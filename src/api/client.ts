/**
 * Banxa API Client
 *
 * HTTP client for Banxa API with x-api-key authentication.
 */

import type {
  BanxaConfig,
  BanxaApiResponse,
  BanxaApiErrorItem,
  CurrencyResponse,
  Country,
  PaymentMethodResponse,
  QuoteRequest,
  Quote,
  CreateOrderRequest,
  Order,
  OrderEligibilityResponse,
  CreateKycSessionRequest,
  KycSession,
  BanxaEnvironment,
  BanxaOrderTypePath,
  FiatCurrency,
  CryptoCurrency,
} from '../types/banxa.js';
import {
  serializeCreateOrderRequest,
  serializeOrderEligibilityRequest,
} from './serialize-create-order.js';
import { serializeCreateKycSessionRequest } from './serialize-create-kyc-session.js';
import { createBanxaHeaders } from '../utils/headers.js';

export class BanxaApiClient {
  private readonly apiKey: string;
  private readonly partner: string;
  private readonly baseUrl: string;

  constructor(config: BanxaConfig) {
    this.apiKey = config.apiKey;
    this.partner = config.partner;
    this.baseUrl = this.getBaseUrl(config.environment);
  }

  private getBaseUrl(environment: BanxaEnvironment): string {
    switch (environment) {
      case 'sandbox':
        return `https://api.banxa-sandbox.com/${this.partner}/v2`;
      case 'staging':
        return `https://partner-api-int.stg.btccorp-stage-int.systems/${this.partner}/v2`;
      case 'production':
        return `https://api.banxa.com/${this.partner}/v2`;
      default:
        throw new Error(`Unsupported environment: ${environment}`);
    }
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = createBanxaHeaders(this.apiKey);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BanxaApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorText,
      );
    }

    const json = (await response.json()) as BanxaApiResponse<T> | T;

    if (
      json &&
      typeof json === 'object' &&
      'errors' in json &&
      Array.isArray(json.errors) &&
      json.errors.length > 0
    ) {
      throw new BanxaApiError(
        json.errors.map((e: BanxaApiErrorItem) => e.message).join(', '),
        response.status,
        undefined,
        json.errors,
      );
    }

    if (
      json &&
      typeof json === 'object' &&
      'data' in json &&
      (json as BanxaApiResponse<T>).data !== undefined
    ) {
      return (json as BanxaApiResponse<T>).data;
    }

    return json as T;
  }

  async getFiatCurrencies(orderType: BanxaOrderTypePath = 'buy'): Promise<FiatCurrency[]> {
    return this.request<FiatCurrency[]>('GET', `/fiats/${orderType}`);
  }

  async getCryptoCurrencies(orderType: BanxaOrderTypePath = 'buy'): Promise<CryptoCurrency[]> {
    return this.request<CryptoCurrency[]>('GET', `/crypto/${orderType}`);
  }

  async getCurrencies(orderType: BanxaOrderTypePath = 'buy'): Promise<CurrencyResponse> {
    const [fiats, cryptos] = await Promise.all([
      this.getFiatCurrencies(orderType),
      this.getCryptoCurrencies(orderType),
    ]);
    return { fiats, cryptos };
  }

  async getCountries(): Promise<Country[]> {
    return this.request<Country[]>('GET', '/countries');
  }

  async getPaymentMethods(
    source?: string,
    target?: string,
    country?: string,
  ): Promise<PaymentMethodResponse> {
    const params = new URLSearchParams();
    if (source) params.append('source', source);
    if (target) params.append('target', target);
    if (country) params.append('country', country);

    const query = params.toString();
    const endpoint = query ? `/payment-methods?${query}` : '/payment-methods';

    return this.request<PaymentMethodResponse>('GET', endpoint);
  }

  async getQuote(request: QuoteRequest, orderType: BanxaOrderTypePath = 'buy'): Promise<Quote> {
    const params = new URLSearchParams();
    params.append('fiat', request.fiat);
    params.append('crypto', request.crypto);
    params.append('blockchain', request.blockchain);
    params.append('paymentMethodId', request.paymentMethodId);

    if (request.cryptoAmount) params.append('cryptoAmount', request.cryptoAmount);
    if (request.fiatAmount) params.append('fiatAmount', request.fiatAmount);
    if (request.externalCustomerId) {
      params.append('externalCustomerId', request.externalCustomerId);
    }
    if (request.ipAddress) params.append('ipAddress', request.ipAddress);
    if (request.discountCode) params.append('discountCode', request.discountCode);

    return this.request<Quote>('GET', `/quotes/${orderType}?${params.toString()}`);
  }

  async checkOrderEligibility(
    request: CreateOrderRequest,
    orderType: BanxaOrderTypePath = 'buy',
  ): Promise<OrderEligibilityResponse> {
    return this.request<OrderEligibilityResponse>(
      'POST',
      '/eligibility',
      serializeOrderEligibilityRequest(request, orderType),
    );
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    return this.request<Order>('POST', '/buy', serializeCreateOrderRequest(request));
  }

  /**
   * Starts a hosted KYC session, so a customer can be verified before any order exists.
   */
  async createKycSession(request: CreateKycSessionRequest): Promise<KycSession> {
    return this.request<KycSession>(
      'POST',
      '/kyc/sessions',
      serializeCreateKycSessionRequest(request),
    );
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.request<Order>('GET', `/orders/${orderId}`);
  }
}

export class BanxaApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string,
    public readonly errors?: BanxaApiErrorItem[],
  ) {
    super(message);
    this.name = 'BanxaApiError';
  }
}
