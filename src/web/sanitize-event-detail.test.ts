import { describe, it, expect } from 'vitest';
import { sanitizeEventDetail } from './sanitize-event-detail.js';

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

  it('should preserve plain serializable fields', () => {
    const detail = {
      paymentMethod: { type: 'PAYMENT_CARD', displayName: 'Card' },
      amount: 100,
      currency: 'USD',
    };

    expect(sanitizeEventDetail(detail)).toEqual(detail);
  });

  it('should return undefined for undefined input', () => {
    expect(sanitizeEventDetail(undefined)).toBeUndefined();
  });
});
