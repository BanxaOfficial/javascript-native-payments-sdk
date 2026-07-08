/**
 * Primer SDK Types
 *
 * Type definitions for Primer Checkout Web SDK.
 */

export interface PrimerCheckoutOptions {
  locale?: string;
  merchantDomain?: string;
  enabledPaymentMethods?: string[];
  disabledPayments?: string[];
  redirect?: PrimerRedirectOptions;
  card?: PrimerCardOptions;
  vault?: PrimerVaultOptions;
  applePay?: PrimerApplePayOptions;
  googlePay?: PrimerGooglePayOptions;
  klarna?: PrimerKlarnaOptions;
  adyenKlarna?: PrimerAdyenKlarnaOptions;
  submitButton?: PrimerSubmitButtonOptions;
  stripe?: PrimerStripeOptions;
}

export interface PrimerRedirectOptions {
  returnUrl?: string;
  forceRedirect?: boolean;
}

export interface PrimerCardOptions {
  cardholderName?: {
    required?: boolean;
  };
}

export interface PrimerVaultOptions {
  enabled?: boolean;
  headless?: boolean;
  showEmptyState?: boolean;
}

export interface PrimerApplePayOptions {
  buttonOptions?: {
    type?:
      | 'plain'
      | 'buy'
      | 'setUp'
      | 'donate'
      | 'checkOut'
      | 'book'
      | 'subscribe'
      | 'reload'
      | 'addMoney'
      | 'topUp'
      | 'order'
      | 'rent'
      | 'support'
      | 'contribute'
      | 'tip'
      | 'continue';
    style?: 'black' | 'white' | 'whiteOutline';
  };
  billingOptions?: {
    required?: boolean;
    modifiable?: boolean;
  };
  shippingOptions?: {
    required?: boolean;
    modifiable?: boolean;
    contactFields?: ('postalAddress' | 'name' | 'phoneticName' | 'phone' | 'email')[];
    requireShippingMethod?: boolean;
  };
}

export interface PrimerGooglePayOptions {
  buttonType?: 'book' | 'buy' | 'checkout' | 'donate' | 'order' | 'pay' | 'plain' | 'subscribe';
  buttonColor?: 'black' | 'white';
  buttonSizeMode?: 'static' | 'fill';
  buttonRadius?: number;
  buttonLocale?: string;
  captureBillingAddress?: boolean;
  captureShippingAddress?: boolean;
  shippingAddressParameters?: {
    allowedCountryCodes?: string[];
    phoneNumberRequired?: boolean;
  };
  requireShippingMethod?: boolean;
  emailRequired?: boolean;
  existingPaymentMethodRequired?: boolean;
}

export interface PrimerKlarnaOptions {
  paymentFlow?: 'payOverTime' | 'payNow' | 'payIn3' | 'payLater';
  recurringPaymentDescription?: string;
  allowedPaymentCategories?: string[];
  buttonOptions?: {
    text?: string;
  };
}

export interface PrimerAdyenKlarnaOptions {
  buttonOptions?: {
    text?: string;
  };
}

export interface PrimerSubmitButtonOptions {
  amountVisible?: boolean;
  useBuiltInButton?: boolean;
}

export interface PrimerStripeOptions {
  publishableKey?: string;
  mandateData?: {
    type?: 'subscription' | 'single_use';
    description?: string;
  };
}

// Event Types
export type PrimerEventType =
  | 'primer:ready'
  | 'primer:methods-update'
  | 'primer:state-change'
  | 'primer:bin-data-available'
  | 'primer:bin-data-loading-change'
  | 'primer:card-success'
  | 'primer:card-error'
  | 'primer:payment-start'
  | 'primer:payment-success'
  | 'primer:payment-failure'
  | 'primer:payment-cancel'
  | 'primer:vault-methods-update'
  | 'primer:vault-selection-change'
  | 'primer:show-other-payments-toggled';

export interface PrimerEventData {
  'primer:ready': PrimerReadyEventData;
  'primer:methods-update': PrimerMethodsUpdateEventData;
  'primer:state-change': PrimerStateChangeEventData;
  'primer:bin-data-available': PrimerBinDataAvailableEventData;
  'primer:bin-data-loading-change': PrimerBinDataLoadingChangeEventData;
  'primer:card-success': PrimerCardSuccessEventData;
  'primer:card-error': PrimerCardErrorEventData;
  'primer:payment-start': PrimerPaymentStartEventData;
  'primer:payment-success': PrimerPaymentSuccessEventData;
  'primer:payment-failure': PrimerPaymentFailureEventData;
  'primer:payment-cancel': PrimerPaymentCancelEventData;
}

export interface PrimerReadyEventData {
  paymentMethods: PrimerPaymentMethod[];
}

export interface PrimerMethodsUpdateEventData {
  paymentMethods: PrimerPaymentMethod[];
}

export interface PrimerPaymentMethod {
  type: string;
  displayName: string;
  iconUrl?: string;
}

export interface PrimerStateChangeEventData {
  state: PrimerSdkState;
}

export interface PrimerSdkState {
  availablePaymentMethods: PrimerPaymentMethod[];
  selectedPaymentMethod?: PrimerPaymentMethod;
  isLoading: boolean;
  error?: PrimerError;
}

export interface PrimerError {
  code: string;
  message: string;
}

export interface PrimerBinDataAvailableEventData {
  bin: string;
  bankName?: string;
  countryCode?: string;
  cardType?: string;
}

export interface PrimerBinDataLoadingChangeEventData {
  isLoading: boolean;
}

export interface PrimerCardSuccessEventData {
  paymentMethod: PrimerPaymentMethod;
}

export interface PrimerCardErrorEventData {
  errors: PrimerInputValidationError[];
}

export interface PrimerInputValidationError {
  field: string;
  message: string;
}

export interface PrimerPaymentStartEventData {
  paymentMethod: PrimerPaymentMethod;
  amount: number;
  currency: string;
}

export interface PrimerPaymentSuccessEventData {
  paymentMethod: PrimerPaymentMethod;
  amount: number;
  currency: string;
  transactionId: string;
  orderId: string;
}

export interface PrimerPaymentFailureEventData {
  paymentMethod: PrimerPaymentMethod;
  errorCode: string;
  errorMessage: string;
}

export interface PrimerPaymentCancelEventData {
  paymentMethod: PrimerPaymentMethod;
}

import type { CheckoutLayoutConfig } from './checkout-layout.js';

// Checkout component configuration
export interface CheckoutOptions extends PrimerCheckoutOptions {
  clientToken: string;
  customStyles?: string;
  loaderDisabled?: boolean;
  checkoutLayout?: CheckoutLayoutConfig;
}
