export class Token<T> {
  constructor(public row: number, public column: number, public rep: T) {}
}

export class Punctuation extends Token<
  '->' | ',' | '(' | ')' | '[' | ']' | '{' | '}' | ':' | '=' | ';'
> {}

export abstract class Operator<K extends string, T> extends Token<T> {
  abstract kind: K;
}

export class UnaryOp extends Operator<'unary', '+' | '-' | '!'> {
  kind: 'unary' = 'unary';
}

export abstract class BinaryOp<P extends number, T> extends Operator<
  'binary',
  T
> {
  kind: 'binary' = 'binary';
  abstract precedence: P;
}

export class RelOp extends BinaryOp<0, '==' | '!=' | '<' | '<=' | '>' | '>='> {
  precedence: 0 = 0;
}

export class AddOp extends BinaryOp<1, '+' | '-' | '|' | '^'> {
  precedence: 1 = 1;
}

export class MulOp extends BinaryOp<2, '*' | '/' | '%' | '&'> {
  precedence: 2 = 2;
}

export class BoolOp extends BinaryOp<3, '||' | '&&'> {
  precedence: 3 = 3;
}

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
