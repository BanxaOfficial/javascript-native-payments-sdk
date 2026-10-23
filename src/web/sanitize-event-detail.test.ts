import { describe, it, expect } from 'vitest';
import { sanitizeEventDetail } from './sanitize-event-detail.js';

/** Simulates a cross-origin WindowProxy: `window` is readable, everything else throws. */
function fakeCrossOriginWindow(): object {
  const proxy: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'window') return proxy;
        throw new DOMException(
          'Blocked a frame from accessing a cross-origin frame.',
          'SecurityError',
        );
      },
      ownKeys() {
        throw new DOMException(
          'Blocked a frame from accessing a cross-origin frame.',
          'SecurityError',
        );
      },
    },
  );
  return proxy;
}

/** Simulates a cross-origin Location: any property read throws. */
function fakeCrossOriginLocation(): object {
  return new Proxy(
    {},
    {
      get() {
        throw new DOMException(
          'Blocked a frame from accessing a cross-origin frame.',
          'SecurityError',
        );
      },
    },
  );
}

describe('sanitizeEventDetail', () => {
  it('should strip circular references', () => {
    const host = document.createElement('div');
    const detail = {
      renderOptions: {
        host,
      },
    };
    host.setAttribute('data-ref', 'self');
    (detail.renderOptions as { host: HTMLElement }).host = host;

    const sanitized = sanitizeEventDetail(detail) as {
      renderOptions: { host: string };
    };

    expect(() => JSON.stringify(sanitized)).not.toThrow();
    expect(sanitized.renderOptions.host).toBe('[HTMLElement:div]');
  });

  it('should mark self-references as circular', () => {
    const detail: Record<string, unknown> = { a: 1 };
    detail.self = detail;

    expect(sanitizeEventDetail(detail)).toEqual({ a: 1, self: '[Circular]' });
  });

  it('should preserve plain serializable fields', () => {
    const detail = {
      paymentMethod: { type: 'PAYMENT_CARD', displayName: 'Card' },
      amount: 100,
      currency: 'USD',
    };

    expect(sanitizeEventDetail(detail)).toEqual(detail);
  });

  it('should match JSON semantics for functions, undefined and dates', () => {
    const detail = {
      fn: () => 1,
      missing: undefined,
      list: [1, undefined, () => 2],
      when: new Date('2026-10-22T10:00:00Z'),
    };

    expect(sanitizeEventDetail(detail)).toEqual({
      list: [1, null, null],
      when: '2026-10-22T10:00:00.000Z',
    });
  });

  it('should not throw on a cross-origin window', () => {
    const detail = { paymentMethod: 'APPLE_PAY', source: fakeCrossOriginWindow() };

    expect(() => sanitizeEventDetail(detail)).not.toThrow();
    expect(sanitizeEventDetail(detail)).toEqual({ paymentMethod: 'APPLE_PAY', source: '[Window]' });
  });

  it('should not throw on a cross-origin window inside an array', () => {
    const detail = { list: [1, fakeCrossOriginWindow(), 'x'] };

    expect(sanitizeEventDetail(detail)).toEqual({ list: [1, '[Window]', 'x'] });
  });

  it('should replace the current window', () => {
    expect(sanitizeEventDetail({ w: window })).toEqual({ w: '[Window]' });
  });

  it('should not throw on a cross-origin location', () => {
    expect(sanitizeEventDetail({ loc: fakeCrossOriginLocation() })).toEqual({
      loc: '[Unserializable]',
    });
  });

  it('should not throw on a throwing getter', () => {
    const detail = {
      get boom(): never {
        throw new Error('nope');
      },
      ok: true,
    };

    expect(sanitizeEventDetail(detail)).toEqual({ boom: '[Unserializable]', ok: true });
  });

  it('should return undefined for undefined input', () => {
    expect(sanitizeEventDetail(undefined)).toBeUndefined();
  });
});
