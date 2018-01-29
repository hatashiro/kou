import * as a from '../parser/ast';

// AnyType should be used only when it's really needed, e.g. empty list
class AnyType extends a.Type<null> {
  constructor() {
    super(null, -1, -1);
  }
}

export class TypeContext {
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

  push(ident: a.Ident, ty: a.Type<any>) {
    const name = ident.value;
    if (this.currentScope.has(name)) {
      throw new TypeError(
        ident,
        undefined,
        `Semantic error: identifier '${name}' has already been declared`,
      );
    } else {
      this.currentScope.set(name, ty);
    }
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
    public actual: { row: number; column: number; name: string },
    public expected?: { name: string },
    message: string = 'Type mismatch',
  ) {
    super(
      `${message}: ${expected ? `expected ${expected.name}, ` : ''}found ${
        actual.name
      } at ${actual.row}:${actual.column}`,
    );
  }
}

const typeCache: Map<a.Expr<any> | a.Block, a.Type<any>> = new Map();

export function typeOf(
  node: a.Expr<any> | a.Block,
  ctx: TypeContext,
): a.Type<any> {
  let ty = typeCache.get(node);
  if (!ty) {
    if (node instanceof a.Block) {
      ty = checkBlockType(node, ctx);
    } else {
      ty = checkExprType(node, ctx);
    }
    typeCache.set(node, ty);
  }
  return ty;
}

function checkExprType(expr: a.Expr<any>, ctx: TypeContext): a.Type<any> {
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
        {
          row: expr.row,
          column: expr.column,
          name: `undefined identifier ${expr.value.value}`,
        },
        undefined,
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
  } else if (expr instanceof a.FuncExpr) {
    let param: a.Type<any>;
    if (expr.value.params.size === 1) {
      param = expr.value.params.items[0].type;
    } else {
      param = new a.TupleType(
        {
          size: expr.value.params.size,
          items: expr.value.params.items.map(item => item.type),
        },
        expr.row,
        expr.column,
      );
    }
    return new a.FuncType(
      { param, return: expr.value.returnType },
      expr.row,
      expr.column,
    );
  } else if (expr instanceof a.CallExpr) {
    const funcType = typeOf(expr.value.func, ctx);
    const argsType = typeOf(expr.value.args, ctx);

    if (!(funcType instanceof a.FuncType)) {
      throw new TypeError(
        funcType,
        { name: 'function' },
        'Semantic error: non-callable target',
      );
    }

    try {
      typeEqual(argsType, funcType.value.param);
    } catch {
      throw new TypeError(
        argsType,
        funcType.value.param,
        'Function parameter type mismatch',
      );
    }

    return funcType.value.return;
  }

  throw new TypeError({
    row: expr.row,
    column: expr.column,
    name: 'invalid type',
  });
}

function checkBlockType(block: a.Block, ctx: TypeContext): a.Type<any> {
  // FIXME
  return new a.VoidType(-1, -1);
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
    try {
      typeEqual(actual.value.param, expected.value.param);
      typeEqual(actual.value.return, expected.value.return);
    } catch {
      throw new TypeError(actual, expected);
    }
    return;
  }

  // tuple type
  if (actual instanceof a.TupleType && expected instanceof a.TupleType) {
    if (expected.value.size !== actual.value.size) {
      throw new TypeError(actual, expected, 'Tuple length mismatch');
    }

    for (let i = 0; i < expected.value.size; i++) {
      try {
        typeEqual(actual.value.items[i], expected.value.items[i]);
      } catch {
        throw new TypeError(actual, expected);
      }
    }

    return;
  }

  // list type
  if (actual instanceof a.ListType && expected instanceof a.ListType) {
    try {
      typeEqual(actual.value, expected.value);
    } catch {
      throw new TypeError(actual, expected);
    }
    return;
  }

  throw new TypeError(actual, expected);
}
