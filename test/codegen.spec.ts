import chalk from 'chalk';
import { tokenize } from '../src/lexer/';
import { parse } from '../src/parser/';
import { desugarBefore, desugarAfter } from '../src/desugarer/';
import { typeCheck, TypeContext } from '../src/typechecker/';
import { genWASM } from '../src/codegen/';
import { Compose } from '../src/util';
import { runWASM } from '../src/wasm';

console.log(chalk.bold('Running codegen tests...'));

const compile = Compose.then(tokenize)
  .then(parse)
  .then(desugarBefore)
  .then(mod => typeCheck(mod, new TypeContext()))
  .then(desugarAfter)
  .then(mod => genWASM(mod, 'test')).f;

async function moduleRunTest(moduleStr: string, expected: any): Promise<void> {
  try {
    const wasmModule = compile(moduleStr);
    const result = await runWASM(wasmModule, 'test');
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

console.log(chalk.green.bold('Passed!'));
