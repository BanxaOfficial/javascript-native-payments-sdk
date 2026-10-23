/**
 * Produces a JSON-serializable copy of Primer event detail objects.
 * Primer may include DOM nodes, circular references (e.g. renderOptions.host)
 * and window references (e.g. Apple Pay). JSON.stringify cannot be used here:
 * it reads `toJSON` on every object before any replacer runs, and reading a
 * property on a cross-origin Window or Location throws a SecurityError.
 */
export function sanitizeEventDetail(detail: unknown): unknown {
  if (detail === undefined) return undefined;

  const seen = new WeakSet<object>();

  const walk = (value: unknown): unknown => {
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'function' || typeof value === 'symbol') return undefined;
      if (typeof value === 'bigint') return value.toString();
      return value;
    }

    try {
      // `window` is readable on cross-origin WindowProxy objects, so this check is safe.
      if ((value as Window).window === value) return '[Window]';

      if (typeof Node !== 'undefined' && value instanceof Node) {
        if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
          return `[HTMLElement:${value.tagName.toLowerCase()}]`;
        }
        return `[${value.nodeName}]`;
      }

      if (value instanceof Date) return value.toISOString();

      if (seen.has(value)) return '[Circular]';
      seen.add(value);

      if (Array.isArray(value)) {
        return value.map((item) => walk(item) ?? null);
      }

      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        let result: unknown;
        try {
          result = walk((value as Record<string, unknown>)[key]);
        } catch {
          result = '[Unserializable]';
        }
        if (result !== undefined) out[key] = result;
      }
      return out;
    } catch {
      // Any other cross-origin access (e.g. a cross-origin Location).
      return '[Unserializable]';
    }
  };

  return walk(detail);
}
