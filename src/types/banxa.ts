/**
 * Banxa API Types
 *
 * Type definitions for Banxa API requests and responses.
 */

export type BanxaEnvironment = 'sandbox' | 'staging' | 'production';

export interface BanxaConfig {
  apiKey: string;
  partner: string;
  environment: BanxaEnvironment;
}

export interface BanxaApiErrorItem {
  code: string;
  message: string;
  field?: string;
}

export interface BanxaApiResponse<T> {
  data: T;
  errors?: BanxaApiErrorItem[];
}

// Currencies (Banxa v2: GET /fiats/{orderType}, GET /crypto/{orderType})
export type BanxaOrderTypePath = 'buy' | 'sell';

export interface FiatSupportedPaymentMethod {
  id: string;
  name: string;
  minimum?: string;
  maximum?: string;
}

export interface FiatCurrency {
  id: string;
  description: string;
  symbol: string;
  supportedPaymentMethods?: FiatSupportedPaymentMethod[];
}

export interface CryptoBlockchain {
  id: string;
  description: string;
  isDefaultBlockchain?: boolean;
  address?: string;
  network?: string;
  minimum?: string;
  unsupportedCountries?: Record<string, string[]>;
}

export interface CryptoCurrency {
  id: string;
  description: string;
  blockchains?: CryptoBlockchain[];
}

export interface CurrencyResponse {
  fiats: FiatCurrency[];
  cryptos: CryptoCurrency[];
}

// Countries
export interface Country {
  code: string;
  name: string;
  states?: State[];
}

export interface State {
  code: string;
  name: string;
}

// Payment Methods
export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: string;
  supported_fiats: string[];
  supported_cryptos: string[];
  supported_countries: string[];
  logo_url: string;
}

export interface PaymentMethodResponse {
  payment_methods: PaymentMethod[];
}

// Quotes (Banxa v2: GET /quotes/{orderType})
export interface QuoteRequest {
  fiat: string;
  crypto: string;
  blockchain: string;
  paymentMethodId: string;
  /** Either fiatAmount or cryptoAmount must be provided. If both are set, cryptoAmount is used. */
  fiatAmount?: string;
  cryptoAmount?: string;
  externalCustomerId?: string;
  ipAddress?: string;
  discountCode?: string;
}

export interface QuoteDiscountOriginalQuote {
  originalCryptoAmount?: string;
  /** Banxa API field name (typo preserved). */
  orginalNetworkFee?: string;
  originalProcessingFee?: string;
  originalFiatAmount?: string;
}

export interface QuoteDiscount {
  originalQuote?: QuoteDiscountOriginalQuote;
  discountCode?: string;
}

export interface Quote {
  paymentMethodId: string;
  cryptoAmount: string;
  fiatAmount: string;
  processingFee: string;
  networkFee: string;
  discount?: QuoteDiscount;
}

export interface Fee {
  type: string;
  amount: string;
  currency: string;
}

// Orders
export type OrderType = 'BUY' | 'SELL';
export type OrderStatus =
  | 'pendingPayment'
  | 'paymentReceived'
  | 'inProgress'
  | 'cryptoTransferInitiated'
  | 'cryptoTransferPending'
  | 'cryptoTransferComplete'
  | 'complete'
  | 'cancelled'
  | 'declined'
  | 'expired'
  | 'refunded';

export interface CreateOrderRequest {
  crypto: string;
  fiat: string;
  walletAddress: string;
  redirectUrl: string;
  externalCustomerId: string;
  /** Either fiatAmount or cryptoAmount must be provided. If both are set, cryptoAmount is used. */
  fiatAmount?: string;
  cryptoAmount?: string;
  blockchain?: string;
  paymentMethodId?: string;
  walletAddressTag?: string;
  subPartnerId?: string;
  metadata?: string;
  externalOrderId?: string;
  discountCode?: string;
  email?: string;
}

/** Response from POST /eligibility (same request body as POST /buy plus orderTypeId). */
export interface OrderEligibilityResponse {
  eligible: boolean;
  /** When true, the customer can proceed with native Primer checkout. */
  paymentReady?: boolean;
  message?: string;
  requirements?: string[];
}

/**
 * Verification depth requested for a hosted KYC session.
 */
export type KycTier = 'standard' | 'express' | 'enhanced';

/** Request body for POST /kyc/sessions. */
export interface CreateKycSessionRequest {
  externalCustomerId: string;
  /** Defaults to `standard` when omitted. */
  tier?: KycTier;
  country?: string;
  returnUrl?: string;
}

/** Response from POST /kyc/sessions. */
export interface KycSession {
  redirectUrl: string;
  expiresAt: string;
}

export interface CustomerDetails {
  email?: string;
  mobileNumber?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  address?: Address;
}

export interface Address {
  street?: string;
  sub_street?: string;
  state?: string;
  city?: string;
  postcode?: string;
  country?: string;
}

export interface Order {
  id: string;
  checkoutUrl?: string;
  externalId?: string;
  externalCustomerId?: string;
  fiat?: string;
  fiatAmount?: string;
  crypto?: string;
  cryptoAmount?: string;
  blockchain?: string;
  discountCode?: string;
  /** Primer client token for native payments checkout (Banxa API field: `nativeToken`). */
  nativeToken?: string;
  /** Legacy / get-order fields */
  account_reference?: string;
  status?: OrderStatus;
  status_date?: string;
  created_at?: string;
  updated_at?: string;
  order_type?: OrderType;
  source?: string;
  target?: string;
  source_amount?: string;
  target_amount?: string;
  payment_method?: PaymentMethodDetails;
  fees?: Fee[];
  payment_url?: string;
  meta_data?: Record<string, string>;
}

export interface PaymentMethodDetails {
  id: string;
  code: string;
  name: string;
}

// Customer Identity
export interface CustomerIdentityRequest {
  account_reference: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number?: string;
  dob?: string;
  address?: Address;
  identity_documents?: IdentityDocument[];
}

export interface IdentityDocument {
  type: string;
  number: string;
  issuing_country: string;
  front_image?: string;
  back_image?: string;
}

export interface SumsubTokenRequest {
  account_reference: string;
  sumsub_token: string;
}

// Webhooks
export interface WebhookPayload {
  order_id: string;
  status: OrderStatus;
  status_date: string;
  created_at: string;
  updated_at: string;
  external_id: string | null;
  order_type: OrderType;
  crypto_coin: string;
  crypto_blockchain: string;
  crypto_amount: string;
  fiat_currency: string;
  fiat_amount: string;
  asset_price: string;
  payment_method: string;
  processing_fee: string;
  network_fee: string;
  usd_exchange_rate: string;
  transaction_hash: string;
  metadata: Record<string, string>[];
}
