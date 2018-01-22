import { Context, ValDef } from '../parser/visitor';
import * as a from '../parser/ast';

export class TypeContext implements Context {
  enterScope() {}

  leaveScope() {}

  push(def: ValDef) {}
}

export class TypeError extends Error {
  name: string = 'TypeError';

  constructor(
    public row: number,
    public column: number,
    public actual: string,
    public expected?: string,
    message?: string,
  ) {
    super(
      `${message || 'Type mismatch'}: ${
        expected ? `expected ${expected}, ` : ''
      }found ${actual} at ${row}:${column}`,
    );
  }
}

export function typeOf(expr: a.Expr<any>, ctx: TypeContext): a.Type<any> {
  if (expr instanceof a.LitExpr) {
    if (expr.value instanceof a.IntLit) {
      return new a.IntType(expr.row, expr.column);
    } else if (expr.value instanceof a.FloatLit) {
      return new a.FloatType(expr.row, expr.column);
    } else if (expr.value instanceof a.CharLit) {
      return new a.CharType(expr.row, expr.column);
    } else if (expr.value instanceof a.BoolLit) {
      return new a.BoolType(expr.row, expr.column);
    } else if (expr.value instanceof a.StrLit) {
      return new a.StrType(expr.row, expr.column);
    }
  }

  throw new TypeError(expr.row, expr.column, 'InvalidType');
}

export function typeEqual(expected: a.Type<any>, actual: a.Type<any>) {
  // simple types
  if (
    (expected instanceof a.IntType && actual instanceof a.IntType) ||
    (expected instanceof a.FloatType && actual instanceof a.FloatType) ||
    (expected instanceof a.StrType && actual instanceof a.StrType) ||
    (expected instanceof a.BoolType && actual instanceof a.BoolType) ||
    (expected instanceof a.CharType && actual instanceof a.CharType) ||
    (expected instanceof a.VoidType && actual instanceof a.VoidType)
  ) {
    return;
  }

  // func type
  if (expected instanceof a.FuncType && actual instanceof a.FuncType) {
    // FIXME
  }

  // tuple type
  if (expected instanceof a.TupleType && actual instanceof a.TupleType) {
    // FIXME
  }

  // list type
  if (expected instanceof a.ListType && actual instanceof a.ListType) {
    // FIXME
  }

  throw new TypeError(
    actual.row,
    actual.column,
    actual.constructor.name,
    expected.constructor.name,
  );
}
