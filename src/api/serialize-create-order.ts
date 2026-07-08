import type { BanxaOrderTypePath, CreateOrderRequest } from '../types/banxa.js';

/**
 * Builds the Banxa v2 POST /buy JSON body (camelCase field names per API spec).
 */
export function serializeCreateOrderRequest(request: CreateOrderRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    crypto: request.crypto,
    fiat: request.fiat,
    walletAddress: request.walletAddress,
    redirectUrl: request.redirectUrl,
    externalCustomerId: request.externalCustomerId,
  };

  if (request.fiatAmount !== undefined) body.fiatAmount = request.fiatAmount;
  if (request.cryptoAmount !== undefined) body.cryptoAmount = request.cryptoAmount;
  if (request.blockchain !== undefined) body.blockchain = request.blockchain;
  if (request.paymentMethodId !== undefined) body.paymentMethodId = request.paymentMethodId;
  if (request.walletAddressTag !== undefined) body.walletAddressTag = request.walletAddressTag;
  if (request.subPartnerId !== undefined) body.subPartnerId = request.subPartnerId;
  if (request.metadata !== undefined) body.metadata = request.metadata;
  if (request.externalOrderId !== undefined) body.externalOrderId = request.externalOrderId;
  if (request.discountCode !== undefined) body.discountCode = request.discountCode;
  if (request.email !== undefined) body.email = request.email;

  return body;
}

/**
 * Builds the Banxa v2 POST /eligibility JSON body (buy/sell order fields + orderTypeId).
 */
export function serializeOrderEligibilityRequest(
  request: CreateOrderRequest,
  orderType: BanxaOrderTypePath = 'buy',
): Record<string, unknown> {
  return {
    ...serializeCreateOrderRequest(request),
    orderTypeId: orderType,
  };
}
