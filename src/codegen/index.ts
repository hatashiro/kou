import * as a from '../parser/ast';
import { wat2wasm } from '../wasm';

export function genWASM(mod: a.Module, exportName: string): Buffer {
  return wat2wasm(genWAT(mod, exportName));
}

export function genWAT(mod: a.Module, exportName: string): string {
  // FIXME
  return `
(module
  (func $${exportName} (param) (result i32)
    (i64.const 1234)
    (i32.wrap/i64))
  (export "${exportName}" (func $${exportName})))
`;
}
