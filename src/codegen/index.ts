import * as a from '../parser/ast';
import { wat2wasm } from '../wasm';

export function genWASM(mod: a.Module, exportName: string): Buffer {
  return wat2wasm(genWAT(mod, exportName));
}

export function genWAT(mod: a.Module, exportName: string): string {
  const ctx = new CodegenContext();
  let result = '';
  for (const thunk of codegenModule(mod, exportName, ctx)) {
    result += thunk;
  }
  return result;
}

class CodegenContext {
  private globalNameMap: Map<string, string> = new Map();
  private localNameMaps: Array<Map<string, string>> = [];

  enterScope() {
    this.localNameMaps.unshift(new Map());
  }

  leaveScope() {
    this.localNameMaps.shift();
  }

  pushName(origName: string): string {
    const nameMap = this.localNameMaps[0] || this.globalNameMap;

    // FIXME: add a logic to convert the original name
    const name = origName;

    nameMap.set(origName, name);
    return name;
  }

  getWATName(origName: string): string | undefined {
    for (const map of this.localNameMaps) {
      const name = map.get(origName);
      if (name) {
        return name;
      }
    }
    return this.globalNameMap.get(origName);
  }
}

function* codegenModule(
  mod: a.Module,
  exportName: string,
  ctx: CodegenContext,
): Iterable<string> {
  yield '(module';

  // FIXME: imports

  for (const decl of mod.value.decls) {
    yield* codegenGlobalDecl(decl, ctx);
  }

  yield `(export "${exportName}" (func $${ctx.getWATName(exportName)}))`;

  yield ')';
}

function* codegenGlobalDecl(
  decl: a.Decl,
  ctx: CodegenContext,
): Iterable<string> {
  if (decl.value.expr instanceof a.FuncExpr) {
    yield* codegenFunction(decl.value.name.value, decl.value.expr, ctx);
  } else {
    // FIXME: global variable decl
  }
}

function* codegenFunction(
  origName: string,
  func: a.FuncExpr,
  ctx: CodegenContext,
): Iterable<string> {
  const name = ctx.pushName(origName);

  yield `(func $${name}`;

  ctx.enterScope();

  for (const param of func.value.params.items) {
    // FIXME: param
    // (param $name <type>)
  }

  yield '(result ';
  yield* codegenType(func.value.returnType);
  yield ')';

  yield* codegenBlock(func.value.body, false, ctx);

  ctx.leaveScope();

  yield ')';
}

function* codegenType(ty: a.Type<any>): Iterable<string> {
  if (ty instanceof a.IntType) {
    yield 'i32';
  } else if (ty instanceof a.FloatType) {
    yield 'f64';
  } else if (ty instanceof a.StrType) {
    yield 'i32'; // memory offset
  } else if (ty instanceof a.BoolType) {
    yield 'i32'; // 0 or 1
  } else if (ty instanceof a.CharType) {
    yield 'i32'; // ascii
  } else if (ty instanceof a.VoidType) {
    yield '';
  }

  // FIXME: complex types
}

function* codegenBlock(
  block: a.Block,
  createWASMBlock: boolean,
  ctx: CodegenContext,
): Iterable<string> {
  for (const body of block.value.bodies) {
    if (body instanceof a.Decl) {
      yield* codegenLocalDecl(body, ctx, true);
    }
  }

  for (const body of block.value.bodies) {
    if (body instanceof a.Expr) {
      // expr
      yield* codegenExpr(body, ctx);
    } else {
      // local decl
      yield* codegenLocalDecl(body, ctx, false);
    }
  }

  yield '(return)';
}

function* codegenExpr(
  expr: a.Expr<any>,
  ctx: CodegenContext,
): Iterable<string> {
  if (expr instanceof a.LitExpr) {
    yield* codegenLiteral(expr.value, ctx);
  } else if (expr instanceof a.IdentExpr) {
    yield* codegenIdent(expr.value, ctx);
  }
  // FIXME
}

function* codegenLiteral(
  lit: a.Literal<any>,
  ctx: CodegenContext,
): Iterable<string> {
  if (lit instanceof a.IntLit) {
    yield `(i32.const ${lit.value})`;
  } else if (lit instanceof a.FloatLit) {
    yield `(f64.const ${lit.value})`;
  } else if (lit instanceof a.StrLit) {
    // FIXME: string literal
  } else if (lit instanceof a.CharLit) {
    yield `(i32.const ${lit.parsedValue.codePointAt(0)})`;
  } else if (lit instanceof a.BoolLit) {
    yield `(i32.const ${lit.parsedValue ? 1 : 0})`;
  }
}

function* codegenIdent(ident: a.Ident, ctx: CodegenContext): Iterable<string> {
  // FIXME: process global
  const name = ctx.getWATName(ident.value);
  yield `(get_local $${name})`;
}

function* codegenLocalDecl(
  decl: a.Decl,
  ctx: CodegenContext,
  init: boolean,
): Iterable<string> {
  if (init) {
    const name = ctx.pushName(decl.value.name.value);
    yield `(local $${name} `;
    yield* codegenType(decl.value.expr.type!);
    yield ')';
  } else {
    const name = ctx.getWATName(decl.value.name.value);
    yield* codegenExpr(decl.value.expr, ctx);
    yield `(set_local $${name})`;
  }
}
