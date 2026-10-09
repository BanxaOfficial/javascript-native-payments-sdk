# Banxa Native Payments SDK

A TypeScript SDK for Banxa merchant partners integrating [Primer](https://primer.io) native payments. It provides a **Node-safe REST client** for the Banxa v2 API and **browser web components** for native Primer checkout, hosted Banxa checkout, and hosted KYC.

## Features

- **Backend API client** (`BanxaApiClient`) — Node-safe; no DOM or web component code on import
- **Native checkout** (`<banxa-primer-checkout>`) — configurable Primer checkout layouts
- **Hosted checkout** (`<banxa-hosted-checkout>`) — iframe fallback when native payments are not ready
- **Buy flow helper** (`runBuyCheckoutFlow`) — eligibility check, order creation, and automatic UI selection
- **Hosted KYC** (`<banxa-hosted-kyc>`, `runKycFlow`) — verify a customer before any order exists, to unlock native payments — see [Hosted KYC](#hosted-kyc)
- **x-api-key authentication** for all Banxa API requests
- **TypeScript** types for Banxa API and Primer checkout
- **Dual module output** (ESM + CJS) with separate `/api` and `/web` entry points

## Installation

```bash
npm install @banxa/native-payments-sdk
```

For the checkout web component, install the Primer peer dependency:

```bash
npm install @primer-io/primer-js
```

## Entry points

| Import | Environment | Exports |
|--------|-------------|---------|
| `@banxa/native-payments-sdk` | Node / server | Same as `/api` |
| `@banxa/native-payments-sdk/api` | Node / server | `BanxaApiClient`, `BanxaApiError`, Banxa API types |
| `@banxa/native-payments-sdk/web` | Browser | `registerBanxaCheckout`, `registerBanxaPrimerCheckout`, `registerBanxaHostedCheckout`, `BanxaPrimerCheckout`, `BanxaHostedCheckout`, `runBuyCheckoutFlow`, `loadPrimerSdk`, `isPrimerLoaded`, `DEFAULT_CARD_FORM_HTML`, `PrimerPaymentMethodTypes`, checkout + Primer types |

The web entry does **not** auto-register custom elements. Call `registerBanxaCheckout()` (or register components individually) before using them in HTML.

## Quick start

### 1. Backend — create an order

```typescript
import { BanxaApiClient } from '@banxa/native-payments-sdk';

const client = new BanxaApiClient({
  apiKey: process.env.BANXA_API_KEY!,
  partner: process.env.BANXA_PARTNER!,
  environment: 'sandbox', // 'sandbox' | 'production'
});

const order = await client.createOrder({
  externalCustomerId: 'user-123',
  fiat: 'AUD',
  crypto: 'USDT',
  fiatAmount: '100', // or cryptoAmount — at least one is required
  walletAddress: '0x1234567890abcdef...',
  redirectUrl: 'https://yoursite.com/order-complete',
  paymentMethodId: 'debit-credit-card', // optional
  blockchain: 'TRON', // optional
});

// Native payments: use the Primer token from the create-order response
const nativeToken = order.nativeToken;
```

`createOrder` calls `POST /v2/buy` with camelCase JSON matching the [Banxa v2 buy order API](https://docs.banxa.com/products/hosted-checkout/openapi/other/create-a-buy-order).

### 2. Frontend — render checkout

```html
<script type="module">
  import { registerBanxaPrimerCheckout } from '@banxa/native-payments-sdk/web';

  registerBanxaPrimerCheckout();
</script>

<banxa-primer-checkout id="checkout" locale="en"></banxa-primer-checkout>

<script type="module">
  const response = await fetch('/api/create-order', { method: 'POST', /* ... */ });
  const { nativeToken } = await response.json();

  const checkout = document.getElementById('checkout');
  checkout.clientToken = nativeToken;

  checkout.addEventListener('banxa:payment-success', (event) => {
    console.log('Payment successful!', event.detail);
  });

  checkout.addEventListener('banxa:payment-failure', (event) => {
    console.error('Payment failed:', event.detail);
  });
</script>
```

Set `client-token` via the `clientToken` property (or attribute) after your backend returns `nativeToken` from `createOrder`.

## API reference

### `BanxaApiClient`

```typescript
class BanxaApiClient {
  constructor(config: {
    apiKey: string;
    partner: string;
    environment: 'sandbox' | 'staging' | 'production';
  });

  // GET /fiats/{orderType} + GET /crypto/{orderType} (default orderType: 'buy')
  getCurrencies(orderType?: 'buy' | 'sell'): Promise<CurrencyResponse>;
  getFiatCurrencies(orderType?: 'buy' | 'sell'): Promise<FiatCurrency[]>;
  getCryptoCurrencies(orderType?: 'buy' | 'sell'): Promise<CryptoCurrency[]>;

  // GET /countries
  getCountries(): Promise<Country[]>;

  // GET /payment-methods?…
  getPaymentMethods(source?: string, target?: string, country?: string): Promise<PaymentMethodResponse>;

  // GET /quotes/{orderType}?…
  getQuote(request: QuoteRequest, orderType?: 'buy' | 'sell'): Promise<Quote>;

  // POST /eligibility (same body as POST /buy + orderTypeId)
  checkOrderEligibility(request: CreateOrderRequest, orderType?: 'buy' | 'sell'): Promise<OrderEligibilityResponse>;

  // POST /buy
  createOrder(request: CreateOrderRequest): Promise<Order>;

  // GET /orders/{orderId}
  getOrder(orderId: string): Promise<Order>;

  // POST /kyc/sessions — verify a customer before any order exists
  createKycSession(request: CreateKycSessionRequest): Promise<KycSession>;
}
```

API failures throw `BanxaApiError` with `statusCode`, optional `responseBody`, and optional `errors` (`BanxaApiErrorItem[]`).

### `CreateOrderRequest`

| Field | Required | Description |
|-------|----------|-------------|
| `externalCustomerId` | Yes | Your customer reference (same value as identity/eligibility flows) |
| `fiat` | Yes | Fiat currency code (e.g. `AUD`, `USD`) |
| `crypto` | Yes | Crypto currency code (e.g. `USDT`, `BTC`) |
| `walletAddress` | Yes | Customer wallet address |
| `redirectUrl` | Yes | URL after checkout completes, fails, or is cancelled |
| `fiatAmount` | One of* | Fiat amount to buy |
| `cryptoAmount` | One of* | Crypto amount to buy |
| `paymentMethodId` | No | Pre-select payment method (e.g. `debit-credit-card`) |
| `blockchain` | No | Blockchain network for the crypto token |
| `walletAddressTag` | No | Memo/tag for wallets that require it |
| `externalOrderId` | No | Your order reference |
| `discountCode` | No | Promotion / discount code |
| `email` | No | Pre-fill customer email |
| `metadata` | No | Opaque string returned on order lookup |
| `subPartnerId` | No | Channel identifier (exchange, wallet, web, etc.) |

\*Provide `fiatAmount` or `cryptoAmount`. If both are set, Banxa uses `cryptoAmount`.

### `OrderEligibilityResponse` (`POST /eligibility`)

Uses the same request body as `createOrder` plus `orderTypeId` (`buy` or `sell`). Check `paymentReady` before native Primer checkout — when `false`, use hosted checkout (`checkoutUrl`) instead.

| Field | Description |
|-------|-------------|
| `eligible` | Whether the order context is eligible |
| `paymentReady` | When `true`, customer can use native Primer checkout |
| `requirements` | Outstanding KYC/compliance requirements (when not payment-ready) |
| `message` | Optional human-readable detail |

### `QuoteRequest`

| Field | Required | Description |
|-------|----------|-------------|
| `fiat` | Yes | Fiat currency code |
| `crypto` | Yes | Crypto currency code |
| `blockchain` | Yes | Blockchain network |
| `paymentMethodId` | Yes | Payment method ID |
| `fiatAmount` | One of* | Fiat amount |
| `cryptoAmount` | One of* | Crypto amount |
| `externalCustomerId` | No | Customer reference for pricing |
| `ipAddress` | No | User IP for geo validation |
| `discountCode` | No | Discount code |

### `Order` (create-order response)

Common fields from `POST /buy`:

| Field | Description |
|-------|-------------|
| `id` | Banxa order ID |
| `nativeToken` | Primer client token for `<banxa-primer-checkout>` (native payments) |
| `checkoutUrl` | Hosted checkout URL (when not using native Primer flow) |
| `fiat`, `fiatAmount`, `crypto`, `cryptoAmount`, `blockchain` | Order amounts and assets |
| `externalCustomerId`, `externalId` | Customer / external references |

`getOrder` may also return legacy snake_case fields (`status`, `source`, `target`, etc.).

### `CreateKycSessionRequest` / `KycSession` (`POST /kyc/sessions`)

| Field | Required | Description |
|-------|----------|-------------|
| `externalCustomerId` | Yes | Your customer reference. Max 255 characters — longer values are rejected, not truncated |
| `tier` | No | `standard` (default), `express` or `enhanced` |
| `country` | No | ISO 3166-1 alpha-2 hint; the customer confirms it in the flow |
| `returnUrl` | No | Where the customer is sent afterwards. URL or app deep link |

Response:

| Field | Description |
|-------|-------------|
| `redirectUrl` | One-time link into the hosted verification flow |
| `expiresAt` | ISO-8601 — the life of the link |

Sessions are idempotent per (merchant, `externalCustomerId`) for one hour, so a repeat request
returns the original link. `express` resolves to the region's standard band here, because a session
created before an order has no payment provider to supply identity data.

### Currency types (v2)

`FiatCurrency`: `id`, `description`, `symbol`, optional `supportedPaymentMethods`

`CryptoCurrency`: `id`, `description`, optional `blockchains`

## Web component

### Registration

```typescript
import { registerBanxaCheckout } from '@banxa/native-payments-sdk/web';

registerBanxaCheckout(); // registers <banxa-primer-checkout> and <banxa-hosted-checkout>
```

Or register individually:

```typescript
import { registerBanxaPrimerCheckout, registerBanxaHostedCheckout, registerBanxaHostedKyc } from '@banxa/native-payments-sdk/web';
```

`registerBanxaElements()` registers all three, including `<banxa-hosted-kyc>`.

### Eligibility-aware buy flow

When `checkOrderEligibility` returns `paymentReady: false`, use hosted checkout in an iframe instead of native Primer. `runBuyCheckoutFlow` handles this automatically:

```typescript
import { BanxaApiClient } from '@banxa/native-payments-sdk';
import { runBuyCheckoutFlow } from '@banxa/native-payments-sdk/web';

const client = new BanxaApiClient({ apiKey, partner, environment: 'sandbox' });
const container = document.getElementById('checkout')!;

const { mode, order, element } = await runBuyCheckoutFlow({
  client,
  request: {
    externalCustomerId: 'user-123',
    fiat: 'AUD',
    crypto: 'USDT',
    fiatAmount: '100',
    walletAddress: '0xabc',
    redirectUrl: `${window.location.origin}/checkout/return`,
    paymentMethodId: 'debit-credit-card',
  },
  container,
});

if (mode === 'primer') {
  element.addEventListener('banxa:payment-success', () => { /* ... */ });
} else {
  element.addEventListener('banxa:checkout-success', () => { /* hosted iframe completed */ });
}
```

| `paymentReady` | `nativeToken` | Result |
|----------------|---------------|--------|
| `true` | present | `<banxa-primer-checkout>` (native Primer) |
| `false` or no token | `checkoutUrl` present | `<banxa-hosted-checkout>` (iframe) |

`runBuyCheckoutFlow` options:

| Option | Description |
|--------|-------------|
| `skipEligibilityCheck` | Skip `POST /eligibility` and assume payment-ready |
| `primerCheckoutOptions` | Pass-through for `locale`, `merchantDomain`, `layoutMode`, `checkoutLayout`, `checkoutTemplate`, `loaderDisabled`, `customStyles` on native checkout |

Use the same `redirectUrl` on your checkout page origin so the iframe can detect return navigation when Banxa redirects after KYC or payment.

### `<banxa-primer-checkout>`

| Attribute | Description |
|-----------|-------------|
| `client-token` | **Required.** Primer client token (`order.nativeToken` from `createOrder`) |
| `locale` | Locale string (e.g. `en`) |
| `merchant-domain` | Merchant domain passed to Primer as `options.merchantDomain` |
| `layout-mode` | `preset` (default), `auto`, or `custom` |
| `payment-methods` | Comma-separated Primer types for preset mode (e.g. `PAYMENT_CARD,APPLE_PAY`) |
| `loader-disabled` | Disable the loading placeholder |
| `custom-styles` | CSS string injected into the component shadow root |

### Properties

| Property | Description |
|----------|-------------|
| `clientToken` | Get/set `client-token` attribute |
| `locale` | Get/set locale |
| `merchantDomain` | Get/set `merchant-domain` attribute |
| `layoutMode` | Get/set `layout-mode` |
| `paymentMethods` | Get/set `payment-methods` |
| `checkoutLayout` | Programmatic `CheckoutLayoutConfig` (merged with attributes) |
| `checkoutTemplate` | Raw HTML for custom layout mode |
| `loaderDisabled` | Get/set loading placeholder |
| `customStyles` | Get/set custom CSS |

### Methods

| Method | Description |
|--------|-------------|
| `refreshSession()` | Delegates to Primer `primerJS.refreshSession()` when available |

### Events

Primer events are re-emitted on the host element with a `banxa:` prefix:

| Event | Description |
|-------|-------------|
| `banxa:ready` | Checkout ready |
| `banxa:payment-start` | Payment started |
| `banxa:payment-success` | Payment succeeded |
| `banxa:payment-failure` | Payment failed |
| `banxa:payment-cancel` | Payment cancelled |
| `banxa:state-change` | Primer SDK state changed |
| `banxa:methods-update` | Available payment methods updated |
| `banxa:card-success` / `banxa:card-error` | Card validation events |
| `banxa:bin-data-available` / `banxa:bin-data-loading-change` | Card BIN lookup events |
| `checkout-error` | SDK failed to load or initialize (not prefixed) |

Event `detail` objects are sanitized for JSON serialization (DOM nodes and circular references are replaced with string placeholders).

Use native `addEventListener` on the element.

### Layout modes

| Mode | Behavior |
|------|----------|
| `preset` (default) | Builds markup from `paymentMethods` (default: card + Apple Pay). Card payments use a standalone `<primer-card-form>` with slotted fields from `DEFAULT_CARD_FORM_HTML`. |
| `auto` | Omits the payments slot so Primer renders all session payment methods. |
| `custom` | Uses `checkoutTemplate`, `checkoutLayout.mainHtml`, or a `<template slot="checkout-layout">` child for full control. |

Preset mode renders each configured method individually when a card is included (so the card form markup is applied). When no card is present and all entries are simple presets, a `<primer-payment-method-container>` is used instead.

Custom card forms (`cardFormHtml`) must use Primer hosted input components only — raw HTML inputs cannot host PCI card data. In preset mode, `cardFormHtml` is ignored with a console warning; use `custom` layout mode or the checkout-layout slot instead.

### Layout example

```typescript
import { registerBanxaPrimerCheckout, PrimerPaymentMethodTypes } from '@banxa/native-payments-sdk/web';

registerBanxaPrimerCheckout();

const checkout = document.querySelector('banxa-primer-checkout');
checkout.checkoutLayout = {
  mode: 'preset',
  paymentMethods: [
    { type: PrimerPaymentMethodTypes.PAYMENT_CARD },
    { type: PrimerPaymentMethodTypes.APPLE_PAY },
  ],
};
```

Or supply a full template via the checkout-layout slot:

```html
<banxa-primer-checkout client-token="…">
  <template slot="checkout-layout">
    <primer-checkout>
      <primer-main slot="main">
        <div slot="payments"><!-- your Primer markup --></div>
      </primer-main>
    </primer-checkout>
  </template>
</banxa-primer-checkout>
```

### `<banxa-hosted-checkout>`

Embeds Banxa hosted checkout (`order.checkoutUrl`) in an iframe. Use when eligibility is not payment-ready or when the order has no `nativeToken`.

| Attribute | Description |
|-----------|-------------|
| `checkout-url` | **Required.** Hosted checkout URL from `createOrder` |
| `return-url` | Redirect URL base for success, failure, and cancel detection |
| `return-url-success` | Optional override for success detection |
| `return-url-failure` | Optional override for failure detection |
| `return-url-cancelled` | Optional override for cancel detection |
| `iframe-title` | Accessible iframe title (default: `Banxa checkout`) |
| `custom-styles` | CSS injected into the shadow root |

| Event | Description |
|-------|-------------|
| `banxa:checkout-success` | Iframe navigated to return success URL |
| `banxa:checkout-failure` | Iframe navigated to return failure URL |
| `banxa:checkout-cancelled` | Iframe navigated to return cancel URL |

For verification rather than checkout, see [Hosted KYC](#hosted-kyc).

## Hosted KYC

Verify a customer **before any order exists**, so partners who do not run their own KYC can still
use native payments. Request types are in the [API reference](#createkycsessionrequest--kycsession-post-kycsessions).

### 1. Backend — create a verification session

```typescript
import { BanxaApiClient } from '@banxa/native-payments-sdk/api';

const client = new BanxaApiClient({
  apiKey: process.env.BANXA_API_KEY!,
  partner: process.env.BANXA_PARTNER!,
  environment: 'sandbox', // 'sandbox' | 'production'
});

const session = await client.createKycSession({
  externalCustomerId: 'user-123',
  tier: 'standard', // optional — 'standard' | 'express' | 'enhanced'
  country: 'AU', // optional
  returnUrl: 'https://yoursite.com/kyc/done', // optional; a deep link works too
});

// Hand redirectUrl and expiresAt to the browser
const { redirectUrl, expiresAt } = session;
```

`createKycSession` calls `POST /v2/kyc/sessions`. The API key must never reach the browser, and
`returnUrl` is set here rather than on the element — the hosted flow reads it from the session.

### 2. Frontend — mount the flow

```html
<div id="kyc"></div>

<script type="module">
  import { runKycFlow } from '@banxa/native-payments-sdk/web';

  const session = await (await fetch('/api/kyc-session')).json();

  const { element } = await runKycFlow({
    session,
    container: document.getElementById('kyc'),
  });

  element.addEventListener('banxa:kyc-complete', () => {
    showPendingScreen();
  });

  element.addEventListener('banxa:kyc-error', (event) => {
    console.error('Verification error', event.detail);
  });
</script>
```

`runKycFlow` registers `<banxa-hosted-kyc>`, mounts the session, and returns the element. Sessions
are idempotent per customer for an hour, so remounting is safe.

> **`banxa:kyc-complete` does not mean verified.** It means *submitted and under review* — the
> identity provider decides asynchronously. Wait for the merchant webhook before creating an order.
> There is deliberately no status endpoint to poll.

Once the webhook reports the customer verified, create the order as usual — `checkOrderEligibility`
returns `paymentReady: true` and the customer gets native Primer checkout instead of hosted.

### `<banxa-hosted-kyc>`

Embeds the Banxa hosted verification flow (`session.redirectUrl`) in an iframe. Use it to verify a customer before any order exists. Every attribute takes effect after mount, not only before it.

| Attribute | Description |
|-----------|-------------|
| `session-url` | **Required.** `redirectUrl` from `createKycSession` |
| `expires-at` | `expiresAt` from the session. An expired link is refused rather than mounted |
| `iframe-title` | Accessible iframe title (default: `Banxa verification`) |
| `custom-styles` | CSS injected into the shadow root |
| `allowed-origins` | Comma-separated extra origins whose messages are accepted, on top of the session link's own |

| Event | Description |
|-------|-------------|
| `banxa:kyc-complete` | The customer finished and is **under review**. Fires once per session |
| `banxa:kyc-error` | Verification reported an error, or the session had already expired |
| `banxa:kyc-ready` | The hosted flow rendered |
| `banxa:kyc-loading` | The hosted flow is loading |
| `banxa:kyc-message-rejected` | Diagnostic — a `banxa:*` message arrived but was not accepted |

`runKycFlow` also accepts `{ client, request }` instead of `{ session }` for local development.
Avoid it in production: `BanxaApiClient` carries your partner API key, and constructing it in the
browser publishes that key to everyone who loads the page.

### Camera and microphone

Document and liveness capture run inside the iframe, so the SDK always mounts it with
`allow="camera; microphone"`. That is a Permissions Policy grant, separate from `sandbox` — without
it `getUserMedia()` is rejected and capture fails. Set it yourself if you mount your own iframe.

### Merchant configuration

`banxa:kyc-complete` requires the merchant to be set up for embedded mode —
`embeddedButtonOnlyIframeEnabled`, and `embeddedAPMerchantDomain` matching the origin serving your
page. Ask your Banxa contact to set both.

| Embedded mode | What you get |
|---|---|
| Configured | `banxa:kyc-complete` on the element |
| Not configured | Your page is navigated to `returnUrl`. Handle it as a normal route |

Keep `returnUrl` lowercase — the hosted flow lowercases it before redirecting, so a case-sensitive
token or reference arrives corrupted.

### When completion does not arrive

Messages are accepted only from the frame the SDK mounted, at an origin it accepts. One that fails
either check is reported rather than dropped:

```typescript
element.addEventListener('banxa:kyc-message-rejected', (event) => {
  console.warn('Rejected', event.detail); // { reason, type, origin, acceptedOrigins }
});
```

| What you see | What it means |
|---|---|
| No event at all | The flow never posted — check the merchant configuration above |
| `reason: "origin"` | The flow serves from a host the session link did not name; add it to `allowed-origins` |
| `reason: "source"` | The message came from a window other than the mounted frame |

## Complete integration example

```typescript
// server.ts
import express from 'express';
import { BanxaApiClient } from '@banxa/native-payments-sdk';

const app = express();
app.use(express.json());

const banxa = new BanxaApiClient({
  apiKey: process.env.BANXA_API_KEY!,
  partner: process.env.BANXA_PARTNER!,
  environment: 'production',
});

app.post('/api/create-order', async (req, res) => {
  const { userId, amount, fiatCurrency, cryptoCurrency, walletAddress } = req.body;

  try {
    const order = await banxa.createOrder({
      externalCustomerId: userId,
      fiat: fiatCurrency,
      crypto: cryptoCurrency,
      fiatAmount: amount,
      walletAddress,
      paymentMethodId: 'debit-credit-card',
      redirectUrl: `${process.env.FRONTEND_URL}/order-complete`,
    });

    res.json({
      orderId: order.id,
      nativeToken: order.nativeToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Order creation failed';
    res.status(500).json({ error: message });
  }
});
```

```html
<!-- checkout.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Crypto Checkout</title>
  <script type="module">
    import { registerBanxaPrimerCheckout } from '@banxa/native-payments-sdk/web';
    registerBanxaPrimerCheckout();
  </script>
  <style>
    banxa-primer-checkout {
      display: block;
      max-width: 500px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <h1>Complete Your Purchase</h1>
  <banxa-primer-checkout id="checkout" locale="en"></banxa-primer-checkout>

  <script type="module">
    async function startCheckout() {
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-123',
          amount: '100',
          fiatCurrency: 'AUD',
          cryptoCurrency: 'USDT',
          walletAddress: '0x...',
        }),
      });

      if (!response.ok) throw new Error('Failed to create order');

      const { nativeToken } = await response.json();
      const checkout = document.getElementById('checkout');
      checkout.clientToken = nativeToken;

      checkout.addEventListener('banxa:payment-success', () => {
        window.location.href = '/success';
      });

      checkout.addEventListener('banxa:payment-failure', (event) => {
        const detail = event.detail;
        const message = detail?.error?.message ?? detail?.errorMessage ?? 'Payment failed';
        alert('Payment failed: ' + message);
      });
    }

    startCheckout().catch(console.error);
  </script>
</body>
</html>
```

## Environment URLs

| Environment | Base URL |
|-------------|----------|
| Sandbox | `https://api.banxa-sandbox.com/{partner}/v2` |
| Production | `https://api.banxa.com/{partner}/v2` |

## Development

```bash
npm run build        # Build dist/api.* and dist/web.*
npm run typecheck    # TypeScript check
npm run test:run     # Build + run tests
npm run lint         # ESLint
npm run format:check # Prettier
```

CI runs build, typecheck, lint, format check, and tests on push/PR (see `.github/workflows/ci.yml`).

## License

MIT