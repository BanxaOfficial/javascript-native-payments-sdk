import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BanxaHostedCheckout } from './banxa-hosted-checkout.js';

function registerHostedCheckoutElement(): void {
  if (!customElements.get('banxa-hosted-checkout')) {
    customElements.define('banxa-hosted-checkout', BanxaHostedCheckout);
  }
}

describe('BanxaHostedCheckout', () => {
  let element: BanxaHostedCheckout;

  beforeEach(() => {
    registerHostedCheckoutElement();
    element = new BanxaHostedCheckout();
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  describe('properties', () => {
    it('should get and set checkoutUrl', () => {
      element.checkoutUrl = 'https://checkout.banxa.com/order';
      expect(element.checkoutUrl).toBe('https://checkout.banxa.com/order');
    });

    it('should get and set returnUrl', () => {
      element.returnUrl = 'https://app.example.com/return';
      expect(element.returnUrl).toBe('https://app.example.com/return');
    });

    it('should default iframeTitle', () => {
      expect(element.iframeTitle).toBe('Banxa checkout');
    });

    it('should get and set customStyles', () => {
      element.customStyles = '.frame { border-radius: 8px; }';
      expect(element.customStyles).toBe('.frame { border-radius: 8px; }');
    });
  });

  describe('iframe mounting', () => {
    it('should mount an iframe when checkoutUrl is set', () => {
      element.checkoutUrl = 'https://checkout.banxa.com/order-123';

      const iframe = element.shadowRoot?.querySelector('iframe');
      expect(iframe).not.toBeNull();
      expect(iframe?.src).toBe('https://checkout.banxa.com/order-123');
      expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');
    });

    it('should show error when checkoutUrl is missing on mount', () => {
      element.checkoutUrl = null;
      element.removeAttribute('checkout-url');

      const error = element.shadowRoot?.querySelector('.error');
      expect(error?.textContent).toBe('Checkout URL is required');
    });
  });

  describe('return URL detection', () => {
    it('should dispatch banxa:checkout-success when iframe navigates to return URL', () => {
      element.checkoutUrl = 'https://checkout.banxa.com/order';
      element.returnUrl = 'https://app.example.com/return';

      const handler = vi.fn();
      element.addEventListener('banxa:checkout-success', handler);

      const iframe = element.shadowRoot?.querySelector('iframe') as HTMLIFrameElement;
      Object.defineProperty(iframe, 'contentWindow', {
        value: { location: { href: 'https://app.example.com/return?status=success' } },
        configurable: true,
      });

      iframe.dispatchEvent(new Event('load'));

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail.url).toContain('https://app.example.com/return');
    });

    it('should dispatch banxa:checkout-failure for failure return URL', () => {
      element.checkoutUrl = 'https://checkout.banxa.com/order';
      element.returnUrlFailure = 'https://app.example.com/failed';

      const handler = vi.fn();
      element.addEventListener('banxa:checkout-failure', handler);

      const iframe = element.shadowRoot?.querySelector('iframe') as HTMLIFrameElement;
      Object.defineProperty(iframe, 'contentWindow', {
        value: { location: { href: 'https://app.example.com/failed' } },
        configurable: true,
      });

      iframe.dispatchEvent(new Event('load'));

      expect(handler).toHaveBeenCalledOnce();
    });
  });
});
