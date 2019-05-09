const wabt = require('wabt');

const { parseWat } = wabt();

const FILENAME = 'main.wat';

export function wat2wasm(wat: string): Buffer {
  const module = parseWat(FILENAME, wat);
  const binary = module.toBinary({
    log: false,
    canonicalize_lebs: false,
    relocatable: false,
    write_debug_names: false,
  });
  return Buffer.from(binary.buffer);
}

export const magicNumber = Buffer.from([0x00, 0x61, 0x73, 0x6d]);

export function convertMiBToPage(mib: number): number {
  // 1 page in WASM is 64KiB
  return (mib * 1024) / 64;
}

export type WASMResult = {
  value: any;
  memory: WebAssembly.Memory;
};

export async function runWASM(
  wasmModule: Buffer,
  opts: {
    main: string;
    memorySize: number;
  },
): Promise<WASMResult> {
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
  const value = instance.exports[opts.main]();

  return { value, memory };
}
