/**
 * Checkout layout configuration for Banxa Primer checkout.
 *
 * Custom markup must use Primer web components (e.g. `primer-payment-method`,
 * `primer-card-form`, `primer-input-card-number`). Raw HTML inputs cannot host
 * PCI card data.
 */

/** How the checkout DOM is built when mounting Primer. */
export type CheckoutLayoutMode = 'preset' | 'auto' | 'custom';

/**
 * Primer payment method type identifiers (subset of Primer `PaymentMethodType`).
 * Use these when configuring preset layouts.
 */
export const PrimerPaymentMethodTypes = {
  PAYMENT_CARD: 'PAYMENT_CARD',
  APPLE_PAY: 'APPLE_PAY',
  GOOGLE_PAY: 'GOOGLE_PAY',
  PAYPAL: 'PAYPAL',
  KLARNA: 'KLARNA',
} as const;

export type PrimerPaymentMethodType =
  (typeof PrimerPaymentMethodTypes)[keyof typeof PrimerPaymentMethodTypes];

export interface PaymentMethodLayoutEntry {
  /** Primer payment method type, e.g. `PAYMENT_CARD`. */
  type: PrimerPaymentMethodType;
  disabled?: boolean;
  /**
   * Optional HTML inside `<primer-payment-method>` (wrappers/chrome only).
   * Primer still renders the method form internally; children are not used for PCI fields.
   */
  innerHtml?: string;
  /**
   * Custom markup inside `<primer-card-form>` (Primer hosted input components only).
   * When omitted for `PAYMENT_CARD`, the SDK uses {@link DEFAULT_CARD_FORM_HTML}
   * (standard card inputs).
   *
   * @example
   * `<primer-input-card-number></primer-input-card-number>
   *  <primer-input-card-expiry></primer-input-card-expiry>
   *  <primer-input-cvv></primer-input-cvv>`
   */
  cardFormHtml?: string;
}

export interface CheckoutLayoutConfig {
  mode?: CheckoutLayoutMode;
  /** Payment methods and order for `preset` mode. */
  paymentMethods?: PaymentMethodLayoutEntry[];
  /**
   * Primer `enabledPaymentMethods` option — limits which session methods are initialized.
   * When omitted, all methods on the client session are initialized; use `paymentMethods`
   * to control which appear in the preset layout DOM.
   */
  enabledPaymentMethods?: string[];
  /** HTML for the `checkout-complete` slot. */
  completeHtml?: string;
  /**
   * Advanced: full inner tree for `custom` mode.
   * May be the entire `<primer-checkout>...</primer-checkout>` or only
   * `<primer-main slot="main">...</primer-main>` (wrapped automatically).
   */
  mainHtml?: string;
}
