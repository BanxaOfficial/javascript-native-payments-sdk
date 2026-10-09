import type { BanxaApiClient } from '../api/client.js';
import type { CreateOrderRequest, Order, OrderEligibilityResponse } from '../types/banxa.js';
import type { CheckoutLayoutConfig, CheckoutLayoutMode } from '../types/checkout-layout.js';
import { BanxaHostedCheckout } from './components/banxa-hosted-checkout.js';
import { BanxaPrimerCheckout } from './components/banxa-primer-checkout.js';
import { registerBanxaCheckout } from './register-checkout.js';

export type BuyCheckoutFlowMode = 'primer' | 'hosted';

export interface BuyCheckoutFlowResult {
  mode: BuyCheckoutFlowMode;
  order: Order;
  eligibility: OrderEligibilityResponse;
  element: BanxaPrimerCheckout | BanxaHostedCheckout;
}

export interface BuyCheckoutFlowOptions {
  client: BanxaApiClient;
  request: CreateOrderRequest;
  container: HTMLElement;
  /** Skip POST /eligibility and treat the order response as the source of truth for checkout mode. */
  skipEligibilityCheck?: boolean;
  primerCheckoutOptions?: {
    locale?: string;
    merchantDomain?: string;
    layoutMode?: CheckoutLayoutMode;
    checkoutLayout?: CheckoutLayoutConfig;
    checkoutTemplate?: string;
    loaderDisabled?: boolean;
    customStyles?: string;
  };
}

/**
 * Check buy-order eligibility, create the order, and mount the appropriate checkout UI:
 * - `paymentReady` + `nativeToken` → `<banxa-primer-checkout>` (native Primer)
 * - otherwise → `<banxa-hosted-checkout>` iframe with `checkoutUrl`
 */
export async function runBuyCheckoutFlow(
  options: BuyCheckoutFlowOptions,
): Promise<BuyCheckoutFlowResult> {
  registerBanxaCheckout();

  const { client, request, container } = options;

  const eligibility: OrderEligibilityResponse = options.skipEligibilityCheck
    ? { eligible: true, paymentReady: true }
    : await client.checkOrderEligibility(request);

  const order = await client.createOrder(request);

  container.replaceChildren();

  const nativeToken = order.nativeToken;
  if (eligibility.paymentReady === true && nativeToken) {
    const checkout = document.createElement('banxa-primer-checkout') as BanxaPrimerCheckout;
    const primerOptions = options.primerCheckoutOptions;

    if (primerOptions?.locale) checkout.locale = primerOptions.locale;
    if (primerOptions?.layoutMode) checkout.layoutMode = primerOptions.layoutMode;
    if (primerOptions?.merchantDomain) checkout.merchantDomain = primerOptions.merchantDomain;
    if (primerOptions?.checkoutLayout) checkout.checkoutLayout = primerOptions.checkoutLayout;
    if (primerOptions?.checkoutTemplate) checkout.checkoutTemplate = primerOptions.checkoutTemplate;
    if (primerOptions?.loaderDisabled) checkout.loaderDisabled = primerOptions.loaderDisabled;
    if (primerOptions?.customStyles) checkout.customStyles = primerOptions.customStyles;

    checkout.clientToken = nativeToken;
    container.appendChild(checkout);

    return { mode: 'primer', order, eligibility, element: checkout };
  }

  if (order.checkoutUrl) {
    const hosted = document.createElement('banxa-hosted-checkout') as BanxaHostedCheckout;
    hosted.checkoutUrl = order.checkoutUrl;
    hosted.returnUrl = request.redirectUrl;
    if (options.primerCheckoutOptions?.customStyles) {
      hosted.customStyles = options.primerCheckoutOptions.customStyles;
    }
    container.appendChild(hosted);

    return { mode: 'hosted', order, eligibility, element: hosted };
  }

  throw new Error(
    'Order has no nativeToken or checkoutUrl; cannot start checkout after eligibility check.',
  );
}
