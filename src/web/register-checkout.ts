import { BanxaPrimerCheckout } from './components/banxa-primer-checkout.js';
import { BanxaHostedCheckout } from './components/banxa-hosted-checkout.js';

/**
 * Register the `<banxa-primer-checkout>` custom element.
 */
export function registerBanxaPrimerCheckout(): void {
  if (typeof customElements === 'undefined') {
    throw new Error('registerBanxaPrimerCheckout() requires a browser environment');
  }
  if (!customElements.get('banxa-primer-checkout')) {
    customElements.define('banxa-primer-checkout', BanxaPrimerCheckout);
  }
}

/**
 * Register the `<banxa-hosted-checkout>` custom element.
 */
export function registerBanxaHostedCheckout(): void {
  if (typeof customElements === 'undefined') {
    throw new Error('registerBanxaHostedCheckout() requires a browser environment');
  }
  if (!customElements.get('banxa-hosted-checkout')) {
    customElements.define('banxa-hosted-checkout', BanxaHostedCheckout);
  }
}

/**
 * Register Primer and hosted checkout custom elements.
 */
export function registerBanxaCheckout(): void {
  registerBanxaPrimerCheckout();
  registerBanxaHostedCheckout();
}
