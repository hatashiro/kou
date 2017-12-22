import { Type } from './type';
import { Tuple } from './common';

export abstract class Node<T> {
  constructor(public value: T, public row: number, public column: number) {}
}

export abstract class Literal<T> extends Node<T> {}

export class IntLit extends Literal<number> {}

export class FloatLit extends Literal<number> {}

export class CharLit extends Literal<string> {}

export class StrLit extends Literal<string> {}

export class BoolLit extends Literal<boolean> {}

export class Ident extends Node<string> {}

export abstract class Operator<T extends string> extends Node<T> {}

export class UnaryOp extends Operator<'+' | '-' | '!'> {}

export abstract class BinaryOp<T extends string> extends Operator<T> {
  abstract precedence: number;
}

export class RelOp extends BinaryOp<'==' | '!=' | '<' | '<=' | '>' | '>='> {
  precedence = 0;
}

export class AddOp extends BinaryOp<'+' | '-' | '|' | '^'> {
  precedence = 1;
}

export class MulOp extends BinaryOp<'*' | '/' | '%' | '&'> {
  precedence = 2;
}

export class BoolOp extends BinaryOp<'||' | '&&'> {
  precedence = 3;
}

export class Program extends Node<{
  imports: Array<Import>;
  decls: Array<Decl>;
}> {}

export class Import extends Node<{ path: StrLit; name: Ident; alias: Ident }> {}

export class Decl extends Node<{
  name: Ident;
  type?: Type;
  expr: Expr<any>;
}> {}

export class Block extends Node<{
  exprOrDecl: Array<Expr<any> | Decl>;
  isVoid: boolean;
}> {}

export abstract class Expr<T> extends Node<T> {}

export class BinaryExpr extends Expr<{
  left: Expr<any>;
  op: BinaryOp<any>;
  right: Expr<any>;
}> {}

export abstract class PrimUnaryExpr<T> extends Expr<T> {}

export class UnaryExpr extends PrimUnaryExpr<{
  op: UnaryOp;
  right: UnaryExpr;
}> {}

export abstract class PrimExpr<T> extends PrimUnaryExpr<T> {}

export class LitExpr extends PrimExpr<Literal<any>> {}

export class IdentExpr extends PrimExpr<Ident> {}

export class TupleExpr extends PrimExpr<Tuple<Expr<any>>> {}

export class ListExpr extends PrimExpr<Array<Expr<any>>> {}

export class FuncExpr extends PrimExpr<{ params: Tuple<Param>; body: Body }> {}

export type Param = { name: Ident; type: Type };

export type Body = Expr<any> | Block;

export class CallExpr extends PrimExpr<{
  func: PrimExpr<any>;
  args: TupleExpr;
}> {}

export class CondExpr extends PrimExpr<{
  if: Expr<any>;
  then: Body;
  else: Body;
}> {}

export class LoopExpr extends PrimExpr<{
  for: Ident;
  in: Expr<any>;
  body: Body;
}> {}
