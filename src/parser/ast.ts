export class Node<C> {
  constructor(public children: C, public row: number, public column: number) {}
}

// FIXME
type Expr = any;

export abstract class Operator<C, K extends string, T> extends Node<C> {
  abstract kind: K;

  constructor(public token: T, children: C, row: number, column: number) {
    super(children, row, column);
  }
}

export class UnaryOp extends Operator<
  { right: Expr },
  'unary',
  '+' | '-' | '!'
> {
  kind: 'unary' = 'unary';
}

export abstract class BinaryOp<P extends number, T> extends Operator<
  { left: Expr; right: Expr },
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
