import * as yargs from 'yargs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runWASM } from './wasm';

interface Argv {
  source: string;
  main: string;
}

async function main(argv: Argv) {
  const sourcePath = resolve(argv.source);
  const wasmModule = readFileSync(sourcePath);
  const result = await runWASM(wasmModule, argv.main);
  console.log(result);
}

main(yargs
  .usage('$0 [args] <source>', 'kou Programming Language CLI')
  .help()
  .option('main', {
    desc: 'An exported function to run',
    type: 'string',
    default: 'main',
  }).argv as any).catch(err => {
  console.error(err);
  process.exit(1);
});
