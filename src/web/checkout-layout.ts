/**
 * Builds Primer checkout DOM markup from Banxa layout configuration.
 */

import type {
  CheckoutLayoutConfig,
  CheckoutLayoutMode,
  PaymentMethodLayoutEntry,
  PrimerPaymentMethodType,
} from '../types/checkout-layout.js';
import { PrimerPaymentMethodTypes } from '../types/checkout-layout.js';

const DEFAULT_COMPLETE_HTML = '<h2>Thank you for your purchase!</h2>';

/** Default Primer card form fields for preset layouts. */
export const DEFAULT_CARD_FORM_HTML = `<primer-input-card-number></primer-input-card-number>
<primer-input-card-expiry></primer-input-card-expiry>
<primer-input-cvv></primer-input-cvv>
<primer-input-card-holder-name></primer-input-card-holder-name>
<primer-card-form-submit></primer-card-form-submit>`;

export const DEFAULT_PRESET_LAYOUT: CheckoutLayoutConfig = {
  mode: 'preset',
  paymentMethods: [
    { type: PrimerPaymentMethodTypes.PAYMENT_CARD },
    { type: PrimerPaymentMethodTypes.APPLE_PAY },
  ],
  completeHtml: DEFAULT_COMPLETE_HTML,
};

export const PAYMENT_METHOD_PRESETS: Record<string, PaymentMethodLayoutEntry> = {
  [PrimerPaymentMethodTypes.PAYMENT_CARD]: { type: PrimerPaymentMethodTypes.PAYMENT_CARD },
  [PrimerPaymentMethodTypes.APPLE_PAY]: { type: PrimerPaymentMethodTypes.APPLE_PAY },
  [PrimerPaymentMethodTypes.GOOGLE_PAY]: { type: PrimerPaymentMethodTypes.GOOGLE_PAY },
};

export function buildPaymentMethodMarkup(
  entry: PaymentMethodLayoutEntry,
  mode: CheckoutLayoutMode = 'preset',
): string {
  if (entry.type === PrimerPaymentMethodTypes.PAYMENT_CARD) {
    return buildCardPaymentMethodMarkup(entry, mode);
  }

  const disabledAttr = entry.disabled ? ' disabled' : '';
  const inner = entry.innerHtml ?? '';

  return `<primer-payment-method type="${entry.type}"${disabledAttr}>${inner}</primer-payment-method>`;
}

function resolveCardFormFields(entry: PaymentMethodLayoutEntry, mode: CheckoutLayoutMode): string {
  if (entry.cardFormHtml && mode === 'preset') {
    console.warn(
      '[@banxa/native-payments-sdk] cardFormHtml is ignored in preset layout mode. ' +
        'Use layout-mode="custom", checkoutTemplate, or the checkout-layout slot for custom card forms.',
    );
    return DEFAULT_CARD_FORM_HTML;
  }

  return entry.cardFormHtml ?? DEFAULT_CARD_FORM_HTML;
}

function buildCardPaymentMethodMarkup(
  entry: PaymentMethodLayoutEntry,
  mode: CheckoutLayoutMode,
): string {
  const disabledAttr = entry.disabled ? ' disabled' : '';
  const inner = entry.innerHtml ?? '';
  const cardFormFields = resolveCardFormFields(entry, mode);

  // Use a standalone `primer-card-form` — `primer-payment-method` renders its own
  // empty card form in shadow DOM and ignores light-DOM children.
  return `<primer-card-form${disabledAttr}>
      <div slot="card-form-content">
${cardFormFields}
      </div>
    </primer-card-form>${inner}`;
}

function buildPaymentsSlot(
  paymentMethods: PaymentMethodLayoutEntry[],
  mode: CheckoutLayoutMode,
): string {
  const needsIndividualMarkup = paymentMethods.some(
    (entry) =>
      entry.innerHtml ||
      entry.cardFormHtml ||
      entry.disabled ||
      entry.type === PrimerPaymentMethodTypes.PAYMENT_CARD,
  );

  if (needsIndividualMarkup || mode !== 'preset') {
    return paymentMethods.map((entry) => buildPaymentMethodMarkup(entry, mode)).join('\n');
  }

  const include = paymentMethods.map((entry) => entry.type).join(',');
  return `<primer-payment-method-container include="${include}"></primer-payment-method-container>`;
}

function wrapMainTree(completeHtml: string, mainInner?: string): string {
  const paymentsBlock = mainInner ? `${mainInner}\n    ` : '';
  return `<primer-checkout>
  <primer-main slot="main">
    ${paymentsBlock}<div slot="checkout-complete">${completeHtml}</div>
  </primer-main>
</primer-checkout>`;
}

function normalizeCustomMarkup(mainHtml: string, completeHtml: string): string {
  const trimmed = mainHtml.trim();
  if (trimmed.includes('<primer-checkout')) {
    return trimmed;
  }
  if (trimmed.includes('<primer-main')) {
    return wrapMainTree(completeHtml, trimmed);
  }
  return wrapMainTree(completeHtml, `<div slot="payments">${trimmed}</div>`);
}

export function resolveCheckoutLayout(config?: CheckoutLayoutConfig | null): CheckoutLayoutConfig {
  if (!config) return { ...DEFAULT_PRESET_LAYOUT };

  const mode = config.mode ?? DEFAULT_PRESET_LAYOUT.mode ?? 'preset';

  return {
    mode,
    paymentMethods:
      config.paymentMethods ??
      (mode === 'preset' ? DEFAULT_PRESET_LAYOUT.paymentMethods : undefined),
    enabledPaymentMethods: config.enabledPaymentMethods,
    completeHtml: config.completeHtml ?? DEFAULT_COMPLETE_HTML,
    mainHtml: config.mainHtml,
  };
}

export function getEnabledPaymentMethodsFromLayout(
  config: CheckoutLayoutConfig,
): string[] | undefined {
  if (config.enabledPaymentMethods?.length) {
    return [...config.enabledPaymentMethods];
  }
  return undefined;
}

export function buildCheckoutMarkup(config?: CheckoutLayoutConfig | null): string {
  const resolved = resolveCheckoutLayout(config);
  const mode = resolved.mode ?? 'preset';
  const completeHtml = resolved.completeHtml ?? DEFAULT_COMPLETE_HTML;

  if (mode === 'custom' && resolved.mainHtml) {
    return normalizeCustomMarkup(resolved.mainHtml, completeHtml);
  }

  if (mode === 'auto') {
    return wrapMainTree(completeHtml);
  }

  const methods = resolved.paymentMethods ?? DEFAULT_PRESET_LAYOUT.paymentMethods ?? [];
  const paymentsHtml = buildPaymentsSlot(methods, mode);
  return wrapMainTree(completeHtml, `<div slot="payments">${paymentsHtml}</div>`);
}

export function parsePaymentMethodsAttribute(
  value: string | null,
): PaymentMethodLayoutEntry[] | undefined {
  if (!value?.trim()) return undefined;
  return value.split(',').map((raw) => {
    const type = raw.trim() as PrimerPaymentMethodType;
    return { ...(PAYMENT_METHOD_PRESETS[type] ?? {}), type };
  });
}
