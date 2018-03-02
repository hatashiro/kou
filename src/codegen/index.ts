import * as a from '../parser/ast';
import { wat2wasm } from '../wasm';

export function genWASM(mod: a.Module, exportName: string): Buffer {
  return wat2wasm(genWAT(mod, exportName));
}

export function genWAT(mod: a.Module, exportName: string): string {
  const ctx = new CodeGenContext();
  let result = '';
  for (const thunk of codegenModule(mod, exportName, ctx)) {
    result += thunk;
  }
  return result;
}

class CodeGenContext {
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
  ctx: CodeGenContext,
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
  ctx: CodeGenContext,
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
  ctx: CodeGenContext,
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

  // FIXME: body
  yield `(f64.const 1234)`;

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
