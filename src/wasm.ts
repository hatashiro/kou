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

export const magicNumber = Buffer.from([0x00, 0x61, 0x73, 0x6d]);

export function convertMiBToPage(mib: number): number {
  // 1 page in WASM is 64KiB
  return (mib * 1024) / 64;
}

export async function runWASM(
  wasmModule: Buffer,
  opts: {
    main: string;
    memorySize: number;
  },
): Promise<any> {
  // FIXME: stdlib

  const memory = new WebAssembly.Memory({
    initial: convertMiBToPage(opts.memorySize),
  });

  const uint32arr = new Uint32Array(memory.buffer);
  uint32arr[0] = 4; // set current heap pointer, the first 4 bytes are used for the pointer

  const imports = {
    js: {
      memory,
    },
  };

  const { instance } = await WebAssembly.instantiate(wasmModule, imports);
  return instance.exports[opts.main]();
}
