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
  // FIXME
  return str;
}
