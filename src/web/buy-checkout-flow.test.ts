import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BanxaApiClient } from '../api/client.js';
import { runBuyCheckoutFlow } from './buy-checkout-flow.js';
import { BanxaHostedCheckout } from './components/banxa-hosted-checkout.js';
import { BanxaPrimerCheckout } from './components/banxa-primer-checkout.js';

vi.mock('./components/banxa-primer-checkout.js', async () => {
  const actual = await vi.importActual<typeof import('./components/banxa-primer-checkout.js')>(
    './components/banxa-primer-checkout.js',
  );
  return {
    ...actual,
    BanxaPrimerCheckout: class extends actual.BanxaPrimerCheckout {
      connectedCallback(): void {
        super.connectedCallback();
      }
    },
  };
});

vi.mock('./primer-loader.js', () => ({
  loadPrimerSdk: vi.fn().mockResolvedValue(undefined),
  isPrimerLoaded: vi.fn().mockReturnValue(false),
}));

describe('runBuyCheckoutFlow', () => {
  const request = {
    externalCustomerId: 'user-123',
    fiat: 'AUD',
    crypto: 'USDT',
    fiatAmount: '100',
    walletAddress: '0xabc',
    redirectUrl: 'https://app.example.com/return',
    paymentMethodId: 'debit-credit-card',
  };

  let container: HTMLDivElement;
  let client: BanxaApiClient;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    client = new BanxaApiClient({
      apiKey: 'test-key',
      partner: 'test-partner',
      environment: 'sandbox',
    });
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('should mount primer checkout when paymentReady and nativeToken are present', async () => {
    vi.spyOn(client, 'checkOrderEligibility').mockResolvedValue({
      eligible: true,
      paymentReady: true,
    });
    vi.spyOn(client, 'createOrder').mockResolvedValue({
      id: 'order-1',
      nativeToken: 'primer-token-123',
    });

    const result = await runBuyCheckoutFlow({
      client,
      request,
      container,
      primerCheckoutOptions: {
        merchantDomain: 'checkout.merchant.com',
      },
    });

    expect(result.mode).toBe('primer');
    expect(result.element).toBeInstanceOf(BanxaPrimerCheckout);
    expect((result.element as BanxaPrimerCheckout).clientToken).toBe('primer-token-123');
    expect((result.element as BanxaPrimerCheckout).merchantDomain).toBe('checkout.merchant.com');
    expect(container.querySelector('banxa-primer-checkout')).not.toBeNull();
  });

  it('should mount hosted iframe checkout when payment is not ready', async () => {
    vi.spyOn(client, 'checkOrderEligibility').mockResolvedValue({
      eligible: true,
      paymentReady: false,
      requirements: ['DOCUMENT'],
    });
    vi.spyOn(client, 'createOrder').mockResolvedValue({
      id: 'order-2',
      checkoutUrl: 'https://checkout.banxa.com/hosted-order',
    });

    const result = await runBuyCheckoutFlow({ client, request, container });

    expect(result.mode).toBe('hosted');
    expect(result.element).toBeInstanceOf(BanxaHostedCheckout);
    expect((result.element as BanxaHostedCheckout).checkoutUrl).toBe(
      'https://checkout.banxa.com/hosted-order',
    );
    expect((result.element as BanxaHostedCheckout).returnUrl).toBe(request.redirectUrl);
    expect(container.querySelector('banxa-hosted-checkout')).not.toBeNull();
    expect(container.querySelector('banxa-primer-checkout')).toBeNull();
  });

  it('should fall back to hosted checkout when paymentReady but no nativeToken', async () => {
    vi.spyOn(client, 'checkOrderEligibility').mockResolvedValue({
      eligible: true,
      paymentReady: true,
    });
    vi.spyOn(client, 'createOrder').mockResolvedValue({
      id: 'order-3',
      checkoutUrl: 'https://checkout.banxa.com/fallback',
    });

    const result = await runBuyCheckoutFlow({ client, request, container });

    expect(result.mode).toBe('hosted');
    expect(result.element).toBeInstanceOf(BanxaHostedCheckout);
  });

  it('should throw when order has neither nativeToken nor checkoutUrl', async () => {
    vi.spyOn(client, 'checkOrderEligibility').mockResolvedValue({
      eligible: false,
      paymentReady: false,
    });
    vi.spyOn(client, 'createOrder').mockResolvedValue({ id: 'order-4' });

    await expect(runBuyCheckoutFlow({ client, request, container })).rejects.toThrow(
      'Order has no nativeToken or checkoutUrl',
    );
  });
});
