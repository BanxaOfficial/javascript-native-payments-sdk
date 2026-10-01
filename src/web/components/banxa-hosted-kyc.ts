/**
 * Banxa Hosted KYC Web Component
 *
 * Embeds the Banxa hosted verification flow in an iframe, so a customer can be verified before any
 * order exists.
 *
 * Note: completion arrives as a `banxa:kyc-complete` postMessage, which the hosted flow sends only
 * for a merchant with `embeddedButtonOnlyIframeEnabled`. Without it the flow redirects the parent
 * frame instead and there is no in-frame signal at all — see the README.
 */

/** Message types the hosted flow posts — the inbound half of the contract. */
export const BANXA_KYC_MESSAGE_TYPES = {
  LOADING: 'banxa:loading',
  READY: 'banxa:ready',
  COMPLETE: 'banxa:kyc-complete',
  ERROR: 'banxa:error',
} as const;

/** Events this element dispatches — the outbound half. */
export const BANXA_KYC_EVENTS = {
  COMPLETE: 'banxa:kyc-complete',
  ERROR: 'banxa:kyc-error',
  READY: 'banxa:kyc-ready',
  LOADING: 'banxa:kyc-loading',
  /** Diagnostic: a `banxa:*` message was received but not accepted. */
  MESSAGE_REJECTED: 'banxa:kyc-message-rejected',
} as const;

export type BanxaKycEventName = (typeof BANXA_KYC_EVENTS)[keyof typeof BANXA_KYC_EVENTS];

/**
 * Maps an inbound message to the event it becomes, and the status to report when one is omitted.
 * Note: a table rather than a switch — this mapping is the contract with the hosted flow.
 */
const RELAYED_MESSAGES: Record<string, { event: BanxaKycEventName; status: string }> = {
  [BANXA_KYC_MESSAGE_TYPES.LOADING]: { event: BANXA_KYC_EVENTS.LOADING, status: 'loading' },
  [BANXA_KYC_MESSAGE_TYPES.READY]: { event: BANXA_KYC_EVENTS.READY, status: 'ready' },
};

interface BanxaFrameMessage {
  type?: string;
  status?: string;
  code?: string | number;
  message?: string;
}

declare global {
  interface HTMLElementTagNameMap {
    'banxa-hosted-kyc': BanxaHostedKyc;
  }
}

export class BanxaHostedKyc extends HTMLElement {
  private container: HTMLDivElement | null = null;
  private frame: HTMLIFrameElement | null = null;
  private completed = false;
  private acceptedOrigins: string[] = [];
  private readonly onWindowMessage = (event: MessageEvent): void => this.handleFrameMessage(event);

  static get observedAttributes(): string[] {
    return ['session-url', 'expires-at', 'iframe-title', 'custom-styles', 'allowed-origins'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  /** Writes an attribute, removing it when the value is empty. */
  private reflect(name: string, value: string | null): void {
    if (value) {
      this.setAttribute(name, value);
    } else {
      this.removeAttribute(name);
    }
  }

  get sessionUrl(): string | null {
    return this.getAttribute('session-url');
  }

  set sessionUrl(value: string | null) {
    this.reflect('session-url', value);
  }

  get expiresAt(): string | null {
    return this.getAttribute('expires-at');
  }

  set expiresAt(value: string | null) {
    this.reflect('expires-at', value);
  }

  get iframeTitle(): string {
    return this.getAttribute('iframe-title') ?? 'Banxa verification';
  }

  set iframeTitle(value: string) {
    this.setAttribute('iframe-title', value);
  }

  get customStyles(): string | null {
    return this.getAttribute('custom-styles');
  }

  set customStyles(value: string | null) {
    this.reflect('custom-styles', value);
  }

  /**
   * Extra origins whose messages are accepted, comma-separated, on top of the session URL's own.
   * Note: the journey spans many navigations, so a flow serving from a host the link never named
   * would otherwise have its completion silently dropped.
   */
  get allowedOrigins(): string | null {
    return this.getAttribute('allowed-origins');
  }

  set allowedOrigins(value: string | null) {
    this.reflect('allowed-origins', value);
  }

  connectedCallback(): void {
    window.addEventListener('message', this.onWindowMessage);
    this.render();
    if (this.sessionUrl) {
      this.mountIframe();
    } else {
      this.showError('Session URL is required');
    }
  }

  disconnectedCallback(): void {
    // The listener sits on window, so it would outlive the element and fire at a detached node.
    window.removeEventListener('message', this.onWindowMessage);
  }

  /**
   * Applies an attribute change.
   * Note: every observed attribute acts. One that is observed but ignored reads as a working
   * setter while doing nothing.
   */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (name === 'iframe-title') {
      if (this.frame) this.frame.title = this.iframeTitle;
      return;
    }

    if (name === 'custom-styles') {
      this.render();
    }

    if (name === 'session-url') {
      // A new link means a new attempt, possibly for a different customer.
      this.completed = false;
    }

    if (this.sessionUrl) {
      this.mountIframe();
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const styles = `
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .hosted-kyc-container {
        width: 100%;
        min-height: 560px;
        position: relative;
      }
      .hosted-kyc-frame {
        width: 100%;
        min-height: 560px;
        border: 0;
        display: block;
        background: #fff;
      }
      .error {
        padding: 16px;
        background: #fee;
        border: 1px solid #fcc;
        border-radius: 8px;
        color: #c00;
      }
      ${this.customStyles || ''}
    `;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="hosted-kyc-container" id="hosted-kyc-container"></div>
    `;

    this.container = this.shadowRoot.querySelector('#hosted-kyc-container') as HTMLDivElement;
  }

  private mountIframe(): void {
    if (!this.container || !this.sessionUrl) {
      if (!this.sessionUrl) {
        this.showError('Session URL is required');
      }
      return;
    }

    if (this.hasExpired()) {
      this.showError('This verification session has expired. Request a new one to continue.');
      this.dispatch(BANXA_KYC_EVENTS.ERROR, {
        code: 'session_expired',
        message: 'The verification session expired before it was mounted.',
      });
      return;
    }

    // Resolved once per mount. The set cannot change while a frame is up, and every stray
    // postMessage on the page would otherwise re-parse the URL.
    this.acceptedOrigins = this.resolveAcceptedOrigins();

    this.container.replaceChildren();

    const iframe = document.createElement('iframe');
    iframe.className = 'hosted-kyc-frame';
    iframe.title = this.iframeTitle;
    iframe.src = this.sessionUrl;
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
    );
    // Permissions Policy, not sandbox. Without it getUserMedia() is rejected inside the frame and
    // document capture cannot run. Always granted — whether a journey reaches capture is decided
    // server-side, so a caller has no way to know it is safe to withhold.
    iframe.setAttribute('allow', 'camera; microphone');

    this.frame = iframe;
    this.container.appendChild(iframe);
  }

  private resolveAcceptedOrigins(): string[] {
    const extra = (this.allowedOrigins ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    try {
      return [new URL(this.sessionUrl ?? '').origin, ...extra];
    } catch {
      return extra;
    }
  }

  private hasExpired(): boolean {
    const expiresAt = this.expiresAt;
    if (!expiresAt) return false;

    const timestamp = Date.parse(expiresAt);
    if (Number.isNaN(timestamp)) return false;

    return timestamp <= Date.now();
  }

  private handleFrameMessage(event: MessageEvent): void {
    const data = event.data as BanxaFrameMessage | null;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;
    if (!data.type.startsWith('banxa:')) return;

    const rejection = this.rejectionReason(event);
    if (rejection) {
      // Announced, not dropped. A silent rejection looks identical to the flow never posting,
      // which leaves a broken integration with nothing to go on.
      this.dispatch(BANXA_KYC_EVENTS.MESSAGE_REJECTED, {
        reason: rejection,
        type: data.type,
        origin: event.origin,
        acceptedOrigins: [...this.acceptedOrigins],
      });
      return;
    }

    if (data.type === BANXA_KYC_MESSAGE_TYPES.COMPLETE) {
      this.completeOnce({ status: data.status ?? 'complete' });
      return;
    }

    if (data.type === BANXA_KYC_MESSAGE_TYPES.ERROR) {
      this.dispatch(BANXA_KYC_EVENTS.ERROR, { code: data.code, message: data.message ?? '' });
      return;
    }

    const relayed = RELAYED_MESSAGES[data.type];
    if (relayed) {
      this.dispatch(relayed.event, { status: data.status ?? relayed.status });
    }
  }

  /**
   * Returns why a message was refused, or null when it is accepted.
   * Note: the hosted flow falls back to `postMessage(payload, '*')` when the merchant domain is
   * unset, so the sender is checked here rather than trusted.
   */
  private rejectionReason(event: MessageEvent): 'no-frame' | 'source' | 'origin' | null {
    if (!this.frame) return 'no-frame';
    if (event.source !== this.frame.contentWindow) return 'source';
    if (!this.acceptedOrigins.includes(event.origin)) return 'origin';

    return null;
  }

  /** Dispatches completion, at most once per session. */
  private completeOnce(detail: Record<string, unknown>): void {
    if (this.completed) return;
    this.completed = true;
    this.dispatch(BANXA_KYC_EVENTS.COMPLETE, detail);
  }

  private dispatch(name: BanxaKycEventName, detail: Record<string, unknown>): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private showError(message: string): void {
    this.frame = null;
    if (!this.container) return;

    const el = document.createElement('div');
    el.className = 'error';
    el.textContent = message;
    this.container.replaceChildren(el);
  }
}
