import * as a from '../parser/ast';

export const genWASM = (exportName: string) => (mod: a.Module): Buffer => {
  return new Buffer(0);
};
