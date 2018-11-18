import * as t from '../lexer/token';
import { unescape } from '../util';

export abstract class Node<T> {
  constructor(public value: T, public row: number, public column: number) {}

  get name() {
    return this.constructor.name;
  }
}

export type ValType<N extends Node<any>> = N extends Node<infer V> ? V : never;

export interface NodeConstructor<T, N extends Node<T>> {
  new (value: T, row: number, column: number): N;
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

export type UnaryOperandType = { right: Type<any>; ret: Type<any> };

export class UnaryOp extends Operator<'+' | '-' | '!'> {
  static isUnaryOp(token: t.Token<any>) {
    return token.is(t.Operator) && ['+', '-', '!'].includes(token.rep);
  }

  getOperandTypes(): Array<UnaryOperandType> {
    // helper for op with same operand/return types
    const res = (ty: Type<any>) => ({ right: ty, ret: ty });

    switch (this.value) {
      case '+':
        return [res(IntType.instance), res(FloatType.instance)];
      case '-':
        return [res(IntType.instance), res(FloatType.instance)];
      case '!':
        return [res(BoolType.instance)];
    }
  }
}

export type BinaryOperandType = {
  left: Type<any>;
  right: Type<any>;
  ret: Type<any>;
};

export abstract class BinaryOp<T extends string> extends Operator<T> {
  abstract precedence: number;

  static isBinaryOp(token: t.Token<any>) {
    return (
      token.is(t.Operator) &&
      [
        '+',
        '-',
        '==',
        '!=',
        '<',
        '<=',
        '>',
        '>=',
        '|',
        '^',
        '*',
        '/',
        '%',
        '&',
        '||',
        '&&',
      ].includes(token.rep)
    );
  }

  abstract getOperandTypes(left: Type<any>): Array<BinaryOperandType>;
}

// helper for op with same operand/return types
const binaryOperand = (ty: Type<any>, ret: Type<any> = ty) => ({
  left: ty,
  right: ty,
  ret: ret,
});

export class EqOp extends BinaryOp<'==' | '!='> {
  precedence = 0;

  getOperandTypes(left: Type<any>): Array<BinaryOperandType> {
    return [binaryOperand(left, BoolType.instance)];
  }
}

export class CompOp extends BinaryOp<'<' | '<=' | '>' | '>='> {
  precedence = 0;

  getOperandTypes(left: Type<any>): Array<BinaryOperandType> {
    return [
      binaryOperand(IntType.instance, BoolType.instance),
      binaryOperand(FloatType.instance, BoolType.instance),
      binaryOperand(BoolType.instance, BoolType.instance),
      binaryOperand(CharType.instance, BoolType.instance),
      binaryOperand(StrType.instance, BoolType.instance),
    ];
  }
}

export class AddOp extends BinaryOp<'+' | '-' | '|' | '^'> {
  precedence = 1;

  getOperandTypes(left: Type<any>): Array<BinaryOperandType> {
    switch (this.value) {
      case '+':
      case '-':
        return [
          binaryOperand(IntType.instance),
          binaryOperand(FloatType.instance),
        ];
      case '|':
      case '^':
        return [binaryOperand(IntType.instance)];
    }
  }
}

export class MulOp extends BinaryOp<'*' | '/' | '%' | '&'> {
  precedence = 2;

  getOperandTypes(left: Type<any>): Array<BinaryOperandType> {
    switch (this.value) {
      case '*':
      case '/':
        return [
          binaryOperand(IntType.instance),
          binaryOperand(FloatType.instance),
        ];
      case '%':
      case '&':
        return [binaryOperand(IntType.instance)];
    }
  }
}

export class BoolOp extends BinaryOp<'||' | '&&'> {
  precedence = 3;

  getOperandTypes(left: Type<any>): Array<BinaryOperandType> {
    return [binaryOperand(BoolType.instance)];
  }
}

export class Module extends Node<{
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

export class Assign extends Node<{
  lVal: LVal;
  expr: Expr<any>;
}> {}

export type LVal = IdentExpr | IndexExpr;

export class Block extends Node<{
  bodies: Array<Expr<any> | Decl | Assign>;
  returnVoid: boolean;
}> {}

export abstract class Expr<T> extends Node<T> {
  type: Type<any> | null = null; // 'type' is set in typechecker
}

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

export class ArrayExpr extends PrimExpr<Array<Expr<any>>> {}

export class CallExpr extends PrimExpr<{
  func: Expr<any>; // Syntactically PrimExpr, but Expr for desugar
  args: Expr<any>; // Syntactically TupleExpr, but Expr for desugar
}> {}

export class IndexExpr extends PrimExpr<{
  target: Expr<any>; // Syntactically PrimExpr, but Expr for desugar
  index: Expr<any>;
}> {}

export class FuncExpr extends PrimExpr<{
  params: Tuple<Param>;
  returnType: Type<any>;
  body: Block;
}> {}

export type Param = { name: Ident; type: Type<any> };

export class CondExpr extends PrimExpr<{
  if: Expr<any>;
  then: Block;
  else: Block;
}> {}

export class LoopExpr extends PrimExpr<{
  for: Ident;
  in: Expr<any>;
  do: Block;
}> {}

export class NewExpr extends PrimExpr<{
  type: Type<any>;
  length: Expr<any>;
}> {}

export abstract class Type<T> extends Node<T> {
  constructor(value: T, row: number, column: number) {
    super(value, row, column);
  }
}

// type without nested type
export abstract class SimpleType extends Type<null> {
  constructor(row: number, column: number);
  constructor(value: null, row: number, column: number);

  constructor() {
    if (arguments.length === 3) {
      super(arguments[0], arguments[1], arguments[2]);
    } else {
      super(null, arguments[0], arguments[1]);
    }
  }
}

export abstract class PrimType extends SimpleType {}

export class IntType extends PrimType {
  get name() {
    return 'int';
  }

  static instance: IntType = new IntType(-1, -1);
}

export class FloatType extends PrimType {
  get name() {
    return 'float';
  }

  static instance: FloatType = new FloatType(-1, -1);
}

export class StrType extends PrimType {
  get name() {
    return 'str';
  }

  static instance: StrType = new StrType(-1, -1);
}

export class BoolType extends PrimType {
  get name() {
    return 'bool';
  }

  static instance: BoolType = new BoolType(-1, -1);
}

export class CharType extends PrimType {
  get name() {
    return 'char';
  }

  static instance: CharType = new CharType(-1, -1);
}

export class FuncType extends Type<{ param: Type<any>; return: Type<any> }> {
  get name() {
    let paramName = this.value.param.name;
    if (this.value.param instanceof FuncType) {
      paramName = `(${paramName})`;
    }
    return `${paramName} -> ${this.value.return.name}`;
  }
}

export class TupleType extends Type<Tuple<Type<any>>> {
  get name() {
    return `(${this.value.items.map(item => item.name).join(', ')})`;
  }
}

export class ArrayType extends Type<Type<any>> {
  get name() {
    return `[${this.value.name}]`;
  }
}

export class VoidType extends SimpleType {
  get name() {
    return 'void';
  }

  static instance: VoidType = new VoidType(-1, -1);
}

// AnyType should be used only when it's really needed, e.g. empty array
export class AnyType extends SimpleType {
  static instance: AnyType = new AnyType(-1, -1);
}
