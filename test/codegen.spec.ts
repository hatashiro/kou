import chalk from 'chalk';
import { tokenize } from '../src/lexer/';
import { parse } from '../src/parser/';
import { desugarBefore, desugarAfter } from '../src/desugarer/';
import { typeCheck } from '../src/typechecker/';
import { TypeContext } from '../src/typechecker/context';
import { genWASM } from '../src/codegen/';
import { Compose } from '../src/util';
import { runWASM } from '../src/wasm';

console.log(chalk.bold('Running codegen tests...'));

const memorySize = 4; // 4MiB

const compile = Compose.then(tokenize)
  .then(parse)
  .then(desugarBefore)
  .then(mod => typeCheck(mod, new TypeContext()))
  .then(desugarAfter)
  .then(mod => genWASM(mod, { exports: ['test'], memorySize })).f;

async function moduleRunTest(moduleStr: string, expected: any): Promise<void> {
  try {
    const wasmModule = compile(moduleStr);
    const result = await runWASM(wasmModule, { main: 'test', memorySize });
    if (result !== expected) {
      throw new Error(`expected ${expected}, but the result was ${result}`);
    }
  } catch (err) {
    console.error(chalk.blue.bold('Test:'));
    console.error(moduleStr);
    console.error();
    console.error(chalk.red.bold('Error:'));
    console.error(err.message);
    process.exit(1);
  }
}

moduleRunTest(
  `
let test = fn () float {
  1234.
}
`,
  1234,
);

moduleRunTest(
  `
let test = fn () void {
  1234.;
}
`,
  undefined,
);

moduleRunTest(
  `
let test = fn () int {
  1234
}
`,
  1234,
);

moduleRunTest(
  `
let test = fn () bool {
  true
}
`,
  1,
);

moduleRunTest(
  `
let test = fn () char {
  '\\n'
}
`,
  '\n'.codePointAt(0),
);

moduleRunTest(
  `
let test = fn () int {
  let x = 1234;
  x
}
`,
  1234,
);

moduleRunTest(
  `
let test = fn () int {
  let x = 1234;
  x;
  let y = 123;
  y
}
`,
  123,
);

moduleRunTest(
  `
let x = 1234
let y = 123
let test = fn () int {
  x;
  y
}
`,
  123,
);

moduleRunTest(
  `
let test_impl = fn () int {
  let x = 1234;
  x;
  let y = 123;
  y
}

let test = test_impl
`,
  123,
);

moduleRunTest(
  `
let test_impl = fn (x float) float {
  1234;
  x
}

let test = fn () float {
  test_impl(123.)
}
`,
  123,
);

moduleRunTest(
  `
let test_impl = fn (x float, y int) int {
  x;
  y
}

let test = fn () int {
  test_impl(123., test_impl(123., 1234))
}
`,
  1234,
);

moduleRunTest(
  `
let test_impl = fn (x float, y int) int {
  x;
  y
}

let test = fn () int {
  let f = test_impl;
  let g = f;
  g(123., f(123., 1234))
}
`,
  1234,
);

moduleRunTest(
  `
let test_impl = fn (x float, y int) int {
  x;
  y
}

let x = test_impl(123., 1234)

let test = fn () int {
  x
}
`,
  1234,
);

moduleRunTest(
  `
let test = fn () int {
  -100
}
`,
  -100,
);

moduleRunTest(
  `
let test = fn () float {
  +100.123
}
`,
  100.123,
);

moduleRunTest(
  `
let test = fn () float {
  -100.123
}
`,
  -100.123,
);

moduleRunTest(
  `
let test = fn () bool {
  !false
}
`,
  1,
);

moduleRunTest(
  `
let test = fn () bool {
  !true
}
`,
  0,
);

moduleRunTest(
  `
let a = 1234.
let f = fn () float {
  a;
  123.
}
let id = fn (x float) float { x }
let c = fn (b bool) float {
  let x = 1.23;
  if (!b) {
    let x = a;
    x
  } else {
    let y = x;
    let x = y;
    let f = id;
    f(x)
  }
}
let test = fn () float {
  c(false);
  c(true)
}
`,
  1.23,
);

moduleRunTest(
  `
let test = fn () bool {
  1234 == 1234
}
`,
  1,
);

moduleRunTest(
  `
let test = fn () bool {
  1234. == 1234.
}
`,
  1,
);

moduleRunTest(
  `
let test = fn () bool {
  'a' != 'a'
}
`,
  0,
);

moduleRunTest(
  `
let test = fn () bool {
  'a' < 'b'
}
`,
  1,
);

moduleRunTest(
  `
let test = fn () bool {
  'a' <= 'a'
}
`,
  1,
);

moduleRunTest(
  `
let test = fn () bool {
  1.234 > 12.34
}
`,
  0,
);

moduleRunTest(
  `
let test = fn () bool {
  1234 >= 1235
}
`,
  0,
);

moduleRunTest(
  `
let test = fn () int {
  1234 + 5678
}
`,
  6912,
);

moduleRunTest(
  `
let test = fn () float {
  1234. + .5678
}
`,
  1234.5678,
);

moduleRunTest(
  `
let test = fn () int {
  1234 - 5678 + 1
}
`,
  -4443,
);

moduleRunTest(
  `
let test = fn () float {
  1234. - 5678. + 1.
}
`,
  -4443,
);

moduleRunTest(
  `
let test = fn () int {
  1234 ^ 5678
}
`,
  4860,
);

moduleRunTest(
  `
let test = fn () int {
  1234 | 5678
}
`,
  5886,
);

moduleRunTest(
  `
let test = fn () int {
  1234 & 5678
}
`,
  1026,
);

moduleRunTest(
  `
let test = fn () int {
  1234 * 5678
}
`,
  7006652,
);

moduleRunTest(
  `
let test = fn () float {
  1234. * 5678.
}
`,
  7006652,
);

moduleRunTest(
  `
let test = fn () int {
  -5678 / 1234
}
`,
  -4,
);

moduleRunTest(
  `
let test = fn () float {
  4. / -2.
}
`,
  -2,
);

moduleRunTest(
  `
let test = fn () int {
  1234 % 123
}
`,
  4,
);

moduleRunTest(
  `
let test = fn () int {
  -1234 % -123
}
`,
  -4,
);

moduleRunTest(
  `
let test = fn () bool {
  false && true
}
`,
  0,
);

moduleRunTest(
  `
let test = fn () bool {
  true && (1 == 1)
}
`,
  1,
);

moduleRunTest(
  `
let test = fn () bool {
  true || false
}
`,
  1,
);

moduleRunTest(
  `
let fac = fn (n int) int {
  if n == 1 {
    1
  } else {
    n * fac(n - 1)
  }
}

let test = fn () int {
  fac(10)
}
`,
  3628800,
);

console.log(chalk.green.bold('Passed!'));
