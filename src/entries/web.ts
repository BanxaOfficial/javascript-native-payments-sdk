/**
 * Banxa Native Payments SDK — Web entry
 *
 * Browser entry point for checkout web components and buy checkout flow.
 */

export { BanxaPrimerCheckout } from '../web/components/banxa-primer-checkout.js';
export { BanxaHostedCheckout } from '../web/components/banxa-hosted-checkout.js';
export {
  BanxaHostedKyc,
  BANXA_KYC_MESSAGE_TYPES,
  BANXA_KYC_EVENTS,
} from '../web/components/banxa-hosted-kyc.js';
export type { BanxaKycEventName } from '../web/components/banxa-hosted-kyc.js';
export { loadPrimerSdk, isPrimerLoaded } from '../web/primer-loader.js';
export {
  registerBanxaPrimerCheckout,
  registerBanxaHostedCheckout,
  registerBanxaCheckout,
  registerBanxaHostedKyc,
  registerBanxaElements,
} from '../web/register-checkout.js';
export { runBuyCheckoutFlow } from '../web/buy-checkout-flow.js';
export { runKycFlow } from '../web/kyc-flow.js';
export type {
  KycFlowOptions,
  KycFlowSessionOptions,
  KycFlowClientOptions,
  KycFlowResult,
} from '../web/kyc-flow.js';
export type { KycTier, CreateKycSessionRequest, KycSession } from '../types/banxa.js';
export type {
  BuyCheckoutFlowMode,
  BuyCheckoutFlowResult,
  BuyCheckoutFlowOptions,
} from '../web/buy-checkout-flow.js';

export type {
  CheckoutLayoutMode,
  CheckoutLayoutConfig,
  PaymentMethodLayoutEntry,
  PrimerPaymentMethodType,
} from '../types/checkout-layout.js';
export { PrimerPaymentMethodTypes } from '../types/checkout-layout.js';
export { DEFAULT_CARD_FORM_HTML } from '../web/checkout-layout.js';

export type {
  PrimerCheckoutOptions,
  PrimerRedirectOptions,
  PrimerCardOptions,
  PrimerVaultOptions,
  PrimerApplePayOptions,
  PrimerGooglePayOptions,
  PrimerKlarnaOptions,
  PrimerAdyenKlarnaOptions,
  PrimerSubmitButtonOptions,
  PrimerStripeOptions,
  PrimerEventType,
  PrimerEventData,
  PrimerReadyEventData,
  PrimerMethodsUpdateEventData,
  PrimerPaymentMethod,
  PrimerStateChangeEventData,
  PrimerSdkState,
  PrimerError,
  PrimerBinDataAvailableEventData,
  PrimerBinDataLoadingChangeEventData,
  PrimerCardSuccessEventData,
  PrimerCardErrorEventData,
  PrimerInputValidationError,
  PrimerPaymentStartEventData,
  PrimerPaymentSuccessEventData,
  PrimerPaymentFailureEventData,
  PrimerPaymentCancelEventData,
  CheckoutOptions,
} from '../types/primer.js';
