import { PreviewableIterable } from 'previewable-iterator';
import {
  Token,
  TokenConstructor,
  Punctuation,
  Operator,
  Keyword,
  IntLit,
  FloatLit,
  BoolLit,
  CharLit,
  StrLit,
  Ident,
  EOF,
} from './token';
import { match, isDigit, isAlphabet, isAlphanumeric } from '../util';

class LexerInput extends PreviewableIterable<string> {
  public row: number = 1;
  public column: number = 1;
  private nextRow: number = 1;
  private nextColumn: number = 1;

  constructor(iterable: Iterable<string>) {
    super(iterable[Symbol.iterator]());
  }

  next(): IteratorResult<string> {
    const { done, value } = super.next();
    this.row = this.nextRow;
    this.column = this.nextColumn;
    if (value === '\n') {
      this.nextRow += 1;
      this.nextColumn = 1;
    } else {
      this.nextColumn += 1;
    }
    return { done, value };
  }
}

export class LexError extends Error {
  name: string = 'LexError';

  constructor(
    public row: number,
    public column: number,
    public unexpected: string,
  ) {
    super(`Unexpected ${unexpected} at ${row}:${column}`);
  }
}

export function* tokenize(raw: Iterable<string>): Iterable<Token<any>> {
  // make input previewable
  const input = new LexerInput(raw);

  skipSpaces(input);
  while (!input.preview().done) {
    yield parseToken(input);
    skipSpaces(input);
  }

  return new EOF(input.row, input.column, null);
}

function skipSpaces(input: LexerInput) {
  while (/^\s$/.test(input.preview().value)) {
    input.next();
  }
}

function parseToken(input: LexerInput): Token<any> {
  const { done, value } = input.next();
  if (done) {
    throw new LexError(input.row, input.column, 'end of input');
  }

  let pos: [number, number] | null = null;

  function savePos() {
    pos = [input.row, input.column];
  }

  function token<T>(Con: TokenConstructor<T>, rep: T): Token<any> {
    if (pos) {
      const t = new Con(pos[0], pos[1], rep);
      pos = null;
      return t;
    } else {
      return new Con(input.row, input.column, rep);
    }
  }

  function withPreview(
    rep: string,
    A: TokenConstructor<any>,
    B: TokenConstructor<any> = A,
  ): Token<any> {
    savePos();
    if (input.preview().value === rep[1]) {
      input.next();
      return token(A, rep);
    } else {
      return token(B, rep[0]);
    }
  }

  function digits(): string {
    let lit = '';
    while (isDigit(input.preview().value)) {
      lit += input.next().value;
    }
    return lit;
  }

  function char(): string {
    let { done, value: lit } = input.next();

    if (done) {
      throw new LexError(input.row, input.column, 'end of input');
    }
    if (lit === '\n') {
      throw new LexError(input.row, input.column, 'newline');
    }

    if (
      lit === '\\' &&
      ['n', 'r', 't', '\\', "'", '"'].includes(input.preview().value)
    ) {
      lit += input.next().value;
    }
    return lit;
  }

  return match(
    value,
    [
      // single char punctuation
      [',', () => token(Punctuation, ',')],
      ['(', () => token(Punctuation, '(')],
      [')', () => token(Punctuation, ')')],
      ['[', () => token(Punctuation, '[')],
      [']', () => token(Punctuation, ']')],
      ['{', () => token(Punctuation, '{')],
      ['}', () => token(Punctuation, '}')],
      [':', () => token(Punctuation, ':')],
      [';', () => token(Punctuation, ';')],

      // single char operator
      ['+', () => token(Operator, '+')],
      ['^', () => token(Operator, '^')],
      ['*', () => token(Operator, '*')],
      ['/', () => token(Operator, '/')],
      ['%', () => token(Operator, '%')],

      // punctuation or operator
      ['-', () => withPreview('->', Punctuation, Operator)],
      ['=', () => withPreview('==', Operator, Punctuation)],
      ['!', () => withPreview('!=', Operator)],
      ['<', () => withPreview('<=', Operator)],
      ['>', () => withPreview('>=', Operator)],
      ['|', () => withPreview('||', Operator)],
      ['&', () => withPreview('&&', Operator)],

      // number literal
      [
        isDigit,
        () => {
          savePos();
          let lit = value + digits();
          if (input.preview().value === '.') {
            lit += input.next().value + digits();
            return token(FloatLit, lit);
          } else {
            return token(IntLit, lit);
          }
        },
      ],
      [
        '.',
        () => {
          savePos();
          return token(FloatLit, '.' + digits());
        },
      ],

      // keyword, bool literal, or identifier
      [
        c => c === '_' || isAlphabet(c),
        () => {
          savePos();
          let rep = value;
          while (
            input.preview().value === '_' ||
            isAlphanumeric(input.preview().value)
          ) {
            rep += input.next().value;
          }
          switch (rep) {
            case 'import':
            case 'as':
            case 'let':
            case 'fn':
            case 'if':
            case 'then':
            case 'else':
            case 'for':
            case 'in':
              return token(Keyword, rep);
            case 'true':
            case 'false':
              return token(BoolLit, rep);
            default:
              return token(Ident, rep);
          }
        },
      ],

      // char literal
      [
        "'",
        () => {
          savePos();
          let rep = value;
          rep += char();
          const closing = input.next().value;
          if (closing !== "'") {
            throw new LexError(input.row, input.column, closing);
          }
          rep += closing;
          return token(CharLit, rep);
        },
      ],

      // string literal
      [
        '"',
        () => {
          savePos();
          let rep = value;
          while (true) {
            const c = char();
            rep += c;
            if (c === '"') {
              break;
            }
          }
          return token(StrLit, rep);
        },
      ],
    ],
    () => {
      throw new LexError(input.row, input.column, value);
    },
  );
}
