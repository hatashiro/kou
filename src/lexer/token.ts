export class Token<T> {
  constructor(public row: number, public column: number, public rep: T) {}

  is(Con: TokenConstructor<T>, rep?: T): boolean {
    return (
      this instanceof Con && (typeof rep === 'undefined' || this.rep === rep)
    );
  }
}

export interface TokenConstructor<T> {
  new (row: number, column: number, rep: T): Token<T>;
}

export class Punctuation extends Token<
  '->' | ',' | '(' | ')' | '[' | ']' | '{' | '}' | ':' | '=' | ';'
> {}

export class Operator extends Token<
  | '+'
  | '-'
  | '!'
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | '|'
  | '^'
  | '*'
  | '/'
  | '%'
  | '&'
  | '||'
  | '&&'
> {}

export class Keyword extends Token<
  'import' | 'as' | 'let' | 'fn' | 'if' | 'else' | 'for' | 'in'
> {}

export abstract class Literal<T> extends Token<T> {}

export class IntLit extends Literal<string> {}

export class FloatLit extends Literal<string> {}

export class CharLit extends Literal<string> {}

export class StrLit extends Literal<string> {}

export class BoolLit extends Literal<'true' | 'false'> {}

export class Ident extends Token<string> {}

export class EOF extends Token<null> {}
