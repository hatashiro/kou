import { fileSync } from 'tmp';

type Condition<T> = T | ((val: T) => boolean);

function predicate<T>(val: T, cond: Condition<T>): boolean {
  if (typeof cond === 'function') {
    return cond(val);
  } else {
    return val === cond;
  }
}

export function match<V, T>(
  val: V,
  matches: Array<[Condition<V>, () => T]>,
  fallback: () => T,
): T {
  for (const [p, f] of matches) {
    if (predicate(val, p)) {
      return f();
    }
  }
  return fallback();
}

export function isDigit(c: string): boolean {
  return /^[0-9]$/.test(c);
}

export function isAlphabet(c: string): boolean {
  return /^[a-zA-Z]$/.test(c);
}

export function isAlphanumeric(c: string): boolean {
  return isDigit(c) || isAlphabet(c);
}

export function unescape(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"');
}

export function orStr(words: Array<string>): string {
  const last = words.slice(-1)[0];
  const rests = words.slice(0, -1).join(', ');
  return rests ? `${rests} or ${last}` : last;
}

export function tempFile(ext: string): string {
  return fileSync({ mode: 0o644, postfix: `.${ext}` }).name;
}
