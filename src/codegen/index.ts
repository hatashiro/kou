import * as a from '../parser/ast';
import { wat2wasm, convertMiBToPage } from '../wasm';
import { CodegenContext } from './context';
import { SExp, beautify } from 's-exify';

export function genWASM(
  mod: a.Module,
  opts: { exports: Array<string>; memorySize: number },
): Buffer {
  return wat2wasm(genWAT(mod, opts));
}

export function genWAT(
  mod: a.Module,
  opts: { exports: Array<string>; memorySize: number },
): string {
  return beautify(
    codegenModule(mod, new CodegenContext(), {
      exports: opts.exports,
      pageCount: convertMiBToPage(opts.memorySize),
    }),
  );
}

const exp = (...nodes: Array<string | SExp>): SExp => nodes;
const str = (raw: string) => `"${raw.replace('"', '\\"')}"`;
const wat = (name: string) => `$${name}`;
const sys = (name: string) => wat(`/${name}`);

function codegenModule(
  mod: a.Module,
  ctx: CodegenContext,
  opts: {
    exports: Array<string>;
    pageCount: number;
  },
): SExp {
  const modE = exp('module');

  // imports
  modE.push(
    exp(
      'import',
      str('js'),
      str('memory'),
      exp('memory', String(opts.pageCount)),
    ),
  );

  // system registries for language implementation
  modE.push(...codegenRegistry(ctx));

  for (const decl of mod.value.decls) {
    const declE = codegenGlobalDecl(decl, ctx);
    if (declE) modE.push(declE);
  }

  modE.push(...codegenStartFunc(ctx));

  // used tuple constructors
  for (const [name, { types, sizes }] of ctx.tupleConstructors.entries()) {
    modE.push(codegenTupleConstructor(name, types, sizes));
  }

  for (const exportName of opts.exports) {
    const watName = ctx.getGlobalWATName(exportName)!;
    modE.push(exp('export', str(exportName), exp('func', wat(watName))));
  }

  return modE;
}

function* codegenRegistry(ctx: CodegenContext): Iterable<SExp> {
  const reg = (name: string, ty: string) =>
    exp('global', sys(name), exp('mut', ty), exp(`${ty}.const`, '0'));

  yield reg('reg/addr', 'i32');
  yield reg('reg/i32/1', 'i32');
  yield reg('reg/i32/2', 'i32');
  yield reg('reg/f64/1', 'f64');
  yield reg('reg/f64/2', 'f64');
}

function* codegenStartFunc(ctx: CodegenContext): Iterable<SExp> {
  if (ctx.globalInitializers.length === 0) {
    return;
  }

  const funcE = exp('func', sys('start'));

  for (const { watName, expr } of ctx.globalInitializers) {
    funcE.push(...codegenExpr(expr, ctx));
    funcE.push(exp('set_global', wat(watName)));
  }

  yield funcE;
  yield exp('start', sys('start'));
}

function codegenGlobalDecl(decl: a.Decl, ctx: CodegenContext): SExp | null {
  const expr = decl.value.expr;
  if (expr instanceof a.FuncExpr) {
    return codegenFunction(decl.value.name.value, decl.value.expr, ctx);
  } else if (expr instanceof a.IdentExpr && expr.type instanceof a.FuncType) {
    // function name alias
    ctx.pushAlias(decl.value.name.value, expr.value.value);
    return null;
  } else {
    return codegenGlobalVar(decl, ctx);
  }
}

function codegenFunction(
  origName: string,
  func: a.FuncExpr,
  ctx: CodegenContext,
): SExp {
  const name = ctx.pushName(origName);

  const funcE = exp('func', wat(name));

  ctx.enterFunction();

  for (const param of func.value.params.items) {
    funcE.push(
      exp(
        'param',
        wat(ctx.pushName(param.name.value)),
        codegenType(param.type, ctx),
      ),
    );
  }

  funcE.push(exp('result', codegenType(func.value.returnType, ctx)));

  funcE.push(...codegenBlock(func.value.body, true, ctx));

  ctx.leaveFunction();

  return funcE;
}

function codegenType(ty: a.Type<any>, ctx: CodegenContext): string {
  if (ty instanceof a.IntType) {
    return 'i32';
  } else if (ty instanceof a.FloatType) {
    return 'f64';
  } else if (ty instanceof a.BoolType) {
    return 'i32'; // 0 or 1
  } else if (ty instanceof a.CharType) {
    return 'i32'; // ascii
  } else if (ty instanceof a.VoidType) {
    return '';
  } else {
    return 'i32'; // memory offset
  }
}

function getByteSizeOfType(ty: a.Type<any>): number {
  if (ty instanceof a.FloatType) {
    return 8;
  } else if (ty instanceof a.VoidType) {
    return 0;
  } else {
    return 4;
  }
}

function* codegenBlock(
  block: a.Block,
  isFunction: boolean,
  ctx: CodegenContext,
): Iterable<SExp> {
  if (isFunction) {
    yield* codegenLocalVarDef(block, ctx);
    ctx.resetScopeID();
  } else {
    ctx.enterBlock();
  }

  for (const body of block.value.bodies) {
    if (body instanceof a.Expr) {
      // expr
      yield* codegenExpr(body, ctx);
    } else if (body instanceof a.Decl) {
      // local decl
      yield* codegenLocalVarDecl(body, ctx);
    } else if (body instanceof a.Assign) {
      // assignment
      yield* codegenAssign(body, ctx);
    } else {
      // break
      yield codegenBreak(body, ctx);
    }
  }

  if (isFunction) {
    yield exp('return');
  } else {
    ctx.leaveBlock();
  }
}

function codegenBlockType(block: a.Block, ctx: CodegenContext): string {
  if (block.value.returnVoid) {
    return '';
  } else {
    // the last body should be an expr;
    const lastExpr: a.Expr<any> = block.value.bodies[
      block.value.bodies.length - 1
    ] as any;
    return codegenType(lastExpr.type!, ctx);
  }
}

function* codegenExpr(expr: a.Expr<any>, ctx: CodegenContext): Iterable<SExp> {
  if (expr instanceof a.LitExpr) {
    yield codegenLiteral(expr.value, ctx);
  } else if (expr instanceof a.IdentExpr) {
    yield codegenIdent(expr.value, ctx);
  } else if (expr instanceof a.CallExpr) {
    yield* codegenCallExpr(expr, ctx);
  } else if (expr instanceof a.UnaryExpr) {
    yield* codegenUnaryExpr(expr, ctx);
  } else if (expr instanceof a.BinaryExpr) {
    yield* codegenBinaryExpr(expr, ctx);
  } else if (expr instanceof a.CondExpr) {
    yield* codegenCondExpr(expr, ctx);
  } else if (expr instanceof a.TupleExpr) {
    yield* codegenTupleExpr(expr, ctx);
  } else if (expr instanceof a.ArrayExpr) {
    yield* codegenArrayExpr(expr, ctx);
  } else if (expr instanceof a.IndexExpr) {
    yield* codegenIndexExpr(expr, ctx);
  } else if (expr instanceof a.NewExpr) {
    yield* codegenNewExpr(expr, ctx);
  } else if (expr instanceof a.LoopExpr) {
    yield codegenLoopExpr(expr, ctx);
  }
}

function codegenLiteral(lit: a.Literal<any>, ctx: CodegenContext): SExp {
  if (lit instanceof a.IntLit) {
    return exp('i32.const', String(lit.value));
  } else if (lit instanceof a.FloatLit) {
    const rep = lit.value.startsWith('.') ? '0' + lit.value : lit.value;
    return exp('f64.const', rep);
  } else if (lit instanceof a.StrLit) {
    // TODO: string literal
    return exp('i32.const', '0');
  } else if (lit instanceof a.CharLit) {
    return exp('i32.const', String(lit.parsedValue.codePointAt(0)));
  } else if (lit instanceof a.BoolLit) {
    return exp('i32.const', lit.parsedValue ? '1' : '0');
  } else {
    return exp('unreachable');
  }
}

function codegenInitialValForType(lit: a.Type<any>, ctx: CodegenContext): SExp {
  if (lit instanceof a.IntType) {
    return exp('i32.const', '0');
  } else if (lit instanceof a.FloatType) {
    return exp('f64.const', '0');
  } else if (lit instanceof a.CharType) {
    return exp('i32.const', '0');
  } else if (lit instanceof a.BoolType) {
    return exp('i32.const', '0');
  } else {
    // memory address
    return exp('i32.const', '0');
  }
}

function codegenIdent(ident: a.Ident, ctx: CodegenContext): SExp {
  let name = ctx.getLocalWATName(ident.value);
  if (name) {
    return exp('get_local', wat(name));
  } else {
    name = ctx.getGlobalWATName(ident.value)!;
    return exp('get_global', wat(name));
  }
}

function* codegenCallExpr(
  call: a.CallExpr,
  ctx: CodegenContext,
): Iterable<SExp> {
  if (!(call.value.func instanceof a.IdentExpr)) {
    // do not support
    return;
  }

  if (call.value.args instanceof a.TupleExpr) {
    for (const arg of call.value.args.value.items) {
      yield* codegenExpr(arg, ctx);
    }
  } else {
    yield* codegenExpr(call.value.args, ctx);
  }

  const funcName = ctx.getGlobalWATName(call.value.func.value.value);

  if (typeof funcName === 'string') {
    yield exp('call', wat(funcName));
  } else {
    // must be stdlib
    const stdFunc = ctx.getStdFunc(call.value.func.value.value)!;
    if (stdFunc.expr) {
      yield* stdFunc.expr;
    }
  }
}

function* codegenUnaryExpr(
  unary: a.UnaryExpr,
  ctx: CodegenContext,
): Iterable<SExp> {
  const op = unary.value.op;
  const right = unary.value.right;

  // used for '-'
  let ty = codegenType(right.type!, ctx);

  if (op.value === '-') {
    yield exp(`${ty}.const`, '0');
  }

  yield* codegenExpr(right, ctx);

  if (op.value === '-') {
    yield exp(`${ty}.sub`);
  } else if (op.value === '!') {
    yield exp('i32.eqz');
  }

  // '+' should be removed already in desugarer, no need to handle
}

function* codegenBinaryExpr(
  binary: a.BinaryExpr,
  ctx: CodegenContext,
): Iterable<SExp> {
  const op = binary.value.op;
  const left = binary.value.left;
  const right = binary.value.right;

  const ty = codegenType(right.type!, ctx);
  const signed = ty === 'i32' ? '_s' : '';

  switch (op.value) {
    case '==':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp(`${ty}.eq`);
      break;
    case '!=':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp(`${ty}.ne`);
      break;
    case '<':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp(`${ty}.lt${signed}`);
      break;
    case '<=':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp(`${ty}.le${signed}`);
      break;
    case '>':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp(`${ty}.gt${signed}`);
      break;
    case '>=':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp(`${ty}.ge${signed}`);
      break;
    case '+':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp(`${ty}.add`);
      break;
    case '-':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp(`${ty}.sub`);
      break;
    case '^':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp('i32.xor');
      break;
    case '&':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp('i32.and');
      break;
    case '|':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp('i32.or');
      break;
    case '*':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp(`${ty}.mul`);
      break;
    case '/':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp(`${ty}.div${signed}`);
      break;
    case '%':
      yield* codegenExpr(left, ctx);
      yield* codegenExpr(right, ctx);
      yield exp('i32.rem_s');
      break;
    case '&&':
      // for short circuit evaluation
      yield* codegenExpr(left, ctx);
      yield exp(
        'if',
        exp('result', 'i32'),
        exp('then', ...codegenExpr(right, ctx)),
        exp('else', exp('i32.const', '0')),
      );
      break;
    case '||':
      // for short circuit evaluation
      yield* codegenExpr(left, ctx);
      yield exp(
        'if',
        exp('result', 'i32'),
        exp('then', exp('i32.const', '1')),
        exp('else', ...codegenExpr(right, ctx)),
      );
      break;
  }
}

function* codegenCondExpr(
  cond: a.CondExpr,
  ctx: CodegenContext,
): Iterable<SExp> {
  yield* codegenExpr(cond.value.if, ctx);

  yield exp(
    'if',
    exp('result', codegenBlockType(cond.value.then, ctx)),
    exp('then', ...codegenBlock(cond.value.then, false, ctx)),
    exp('else', ...codegenBlock(cond.value.else, false, ctx)),
  );
}

function* codegenGetCurrentHeapPointer(): Iterable<SExp> {
  yield exp('i32.const', '0');
  yield exp('i32.load');
}

function* codegenSetCurrentHeapPointer(): Iterable<SExp> {
  yield exp('i32.const', '0');
  yield* codegenSwapStackTop('i32');
  yield exp('i32.store');
}

function* codegenSwapStackTop(ty1: string, ty2: string = ty1): Iterable<SExp> {
  yield exp('set_global', sys(`reg/${ty1}/1`));
  yield exp('set_global', sys(`reg/${ty2}/2`));
  yield exp('get_global', sys(`reg/${ty1}/1`));
  yield exp('get_global', sys(`reg/${ty2}/2`));
}

function* codegenMemoryAllocation(size?: number): Iterable<SExp> {
  if (typeof size === 'number') {
    yield exp('i32.const', String(size));
  }

  yield* codegenGetCurrentHeapPointer();
  yield exp('set_global', sys('reg/addr'));
  yield exp('get_global', sys('reg/addr'));
  yield exp('i32.add');
  yield* codegenSetCurrentHeapPointer();
  yield exp('get_global', sys('reg/addr'));
}

function* codegenTupleExpr(
  tuple: a.TupleExpr,
  ctx: CodegenContext,
): Iterable<SExp> {
  if (tuple.value.size === 0) {
    yield exp('i32.const', '0');
    return;
  }

  for (let i = 0; i < tuple.value.size; i++) {
    const expr = tuple.value.items[i];
    yield* codegenExpr(expr, ctx);
  }

  const tupleTy: a.TupleType = tuple.type as any;
  const types = tupleTy.value.items.map(ty => codegenType(ty, ctx));
  const sizes = tupleTy.value.items.map(getByteSizeOfType);

  const constName = ctx.useTupleConstructor(types, sizes);
  yield exp('call', sys(constName));
}

function* codegenArrayExpr(
  array: a.ArrayExpr,
  ctx: CodegenContext,
): Iterable<SExp> {
  const arrTy = array.type! as a.ArrayType;

  const ty = codegenType(arrTy.value, ctx);
  const size = getByteSizeOfType(arrTy.value);
  const len = array.value.length;
  yield* codegenMemoryAllocation(4 + size * len);

  yield exp('set_global', sys('reg/i32/1'));
  for (let i = 0; i < len + 2; i++) {
    // prepare for set
    // +2: +1 to store length, +1 to return
    yield exp('get_global', sys('reg/i32/1'));
  }

  // store length
  let offset = 4;
  yield exp('i32.const', String(len));
  yield exp('i32.store');
  yield exp('i32.const', String(offset));
  yield exp('i32.add');

  // store values
  for (let i = 0; i < len; i++) {
    yield* codegenExpr(array.value[i], ctx);
    yield exp(`${ty}.store`);

    if (i < len - 1) {
      offset += size;
      yield exp('i32.const', String(offset));
      yield exp('i32.add');
    }
  }
}

function codegenTupleConstructor(
  name: string,
  types: Array<string>,
  sizes: Array<number>,
): SExp {
  const funcE = exp('func', sys(name));

  for (let i = 0; i < types.length; i++) {
    funcE.push(exp('param', types[i]));
  }
  funcE.push(exp('result', 'i32'));

  const offset = wat('offset');
  funcE.push(exp('local', wat('offset'), 'i32'));

  funcE.push(...codegenMemoryAllocation(sizes.reduce((x, y) => x + y)));
  funcE.push(exp('set_local', offset));
  funcE.push(exp('get_local', offset)); // this becomes return value

  for (let i = 0; i < types.length; i++) {
    funcE.push(exp('get_local', offset));
    funcE.push(exp('get_local', String(i)));
    funcE.push(exp(`${types[i]}.store`));

    // calculate next offset
    funcE.push(exp('get_local', offset));
    funcE.push(exp('i32.const', String(sizes[i])));
    funcE.push(exp('i32.add'));
    funcE.push(exp('set_local', offset));
  }

  return funcE;
}

function getTupleIdx(expr: a.IndexExpr): number {
  // The index of a tuple expr should be an int literal
  const idxLit: a.IntLit = expr.value.index.value as any;
  return idxLit.parsedValue;
}

function* codegenTupleAddr(
  target: a.Expr<any>,
  idx: number,
  ctx: CodegenContext,
): Iterable<SExp> {
  yield* codegenExpr(target, ctx);

  const tupleTy = target.type! as a.TupleType;

  let offset = 0;
  for (let i = 0; i < idx; i++) {
    offset += getByteSizeOfType(tupleTy.value.items[i]);
  }
  yield exp('i32.const', String(offset));
  yield exp('i32.add');
}

function* codegenArrayAddr(
  target: a.Expr<any>,
  index: a.Expr<any>,
  byteSize: number,
  ctx: CodegenContext,
): Iterable<SExp> {
  yield* codegenExpr(target, ctx);
  yield exp('i32.const', '4');
  yield exp('i32.add');
  yield* codegenExpr(index, ctx);
  yield exp('i32.const', String(byteSize));
  yield exp('i32.mul');
  yield exp('i32.add');
}

function* codegenIndexExpr(
  expr: a.IndexExpr,
  ctx: CodegenContext,
): Iterable<SExp> {
  const target = expr.value.target;
  if (target.type instanceof a.ArrayType) {
    const byteSize = getByteSizeOfType(target.type.value);
    yield* codegenArrayAddr(target, expr.value.index, byteSize, ctx);
    const ty = codegenType(target.type.value, ctx);
    yield exp(`${ty}.load`);
  } else if (target.type instanceof a.TupleType) {
    const idx = getTupleIdx(expr);
    yield* codegenTupleAddr(target, idx, ctx);
    const ty = codegenType(target.type.value.items[idx], ctx);
    yield exp(`${ty}.load`);
  }
}

function* codegenNewExpr(expr: a.NewExpr, ctx: CodegenContext): Iterable<SExp> {
  const size = getByteSizeOfType(expr.value.type);
  yield* codegenExpr(expr.value.length, ctx);
  yield exp('set_global', sys('reg/i32/1'));
  yield exp('get_global', sys('reg/i32/1'));
  yield exp('get_global', sys('reg/i32/1'));
  yield exp('i32.const', String(size));
  yield exp('i32.mul');
  yield exp('i32.const', '4');
  yield exp('i32.add');

  yield* codegenMemoryAllocation();
  yield exp('set_global', sys('reg/addr'));
  yield exp('get_global', sys('reg/addr'));
  yield* codegenSwapStackTop('i32');
  yield exp('i32.store');

  yield exp('get_global', sys('reg/addr'));
}

function codegenLoopExpr(expr: a.LoopExpr, ctx: CodegenContext): SExp {
  const { loop, block } = ctx.enterLoop();

  return exp(
    'block',
    wat(block),
    exp(
      'loop',
      wat(loop),
      ...codegenExpr(expr.value.while, ctx),
      exp(
        'if',
        exp(
          'then',
          ...codegenBlock(expr.value.body, false, ctx),
          exp('br', wat(loop)),
        ),
      ),
    ),
  );
}

function* codegenLocalVarDef(
  block: a.Block,
  ctx: CodegenContext,
): Iterable<SExp> {
  for (const body of block.value.bodies) {
    if (body instanceof a.Decl) {
      const origName = body.value.name.value;
      const expr = body.value.expr;

      // ignore function alias
      if (expr instanceof a.IdentExpr && expr.type instanceof a.FuncType) {
        continue;
      }

      const name = ctx.convertLocalName(origName);
      yield exp('local', wat(name), codegenType(expr.type!, ctx));
    } else if (body instanceof a.CondExpr) {
      ctx.enterBlock();
      yield* codegenLocalVarDef(body.value.then, ctx);
      ctx.leaveBlock();
      ctx.enterBlock();
      yield* codegenLocalVarDef(body.value.else, ctx);
      ctx.leaveBlock();
    } else if (body instanceof a.LoopExpr) {
      ctx.enterBlock();
      yield* codegenLocalVarDef(body.value.body, ctx);
      ctx.leaveBlock();
    }
  }
}

function* codegenLocalVarDecl(
  decl: a.Decl,
  ctx: CodegenContext,
): Iterable<SExp> {
  const origName = decl.value.name.value;
  const expr = decl.value.expr;

  if (expr instanceof a.IdentExpr && expr.type instanceof a.FuncType) {
    ctx.pushAlias(origName, ctx.getGlobalWATName(expr.value.value)!);
  } else {
    yield* codegenExpr(expr, ctx);
    const name = ctx.pushName(origName);
    yield exp('set_local', wat(name));
  }
}

function codegenGlobalVar(decl: a.Decl, ctx: CodegenContext): SExp {
  const name = ctx.pushName(decl.value.name.value);

  const varE = exp('global', wat(name));
  const expr = decl.value.expr;
  varE.push(exp('mut', codegenType(expr.type!, ctx)));
  if (expr instanceof a.LitExpr) {
    varE.push(...codegenLiteral(expr.value, ctx));
  } else {
    varE.push(codegenInitialValForType(expr.type!, ctx));
    ctx.pushInitializer(name, expr);
  }

  return varE;
}

function* codegenAssign(assign: a.Assign, ctx: CodegenContext): Iterable<SExp> {
  yield* codegenExpr(assign.value.expr, ctx);

  const lVal = assign.value.lVal;
  if (lVal instanceof a.IdentExpr) {
    // ident
    const ident = lVal.value;
    let name = ctx.getLocalWATName(ident.value);
    if (name) {
      yield exp('set_local', wat(name));
    } else {
      name = ctx.getGlobalWATName(ident.value)!;
      yield exp('set_global', wat(name));
    }
  } else {
    // index expr
    const target = lVal.value.target;
    if (target.type instanceof a.ArrayType) {
      const byteSize = getByteSizeOfType(target.type.value);
      yield* codegenArrayAddr(target, lVal.value.index, byteSize, ctx);
      const ty = codegenType(target.type.value, ctx);
      yield* codegenSwapStackTop('i32', ty);
      yield exp(`${ty}.store`);
    } else if (target.type instanceof a.TupleType) {
      const idx = getTupleIdx(lVal);
      yield* codegenTupleAddr(target, idx, ctx);
      const ty = codegenType(target.type.value.items[idx], ctx);
      yield* codegenSwapStackTop('i32', ty);
      yield exp(`${ty}.store`);
    }
  }
}

function codegenBreak(break_: a.Break, ctx: CodegenContext): SExp {
  const { block } = ctx.currentLoopLabel;
  return exp('br', wat(block));
}
