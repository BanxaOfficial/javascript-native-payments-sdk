import type { CreateKycSessionRequest } from '../types/banxa.js';

/**
 * Builds the Banxa v2 POST /kyc/sessions JSON body.
 * Note: a field the partner did not supply is left out, not sent as null. Core fills a missing
 * country only and never overwrites one it holds, so null and absent do not mean the same thing.
 */
export function serializeCreateKycSessionRequest(
  request: CreateKycSessionRequest,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    externalCustomerId: request.externalCustomerId,
    tier: request.tier,
    country: request.country,
    returnUrl: request.returnUrl,
  };

  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}
