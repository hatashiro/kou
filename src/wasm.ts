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

interface WAT extends Array<string | WAT> {}

export function beautifyWAT(wat: string): string {
  function parse(input: Array<string>): WAT {
    input.shift(); // drop '('

    const result: WAT = [];
    let str = '';

    while (true) {
      const c = input.shift();

      if (c === ')') {
        if (str) result.push(str);
        break;
      } else if (c === ' ') {
        if (str) result.push(str);
        str = '';
      } else if (c === '(') {
        input.unshift(c);
        result.push(parse(input));
      } else {
        str += c;
      }
    }

    return result;
  }

  const ast = parse(Array.from(wat));

  function len(wat: WAT): number {
    return wat.reduce(
      (res, node) => res + (typeof node === 'string' ? node.length : len(node)),
      0,
    );
  }

  function indent(str: string): string {
    return str
      .split('\n')
      .map(s => '  ' + s)
      .join('\n');
  }

  const stringify = (node: string | WAT) =>
    typeof node === 'string' ? node : beautify(node);

  function beautify(wat: WAT): string {
    if (len(wat) < 50) {
      return `(${wat.map(stringify).join(' ')})`;
    } else {
      return (
        `(${wat[0]}\n` +
        wat
          .slice(1)
          .map(stringify)
          .map(indent)
          .join('\n') +
        '\n)'
      );
    }
  }

  return beautify(ast);
}
