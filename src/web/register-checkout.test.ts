import { describe, it, expect } from 'vitest';
import { registerBanxaHostedKyc, registerBanxaElements } from './register-checkout.js';
import { BanxaHostedKyc } from './components/banxa-hosted-kyc.js';

describe('hosted KYC element registration', () => {
  it('should define <banxa-hosted-kyc>', () => {
    registerBanxaHostedKyc();
    expect(customElements.get('banxa-hosted-kyc')).toBe(BanxaHostedKyc);
  });

  it('should be idempotent', () => {
    registerBanxaHostedKyc();
    expect(() => registerBanxaHostedKyc()).not.toThrow();
  });

  it('should register every element via registerBanxaElements', () => {
    registerBanxaElements();
    for (const tag of ['banxa-primer-checkout', 'banxa-hosted-checkout', 'banxa-hosted-kyc']) {
      expect(customElements.get(tag), tag).toBeDefined();
    }
  });
});
