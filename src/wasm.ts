import { writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { tempFile } from './util';

const bin = {
  wat2wasm: resolve(__dirname, '../wabt/bin/wat2wasm'),
};

export function wat2wasm(watStr: string): Buffer {
  const watFile = tempFile('wat');
  const wasmFile = tempFile('wasm');
  writeFileSync(watFile, watStr);
  execSync(`${bin.wat2wasm} ${watFile} -o ${wasmFile}`);
  return readFileSync(wasmFile);
}

export async function runWASM(wasmModule: Buffer, main: string): Promise<any> {
  // FIXME: stdlib
  const imports = {};
  const { instance } = await WebAssembly.instantiate(wasmModule, imports);
  return instance.exports[main]();
}
