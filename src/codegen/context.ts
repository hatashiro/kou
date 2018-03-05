import * as a from '../parser/ast';

export class CodegenContext {
  private globalNameMap: Map<string, string> = new Map();
  private localNameMaps: Array<Map<string, string>> = [];
  private aliasMaps: Array<Map<string, string>> = [new Map()];

  public globalInitializers: Array<{ watName: string; expr: a.Expr<any> }> = [];

  enterScope() {
    this.localNameMaps.unshift(new Map());
    this.aliasMaps.unshift(new Map());
  }

  leaveScope() {
    this.localNameMaps.shift();
    this.aliasMaps.shift();
  }

  pushName(origName: string): string {
    const nameMap = this.localNameMaps[0] || this.globalNameMap;

    // FIXME: add a logic to convert the original name
    const name = origName;

    nameMap.set(origName, name);
    return name;
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
}
