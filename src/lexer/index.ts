import { previewable, PreviewableIterable } from 'previewable-iterator';
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
  Ident,
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

export function* tokenize(raw: Iterable<string>): Iterable<Token<any>> {
  // make input previewable
  const input = new LexerInput(raw);

  while (!input.preview().done) {
    yield parseToken(input);
  }
}

function parseToken(input: LexerInput): Token<any> {
  const { done, value } = input.next();
  if (done) {
    throw new Error(`Unexpected end of input at ${input.row}:${input.column}`);
  }

  let pos: [number, number] | null = null;

  function savePos() {
    pos = [input.row, input.column];
  }

  function token(Con: TokenConstructor, rep: string): Token<any> {
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
    A: TokenConstructor,
    B: TokenConstructor = A,
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
    let lit = input.next().value;
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
            throw new Error(
              `Unexpected '${closing}' at ${input.row}:${input.column}`,
            );
          }
          rep += closing;
          return token(CharLit, rep);
        },
      ],
    ],
    () => {
      throw new Error(`Unexpected '${value}' at ${input.row}:${input.column}`);
    },
  );
}
