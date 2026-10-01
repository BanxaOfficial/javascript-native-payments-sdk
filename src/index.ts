/**
 * Banxa Native Payments SDK
 * 
 * A TypeScript SDK enabling Banxa merchant partners to use the Primer SDK for native payments.
 * 
 * @example
 * ```typescript
 * // Backend API Client
 * import { BanxaApiClient } from '@banxa/native-payments-sdk';
 * 
 * const client = new BanxaApiClient({
 *   apiKey: 'your-api-key',
 *   partner: 'your-partner-id',
 *   environment: 'sandbox'
 * });
 * 
 * // Create an order
 * const order = await client.createOrder({
 *   account_reference: 'user-123',
 *   source: 'AUD',
 *   target: 'USDT',
 *   source_amount: '100',
 *   wallet_address: '0x...',
 *   return_url_on_success: 'https://yoursite.com/success'
 * });
 * 
 * // Use the primerToken from the order response
 * const primerToken = order.primerToken;
 * ```
 * 
 * @example
 * ```html
 * <!-- Frontend Web Component -->
 * <banxa-primer-checkout
 *   client-token="${primerToken}"
 *   locale="en"
 *   layout-mode="preset"
 *   payment-methods="PAYMENT_CARD,APPLE_PAY">
 * </banxa-primer-checkout>
 * 
 * <script>
 *   const checkout = document.querySelector('banxa-primer-checkout');
 *   checkout.addEventListener('banxa:payment-success', (e) => {
 *     console.log('Payment successful!', e.detail);
 *   });
 * </script>
 * ```
 * 
 * @module @banxa/native-payments-sdk
 */

// API Client
export { BanxaApiClient, BanxaApiError } from './api/client.js';

// Types
export * from './types/index.js';

// Web Components
export { BanxaPrimerCheckout } from './web/components/banxa-primer-checkout.js';
export { BanxaHostedCheckout } from './web/components/banxa-hosted-checkout.js';
export {
  BanxaHostedKyc,
  BANXA_KYC_MESSAGE_TYPES,
  BANXA_KYC_EVENTS,
} from './web/components/banxa-hosted-kyc.js';

// Hosted KYC flow
export { runKycFlow } from './web/kyc-flow.js';
export type {
  KycFlowOptions,
  KycFlowSessionOptions,
  KycFlowClientOptions,
  KycFlowResult,
} from './web/kyc-flow.js';

// Checkout layout
export {
  buildCheckoutMarkup,
  buildPaymentMethodMarkup,
  resolveCheckoutLayout,
  parsePaymentMethodsAttribute,
  getEnabledPaymentMethodsFromLayout,
  DEFAULT_PRESET_LAYOUT,
  PAYMENT_METHOD_PRESETS,
} from './web/checkout-layout.js';

// Web utilities
export { loadPrimerSdk, isPrimerLoaded } from './web/primer-loader.js';
