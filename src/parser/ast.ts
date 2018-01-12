import * as t from '../lexer/token';
import { unescape } from '../util';

export abstract class Node<T> {
  constructor(public value: T, public row: number, public column: number) {}
}

export interface NodeConstructor<T> {
  new (value: T, row: number, column: number): Node<T>;
}

export abstract class Literal<T> extends Node<string> {
  parsedValue: T;
  abstract parse(rep: string): T;

  constructor(value: string, row: number, column: number) {
    super(value, row, column);
    this.parsedValue = this.parse(value);
  }
}

export class IntLit extends Literal<number> {
  parse(rep: string): number {
    return parseInt(rep, 10);
  }

  static from(token: t.IntLit): IntLit {
    return new IntLit(token.rep, token.row, token.column);
  }
}

export class FloatLit extends Literal<number> {
  parse(rep: string): number {
    return parseFloat(rep);
  }

  static from(token: t.FloatLit): FloatLit {
    return new FloatLit(token.rep, token.row, token.column);
  }
}

export class CharLit extends Literal<string> {
  parse(rep: string): string {
    return unescape(rep.slice(1, -1));
  }

  static from(token: t.CharLit): CharLit {
    return new CharLit(token.rep, token.row, token.column);
  }
}

export class StrLit extends Literal<string> {
  parse(rep: string): string {
    return unescape(rep.slice(1, -1));
  }

  static from(token: t.StrLit): StrLit {
    return new StrLit(token.rep, token.row, token.column);
  }
}

export class BoolLit extends Literal<boolean> {
  parse(rep: string): boolean {
    return rep === 'true';
  }

  static from(token: t.BoolLit): BoolLit {
    return new BoolLit(token.rep, token.row, token.column);
  }
}

export class Ident extends Node<string> {}

export abstract class Operator<T extends string> extends Node<T> {}

export class UnaryOp extends Operator<'+' | '-' | '!'> {
  static isUnaryOp(token: t.Token<any>) {
    return token.is(t.Operator) && ['+', '-', '!'].includes(token.rep);
  }
}

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

export class Import extends Node<{ path: StrLit; elems: Array<ImportElem> }> {}

export type ImportElem = { name: Ident; as: Ident | null };

export class Decl extends Node<{
  name: Ident;
  type: Type<any> | null;
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
  right: PrimUnaryExpr<any>;
}> {}

export abstract class PrimExpr<T> extends PrimUnaryExpr<T> {}

export class LitExpr extends PrimExpr<Literal<any>> {}

export class IdentExpr extends PrimExpr<Ident> {}

export type Tuple<T> = { size: number; items: Array<T> };

export class TupleExpr extends PrimExpr<Tuple<Expr<any>>> {}

export class ListExpr extends PrimExpr<Array<Expr<any>>> {}

export class FuncExpr extends PrimExpr<{
  params: Tuple<Param>;
  returnType: Type<any>;
  body: Body;
}> {}

export type Param = { name: Ident; type: Type<any> };

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

export abstract class Type<T> extends Node<T> {}

// type without nested type
export abstract class SimpleType extends Type<null> {
  constructor(row: number, column: number) {
    super(null, row, column);
  }
}

export abstract class PrimType extends SimpleType {}

export class IntType extends PrimType {}

export class FloatType extends PrimType {}

export class StrType extends PrimType {}

export class BoolType extends PrimType {}

export class CharType extends PrimType {}

export class FuncType extends Type<{ param: Type<any>; return: Type<any> }> {}

export class TupleType extends Type<Tuple<Type<any>>> {}

export class ListType extends Type<Type<any>> {}

export class VoidType extends SimpleType {}
