/**
 * Primer SDK Loader
 *
 * Wraps `@primer-io/primer-js` `loadPrimer()` so `<primer-checkout>` and related
 * custom elements are registered before the Banxa wrapper mounts markup.
 */

import { loadPrimer } from '@primer-io/primer-js';

let primerLoadPromise: Promise<void> | null = null;

async function runLoadPrimer(): Promise<void> {
  loadPrimer();
  if (typeof customElements !== 'undefined' && customElements.whenDefined) {
    await customElements.whenDefined('primer-checkout');
  }
}

/**
 * Load the Primer Checkout Web SDK (registers web components).
 * Returns a promise that resolves when `primer-checkout` is defined.
 */
export function loadPrimerSdk(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cannot load Primer SDK in non-browser environment'));
  }

  if (primerLoadPromise) {
    return primerLoadPromise;
  }

  if (isPrimerLoaded()) {
    return Promise.resolve();
  }

  primerLoadPromise = runLoadPrimer().catch((err: unknown) => {
    primerLoadPromise = null;
    throw err;
  });

  return primerLoadPromise;
}

/**
 * Whether Primer Checkout web components are registered (see Primer install docs).
 */
export function isPrimerLoaded(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof customElements !== 'undefined' &&
    !!customElements.get('primer-checkout')
  );
}
