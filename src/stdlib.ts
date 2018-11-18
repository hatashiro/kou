import * as a from './parser/ast';
import { SExp } from 's-exify';

export type StdFunc = {
  name: string;
  type: a.Type<any>;
  init?: Array<SExp>;
  expr?: Array<SExp>;
};

export const defaultStdFuncs = (): Array<StdFunc> => [stdInt, stdFloat];

const funcTy = (val: { param: a.Type<any>; return: a.Type<any> }) =>
  new a.FuncType(val, -1, -1);

export const stdInt: StdFunc = {
  name: 'int',
  type: funcTy({ param: a.FloatType.instance, return: a.IntType.instance }),
  expr: [['i32.trunc_s/f64']],
};

export const stdFloat: StdFunc = {
  name: 'float',
  type: funcTy({ param: a.IntType.instance, return: a.FloatType.instance }),
  expr: [['f64.convert_s/i32']],
};
