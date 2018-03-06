import chalk from 'chalk';
import * as yargs from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import { tokenize } from './lexer';
import { LexError } from './lexer/error';
import { parse } from './parser';
import { ParseError } from './parser/error';
import { desugarBefore, desugarAfter } from './desugarer';
import { typeCheck } from './typechecker';
import { TypeContext } from './typechecker/context';
import { TypeError } from './typechecker/error';
import { Compose } from './util';
import { genWAT, genWASM } from './codegen';

function exitWithErrors(errors: Array<string>) {
  errors.forEach(err => console.error(err));
  process.exit(1);
}

function reportCompileError(
  input: string,
  err: LexError | ParseError | TypeError | any,
) {
  if (
    !(
      err instanceof LexError ||
      err instanceof ParseError ||
      err instanceof TypeError
    )
  ) {
    throw err;
  }

  const errors: Array<string> = [];

  errors.push(`${err.name}: ${err.message}\n`);

  const lineIdx = err.row - 1;
  const fromIdx = lineIdx < 1 ? 0 : lineIdx - 1;
  const toIdx = lineIdx + 2;
  const targetIdx = lineIdx - fromIdx;

  const lineNoDigitLen = toIdx.toString().length;

  input
    .split('\n')
    .slice(fromIdx, toIdx)
    .forEach((line, idx) => {
      const lineNo = fromIdx + idx + 1;
      errors.push(
        `${' '.repeat(lineNoDigitLen - lineNo.toString().length)}${chalk.grey(
          lineNo + '|',
        )} ${line}`,
      );

      if (targetIdx === idx) {
        errors.push(
          `  ${' '.repeat(lineNoDigitLen + err.column - 1)}${chalk.red('^')}`,
        );
      }
    });

  exitWithErrors(errors);
}

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
