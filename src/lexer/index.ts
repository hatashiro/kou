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

  token(Con: TokenConstructor, rep: string): Token<any> {
    return new Con(this.row, this.column, rep);
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

  function withPreview(
    rep: string,
    A: TokenConstructor,
    B: TokenConstructor = A,
  ): Token<any> {
    if (input.preview().value === rep[1]) {
      const t = input.token(A, rep);
      input.next();
      return t;
    } else {
      return input.token(B, rep[0]);
    }
  }

  function digits(): string {
    let lit = '';
    while (isDigit(input.preview().value)) {
      lit += input.next().value;
    }
    return lit;
  }

  return match(
    value,
    [
      // single char punctuation
      [',', () => input.token(Punctuation, ',')],
      ['(', () => input.token(Punctuation, '(')],
      [')', () => input.token(Punctuation, ')')],
      ['[', () => input.token(Punctuation, '[')],
      [']', () => input.token(Punctuation, ']')],
      ['{', () => input.token(Punctuation, '{')],
      ['}', () => input.token(Punctuation, '}')],
      [':', () => input.token(Punctuation, ':')],
      [';', () => input.token(Punctuation, ';')],

      // single char operator
      ['+', () => input.token(Operator, '+')],
      ['^', () => input.token(Operator, '^')],
      ['*', () => input.token(Operator, '*')],
      ['/', () => input.token(Operator, '/')],
      ['%', () => input.token(Operator, '%')],

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
          let lit = value + digits();
          if (input.preview().value === '.') {
            lit += input.next().value + digits();
            return input.token(FloatLit, lit);
          } else {
            return input.token(IntLit, lit);
          }
        },
      ],
      ['.', () => input.token(FloatLit, '.' + digits())],

      // keyword, bool literal, or identifier
      [
        c => c === '_' || isAlphabet(c),
        () => {
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
              return input.token(Keyword, rep);
            case 'true':
            case 'false':
              return input.token(BoolLit, rep);
            default:
              return input.token(Ident, rep);
          }
        },
      ],
    ],
    () => {
      throw new Error(`Unexpected '${value}' at ${input.row}:${input.column}`);
    },
  );
}
