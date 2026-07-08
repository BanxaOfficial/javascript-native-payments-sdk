/**
 * Banxa Primer Checkout Web Component
 *
 * Wraps the Primer Checkout Web SDK with configurable checkout layouts.
 */

import type { CheckoutLayoutConfig, CheckoutLayoutMode } from '../../types/checkout-layout.js';
import type { PrimerCheckoutOptions } from '../../types/primer.js';
import {
  buildCheckoutMarkup,
  getEnabledPaymentMethodsFromLayout,
  parsePaymentMethodsAttribute,
  resolveCheckoutLayout,
} from '../checkout-layout.js';
import { loadPrimerSdk } from '../primer-loader.js';
import { sanitizeEventDetail } from '../sanitize-event-detail.js';

type PrimerCheckoutElement = HTMLElement & {
  options?: PrimerCheckoutOptions;
  primerJS?: { refreshSession(): Promise<void> };
};

const LAYOUT_MODES: CheckoutLayoutMode[] = ['preset', 'auto', 'custom'];

declare global {
  interface HTMLElementTagNameMap {
    'banxa-primer-checkout': BanxaPrimerCheckout;
  }
}

export class BanxaPrimerCheckout extends HTMLElement {
  private container: HTMLDivElement | null = null;
  private _checkoutLayout: CheckoutLayoutConfig | undefined;
  private _checkoutTemplate: string | undefined;
  private _mountedLayoutConfig: CheckoutLayoutConfig | undefined;

  static get observedAttributes(): string[] {
    return [
      'client-token',
      'locale',
      'loader-disabled',
      'custom-styles',
      'layout-mode',
      'payment-methods',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get clientToken(): string | null {
    return this.getAttribute('client-token');
  }

  set clientToken(value: string | null) {
    if (value) {
      this.setAttribute('client-token', value);
    } else {
      this.removeAttribute('client-token');
    }
  }

  get locale(): string | null {
    return this.getAttribute('locale');
  }

  set locale(value: string | null) {
    if (value) {
      this.setAttribute('locale', value);
    } else {
      this.removeAttribute('locale');
    }
  }

  get loaderDisabled(): boolean {
    return this.hasAttribute('loader-disabled');
  }

  set loaderDisabled(value: boolean) {
    if (value) {
      this.setAttribute('loader-disabled', '');
    } else {
      this.removeAttribute('loader-disabled');
    }
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

  get layoutMode(): CheckoutLayoutMode {
    const value = this.getAttribute('layout-mode');
    if (value && LAYOUT_MODES.includes(value as CheckoutLayoutMode)) {
      return value as CheckoutLayoutMode;
    }
    return 'preset';
  }

  set layoutMode(value: CheckoutLayoutMode) {
    this.setAttribute('layout-mode', value);
  }

  get paymentMethods(): string | null {
    return this.getAttribute('payment-methods');
  }

  set paymentMethods(value: string | null) {
    if (value) {
      this.setAttribute('payment-methods', value);
    } else {
      this.removeAttribute('payment-methods');
    }
  }

  get checkoutLayout(): CheckoutLayoutConfig | undefined {
    return this._checkoutLayout;
  }

  set checkoutLayout(value: CheckoutLayoutConfig | undefined) {
    this._checkoutLayout = value;
    this.remountIfReady();
  }

  get checkoutTemplate(): string | undefined {
    return this._checkoutTemplate;
  }

  set checkoutTemplate(value: string | undefined) {
    this._checkoutTemplate = value;
    this.remountIfReady();
  }

  connectedCallback(): void {
    this.render();
    if (this.clientToken) {
      this.initializeCheckout();
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (name === 'client-token' && newValue) {
      this.initializeCheckout();
    } else if (name === 'locale' && this.clientToken && this.container) {
      const checkout = this.container.querySelector('primer-checkout');
      if (checkout) {
        this.applyCheckoutOptions(checkout as PrimerCheckoutElement);
      }
    } else if (
      (name === 'layout-mode' || name === 'payment-methods') &&
      this.clientToken &&
      this.container
    ) {
      this.remountCheckout();
    } else if (name === 'custom-styles') {
      this.render();
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const styles = `
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .checkout-container {
        width: 100%;
        min-height: 200px;
      }
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        color: #666;
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
      <slot name="checkout-layout"></slot>
      <div class="checkout-container" id="checkout-container">
        ${!this.loaderDisabled ? '<div class="loading">Loading checkout...</div>' : ''}
      </div>
    `;

    this.container = this.shadowRoot.querySelector('#checkout-container') as HTMLDivElement;
  }

  private remountIfReady(): void {
    if (this.clientToken && this.container?.querySelector('primer-checkout')) {
      this.remountCheckout();
    }
  }

  private async remountCheckout(): Promise<void> {
    if (!this.clientToken) return;
    try {
      await loadPrimerSdk();
      await this.mountCheckout();
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Failed to remount checkout');
    }
  }

  private async initializeCheckout(): Promise<void> {
    if (!this.clientToken) {
      this.showError('Client token is required');
      return;
    }

    try {
      await loadPrimerSdk();
      await this.mountCheckout();
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Failed to initialize checkout');
      this.dispatchEvent(
        new CustomEvent('checkout-error', {
          detail: { error },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private getLayoutSlotFragment(): DocumentFragment | null {
    const template = this.querySelector('template[slot="checkout-layout"]');
    if (template instanceof HTMLTemplateElement) {
      return template.content.cloneNode(true) as DocumentFragment;
    }

    const slot = this.shadowRoot?.querySelector(
      'slot[name="checkout-layout"]',
    ) as HTMLSlotElement | null;
    const assigned = slot?.assignedNodes({ flatten: true }) ?? [];
    if (assigned.length === 0) return null;

    const fragment = document.createDocumentFragment();
    assigned.forEach((node) => fragment.appendChild(node.cloneNode(true)));
    return fragment;
  }

  private resolveLayoutConfig(): CheckoutLayoutConfig {
    const fromAttrMethods = parsePaymentMethodsAttribute(this.getAttribute('payment-methods'));
    const base: CheckoutLayoutConfig = {
      mode: this.layoutMode,
      ...(fromAttrMethods ? { paymentMethods: fromAttrMethods } : {}),
    };

    if (this._checkoutTemplate) {
      return resolveCheckoutLayout({
        ...base,
        ...this._checkoutLayout,
        mode: 'custom',
        mainHtml: this._checkoutTemplate,
      });
    }

    if (this._checkoutLayout) {
      return resolveCheckoutLayout({ ...base, ...this._checkoutLayout });
    }

    return resolveCheckoutLayout(base);
  }

  private async mountCheckout(): Promise<void> {
    if (!this.container || !this.clientToken) return;

    const slotFragment = this.getLayoutSlotFragment();
    this.container.innerHTML = '';

    if (slotFragment) {
      this._mountedLayoutConfig = this._checkoutLayout ?? { mode: 'custom' };
      this.container.appendChild(slotFragment);
    } else {
      this._mountedLayoutConfig = this.resolveLayoutConfig();
      this.container.innerHTML = buildCheckoutMarkup(this._mountedLayoutConfig);
    }

    const primerCheckout = await this.preparePrimerCheckoutElement();
    if (!primerCheckout) return;

    this.applyCheckoutOptions(primerCheckout, this._mountedLayoutConfig);
    primerCheckout.setAttribute('client-token', this.clientToken);
    this.setupPrimerEventListeners(primerCheckout);
  }

  private async preparePrimerCheckoutElement(): Promise<PrimerCheckoutElement | null> {
    const primerCheckout = this.container?.querySelector('primer-checkout');
    if (!primerCheckout) return null;

    await customElements.whenDefined('primer-checkout');

    const element = primerCheckout as PrimerCheckoutElement & {
      updateComplete?: Promise<boolean>;
    };
    if (element.updateComplete) {
      await element.updateComplete;
    }

    return element;
  }

  private applyCheckoutOptions(
    primerCheckout: PrimerCheckoutElement,
    layoutConfig?: CheckoutLayoutConfig,
  ): void {
    const layout = layoutConfig ?? this._mountedLayoutConfig ?? this.resolveLayoutConfig();
    const options: PrimerCheckoutOptions = {};

    if (this.locale) options.locale = this.locale;

    const enabledPaymentMethods = getEnabledPaymentMethodsFromLayout(layout);
    if (enabledPaymentMethods?.length) {
      options.enabledPaymentMethods = enabledPaymentMethods;
    }

    primerCheckout.options = options;
  }

  private setupPrimerEventListeners(element: Element): void {
    const events = [
      'primer:ready',
      'primer:methods-update',
      'primer:state-change',
      'primer:bin-data-available',
      'primer:bin-data-loading-change',
      'primer:card-success',
      'primer:card-error',
      'primer:payment-start',
      'primer:payment-success',
      'primer:payment-failure',
      'primer:payment-cancel',
    ];

    events.forEach((eventName) => {
      const handler = (event: Event) => {
        const banxaEventName = eventName.replace('primer:', 'banxa:');
        const detail = sanitizeEventDetail((event as CustomEvent).detail);
        this.dispatchEvent(
          new CustomEvent(banxaEventName, {
            detail,
            bubbles: true,
            composed: true,
          }),
        );
      };

      element.addEventListener(eventName, handler);
    });
  }

  private showError(message: string): void {
    if (!this.container) return;
    const el = document.createElement('div');
    el.className = 'error';
    el.textContent = message;
    this.container.replaceChildren(el);
  }

  /**
   * Refresh the checkout session (delegates to Primer’s `primerJS.refreshSession()` when ready).
   */
  refreshSession(): Promise<void> | undefined {
    const checkout = this.container?.querySelector(
      'primer-checkout',
    ) as PrimerCheckoutElement | null;
    return checkout?.primerJS?.refreshSession();
  }
}
