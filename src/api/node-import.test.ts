/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const distDir = join(dirname(fileURLToPath(import.meta.url)), '../../dist');

describe('node API import', () => {
  it('imports BanxaApiClient from built api.mjs without DOM', async () => {
    const apiUrl = new URL('api.mjs', `file://${distDir}/`).href;
    const { BanxaApiClient } = await import(apiUrl);

    const client = new BanxaApiClient({
      apiKey: 'key',
      partner: 'partner',
      environment: 'sandbox',
    });

    expect(client).toBeDefined();
  });
});
