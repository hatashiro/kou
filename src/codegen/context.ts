import * as a from '../parser/ast';
import { StdFunc, defaultStdFuncs } from '../stdlib';

export class CodegenContext {
  private globalNameMap: Map<string, string> = new Map();
  private localNameMaps: Array<Map<string, string>> = [];
  private aliasMaps: Array<Map<string, string>> = [new Map()];

  private scopeIDStack: Array<number> = [];
  private incrScopeID: number = 0;

  private incrLoopID: number = 0;

  public globalInitializers: Array<{ watName: string; expr: a.Expr<any> }> = [];
  public tupleConstructors: Map<
    string,
    { types: Array<string>; sizes: Array<number> }
  > = new Map();

  private stdFuncMap: Map<string, StdFunc>;

  constructor(stdFuncs: Array<StdFunc> = defaultStdFuncs()) {
    this.stdFuncMap = new Map(
      stdFuncs.map<[string, StdFunc]>(func => [func.name, func]),
    );
  }

  private enterScope() {
    this.localNameMaps.unshift(new Map());
    this.aliasMaps.unshift(new Map());
  }

  private leaveScope() {
    this.localNameMaps.shift();
    this.aliasMaps.shift();
  }

  enterFunction() {
    this.enterScope();
    this.resetScopeID();
  }

  leaveFunction() {
    this.leaveScope();
  }

  enterBlock() {
    this.enterScope();
    this.incrScopeID++;
    this.scopeIDStack.unshift(this.incrScopeID);
  }

  leaveBlock() {
    this.leaveScope();
    this.scopeIDStack.shift();
  }

  resetScopeID() {
    this.scopeIDStack = [];
    this.incrScopeID = 0;
  }

  enterLoop(): { loop: string; block: string } {
    this.incrLoopID += 1;
    return this.currentLoopLabel;
  }

  get currentLoopLabel(): { loop: string; block: string } {
    const loop = `LOOP/${this.incrLoopID}`;
    const block = `BLOCK/${loop}`;
    return { loop, block };
  }

  private withScopeID(name: string): string {
    if (this.scopeIDStack.length === 0) {
      return name;
    } else {
      return `${name}/${this.scopeIDStack[0]}`;
    }
  }

  convertLocalName(origName: string): string {
    return this.withScopeID(origName);
  }

  pushName(origName: string): string {
    const nameMap = this.localNameMaps[0] || this.globalNameMap;
    const watName = this.convertLocalName(origName);
    nameMap.set(origName, watName);
    return watName;
  }

  pushAlias(fromName: string, toName: string) {
    this.aliasMaps[0]!.set(fromName, toName);
  }

  pushInitializer(watName: string, expr: a.Expr<any>) {
    // name here is a WAT name
    this.globalInitializers.push({ watName, expr });
  }

  getLocalWATName(origName: string): string | null {
    for (const map of this.localNameMaps) {
      const name = map.get(origName);
      if (name) {
        return name;
      }
    }

    return null;
  }

  getGlobalWATName(origName: string): string | null {
    let aliasedName = null;
    for (const map of this.aliasMaps) {
      aliasedName = map.get(origName);
      if (aliasedName) {
        break;
      }
    }
    return this.globalNameMap.get(aliasedName || origName) || null;
  }

  useTupleConstructor(types: Array<string>, sizes: Array<number>): string {
    const name = `create_tuple/${types.join('/')}`;

    if (!this.tupleConstructors.has(name)) {
      this.tupleConstructors.set(name, { types, sizes });
    }

    return name;
  }

  public getStdFunc(name: string): StdFunc | null {
    return this.stdFuncMap.get(name) || null;
  }
}
