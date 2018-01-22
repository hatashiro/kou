import { Context, ValDef } from '../parser/visitor';
import * as a from '../parser/ast';

export class TypeContext implements Context {
  enterScope() {}

  leaveScope() {}

  push(def: ValDef) {}
}

export class TypeError extends Error {
  name: string = 'TypeError';

  constructor(
    public row: number,
    public column: number,
    public unexpected: string,
    public expected: string,
  ) {
    super();
    this.message = '';
  }
}

export function typeOf(expr: a.Expr<any>, ctx: TypeContext): a.Type<any> {
  return new a.VoidType(-1, -1);
}

export function typeEqual(expected: a.Type<any>, actual: a.Type<any>) {}
