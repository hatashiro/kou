import chalk from 'chalk';
import * as yargs from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import { tokenize } from './lexer';
import { parse } from './parser';
import { desugarBefore, desugarAfter } from './desugarer';
import { typeCheck } from './typechecker';
import { TypeContext } from './typechecker/context';
import { Compose } from './util';
import { genWAT, genWASM } from './codegen';
import { exitWithErrors, reportCompileError } from './report-error';

interface Argv {
  wat: boolean;
  out: string | null;
  export: string;
  source: string;
}

function main(argv: Argv) {
  const exports = argv.export.split(',').map(e => e.trim());
  const compile = Compose.then(tokenize)
    .then(parse)
    .then(desugarBefore)
    .then(mod => typeCheck(mod, new TypeContext()))
    .then(desugarAfter)
    .then(mod => (argv.wat ? genWAT(mod, exports) : genWASM(mod, exports))).f;

  const sourcePath = resolve(argv.source);

  let input: string;
  try {
    input = readFileSync(sourcePath, 'utf-8');
  } catch (err) {
    return exitWithErrors([
      `Cannot open input file: ${sourcePath}`,
      '',
      chalk.red(err.message),
    ]);
  }

  let output: string | Buffer;
  try {
    output = compile(input);
  } catch (err) {
    return reportCompileError(input, err);
  }

  // prettify a little
  if (typeof output === 'string') {
    output = output.replace(/ \)/g, ')').replace(/\( /g, '(');
  }

  if (argv.out) {
    writeFileSync(argv.out, output);
    console.log(chalk.green('Build succeeded!'));
  } else {
    console.log();
    console.log(
      Buffer.isBuffer(output) ? require('hexy').hexy(output) : output,
    );
  }
}

main(yargs
  .usage('$0 [args] <source>', 'kou Programming Language Compiler')
  .help()
  .option('wat', {
    desc: 'Output wat insteadof wasm',
    type: 'boolean',
    default: false,
  })
  .option('out', {
    alias: 'o',
    desc: 'Output file name, stdout if null',
    type: 'string',
    default: null,
  })
  .option('export', {
    alias: 'e',
    desc: 'Comma-separated list of export names',
    type: 'string',
    default: 'main',
  }).argv as any);
