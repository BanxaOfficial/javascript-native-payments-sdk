import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const loadPrimer = vi.fn();

vi.mock('@primer-io/primer-js', () => ({
  loadPrimer,
}));

describe('primer-loader', () => {
  beforeEach(() => {
    vi.resetModules();
    loadPrimer.mockImplementation(() => {
      if (!customElements.get('primer-checkout')) {
        customElements.define(
          'primer-checkout',
          class extends HTMLElement {
            static get observedAttributes() {
              return ['client-token'];
            }
          },
        );
      }
    });
  });

  afterEach(() => {
    loadPrimer.mockClear();
  });

  it('loadPrimerSdk calls loadPrimer once and resolves when primer-checkout is defined', async () => {
    const { loadPrimerSdk, isPrimerLoaded } = await import('./primer-loader.js');

    expect(isPrimerLoaded()).toBe(false);

    await Promise.all([loadPrimerSdk(), loadPrimerSdk()]);

    expect(loadPrimer).toHaveBeenCalledTimes(1);
    expect(isPrimerLoaded()).toBe(true);
  });
});
