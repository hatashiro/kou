import * as a from '../parser/ast';
import { TypeError } from './error';
import { StdFunc, defaultStdFuncs } from '../stdlib';

export type IdentTypeDef = {
  ident: a.Ident;
  type: a.Type<any>;
};

export class TypeContext {
  private scopes: Array<Map<string, a.Type<any>>>;

  constructor(public stdFuncs: Array<StdFunc> = defaultStdFuncs()) {
    this.scopes = [
      new Map(
        stdFuncs.map<[string, a.Type<any>]>(({ name, type }) => [name, type]),
      ),
    ];
  }

  get currentScope() {
    return this.scopes[0];
  }

  enterScope() {
    this.scopes.unshift(new Map());
  }

  leaveScope() {
    this.scopes.shift();
  }

  push({ ident, type: ty }: IdentTypeDef) {
    const name = ident.value;
    if (this.currentScope.has(name)) {
      throw new TypeError(
        ident,
        undefined,
        `identifier '${name}' has already been declared`,
        'SemanticError',
      );
    } else {
      this.currentScope.set(name, ty);
    }
  }

  getTypeOf(ident: a.Ident): a.Type<any> | null {
    for (const scope of this.scopes) {
      const ty = scope.get(ident.value);
      if (ty) {
        return ty;
      }
    }
    return null;
  }
}
