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
  const wasmModule = compile(moduleStr);
  const result = await runWASM(wasmModule, 'test');

  if (result !== expected) {
    console.error(chalk.blue.bold('Test:'));
    console.error(moduleStr);
    console.error();
    console.error(chalk.red.bold('Error:'));
    console.error(`expected ${expected}, but the result was ${result}`);
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

console.log(chalk.green.bold('Passed!'));
