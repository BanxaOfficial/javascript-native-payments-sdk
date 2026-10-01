import type { BanxaApiClient } from '../api/client.js';
import type { CreateKycSessionRequest, KycSession } from '../types/banxa.js';
import { BanxaHostedKyc } from './components/banxa-hosted-kyc.js';
import { registerBanxaHostedKyc } from './register-checkout.js';

export interface KycFlowResult {
  session: KycSession;
  element: BanxaHostedKyc;
}

interface KycFlowBaseOptions {
  container: HTMLElement;
  iframeTitle?: string;
  customStyles?: string;
  allowedOrigins?: string[];
}

/** Mounts a session the partner's backend already created. Prefer this form. */
export interface KycFlowSessionOptions extends KycFlowBaseOptions {
  session: KycSession;
  client?: never;
  request?: never;
}

/** Creates the session in the browser, which ships the partner API key to it. */
export interface KycFlowClientOptions extends KycFlowBaseOptions {
  client: BanxaApiClient;
  request: CreateKycSessionRequest;
  session?: never;
}

export type KycFlowOptions = KycFlowSessionOptions | KycFlowClientOptions;

/**
 * Mounts the Banxa hosted verification flow for one customer.
 */
export async function runKycFlow(options: KycFlowOptions): Promise<KycFlowResult> {
  registerBanxaHostedKyc();

  const session = await resolveSession(options);
  const { container } = options;

  container.replaceChildren();

  const element = document.createElement('banxa-hosted-kyc') as BanxaHostedKyc;

  // Expiry first — setting the URL is what triggers the mount. The element re-evaluates either
  // way, so this is an optimisation rather than a requirement.
  element.expiresAt = session.expiresAt;
  if (options.allowedOrigins?.length) element.allowedOrigins = options.allowedOrigins.join(',');
  if (options.iframeTitle) element.iframeTitle = options.iframeTitle;
  if (options.customStyles) element.customStyles = options.customStyles;

  element.sessionUrl = session.redirectUrl;
  container.appendChild(element);

  return { session, element };
}

async function resolveSession(options: KycFlowOptions): Promise<KycSession> {
  if (options.session) {
    return options.session;
  }

  if (options.client && options.request) {
    return options.client.createKycSession(options.request);
  }

  throw new Error(
    'runKycFlow() needs either a session created by your backend, or a client and a request to create one with.',
  );
}
