export class Token<T> {
  constructor(public row: number, public column: number, public rep: T) {}
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
  'import' | 'as' | 'let' | 'fn' | 'if' | 'then' | 'else' | 'for' | 'in'
> {}

export abstract class Literal<K extends string, T> extends Token<T> {
  abstract kind: K;
}

export class IntLit extends Literal<'int', string> {
  kind: 'int' = 'int';
}

export class FloatLit extends Literal<'float', string> {
  kind: 'float' = 'float';
}

export class CharLit extends Literal<'char', string> {
  kind: 'char' = 'char';
}

export class StrLit extends Literal<'str', string> {
  kind: 'str' = 'str';
}

export class BoolLit extends Literal<'bool', 'true' | 'false'> {
  kind: 'bool' = 'bool';
}

export class Ident extends Token<string> {}
