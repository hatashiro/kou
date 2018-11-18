import { deepEqual } from 'assert';
import chalk from 'chalk';
import { tokenize } from '../src/lexer/';
import { parse } from '../src/parser/';
import { desugarBefore, desugarAfter } from '../src/desugarer/';
import { typeCheck } from '../src/typechecker/';
import { TypeContext } from '../src/typechecker/context';
import { genWASM } from '../src/codegen/';
import { Compose } from '../src/util';
import { runWASM, WASMResult } from '../src/wasm';

console.log(chalk.bold('Running codegen tests...'));

const memorySize = 4; // 4MiB

const compile = Compose.then(tokenize)
  .then(parse)
  .then(desugarBefore)
  .then(mod => typeCheck(mod, new TypeContext()))
  .then(desugarAfter)
  .then(mod => genWASM(mod, { exports: ['test'], memorySize })).f;

async function moduleRunTest(
  moduleStr: string,
  expected: any,
  resultHandler: (result: WASMResult) => any = result => result.value,
): Promise<void> {
  try {
    const wasmModule = compile(moduleStr);
    const result = await runWASM(wasmModule, { main: 'test', memorySize });
    deepEqual(resultHandler(result), expected);
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

const s2i = (slice: ArrayBuffer) => new Int32Array(slice)[0];
const s2f = (slice: ArrayBuffer) => new Float64Array(slice)[0];

const tuple = (...sizes: Array<number>) => ({ value, memory }: WASMResult) => {
  let offset = value;
  return sizes.map(size => {
    const slice = memory.buffer.slice(offset, offset + size);
    let value;
    if (size === 8) {
      // must be float
      value = s2f(slice);
    } else {
      // must be 4, read as int32
      value = s2i(slice);
    }
    offset += size;
    return value;
  });
};

moduleRunTest(
  `
let test = fn () (int, float, bool) {
  (1, 1.5, true)
}
  `,
  [1, 1.5, 1],
  tuple(4, 8, 4),
);

moduleRunTest(
  `
let test = fn () () {
  ()
}
  `,
  0,
);

moduleRunTest(
  `
let f1 = fn () () {
  ()
}

let f2 = fn (x bool) bool {
  !x
}

let test = fn () ((), bool) {
  ();
  ();
  (1, 2);
  (f1(), f2(false))
}
  `,
  [0, 1],
  tuple(4, 4),
);

moduleRunTest(
  `
let test = fn () float {
  (1, 1.5, true)[1]
}
  `,
  1.5,
);

moduleRunTest(
  `
let test = fn () int {
  int((1, 3.5, true)[1])
}
  `,
  3,
);

moduleRunTest(
  `
let test = fn () int {
  let x = (1, (2, (3, 4), 5), 6, (7, 8));
  x[1][1][1]
}
  `,
  4,
);

moduleRunTest(
  `
let test = fn () (float, float) {
  let x = (1, 1.5, (2.5, false, (), 0), 3.5);
  let y = (2.5, false);
  (x[2][0] - float(x[0]), y[0] + float(x[2][3]))
}
  `,
  [1.5, 2.5],
  tuple(8, 8),
);

moduleRunTest(
  `
let test = fn () int {
  let x = 1234.;
  int(x)
}
  `,
  1234,
);

moduleRunTest(
  `
let test = fn () float {
  let x = 1234;
  float(x)
}
  `,
  1234,
);

moduleRunTest(
  `
let test = fn () int {
  let x = 1;
  x = x + 10;
  let y = 2;
  x = x + 2 * y;
  x
}
  `,
  15,
);

moduleRunTest(
  `
let g = 10

let test = fn () int {
  let x = 1;
  x = x + 10;
  let y = 2;
  x = x + 2 * y;
  g = x + g;
  g
}
  `,
  25,
);

moduleRunTest(
  `
let g = (10, 20., 30)

let test = fn () int {
  g[0] = 0;
  g[1] = float(g[0]) + float(g[2]);
  int(g[1]) + g[2]
}
  `,
  60,
);

const array = (size: number) => ({ value, memory }: WASMResult) => {
  let offset = value;

  const len = s2i(memory.buffer.slice(offset, offset + 4));
  if (size === 8) {
    // must be float
    return Array.from(
      new Float64Array(memory.buffer.slice(offset + 4, offset + 4 + 8 * len)),
    );
  } else {
    // must be 4, read as int32
    return Array.from(
      new Int32Array(memory.buffer.slice(offset + 4, offset + 4 + 4 * len)),
    );
  }
};

moduleRunTest(
  `
let test = fn () [int] {
  [1, 2, 3]
}
  `,
  [1, 2, 3],
  array(4),
);

moduleRunTest(
  `
let test = fn () [bool] {
  [true, false, true, true]
}
  `,
  [1, 0, 1, 1],
  array(4),
);

moduleRunTest(
  `
let test = fn () [float] {
  [1.5, 2.4, 3.3, 4.2, 5.1]
}
  `,
  [1.5, 2.4, 3.3, 4.2, 5.1],
  array(8),
);

moduleRunTest(
  `
let test = fn () float {
  [1.5, 2.4, 3.3, 4.2, 5.1][2]
}
  `,
  3.3,
);

moduleRunTest(
  `
let test = fn () float {
  [[1.5, 2.4], [3.3, 4.2, 5.1]][1][2]
}
  `,
  5.1,
);

moduleRunTest(
  `
let test = fn () float {
  let x = [1.5, 2.4, 3.3, 4.2, 5.1];
  x[2] = x[1] + x[3];
  x[2]
}
  `,
  6.6,
);

moduleRunTest(
  `
let test = fn () [float] {
  let x = [[1.5, 2.4], [3.3, 4.2, 5.1]];
  x[1] = x[0];
  x[1]
}
  `,
  [1.5, 2.4],
  array(8),
);

console.log(chalk.green.bold('Passed!'));
