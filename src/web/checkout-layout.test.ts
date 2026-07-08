import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildCheckoutMarkup,
  buildPaymentMethodMarkup,
  resolveCheckoutLayout,
  parsePaymentMethodsAttribute,
  getEnabledPaymentMethodsFromLayout,
  DEFAULT_PRESET_LAYOUT,
} from './checkout-layout.js';
import { PrimerPaymentMethodTypes } from '../types/checkout-layout.js';

describe('checkout-layout', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildCheckoutMarkup', () => {
    it('builds preset layout with card form and other payment methods', () => {
      const html = buildCheckoutMarkup(DEFAULT_PRESET_LAYOUT);
      expect(html).toContain('<primer-checkout>');
      expect(html).toContain('primer-card-form');
      expect(html).toContain('APPLE_PAY');
      expect(html).toContain('primer-input-card-number');
      expect(html).not.toContain('primer-vault-manager');
      expect(html).not.toContain('primer-show-other-payments');
      expect(html).not.toContain('primer-payment-method-container');
      expect(html).toContain('Thank you for your purchase');
    });

    it('builds auto layout without a payments slot (Primer auto-discovery)', () => {
      const html = buildCheckoutMarkup({ mode: 'auto' });
      expect(html).not.toContain('slot="payments"');
      expect(html).not.toContain('primer-payment-method');
      expect(html).toContain('checkout-complete');
    });

    it('builds preset layout without container when card is included', () => {
      const html = buildCheckoutMarkup(DEFAULT_PRESET_LAYOUT);
      expect(html).not.toContain('primer-payment-method-container');
    });

    it('builds preset layout with payment-method-container when card is omitted', () => {
      const html = buildCheckoutMarkup({
        mode: 'preset',
        paymentMethods: [
          { type: PrimerPaymentMethodTypes.APPLE_PAY },
          { type: PrimerPaymentMethodTypes.GOOGLE_PAY },
        ],
      });
      expect(html).toContain('primer-payment-method-container');
      expect(html).toContain('include="APPLE_PAY,GOOGLE_PAY"');
    });

    it('builds custom layout from mainHtml', () => {
      const html = buildCheckoutMarkup({
        mode: 'custom',
        mainHtml:
          '<div slot="payments"><primer-payment-method type="GOOGLE_PAY"></primer-payment-method></div>',
      });
      expect(html).toContain('type="GOOGLE_PAY"');
      expect(html).toContain('<primer-checkout>');
    });

    it('wraps primer-main-only custom markup', () => {
      const html = buildCheckoutMarkup({
        mode: 'custom',
        mainHtml: '<primer-main slot="main"><div slot="payments"></div></primer-main>',
      });
      expect(html).toContain('<primer-checkout>');
      expect(html).toContain('<primer-main slot="main">');
    });
  });

  describe('buildPaymentMethodMarkup', () => {
    it('renders card form with disabled attribute', () => {
      const html = buildPaymentMethodMarkup({
        type: PrimerPaymentMethodTypes.PAYMENT_CARD,
        disabled: true,
      });
      expect(html).toContain('<primer-card-form');
      expect(html).toContain('disabled');
      expect(html).not.toContain('<primer-payment-method');
    });

    it('warns when cardFormHtml is used in preset mode', () => {
      buildPaymentMethodMarkup(
        {
          type: PrimerPaymentMethodTypes.PAYMENT_CARD,
          cardFormHtml: '<primer-input-card-number></primer-input-card-number>',
        },
        'preset',
      );
      expect(console.warn).toHaveBeenCalled();
    });

    it('includes custom cardFormHtml in custom mode', () => {
      const html = buildPaymentMethodMarkup(
        {
          type: PrimerPaymentMethodTypes.PAYMENT_CARD,
          cardFormHtml: '<primer-input-card-number></primer-input-card-number>',
        },
        'custom',
      );
      expect(html).toContain('<primer-card-form');
      expect(html).toContain('primer-input-card-number');
    });

    it('includes default card inputs for preset card method', () => {
      const html = buildPaymentMethodMarkup({
        type: PrimerPaymentMethodTypes.PAYMENT_CARD,
      });
      expect(html).toContain('primer-input-card-number');
      expect(html).toContain('primer-card-form-submit');
    });
  });

  describe('parsePaymentMethodsAttribute', () => {
    it('parses comma-separated types', () => {
      const entries = parsePaymentMethodsAttribute('PAYMENT_CARD, GOOGLE_PAY');
      expect(entries).toEqual([{ type: 'PAYMENT_CARD' }, { type: 'GOOGLE_PAY' }]);
    });

    it('returns undefined for empty value', () => {
      expect(parsePaymentMethodsAttribute(null)).toBeUndefined();
      expect(parsePaymentMethodsAttribute('')).toBeUndefined();
    });
  });

  describe('resolveCheckoutLayout', () => {
    it('returns default preset when config is null', () => {
      const resolved = resolveCheckoutLayout(null);
      expect(resolved.mode).toBe('preset');
      expect(resolved.paymentMethods?.length).toBe(2);
    });
  });

  describe('getEnabledPaymentMethodsFromLayout', () => {
    it('returns undefined when enabledPaymentMethods is not explicit', () => {
      expect(getEnabledPaymentMethodsFromLayout(DEFAULT_PRESET_LAYOUT)).toBeUndefined();
    });

    it('returns explicit enabledPaymentMethods only', () => {
      expect(
        getEnabledPaymentMethodsFromLayout({
          mode: 'preset',
          enabledPaymentMethods: ['GOOGLE_PAY', 'APPLE_PAY'],
          paymentMethods: [{ type: 'PAYMENT_CARD' }],
        }),
      ).toEqual(['GOOGLE_PAY', 'APPLE_PAY']);
    });
  });
});
