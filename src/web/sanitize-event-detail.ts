/**
 * Produces a JSON-serializable copy of Primer event detail objects.
 * Primer may include DOM nodes and circular references (e.g. renderOptions.host).
 */
export function sanitizeEventDetail(detail: unknown): unknown {
  if (detail === undefined) return undefined;

  const seen = new WeakSet<object>();

  return JSON.parse(
    JSON.stringify(detail, (_key, value: unknown) => {
      if (value === null || typeof value !== 'object') {
        if (typeof value === 'function' || typeof value === 'symbol') return undefined;
        return value;
      }

      if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
        return `[HTMLElement:${value.tagName.toLowerCase()}]`;
      }
      if (typeof Node !== 'undefined' && value instanceof Node) {
        return `[${value.constructor.name}]`;
      }

      if (seen.has(value)) return '[Circular]';
      seen.add(value);

      return value;
    }),
  );
}
