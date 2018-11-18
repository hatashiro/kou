export class Token<T> {
  constructor(public row: number, public column: number, public rep: T) {}

  is<Tk extends Token<T>>(Con: TokenConstructor<T, Tk>, rep?: T): this is Tk {
    return (
      this instanceof Con && (typeof rep === 'undefined' || this.rep === rep)
    );
  }
}

export type RepType<Tk extends Token<any>> = Tk extends Token<infer T>
  ? T
  : never;

export interface TokenConstructor<T, Tk extends Token<T>> {
  new (row: number, column: number, rep: T): Tk;
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
  'import' | 'as' | 'let' | 'fn' | 'if' | 'else' | 'for' | 'in' | 'new'
> {}

export abstract class Literal<T> extends Token<T> {}

export class IntLit extends Literal<string> {}

export class FloatLit extends Literal<string> {}

export class CharLit extends Literal<string> {}

export class StrLit extends Literal<string> {}

export class BoolLit extends Literal<'true' | 'false'> {}

export class Ident extends Token<string> {}

export class EOF extends Token<null> {}
