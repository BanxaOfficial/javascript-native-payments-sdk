/**
 * Banxa Hosted Checkout Web Component
 *
 * Embeds Banxa hosted checkout in an iframe when native Primer checkout is not available
 * (e.g. when eligibility returns paymentReady: false).
 */

type CheckoutOutcome = 'success' | 'failure' | 'cancelled';

declare global {
  interface HTMLElementTagNameMap {
    'banxa-hosted-checkout': BanxaHostedCheckout;
  }
}

export class BanxaHostedCheckout extends HTMLElement {
  private container: HTMLDivElement | null = null;

  static get observedAttributes(): string[] {
    return [
      'checkout-url',
      'return-url',
      'return-url-success',
      'return-url-failure',
      'return-url-cancelled',
      'iframe-title',
      'custom-styles',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get checkoutUrl(): string | null {
    return this.getAttribute('checkout-url');
  }

  set checkoutUrl(value: string | null) {
    if (value) {
      this.setAttribute('checkout-url', value);
    } else {
      this.removeAttribute('checkout-url');
    }
  }

  get returnUrl(): string | null {
    return this.getAttribute('return-url');
  }

  set returnUrl(value: string | null) {
    if (value) {
      this.setAttribute('return-url', value);
    } else {
      this.removeAttribute('return-url');
    }
  }

  get returnUrlSuccess(): string | null {
    return this.getAttribute('return-url-success');
  }

  set returnUrlSuccess(value: string | null) {
    if (value) {
      this.setAttribute('return-url-success', value);
    } else {
      this.removeAttribute('return-url-success');
    }
  }

  get returnUrlFailure(): string | null {
    return this.getAttribute('return-url-failure');
  }

  set returnUrlFailure(value: string | null) {
    if (value) {
      this.setAttribute('return-url-failure', value);
    } else {
      this.removeAttribute('return-url-failure');
    }
  }

  get returnUrlCancelled(): string | null {
    return this.getAttribute('return-url-cancelled');
  }

  set returnUrlCancelled(value: string | null) {
    if (value) {
      this.setAttribute('return-url-cancelled', value);
    } else {
      this.removeAttribute('return-url-cancelled');
    }
  }

  get iframeTitle(): string {
    return this.getAttribute('iframe-title') ?? 'Banxa checkout';
  }

  set iframeTitle(value: string) {
    this.setAttribute('iframe-title', value);
  }

  get customStyles(): string | null {
    return this.getAttribute('custom-styles');
  }

  set customStyles(value: string | null) {
    if (value) {
      this.setAttribute('custom-styles', value);
    } else {
      this.removeAttribute('custom-styles');
    }
  }

  connectedCallback(): void {
    this.render();
    if (this.checkoutUrl) {
      this.mountIframe();
    } else {
      this.showError('Checkout URL is required');
    }
  }

  disconnectedCallback(): void {
    // iframe is removed with the element.
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (name === 'checkout-url' && newValue) {
      this.mountIframe();
    } else if (name === 'custom-styles') {
      this.render();
      if (this.checkoutUrl) {
        this.mountIframe();
      }
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const styles = `
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .hosted-checkout-container {
        width: 100%;
        min-height: 480px;
        position: relative;
      }
      .hosted-checkout-frame {
        width: 100%;
        min-height: 480px;
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
      <div class="hosted-checkout-container" id="hosted-checkout-container"></div>
    `;

    this.container = this.shadowRoot.querySelector('#hosted-checkout-container') as HTMLDivElement;
  }

  private mountIframe(): void {
    if (!this.container || !this.checkoutUrl) {
      if (!this.checkoutUrl) {
        this.showError('Checkout URL is required');
      }
      return;
    }

    this.container.replaceChildren();

    const iframe = document.createElement('iframe');
    iframe.className = 'hosted-checkout-frame';
    iframe.title = this.iframeTitle;
    iframe.src = this.checkoutUrl;
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
    );
    iframe.addEventListener('load', () => this.handleIframeLoad(iframe));

    this.container.appendChild(iframe);
  }

  private handleIframeLoad(iframe: HTMLIFrameElement): void {
    try {
      const url = iframe.contentWindow?.location.href;
      if (url) {
        this.handleNavigationUrl(url);
      }
    } catch {
      // Cross-origin iframe — redirect detection requires return URLs on the same origin as this page.
    }
  }

  private handleNavigationUrl(url: string): void {
    const outcome = this.matchReturnUrl(url);
    if (!outcome) return;

    const eventName =
      outcome === 'success'
        ? 'banxa:checkout-success'
        : outcome === 'failure'
          ? 'banxa:checkout-failure'
          : 'banxa:checkout-cancelled';

    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail: { url },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private matchReturnUrl(url: string): CheckoutOutcome | null {
    const success = this.returnUrlSuccess ?? this.returnUrl;
    const failure = this.returnUrlFailure ?? this.returnUrl;
    const cancelled = this.returnUrlCancelled ?? this.returnUrl;

    if (success && url.includes(success)) return 'success';
    if (failure && url.includes(failure)) return 'failure';
    if (cancelled && url.includes(cancelled)) return 'cancelled';
    return null;
  }

  private showError(message: string): void {
    if (!this.container) return;
    const el = document.createElement('div');
    el.className = 'error';
    el.textContent = message;
    this.container.replaceChildren(el);
  }
}
