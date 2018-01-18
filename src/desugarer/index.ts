import * as a from '../parser/ast';
import { visitor } from '../parser/visitor';

export function desugar(mod: a.Module): a.Module {
  // FIXME
  const v = visitor({});

  return v.visitModule(mod);
}
