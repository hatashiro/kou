import * as a from '../parser/ast';
import { orStr } from '../util';
import { TypeContext, IdentTypeDef } from './context';
import { TypeError } from './error';

export function typeCheck(mod: a.Module, ctx: TypeContext) {
  ctx.enterScope();

  // FIXME: process imports

  // register global decls
  mod.value.decls.forEach(decl => registerDeclType(decl, ctx));

  // actual type checks for exprs (including function body)
  mod.value.decls.forEach(decl => checkDeclType(decl, ctx));

  ctx.leaveScope();

  return mod;
}

function cloneType<T, TY extends a.Type<T>>(
  orig: TY,
  { row, column }: { row: number; column: number },
): TY {
  return new (orig.constructor as any)(orig.value, row, column);
}

export function checkExprType(
  expr: a.Expr<any>,
  ctx: TypeContext,
  checkFuncBody: boolean = true,
): a.Type<any> {
  if (expr.type) {
    return expr.type;
  }

  const ty = checkExprTypeWithoutCache(expr, ctx, checkFuncBody);

  // do not cache the result for FuncExpr without body check
  if (!(expr instanceof a.FuncExpr && !checkFuncBody)) {
    expr.type = ty;
  }

  return ty;
}

function checkExprTypeWithoutCache(
  expr: a.Expr<any>,
  ctx: TypeContext,
  checkFuncBody: boolean = true,
): a.Type<any> {
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
      return cloneType(ty, expr);
    } else {
      throw new TypeError(
        {
          row: expr.row,
          column: expr.column,
          name: expr.value.value,
        },
        undefined,
        'undefined identifier',
        'SemanticError',
      );
    }
  } else if (expr instanceof a.TupleExpr) {
    return new a.TupleType(
      {
        size: expr.value.size,
        items: expr.value.items.map(item => checkExprType(item, ctx)),
      },
      expr.row,
      expr.column,
    );
  } else if (expr instanceof a.ListExpr) {
    if (expr.value.length === 0) {
      return new a.ListType(a.AnyType.instance, expr.row, expr.column);
    }
    const ty = checkExprType(expr.value[0], ctx);
    for (let i = 1; i < expr.value.length; i++) {
      assertType(checkExprType(expr.value[i], ctx), ty);
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

    if (checkFuncBody) {
      const bodyType = checkBlockType(
        expr.value.body,
        ctx,
        expr.value.params.items.map(({ name, type: ty }) => ({
          ident: name,
          type: ty,
        })),
      );

      try {
        assertType(bodyType, expr.value.returnType);
      } catch {
        let message = 'Function return type mismatch';

        if (expr.value.returnType instanceof a.VoidType) {
          message += ", ';' may be missing";
        }

        throw new TypeError(bodyType, expr.value.returnType, message);
      }
    }

    return new a.FuncType(
      { param, return: expr.value.returnType },
      expr.row,
      expr.column,
    );
  } else if (expr instanceof a.CallExpr) {
    const funcType = checkExprType(expr.value.func, ctx);
    const argsType = checkExprType(expr.value.args, ctx);

    if (!(funcType instanceof a.FuncType)) {
      throw new TypeError(
        funcType,
        { name: 'function' },
        'non-callable target',
        'SemanticError',
      );
    }

    try {
      assertType(argsType, funcType.value.param);
    } catch {
      throw new TypeError(
        argsType,
        funcType.value.param,
        'Function parameter type mismatch',
      );
    }

    return cloneType(funcType.value.return, expr);
  } else if (expr instanceof a.IndexExpr) {
    const targetType = checkExprType(expr.value.target, ctx);
    if (targetType instanceof a.ListType) {
      const indexType = checkExprType(expr.value.index, ctx);
      if (indexType instanceof a.IntType) {
        return cloneType(targetType.value, expr);
      } else {
        throw new TypeError(
          indexType,
          a.IntType.instance,
          'Index type mismatch',
        );
      }
    } else if (targetType instanceof a.StrType) {
      const indexType = checkExprType(expr.value.index, ctx);
      if (indexType instanceof a.IntType) {
        return new a.CharType(expr.row, expr.column);
      } else {
        throw new TypeError(
          indexType,
          a.IntType.instance,
          'Index type mismatch',
        );
      }
    } else if (targetType instanceof a.TupleType) {
      const index = expr.value.index;
      if (index instanceof a.LitExpr && index.value instanceof a.IntLit) {
        const lit = index.value;
        if (lit.parsedValue < targetType.value.size) {
          return cloneType(targetType.value.items[lit.parsedValue], expr);
        } else {
          throw new TypeError(
            { row: lit.row, column: lit.column, name: lit.value },
            { name: `int < ${targetType.value.size}` },
            'Tuple index out of range',
          );
        }
      } else {
        throw new TypeError(
          { row: index.row, column: index.column, name: 'expr' },
          undefined,
          'Invalid tuple index: only int literal is allowed for tuple index',
        );
      }
    } else {
      throw new TypeError(
        targetType,
        { name: 'list, str or tuple' },
        'Indexable type mismatch',
      );
    }
  } else if (expr instanceof a.CondExpr) {
    assertType(
      checkExprType(expr.value.if, ctx),
      new a.BoolType(expr.row, expr.column),
    );

    const ifBlockType = checkBlockType(expr.value.then, ctx);
    const elseBlockType = checkBlockType(expr.value.else, ctx);
    try {
      assertType(ifBlockType, elseBlockType);
    } catch {
      let message = "'else' block should have the same type as 'if' block";

      if (ifBlockType instanceof a.VoidType) {
        message += ", ';' may be missing";
      }

      throw new TypeError(elseBlockType, ifBlockType, message);
    }

    return ifBlockType;
  } else if (expr instanceof a.LoopExpr) {
    const targetType = checkExprType(expr.value.in, ctx);

    if (targetType instanceof a.ListType) {
      const doBlockType = checkBlockType(expr.value.do, ctx, [
        { ident: expr.value.for, type: targetType.value },
      ]);
      return new a.ListType(doBlockType, doBlockType.row, doBlockType.column);
    } else {
      throw new TypeError(
        targetType,
        undefined,
        'Loop target should be a list',
      );
    }
  } else if (expr instanceof a.UnaryExpr) {
    const opTypes = expr.value.op.getOperandTypes();
    const rightActualTy = checkExprType(expr.value.right, ctx);
    for (const { right, ret } of opTypes) {
      try {
        assertType(rightActualTy, right);

        return cloneType(ret, expr);
      } catch {
        // ignore, try the next
      }
    }
    // fails for all the operand types
    throw new TypeError(
      rightActualTy,
      {
        name: orStr(opTypes.map(x => x.right.name)),
      },
      `Operand type mismatch for '${expr.value.op.value}'`,
    );
  } else if (expr instanceof a.BinaryExpr) {
    const leftActualTy = checkExprType(expr.value.left, ctx);
    const opTypes = expr.value.op.getOperandTypes(leftActualTy);
    const rightActualTy = checkExprType(expr.value.right, ctx);
    for (const { left, right, ret } of opTypes) {
      try {
        assertType(leftActualTy, left);
      } catch {
        // ignore, try the next
        continue;
      }

      try {
        assertType(rightActualTy, right);

        return cloneType(ret, expr);
      } catch {
        throw new TypeError(
          rightActualTy,
          right,
          `Right-hand operand type mismatch for '${expr.value.op.value}'`,
        );
      }
    }
    // fails for all the operand types
    throw new TypeError(
      leftActualTy,
      {
        name: orStr(opTypes.map(x => x.left.name)),
      },
      `Left-hand operand type mismatch for '${expr.value.op.value}'`,
    );
  }

  throw new TypeError({
    row: expr.row,
    column: expr.column,
    name: 'invalid type',
  });
}

function registerDeclType(decl: a.Decl, ctx: TypeContext) {
  if (!decl.value.type) {
    // ensure type property
    decl.value.type = checkExprType(decl.value.expr, ctx, false);
  }

  ctx.push({ ident: decl.value.name, type: decl.value.type });
}

function checkDeclType(decl: a.Decl, ctx: TypeContext) {
  if (!decl.value.type) {
    throw new TypeError(
      decl,
      undefined,
      'Type of decl should be tagged before being checked',
    );
  }

  if (containsVoidType(decl.value.type)) {
    throw new TypeError(
      { name: decl.value.type.name, row: decl.row, column: decl.column },
      undefined,
      'A decl type cannot contain void',
      'SemanticError',
    );
  }

  assertType(checkExprType(decl.value.expr, ctx), decl.value.type);
}

function containsVoidType(ty: a.Type<any>): boolean {
  if (ty instanceof a.VoidType) {
    return true;
  } else if (ty instanceof a.TupleType) {
    return ty.value.items.some(containsVoidType);
  } else if (ty instanceof a.ListType) {
    return containsVoidType(ty.value);
  } else {
    return false;
  }
}

export function checkBlockType(
  block: a.Block,
  ctx: TypeContext,
  initialDefs: Array<IdentTypeDef> = [],
): a.Type<any> {
  ctx.enterScope();
  initialDefs.forEach(def => ctx.push(def));

  let exprType: a.Type<any> = new a.VoidType(block.row, block.column);
  block.value.bodies.forEach(body => {
    if (body instanceof a.Decl) {
      registerDeclType(body, ctx);
      checkDeclType(body, ctx);
    } else {
      exprType = checkExprType(body, ctx);
    }
  });

  const ty: a.Type<any> = block.value.returnVoid
    ? new a.VoidType(block.row, block.column)
    : exprType;

  ctx.leaveScope();

  return ty;
}

export function assertType(actual: a.Type<any>, expected: a.Type<any>) {
  // if it's AnyType, it always succeeds
  if (actual instanceof a.AnyType) {
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
      assertType(actual.value.param, expected.value.param);
      assertType(actual.value.return, expected.value.return);
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
        assertType(actual.value.items[i], expected.value.items[i]);
      } catch {
        throw new TypeError(actual, expected);
      }
    }

    return;
  }

  // list type
  if (actual instanceof a.ListType && expected instanceof a.ListType) {
    try {
      assertType(actual.value, expected.value);
    } catch {
      throw new TypeError(actual, expected);
    }
    return;
  }

  throw new TypeError(actual, expected);
}
