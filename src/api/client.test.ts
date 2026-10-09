import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BanxaApiClient, BanxaApiError } from './client.js';

describe('BanxaApiClient', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    partner: 'test-partner',
    environment: 'sandbox' as const,
  };

  let client: BanxaApiClient;

  beforeEach(() => {
    client = new BanxaApiClient(mockConfig);
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with sandbox environment', () => {
      const sandboxClient = new BanxaApiClient({
        ...mockConfig,
        environment: 'sandbox',
      });
      expect(sandboxClient).toBeDefined();
    });

    it('should create client with production environment', () => {
      const prodClient = new BanxaApiClient({
        ...mockConfig,
        environment: 'production',
      });
      expect(prodClient).toBeDefined();
    });

    it('should use staging base URL for currency endpoints', async () => {
      const stagingClient = new BanxaApiClient({
        ...mockConfig,
        environment: 'staging',
      });

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ data: [{ id: 'USD', description: 'US Dollar', symbol: '$' }] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: 'BTC', description: 'Bitcoin' }] }),
        } as Response);

      await stagingClient.getCurrencies();

      expect(fetch).toHaveBeenCalledWith(
        'https://partner-api-int.stg.btccorp-stage-int.systems/test-partner/v2/fiats/buy',
        expect.any(Object),
      );
      expect(fetch).toHaveBeenCalledWith(
        'https://partner-api-int.stg.btccorp-stage-int.systems/test-partner/v2/crypto/buy',
        expect.any(Object),
      );
    });
  });

  describe('getCurrencies', () => {
    it('should fetch fiats and crypto from v2 endpoints', async () => {
      const mockFiats = [{ id: 'USD', description: 'US Dollar', symbol: '$' }];
      const mockCryptos = [{ id: 'BTC', description: 'Bitcoin' }];

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockFiats }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockCryptos }),
        } as Response);

      const result = await client.getCurrencies();

      expect(result).toEqual({ fiats: mockFiats, cryptos: mockCryptos });
      expect(fetch).toHaveBeenCalledWith(
        'https://api.banxa-sandbox.com/test-partner/v2/fiats/buy',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key',
          },
        }),
      );
      expect(fetch).toHaveBeenCalledWith(
        'https://api.banxa-sandbox.com/test-partner/v2/crypto/buy',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should pass orderType to fiat and crypto endpoints', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        } as Response);

      await client.getCurrencies('sell');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.banxa-sandbox.com/test-partner/v2/fiats/sell',
        expect.any(Object),
      );
      expect(fetch).toHaveBeenCalledWith(
        'https://api.banxa-sandbox.com/test-partner/v2/crypto/sell',
        expect.any(Object),
      );
    });

    it('should throw error on API failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      await expect(client.getCurrencies()).rejects.toThrow(BanxaApiError);
    });
  });

  describe('getFiatCurrencies', () => {
    it('should fetch fiats directly', async () => {
      const mockFiats = [{ id: 'EUR', description: 'Euro', symbol: '€' }];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockFiats }),
      } as Response);

      const result = await client.getFiatCurrencies();

      expect(result).toEqual(mockFiats);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.banxa-sandbox.com/test-partner/v2/fiats/buy',
        expect.any(Object),
      );
    });
  });

  describe('getCryptoCurrencies', () => {
    it('should fetch crypto directly', async () => {
      const mockCryptos = [{ id: 'ETH', description: 'Ethereum' }];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockCryptos }),
      } as Response);

      const result = await client.getCryptoCurrencies();

      expect(result).toEqual(mockCryptos);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.banxa-sandbox.com/test-partner/v2/crypto/buy',
        expect.any(Object),
      );
    });
  });

  describe('checkOrderEligibility', () => {
    it('should post eligibility with buy order body and orderTypeId', async () => {
      const mockEligibility = {
        eligible: true,
        paymentReady: true,
        requirements: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockEligibility),
      } as Response);

      const request = {
        externalCustomerId: 'user-123',
        fiat: 'AUD',
        crypto: 'USDT',
        fiatAmount: '100',
        walletAddress: '0xabc',
        redirectUrl: 'https://example.com/done',
        paymentMethodId: 'debit-credit-card',
        blockchain: 'TRON',
      };

      const result = await client.checkOrderEligibility(request);

      expect(result).toEqual(mockEligibility);
      const call = vi.mocked(fetch).mock.calls[0];
      expect(call[0]).toBe('https://api.banxa-sandbox.com/test-partner/v2/eligibility');
      expect(call[1]?.method).toBe('POST');

      const body = JSON.parse(call[1]?.body as string);
      expect(body).toEqual({
        crypto: 'USDT',
        fiat: 'AUD',
        walletAddress: '0xabc',
        redirectUrl: 'https://example.com/done',
        externalCustomerId: 'user-123',
        fiatAmount: '100',
        paymentMethodId: 'debit-credit-card',
        blockchain: 'TRON',
        orderTypeId: 'buy',
      });
    });

    it('should pass orderType as orderTypeId for sell eligibility', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { eligible: false, paymentReady: false } }),
      } as Response);

      await client.checkOrderEligibility(
        {
          externalCustomerId: 'user-123',
          fiat: 'USD',
          crypto: 'BTC',
          fiatAmount: '50',
          walletAddress: '0x123',
          redirectUrl: 'https://example.com/done',
        },
        'sell',
      );

      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(body.orderTypeId).toBe('sell');
    });
  });

  describe('createOrder', () => {
    it('should create order with nativeToken in response', async () => {
      const mockOrder = {
        id: 'order-123',
        externalCustomerId: 'user-123',
        fiat: 'USD',
        crypto: 'BTC',
        fiatAmount: '100',
        cryptoAmount: '0.001',
        nativeToken: 'test-primer-token',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOrder),
      } as Response);

      const result = await client.createOrder({
        externalCustomerId: 'user-123',
        fiat: 'USD',
        crypto: 'BTC',
        fiatAmount: '100',
        walletAddress: '0x123',
        redirectUrl: 'https://example.com/done',
        paymentMethodId: 'debit-credit-card',
      });

      expect(result.nativeToken).toBe('test-primer-token');
      expect(result.id).toBe('order-123');
    });

    it('should send v2 camelCase buy body with crypto and fiat fields', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'order-123' }),
      } as Response);

      await client.createOrder({
        externalCustomerId: 'user-123',
        fiat: 'AUD',
        crypto: 'USDT',
        fiatAmount: '100',
        walletAddress: '0xabc',
        redirectUrl: 'https://example.com/done',
        paymentMethodId: 'debit-credit-card',
        blockchain: 'TRON',
      });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);

      expect(body).toEqual({
        crypto: 'USDT',
        fiat: 'AUD',
        walletAddress: '0xabc',
        redirectUrl: 'https://example.com/done',
        externalCustomerId: 'user-123',
        fiatAmount: '100',
        paymentMethodId: 'debit-credit-card',
        blockchain: 'TRON',
      });
      expect(body.source).toBeUndefined();
      expect(body.target).toBeUndefined();
      expect(body.account_reference).toBeUndefined();
    });
  });

  describe('getQuote', () => {
    it('should fetch quote from v2 endpoint with camelCase query params', async () => {
      const mockQuote = {
        data: {
          paymentMethodId: 'debit-credit-card',
          cryptoAmount: '0.03564700',
          fiatAmount: '100.00',
          processingFee: '0.92',
          networkFee: '1.67',
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQuote),
      } as Response);

      const result = await client.getQuote({
        fiat: 'USD',
        crypto: 'BTC',
        blockchain: 'BITCOIN',
        paymentMethodId: 'debit-credit-card',
        fiatAmount: '100',
      });

      expect(result).toEqual(mockQuote.data);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.banxa-sandbox.com/test-partner/v2/quotes/buy?fiat=USD&crypto=BTC&blockchain=BITCOIN&paymentMethodId=debit-credit-card&fiatAmount=100',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should pass orderType in quote path', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              paymentMethodId: 'card',
              cryptoAmount: '1',
              fiatAmount: '100',
              processingFee: '0',
              networkFee: '0',
            },
          }),
      } as Response);

      await client.getQuote(
        {
          fiat: 'USD',
          crypto: 'ETH',
          blockchain: 'ETHEREUM',
          paymentMethodId: 'card',
          cryptoAmount: '1',
        },
        'sell',
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/quotes/sell?'),
        expect.any(Object),
      );
    });
  });

  describe('createKycSession', () => {
    const mockSession = {
      data: {
        redirectUrl: 'https://checkout.banxa-sandbox.com/kyc-transit?d=abc123',
        expiresAt: '2026-09-23T11:00:00+00:00',
      },
    };

    it('should POST to /kyc/sessions and return the session', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSession),
      } as Response);

      const result = await client.createKycSession({ externalCustomerId: 'user-123' });

      expect(result).toEqual(mockSession.data);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.banxa-sandbox.com/test-partner/v2/kyc/sessions',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should omit optional fields the partner did not supply', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSession),
      } as Response);

      await client.createKycSession({ externalCustomerId: 'user-123' });

      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body).toEqual({ externalCustomerId: 'user-123' });
    });

    it('should send tier, country and returnUrl when supplied', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSession),
      } as Response);

      await client.createKycSession({
        externalCustomerId: 'user-123',
        tier: 'enhanced',
        country: 'AU',
        returnUrl: 'myapp://kyc/done',
      });

      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body).toEqual({
        externalCustomerId: 'user-123',
        tier: 'enhanced',
        country: 'AU',
        returnUrl: 'myapp://kyc/done',
      });
    });

    it('should surface a 403 with its status code so "not enabled" is distinguishable from "retry"', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('{"message":"Hosted KYC is not enabled for this merchant."}'),
      } as Response);

      await expect(client.createKycSession({ externalCustomerId: 'user-123' })).rejects.toThrow(
        BanxaApiError,
      );

      await expect(
        client.createKycSession({ externalCustomerId: 'user-123' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
