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
  return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(c);
}
