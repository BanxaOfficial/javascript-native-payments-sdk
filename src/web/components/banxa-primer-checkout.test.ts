import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BanxaPrimerCheckout } from './banxa-primer-checkout.js';

vi.mock('../primer-loader.js', () => ({
  loadPrimerSdk: vi.fn().mockResolvedValue(undefined),
  isPrimerLoaded: vi.fn().mockReturnValue(false),
}));

function registerCheckoutElement(): void {
  if (!customElements.get('banxa-primer-checkout')) {
    customElements.define('banxa-primer-checkout', BanxaPrimerCheckout);
  }
  if (!customElements.get('primer-checkout')) {
    customElements.define('primer-checkout', class extends HTMLElement {});
  }
}

describe('BanxaPrimerCheckout', () => {
  let element: BanxaPrimerCheckout;

  beforeEach(() => {
    registerCheckoutElement();
    element = new BanxaPrimerCheckout();
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  describe('properties', () => {
    it('should get and set clientToken', () => {
      element.clientToken = 'test-token';
      expect(element.clientToken).toBe('test-token');
    });

    it('should get and set locale', () => {
      element.locale = 'en';
      expect(element.locale).toBe('en');
    });

    it('should get and set loaderDisabled', () => {
      expect(element.loaderDisabled).toBe(false);
      element.loaderDisabled = true;
      expect(element.loaderDisabled).toBe(true);
    });

    it('should get and set customStyles', () => {
      element.customStyles = '.test { color: red; }';
      expect(element.customStyles).toBe('.test { color: red; }');
    });

    it('should get and set layoutMode', () => {
      element.layoutMode = 'auto';
      expect(element.layoutMode).toBe('auto');
      expect(element.getAttribute('layout-mode')).toBe('auto');
    });

    it('should default layoutMode to preset', () => {
      expect(element.layoutMode).toBe('preset');
    });

    it('should get and set paymentMethods attribute', () => {
      element.paymentMethods = 'PAYMENT_CARD,GOOGLE_PAY';
      expect(element.paymentMethods).toBe('PAYMENT_CARD,GOOGLE_PAY');
    });

    it('should get and set checkoutLayout', () => {
      element.checkoutLayout = { mode: 'auto' };
      expect(element.checkoutLayout?.mode).toBe('auto');
    });

    it('should get and set checkoutTemplate', () => {
      element.checkoutTemplate = '<primer-main slot="main"></primer-main>';
      expect(element.checkoutTemplate).toContain('primer-main');
    });
  });

  describe('observedAttributes', () => {
    it('should observe layout attributes', () => {
      expect(BanxaPrimerCheckout.observedAttributes).toContain('layout-mode');
      expect(BanxaPrimerCheckout.observedAttributes).toContain('payment-methods');
    });
  });

  describe('event handling', () => {
    it('should forward primer events with serializable detail', async () => {
      const handler = vi.fn();
      element.addEventListener('banxa:ready', handler);
      element.clientToken = 'test-token';

      await vi.waitFor(() => {
        expect(element.shadowRoot?.querySelector('primer-checkout')).not.toBeNull();
      });

      const primerCheckout = element.shadowRoot?.querySelector('primer-checkout')!;
      const host = document.createElement('span');
      const circularDetail = {
        paymentMethods: [{ type: 'PAYMENT_CARD', displayName: 'Card' }],
        renderOptions: { host },
      };
      (circularDetail.renderOptions as { host: HTMLElement }).host = host;

      primerCheckout.dispatchEvent(
        new CustomEvent('primer:ready', { detail: circularDetail, bubbles: true }),
      );

      expect(handler).toHaveBeenCalledOnce();
      const detail = handler.mock.calls[0][0].detail;
      expect(() => JSON.stringify(detail)).not.toThrow();
      expect(detail.paymentMethods).toEqual([{ type: 'PAYMENT_CARD', displayName: 'Card' }]);
      expect(detail.renderOptions.host).toBe('[HTMLElement:span]');
    });

    it('should add and remove event listeners', () => {
      const callback = vi.fn();
      element.addEventListener('banxa:ready', callback);
      element.removeEventListener('banxa:ready', callback);
    });

    it('should dispatch checkout-error event on initialization failure', async () => {
      const { loadPrimerSdk } = await import('../primer-loader.js');
      vi.mocked(loadPrimerSdk).mockRejectedValueOnce(new Error('Failed to load'));

      element.clientToken = 'test-token';

      const errorPromise = new Promise((resolve) => {
        element.addEventListener('checkout-error', (e) => {
          resolve((e as CustomEvent).detail);
        });
      });

      await errorPromise;
    });
  });

  describe('layout mounting', () => {
    it('mounts preset payment methods by default after init', async () => {
      element.clientToken = 'test-token';
      await vi.waitFor(() => {
        const container = element.shadowRoot?.querySelector('#checkout-container');
        expect(container?.innerHTML).toContain('primer-card-form');
        expect(container?.innerHTML).toContain('primer-input-card-number');
        expect(container?.innerHTML).toContain('APPLE_PAY');
      });
    });

    it('mounts auto layout without a payments slot', async () => {
      element.layoutMode = 'auto';
      element.clientToken = 'test-token';
      await vi.waitFor(() => {
        const container = element.shadowRoot?.querySelector('#checkout-container');
        expect(container?.innerHTML).not.toContain('slot="payments"');
        expect(container?.innerHTML).not.toContain('primer-payment-method');
      });
    });

    it('does not set enabledPaymentMethods unless explicitly configured', async () => {
      element.clientToken = 'test-token';
      await vi.waitFor(() => {
        const checkout = element.shadowRoot?.querySelector('primer-checkout') as
          | (HTMLElement & { options?: { enabledPaymentMethods?: string[] } })
          | null;
        expect(checkout?.options?.enabledPaymentMethods).toBeUndefined();
      });
    });

    it('applies explicit enabledPaymentMethods via checkoutLayout config', () => {
      element.checkoutLayout = {
        mode: 'preset',
        enabledPaymentMethods: ['PAYMENT_CARD', 'GOOGLE_PAY'],
      };
      expect(element.checkoutLayout?.enabledPaymentMethods).toEqual(['PAYMENT_CARD', 'GOOGLE_PAY']);
    });

    it('uses checkout-layout slot template over preset', async () => {
      const template = document.createElement('template');
      template.setAttribute('slot', 'checkout-layout');
      template.innerHTML = `<primer-checkout><primer-main slot="main"><div slot="payments"><primer-payment-method type="GOOGLE_PAY"></primer-payment-method></div></primer-main></primer-checkout>`;
      element.appendChild(template);
      element.clientToken = 'test-token';

      await vi.waitFor(() => {
        const container = element.shadowRoot?.querySelector('#checkout-container');
        expect(container?.innerHTML).toContain('GOOGLE_PAY');
        expect(container?.innerHTML).not.toContain('PAYMENT_CARD');
      });
    });

    it('remounts when checkoutLayout property changes', async () => {
      element.clientToken = 'test-token';
      await vi.waitFor(() => {
        expect(element.shadowRoot?.querySelector('#checkout-container')?.innerHTML).toContain(
          'primer-card-form',
        );
      });

      element.checkoutLayout = {
        mode: 'preset',
        paymentMethods: [{ type: 'GOOGLE_PAY' }],
      };

      await vi.waitFor(() => {
        const html = element.shadowRoot?.querySelector('#checkout-container')?.innerHTML ?? '';
        expect(html).toContain('GOOGLE_PAY');
        expect(html).not.toContain('primer-card-form');
      });
    });
  });
});
