import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runKycFlow } from './kyc-flow.js';
import type { BanxaApiClient } from '../api/client.js';
import type { KycSession } from '../types/banxa.js';

const SESSION: KycSession = {
  redirectUrl: 'https://checkout.banxa-sandbox.com/kyc-transit?d=abc123',
  expiresAt: '2099-01-01T00:00:00+00:00',
};

describe('runKycFlow', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('should mount a pre-created session without needing an API client', async () => {
    const result = await runKycFlow({ session: SESSION, container });

    expect(result.session).toEqual(SESSION);
    expect(container.querySelector('banxa-hosted-kyc')).not.toBeNull();
    expect(result.element.sessionUrl).toBe(SESSION.redirectUrl);
    expect(result.element.expiresAt).toBe(SESSION.expiresAt);
  });

  it('should create the session through the client when one is not supplied', async () => {
    const client = {
      createKycSession: vi.fn().mockResolvedValue(SESSION),
    } as unknown as BanxaApiClient;

    const result = await runKycFlow({
      client,
      request: { externalCustomerId: 'user-123', tier: 'standard' },
      container,
    });

    expect(client.createKycSession).toHaveBeenCalledWith({
      externalCustomerId: 'user-123',
      tier: 'standard',
    });
    expect(result.session).toEqual(SESSION);
    expect(result.element.sessionUrl).toBe(SESSION.redirectUrl);
  });

  it('should wire extra allowed origins onto the element', async () => {
    const result = await runKycFlow({
      session: SESSION,
      container,
      allowedOrigins: ['https://eu.banxa.com', 'https://au.banxa.com'],
    });

    expect(result.element.allowedOrigins).toBe('https://eu.banxa.com,https://au.banxa.com');
  });

  it('should replace anything already in the container', async () => {
    container.appendChild(document.createElement('p'));

    await runKycFlow({ session: SESSION, container });

    expect(container.querySelectorAll('p')).toHaveLength(0);
    expect(container.children).toHaveLength(1);
  });

  it('should reject when given neither a session nor a client', async () => {
    await expect(
      runKycFlow({ container } as unknown as Parameters<typeof runKycFlow>[0]),
    ).rejects.toThrow(/session|client/i);
  });
});
