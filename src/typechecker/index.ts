import { Context, ValDef } from '../parser/visitor';
import * as a from '../parser/ast';

const ordinal: (x: number) => string = require('ordinal');

// AnyType should be used only when it's really needed, e.g. empty list
class AnyType extends a.Type<null> {
  constructor() {
    super(null, -1, -1);
  }
}

export class TypeContext implements Context {
  private scopes: Array<Map<string, a.Type<any>>>;

  constructor() {
    this.scopes = [new Map()];
  }

  get currentScope() {
    return this.scopes[0];
  }

  enterScope() {
    this.scopes.unshift(new Map());
  }

  leaveScope() {
    this.scopes.shift();
  }

  push(def: ValDef) {
    if (def instanceof a.Import) {
      // FIXME: handle when module system is ready
    } else if (def instanceof a.Decl) {
      this.currentScope.set(
        def.value.name.value,
        def.value.type || typeOf(def.value.expr, this),
      );
    } else if (def instanceof a.LoopExpr) {
      const ty = typeOf(def.value.in, this);
      if (ty instanceof a.ListType) {
        this.currentScope.set(def.value.for.value, ty.value);
      } else {
        throw new TypeError(
          ty.row,
          ty.column,
          'ListType',
          ty.constructor.name,
          'A target of for-in expression should be a list',
        );
      }
    } else if (def.name && def.type) {
      // must be a.Param
      this.currentScope.set(def.name.value, def.type);
    }
    // unknown, ignore
  }

  getTypeOf(ident: a.Ident): a.Type<any> | null {
    for (const scope of this.scopes) {
      const ty = scope.get(ident.value);
      if (ty) {
        return ty;
      }
    }
    return null;
  }
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
  } else if (expr instanceof a.IdentExpr) {
    const ty = ctx.getTypeOf(expr.value);
    if (ty) {
      return ty;
    } else {
      throw new TypeError(
        expr.row,
        expr.column,
        `undefined identifier ${expr.value.value}`,
        '',
        'Semantic error',
      );
    }
  } else if (expr instanceof a.TupleExpr) {
    return new a.TupleType(
      {
        size: expr.value.size,
        items: expr.value.items.map(item => typeOf(item, ctx)),
      },
      expr.row,
      expr.column,
    );
  } else if (expr instanceof a.ListExpr) {
    if (expr.value.length === 0) {
      return new a.ListType(new AnyType(), expr.row, expr.column);
    }
    const ty = typeOf(expr.value[0], ctx);
    for (let i = 1; i < expr.value.length; i++) {
      typeEqual(typeOf(expr.value[i], ctx), ty);
    }
    return new a.ListType(ty, expr.row, expr.column);
  }

  throw new TypeError(expr.row, expr.column, 'InvalidType');
}

export function typeEqual(actual: a.Type<any>, expected: a.Type<any>) {
  // if it's AnyType, it always succeeds
  if (actual instanceof AnyType) {
    return;
  }

  // simple types
  if (
    (actual instanceof a.IntType && expected instanceof a.IntType) ||
    (actual instanceof a.FloatType && expected instanceof a.FloatType) ||
    (actual instanceof a.StrType && expected instanceof a.StrType) ||
    (actual instanceof a.BoolType && expected instanceof a.BoolType) ||
    (actual instanceof a.CharType && expected instanceof a.CharType) ||
    (actual instanceof a.VoidType && expected instanceof a.VoidType)
  ) {
    return;
  }

  // func type
  if (actual instanceof a.FuncType && expected instanceof a.FuncType) {
    // FIXME
  }

  // tuple type
  if (actual instanceof a.TupleType && expected instanceof a.TupleType) {
    if (expected.value.size !== actual.value.size) {
      throw new TypeError(
        actual.row,
        actual.column,
        `${actual.value.size}-tuple`,
        `${expected.value.size}-tuple`,
      );
    }

    for (let i = 0; i < expected.value.size; i++) {
      let itemExpected = expected.value.items[i];
      let itemActual = actual.value.items[i];
      try {
        typeEqual(itemActual, itemExpected);
      } catch (err) {
        throw new TypeError(
          actual.row,
          actual.column,
          itemActual.constructor.name,
          itemExpected.constructor.name,
          `${ordinal(i + 1)} element type mismatch for tuple`,
        );
      }
    }

    return;
  }

  // list type
  if (actual instanceof a.ListType && expected instanceof a.ListType) {
    try {
      typeEqual(actual.value, expected.value);
    } catch (err) {
      throw new TypeError(
        actual.row,
        actual.column,
        `ListType of ${actual.value.constructor.name}`,
        `ListType of ${expected.value.constructor.name}`,
      );
    }
    return;
  }

  throw new TypeError(
    actual.row,
    actual.column,
    actual.constructor.name,
    expected.constructor.name,
  );
}
