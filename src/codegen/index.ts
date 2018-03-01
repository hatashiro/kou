import * as a from '../parser/ast';
import { wat2wasm } from '../wasm';

export const genWASM = (exportName: string) => (mod: a.Module): Buffer =>
  wat2wasm(genWAT(mod, exportName));

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
