import chalk from 'chalk';
import * as a from '../src/parser/ast';
import { tokenize } from '../src/lexer/';
import { parse } from '../src/parser/';
import { desugarBefore } from '../src/desugarer/';
import { Compose } from '../src/util';
import {
  checkExprType,
  checkBlockType,
  assertType,
  typeCheck,
} from '../src/typechecker/';
import { TypeContext } from '../src/typechecker/context';
import { TypeError } from '../src/typechecker/error';

console.log(chalk.bold('Running typechecker tests...'));

// complex type constructors
const tupleType = (v: a.Tuple<a.Type<any>>) => new a.TupleType(v, -1, -1);
const arrayType = (v: a.Type<any>) => new a.ArrayType(v, -1, -1);
const funcType = (v: { param: a.Type<any>; return: a.Type<any> }) =>
  new a.FuncType(v, -1, -1);

const compileAST = Compose.then(tokenize)
  .then(parse)
  .then(desugarBefore).f;

function exprTypeTest(
  exprStr: string,
  ctx: TypeContext,
  expectedType: a.Type<any>,
  shouldThrow?: string,
) {
  const moduleStr = `let x = ${exprStr}`;

  function failWith(errMsg: string) {
    console.error(chalk.blue.bold('Test:'));
    console.error(exprStr);
    console.error();
    console.error(chalk.red.bold('Error:'));
    console.error(errMsg);
    process.exit(1);
  }

  try {
    const mod = compileAST(moduleStr);
    const actualType = checkExprType(mod.value.decls[0].value.expr, ctx);
    assertType(actualType, expectedType);
  } catch (err) {
    if (
      shouldThrow &&
      err instanceof TypeError &&
      err.message.includes(shouldThrow)
    ) {
      return;
    }

    failWith(err);
  }

  if (shouldThrow) {
    failWith(`No error was thrown for '${shouldThrow}'`);
  }
}

function blockTypeTest(
  blockStr: string,
  ctx: TypeContext,
  expectedType: a.Type<any>,
) {
  const moduleStr = `let x = fn () ${expectedType.name} ${blockStr}`;
  try {
    const mod = compileAST(moduleStr);
    const fn = mod.value.decls[0].value.expr as a.FuncExpr;
    const actualType = checkBlockType(fn.value.body, ctx);
    assertType(actualType, expectedType);
  } catch (err) {
    console.error(chalk.blue.bold('Test:'));
    console.error(blockStr);
    console.error();
    console.error(chalk.red.bold('Error:'));
    console.error(err);
    process.exit(1);
  }
}

function ctx(obj: Array<{ [name: string]: a.Type<any> }> = []): TypeContext {
  const ctx = new TypeContext();
  for (const scopeObj of obj) {
    Object.keys(scopeObj).forEach(name =>
      ctx.push({ ident: new a.Ident(name, -1, -1), type: scopeObj[name] }),
    );
  }
  return ctx;
}

// literal
exprTypeTest('123', ctx(), new a.IntType(0, 0));
exprTypeTest('.123', ctx(), new a.FloatType(0, 0));
exprTypeTest('"hello, world"', ctx(), new a.StrType(0, 0));
exprTypeTest('true', ctx(), new a.BoolType(0, 0));
exprTypeTest('false', ctx(), new a.BoolType(0, 0));
exprTypeTest("'\\n'", ctx(), new a.CharType(0, 0));

// ident
exprTypeTest(
  'some_ident',
  ctx([{ some_ident: a.IntType.instance }]),
  a.IntType.instance,
);
exprTypeTest(
  'some_ident',
  ctx([
    {},
    { other_ident: a.FloatType.instance },
    { some_ident: a.IntType.instance },
    {},
  ]),
  a.IntType.instance,
);
exprTypeTest(
  'some_ident',
  ctx([
    {},
    { one_ident: a.IntType.instance },
    { some_ident: a.StrType.instance },
    {},
  ]),
  a.StrType.instance,
);
exprTypeTest(
  'invalid_ident',
  ctx([
    {},
    { one_ident: a.IntType.instance },
    { some_ident: a.StrType.instance },
    {},
  ]),
  a.StrType.instance,
  'undefined identifier: found invalid_ident',
);

// tuple
exprTypeTest(
  '(123, hello, true)',
  ctx([{ hello: a.StrType.instance }]),
  tupleType({
    size: 3,
    items: [a.IntType.instance, a.StrType.instance, a.BoolType.instance],
  }),
);
exprTypeTest(
  '(123, hello, false)',
  ctx([{ hello: a.StrType.instance }]),
  tupleType({
    size: 4,
    items: [
      a.IntType.instance,
      a.StrType.instance,
      a.BoolType.instance,
      a.CharType.instance,
    ],
  }),
  'Tuple length mismatch: expected (int, str, bool, char), found (int, str, bool)',
);
exprTypeTest(
  '(1234, hello, true)',
  ctx([{ hello: a.StrType.instance }]),
  tupleType({
    size: 3,
    items: [a.IntType.instance, a.CharType.instance, a.BoolType.instance],
  }),
  'Type mismatch: expected (int, char, bool), found (int, str, bool)',
);

// array
exprTypeTest('[1, 2, 3, 4]', ctx(), arrayType(a.IntType.instance));
exprTypeTest('[]', ctx(), arrayType(a.IntType.instance));
exprTypeTest('[]', ctx(), arrayType(a.StrType.instance));
exprTypeTest(
  '[[1], [2, 3, 4], []]',
  ctx(),
  arrayType(arrayType(a.IntType.instance)),
);
exprTypeTest(
  '[some_ident, 4]',
  ctx([{ some_ident: a.IntType.instance }]),
  arrayType(a.IntType.instance),
);
exprTypeTest(
  '[some_ident, 4]',
  ctx([{ some_ident: a.IntType.instance }]),
  arrayType(a.StrType.instance),
  'Type mismatch: expected [str], found [int]',
);
exprTypeTest(
  '[some_ident, "str", 4]',
  ctx([{ some_ident: a.IntType.instance }]),
  arrayType(a.IntType.instance),
  'Type mismatch: expected int, found str',
);

// function
exprTypeTest(
  'fn (a int) bool { true }',
  ctx(),
  funcType({
    param: a.IntType.instance,
    return: a.BoolType.instance,
  }),
);
exprTypeTest(
  'fn (a int, b str) bool { true }',
  ctx(),
  funcType({
    param: tupleType({
      size: 2,
      items: [a.IntType.instance, a.StrType.instance],
    }),
    return: a.BoolType.instance,
  }),
);
exprTypeTest(
  "fn (a int, b str) bool -> char { fn (c bool) char { 'a' } }",
  ctx(),
  funcType({
    param: tupleType({
      size: 2,
      items: [a.IntType.instance, a.StrType.instance],
    }),
    return: funcType({
      param: a.BoolType.instance,
      return: a.CharType.instance,
    }),
  }),
);
exprTypeTest(
  "fn (a str -> int) bool -> char { fn (c bool) char { 'a' } }",
  ctx(),
  funcType({
    param: funcType({
      param: a.StrType.instance,
      return: a.IntType.instance,
    }),
    return: funcType({
      param: a.BoolType.instance,
      return: a.CharType.instance,
    }),
  }),
);
exprTypeTest(
  "fn (a float, b str -> int) bool -> char { fn (c bool) char { 'a' } }",
  ctx(),
  funcType({
    param: tupleType({
      size: 2,
      items: [
        a.FloatType.instance,
        funcType({
          param: a.StrType.instance,
          return: a.IntType.instance,
        }),
      ],
    }),
    return: funcType({
      param: a.BoolType.instance,
      return: a.CharType.instance,
    }),
  }),
);
exprTypeTest(
  'fn (a int, b str) bool { false }',
  ctx(),
  funcType({
    param: tupleType({
      size: 2,
      items: [a.CharType.instance, a.StrType.instance],
    }),
    return: a.BoolType.instance,
  }),
  'Type mismatch: expected (char, str) -> bool, found (int, str) -> bool',
);
exprTypeTest(
  "fn (a int, b str) bool -> char { fn (c bool) char { 'a' } }",
  ctx(),
  funcType({
    param: tupleType({
      size: 2,
      items: [a.IntType.instance, a.StrType.instance],
    }),
    return: funcType({
      param: a.BoolType.instance,
      return: a.BoolType.instance,
    }),
  }),
  'Type mismatch: expected (int, str) -> bool -> bool, found (int, str) -> bool -> char',
);
exprTypeTest(
  "fn (a str -> int) bool -> char { fn (c bool) char { 'a' } }",
  ctx(),
  funcType({
    param: funcType({
      param: a.StrType.instance,
      return: a.BoolType.instance,
    }),
    return: funcType({
      param: a.BoolType.instance,
      return: a.CharType.instance,
    }),
  }),
  'Type mismatch: expected (str -> bool) -> bool -> char, found (str -> int) -> bool -> char',
);
exprTypeTest(
  'fn (a int) bool {}',
  ctx(),
  funcType({
    param: a.IntType.instance,
    return: a.BoolType.instance,
  }),
  'Function return type mismatch: expected bool, found void',
);
exprTypeTest(
  'fn (a int) bool { a }',
  ctx(),
  funcType({
    param: a.IntType.instance,
    return: a.BoolType.instance,
  }),
  'Function return type mismatch: expected bool, found int',
);
exprTypeTest(
  'fn (a int) void { a }',
  ctx(),
  funcType({
    param: a.IntType.instance,
    return: a.VoidType.instance,
  }),
  "Function return type mismatch, ';' may be missing: expected void, found int",
);
exprTypeTest(
  'fn (a int) void { a; }',
  ctx(),
  funcType({
    param: a.IntType.instance,
    return: a.VoidType.instance,
  }),
);

// call expr
exprTypeTest('fn (a int, b int) int { a } (1, 2)', ctx(), a.IntType.instance);
exprTypeTest('fn (a str) char { \'a\' } ("hello")', ctx(), a.CharType.instance);
exprTypeTest(
  "fn (a str -> int) bool -> char { fn (c bool) char { 'a' } } (fn (a str) int { 1 })",
  ctx(),
  funcType({
    param: a.BoolType.instance,
    return: a.CharType.instance,
  }),
);
exprTypeTest(
  'f1(f2)',
  ctx([
    {
      f1: funcType({
        param: funcType({
          param: a.StrType.instance,
          return: a.BoolType.instance,
        }),
        return: funcType({
          param: a.BoolType.instance,
          return: a.CharType.instance,
        }),
      }),
      f2: funcType({
        param: a.StrType.instance,
        return: a.BoolType.instance,
      }),
    },
  ]),
  funcType({
    param: a.BoolType.instance,
    return: a.CharType.instance,
  }),
);
exprTypeTest(
  '"i am not callable"(1, \'c\')',
  ctx(),
  a.VoidType.instance,
  'non-callable target: expected function, found str',
);
exprTypeTest(
  "fn (a int, b int) int { a } (1, 'c')",
  ctx(),
  a.IntType.instance,
  'Function parameter type mismatch: expected (int, int), found (int, char)',
);
exprTypeTest(
  "fn (a str) char { 'a' } (.123)",
  ctx(),
  a.CharType.instance,
  'Function parameter type mismatch: expected str, found float',
);

// block
blockTypeTest('{}', ctx(), a.VoidType.instance);
blockTypeTest(
  `
{
  let x = fn () int { x() };
  x()
}
`,
  ctx(),
  a.IntType.instance,
);
blockTypeTest(
  `
{
  f(123);
  let y = f(g);
  h(y)
}
`,
  ctx([
    {
      f: funcType({
        param: a.IntType.instance,
        return: a.BoolType.instance,
      }),
    },
    { g: a.IntType.instance },
    {
      h: funcType({
        param: a.BoolType.instance,
        return: a.CharType.instance,
      }),
    },
  ]),
  a.CharType.instance,
);
blockTypeTest(
  `
{
  f(123);
  let y = f(g);
  h(y);
}
`,
  ctx([
    {
      f: funcType({
        param: a.IntType.instance,
        return: a.BoolType.instance,
      }),
    },
    { g: a.IntType.instance },
    {
      h: funcType({
        param: a.BoolType.instance,
        return: a.CharType.instance,
      }),
    },
  ]),
  a.VoidType.instance,
);

// index expr
exprTypeTest(
  'arr[3]',
  ctx([{ arr: arrayType(a.IntType.instance) }]),
  a.IntType.instance,
);
exprTypeTest('"hello"[3]', ctx(), a.CharType.instance);
exprTypeTest('("hello", false, 123)[0]', ctx(), a.StrType.instance);
exprTypeTest('("hello", false, 123)[1]', ctx(), a.BoolType.instance);
exprTypeTest('("hello", false, 123)[2]', ctx(), a.IntType.instance);
exprTypeTest(
  '("hello", false, 123)[3]',
  ctx(),
  a.VoidType.instance,
  'Tuple index out of range: expected int < 3, found 3',
);
exprTypeTest(
  'arr[no_int]',
  ctx([
    {
      arr: arrayType(a.IntType.instance),
      no_int: a.CharType.instance,
    },
  ]),
  a.IntType.instance,
  'Index type mismatch: expected int, found char',
);
exprTypeTest(
  '"hello"[no_int]',
  ctx([{ no_int: a.CharType.instance }]),
  a.CharType.instance,
  'Index type mismatch: expected int, found char',
);
exprTypeTest(
  '("hello", false, 123)[i]',
  ctx([{ i: a.IntType.instance }]),
  a.VoidType.instance,
  'Invalid tuple index: only int literal is allowed for tuple index: found expr',
);
exprTypeTest(
  '("hello", false, 123)[no_int]',
  ctx([{ no_int: a.CharType.instance }]),
  a.VoidType.instance,
  'Invalid tuple index: only int literal is allowed for tuple index: found expr',
);
exprTypeTest(
  '3[0]',
  ctx(),
  a.VoidType.instance,
  'Indexable type mismatch: expected array, str or tuple, found int',
);

// cond expr
exprTypeTest(
  'if some_bool { 10 } else { 20 }',
  ctx([{ some_bool: a.BoolType.instance }]),
  a.IntType.instance,
);
exprTypeTest(
  'if f(123) { "hello" } else { "world" }',
  ctx([
    {
      f: funcType({ param: a.IntType.instance, return: a.BoolType.instance }),
    },
  ]),
  a.StrType.instance,
);
exprTypeTest(
  'if some_char { 10 } else { 20 }',
  ctx([{ some_char: a.CharType.instance }]),
  a.IntType.instance,
  'Type mismatch: expected bool, found char',
);
exprTypeTest(
  'if some_bool { 10 } else { "hello" }',
  ctx([{ some_bool: a.BoolType.instance }]),
  a.IntType.instance,
  "'else' block should have the same type as 'if' block: expected int, found str",
);
exprTypeTest(
  'if some_bool { } else { "hello" }',
  ctx([{ some_bool: a.BoolType.instance }]),
  a.VoidType.instance,
  "'else' block should have the same type as 'if' block, ';' may be missing: expected void, found str",
);
exprTypeTest(
  'if some_bool { } else { "hello"; }',
  ctx([{ some_bool: a.BoolType.instance }]),
  a.VoidType.instance,
);

// loop expr
exprTypeTest(
  'for x in [1, 2, 3] { f(x) }',
  ctx([
    {
      f: funcType({ param: a.IntType.instance, return: a.BoolType.instance }),
    },
  ]),
  arrayType(a.BoolType.instance),
);
exprTypeTest(
  'for x in [1, 2, 3] { f(x); }',
  ctx([
    {
      f: funcType({ param: a.IntType.instance, return: a.BoolType.instance }),
    },
  ]),
  arrayType(a.VoidType.instance),
);
exprTypeTest(
  'for x in [1, 2, 3] { f(x) }',
  ctx([
    {
      f: funcType({ param: a.CharType.instance, return: a.BoolType.instance }),
    },
  ]),
  arrayType(a.BoolType.instance),
  'Function parameter type mismatch: expected char, found int',
);
exprTypeTest(
  'for x in 123 { f(x) }',
  ctx([
    {
      f: funcType({ param: a.IntType.instance, return: a.BoolType.instance }),
    },
  ]),
  arrayType(a.BoolType.instance),
  'Loop target should be an array: found int',
);

// unary expr
exprTypeTest(
  '+x',
  ctx([
    {
      x: a.IntType.instance,
    },
  ]),
  a.IntType.instance,
);
exprTypeTest(
  '-x',
  ctx([
    {
      x: a.IntType.instance,
    },
  ]),
  a.IntType.instance,
);
exprTypeTest(
  '+x',
  ctx([
    {
      x: a.FloatType.instance,
    },
  ]),
  a.FloatType.instance,
);
exprTypeTest(
  '-x',
  ctx([
    {
      x: a.FloatType.instance,
    },
  ]),
  a.FloatType.instance,
);
exprTypeTest(
  '!x',
  ctx([
    {
      x: a.BoolType.instance,
    },
  ]),
  a.BoolType.instance,
);
exprTypeTest(
  '-x',
  ctx([
    {
      x: a.BoolType.instance,
    },
  ]),
  a.BoolType.instance,
  "Operand type mismatch for '-': expected int or float, found bool",
);
exprTypeTest(
  '!x',
  ctx([
    {
      x: a.IntType.instance,
    },
  ]),
  a.IntType.instance,
  "Operand type mismatch for '!': expected bool, found int",
);

// binary expr
// eq op
exprTypeTest('1 == 1', ctx(), a.BoolType.instance);
exprTypeTest('"hello" != "hello"', ctx(), a.BoolType.instance);
exprTypeTest(
  '"hello" == 3',
  ctx(),
  a.BoolType.instance,
  "Right-hand operand type mismatch for '==': expected str, found int",
);
// comp op
exprTypeTest('3.5 > .0', ctx(), a.BoolType.instance);
exprTypeTest("'c' > 'a'", ctx(), a.BoolType.instance);
exprTypeTest(
  "'c' < 3",
  ctx(),
  a.BoolType.instance,
  "Right-hand operand type mismatch for '<': expected char, found int",
);
exprTypeTest(
  'fn () void {} <= 3',
  ctx(),
  a.BoolType.instance,
  "Left-hand operand type mismatch for '<=': expected int, float, bool, char or str, found () -> void",
);
// add & mul op
exprTypeTest('3 + 0', ctx(), a.IntType.instance);
exprTypeTest('3 * 123 / 13', ctx(), a.IntType.instance);
exprTypeTest('3.5 + .0', ctx(), a.FloatType.instance);
exprTypeTest('3.5 * .0 / 1.0', ctx(), a.FloatType.instance);
exprTypeTest(
  '3.5 * 1 / 1.0',
  ctx(),
  a.FloatType.instance,
  "Right-hand operand type mismatch for '*': expected float, found int",
);
exprTypeTest(
  '"4" | 1',
  ctx(),
  a.IntType.instance,
  "Left-hand operand type mismatch for '|': expected int, found str",
);
// bool op
exprTypeTest('true && false', ctx(), a.BoolType.instance);
exprTypeTest('true || false', ctx(), a.BoolType.instance);
exprTypeTest(
  '.1 || false',
  ctx(),
  a.BoolType.instance,
  "Left-hand operand type mismatch for '||': expected bool, found float",
);
exprTypeTest(
  'true && 1',
  ctx(),
  a.BoolType.instance,
  "Right-hand operand type mismatch for '&&': expected bool, found int",
);

function typeCheckTest(
  program: string,
  context: TypeContext,
  shouldThrow?: string,
) {
  function failWith(errMsg: string) {
    console.error(chalk.blue.bold('Test:'));
    console.error(program);
    console.error();
    console.error(chalk.red.bold('Error:'));
    console.error(errMsg);
    process.exit(1);
  }

  try {
    typeCheck(compileAST(program), context);
  } catch (err) {
    if (
      shouldThrow &&
      err instanceof TypeError &&
      err.message.includes(shouldThrow)
    ) {
      return;
    }

    failWith(err);
  }

  if (shouldThrow) {
    failWith(`No error was thrown for '${shouldThrow}'`);
  }
}

typeCheckTest(
  `
let main = fn () void {
  print("hello, world!");
}
`,
  ctx([
    {
      print: funcType({
        param: a.StrType.instance,
        return: a.VoidType.instance,
      }),
    },
  ]),
);

typeCheckTest(
  `
let fac = fn (n int) int {
  if (n == 1) {
    1
  } else {
    n * fac(n - 1)
  }
}

let main = fn () void {
  print(i2s(fac(10)));
}
`,
  ctx([
    {
      print: funcType({
        param: a.StrType.instance,
        return: a.VoidType.instance,
      }),
      i2s: funcType({ param: a.IntType.instance, return: a.StrType.instance }),
    },
  ]),
);

typeCheckTest(
  `
let fac = fn (n int) int {
  if (n == 1) {
    1
  } else {
    n * fac(n - 1)
  }
}

let print_int = fn (n int) void {
  print(i2s(n))
}

let main = fn () void {
  print_int(fac(10))
}
`,
  ctx([
    {
      print: funcType({
        param: a.StrType.instance,
        return: a.VoidType.instance,
      }),
      i2s: funcType({ param: a.IntType.instance, return: a.StrType.instance }),
    },
  ]),
);

typeCheckTest(
  `
let fac = fn (n int) int {
  if (n == 1) {
    1
  } else {
    n * fac(n - 1)
  }
}

let print_int = fn (n int, blah str) void {
  print(i2s(n))
}

let main = fn () void {
  print_int(fac(10))
}
`,
  ctx([
    {
      print: funcType({
        param: a.StrType.instance,
        return: a.VoidType.instance,
      }),
      i2s: funcType({ param: a.IntType.instance, return: a.StrType.instance }),
    },
  ]),
  'Function parameter type mismatch: expected (int, str), found int at 15:13',
);

// no void decl tests
typeCheckTest(
  `
let f = fn () void {}
let x: void = f()
`,
  ctx(),
  'A decl type cannot contain void: found void at 3:1',
);
typeCheckTest(
  `
let f = fn () void {}
let x = f()
`,
  ctx(),
  'A decl type cannot contain void: found void at 3:1',
);
typeCheckTest(
  `
let f = fn () void {}
let x = (1, f())
`,
  ctx(),
  'A decl type cannot contain void: found (int, void) at 3:1',
);
typeCheckTest(
  `
let f = fn () void {}
let x = (1, ("hello", f(), false))
`,
  ctx(),
  'A decl type cannot contain void: found (int, (str, void, bool)) at 3:1',
);
typeCheckTest(
  `
let f = fn () void {}
let x = [f()]
`,
  ctx(),
  'A decl type cannot contain void: found [void] at 3:1',
);
typeCheckTest(
  `
let f = fn () void {
  let x: void = f()
}
`,
  ctx(),
  'A decl type cannot contain void: found void at 3:3',
);
typeCheckTest(
  `
let f = fn () void {
  let x = f()
}
`,
  ctx(),
  'A decl type cannot contain void: found void at 3:3',
);
typeCheckTest(
  `
let f = fn () void {
  let x = (1, f())
}
`,
  ctx(),
  'A decl type cannot contain void: found (int, void) at 3:3',
);
typeCheckTest(
  `
let f = fn () void {
  let x = (1, ("hello", f(), false))
}
`,
  ctx(),
  'A decl type cannot contain void: found (int, (str, void, bool)) at 3:3',
);
typeCheckTest(
  `
let f = fn () void {
  let x = [f()]
}
`,
  ctx(),
  'A decl type cannot contain void: found [void] at 3:3',
);

// Assignments
typeCheckTest(
  `
let f = fn () void {
  let x = 10;
  x = 2;
}
  `,
  ctx(),
);
typeCheckTest(
  `
let f = fn () void {
  let x = 10;
  x = 1.0;
}
  `,
  ctx(),
  'Type mismatch: expected int, found float',
);
typeCheckTest(
  `
let f = fn () void {
  let x = (10, true);
  x[1] = false;
}
  `,
  ctx(),
);
typeCheckTest(
  `
let f = fn () void {
  let x = (10, true);
  x[1] = "hi";
}
  `,
  ctx(),
  'Type mismatch: expected bool, found str',
);
typeCheckTest(
  `
let f = fn () void {
  let x = (10, true);
  let y = 1;
  x[y] = "hi";
}
  `,
  ctx(),
  'Invalid tuple index: only int literal is allowed for tuple index: found expr',
);
typeCheckTest(
  `
let f = fn () void {
  let x = [1, 2, 3];
  x[1] = 1234;
}
  `,
  ctx(),
);
typeCheckTest(
  `
let f = fn () void {
  let x = [1, 2, 3];
  x[1] = true;
}
  `,
  ctx(),
  'Type mismatch: expected int, found bool',
);

// new expr
exprTypeTest('new int[10]', ctx(), arrayType(a.IntType.instance));
exprTypeTest(
  'new int[len]',
  ctx([{ len: a.IntType.instance }]),
  arrayType(a.IntType.instance),
);
exprTypeTest(
  'new int[int(f)]',
  ctx([{ f: a.FloatType.instance }]),
  arrayType(a.IntType.instance),
);
exprTypeTest(
  'new int[c]',
  ctx([{ c: a.CharType.instance }]),
  arrayType(a.IntType.instance),
  'Length type mismatch: expected int, found char',
);

console.log(chalk.green.bold('Passed!'));
