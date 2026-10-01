import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BanxaHostedKyc } from './banxa-hosted-kyc.js';

const SESSION_URL = 'https://checkout.banxa-sandbox.com/kyc-transit?d=abc123';
const SESSION_ORIGIN = 'https://checkout.banxa-sandbox.com';

function registerHostedKycElement(): void {
  if (!customElements.get('banxa-hosted-kyc')) {
    customElements.define('banxa-hosted-kyc', BanxaHostedKyc);
  }
}

function iframeOf(element: BanxaHostedKyc): HTMLIFrameElement {
  return element.shadowRoot?.querySelector('iframe') as HTMLIFrameElement;
}

/**
 * Stubs the frame's window so `event.source` has something identity-comparable.
 * Note: happy-dom does not load iframe documents, and identity is exactly what the component
 * checks a message against.
 */
function stubContentWindow(element: BanxaHostedKyc, value: unknown): unknown {
  Object.defineProperty(iframeOf(element), 'contentWindow', { value, configurable: true });
  return value;
}

function postToWindow(data: unknown, origin: string, source: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: source as Window }));
}

/** Mounts, then makes the frame's window identifiable so a message can be attributed to it. */
function mountWith(element: BanxaHostedKyc, url = SESSION_URL): unknown {
  element.sessionUrl = url;
  return stubContentWindow(element, { name: 'kyc-frame' });
}

describe('BanxaHostedKyc', () => {
  let element: BanxaHostedKyc;

  beforeEach(() => {
    registerHostedKycElement();
    element = new BanxaHostedKyc();
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  describe('properties', () => {
    it('should get and set sessionUrl', () => {
      element.sessionUrl = SESSION_URL;
      expect(element.sessionUrl).toBe(SESSION_URL);
    });

    it('should default iframeTitle', () => {
      expect(element.iframeTitle).toBe('Banxa verification');
    });

    it('should get and set allowedOrigins', () => {
      element.allowedOrigins = 'https://a.example.com,https://b.example.com';
      expect(element.allowedOrigins).toBe('https://a.example.com,https://b.example.com');
    });
  });

  describe('iframe mounting', () => {
    it('should mount an iframe when sessionUrl is set', () => {
      element.sessionUrl = SESSION_URL;

      const iframe = iframeOf(element);
      expect(iframe).not.toBeNull();
      expect(iframe.src).toBe(SESSION_URL);
      expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
    });

    // `sandbox` does not cover device access — `allow` is a separate mechanism, and without it
    // getUserMedia() is rejected inside the frame.
    it('should grant camera and microphone to the iframe', () => {
      element.sessionUrl = SESSION_URL;

      const allow = iframeOf(element).getAttribute('allow') ?? '';
      expect(allow).toContain('camera');
      expect(allow).toContain('microphone');
    });

    it('should show an error when sessionUrl is missing on mount', () => {
      const error = element.shadowRoot?.querySelector('.error');
      expect(error?.textContent).toBe('Session URL is required');
    });
  });

  // An observed attribute that is ignored reads as a working setter while doing nothing.
  describe('attribute reactivity', () => {
    it('should update the iframe title in place without remounting', () => {
      element.sessionUrl = SESSION_URL;
      const before = iframeOf(element);

      element.iframeTitle = 'Verify your identity';

      expect(iframeOf(element)).toBe(before);
      expect(iframeOf(element).title).toBe('Verify your identity');
    });

    it('should re-evaluate expiry when expiresAt changes after mount', () => {
      element.sessionUrl = SESSION_URL;
      expect(iframeOf(element)).not.toBeNull();

      element.expiresAt = '2020-01-01T00:00:00+00:00';

      expect(iframeOf(element)).toBeNull();
    });
  });

  describe('completion via postMessage', () => {
    it('should dispatch banxa:kyc-complete for a message from the mounted frame', () => {
      const frameWindow = mountWith(element);
      const handler = vi.fn();
      element.addEventListener('banxa:kyc-complete', handler);

      postToWindow({ type: 'banxa:kyc-complete', status: 'complete' }, SESSION_ORIGIN, frameWindow);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail.status).toBe('complete');
    });

    it('should relay banxa:error as banxa:kyc-error', () => {
      const frameWindow = mountWith(element);
      const handler = vi.fn();
      element.addEventListener('banxa:kyc-error', handler);

      postToWindow(
        { type: 'banxa:error', code: 50901, message: 'Link expired' },
        SESSION_ORIGIN,
        frameWindow,
      );

      expect(handler.mock.calls[0][0].detail.code).toBe(50901);
    });

    it('should relay banxa:loading and banxa:ready', () => {
      const frameWindow = mountWith(element);
      const loading = vi.fn();
      const ready = vi.fn();
      element.addEventListener('banxa:kyc-loading', loading);
      element.addEventListener('banxa:kyc-ready', ready);

      postToWindow({ type: 'banxa:loading' }, SESSION_ORIGIN, frameWindow);
      postToWindow({ type: 'banxa:ready' }, SESSION_ORIGIN, frameWindow);

      expect(loading.mock.calls[0][0].detail.status).toBe('loading');
      expect(ready.mock.calls[0][0].detail.status).toBe('ready');
    });

    it('should dispatch completion only once for repeated messages', () => {
      const frameWindow = mountWith(element);
      const handler = vi.fn();
      element.addEventListener('banxa:kyc-complete', handler);

      postToWindow({ type: 'banxa:kyc-complete' }, SESSION_ORIGIN, frameWindow);
      postToWindow({ type: 'banxa:kyc-complete' }, SESSION_ORIGIN, frameWindow);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should allow a second completion after a new session starts', () => {
      const first = mountWith(element);
      const handler = vi.fn();
      element.addEventListener('banxa:kyc-complete', handler);
      postToWindow({ type: 'banxa:kyc-complete' }, SESSION_ORIGIN, first);

      const second = mountWith(element, `${SESSION_URL}&customer=2`);
      postToWindow({ type: 'banxa:kyc-complete' }, SESSION_ORIGIN, second);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should stop listening once removed from the document', () => {
      const frameWindow = mountWith(element);
      const handler = vi.fn();
      element.addEventListener('banxa:kyc-complete', handler);
      element.remove();

      postToWindow({ type: 'banxa:kyc-complete' }, SESSION_ORIGIN, frameWindow);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // A rejection must be announced — dropping it silently looks identical to no message at all.
  describe('sender rejection', () => {
    it('should reject and report a message from an unaccepted origin', () => {
      const frameWindow = mountWith(element);
      const complete = vi.fn();
      const rejected = vi.fn();
      element.addEventListener('banxa:kyc-complete', complete);
      element.addEventListener('banxa:kyc-message-rejected', rejected);

      postToWindow({ type: 'banxa:kyc-complete' }, 'https://evil.example.com', frameWindow);

      expect(complete).not.toHaveBeenCalled();
      expect(rejected).toHaveBeenCalledOnce();
      expect(rejected.mock.calls[0][0].detail.reason).toBe('origin');
      expect(rejected.mock.calls[0][0].detail.origin).toBe('https://evil.example.com');
      expect(rejected.mock.calls[0][0].detail.acceptedOrigins).toContain(SESSION_ORIGIN);
    });

    it('should reject and report a message that did not come from the mounted frame', () => {
      mountWith(element);
      const complete = vi.fn();
      const rejected = vi.fn();
      element.addEventListener('banxa:kyc-complete', complete);
      element.addEventListener('banxa:kyc-message-rejected', rejected);

      postToWindow({ type: 'banxa:kyc-complete' }, SESSION_ORIGIN, { name: 'other-frame' });

      expect(complete).not.toHaveBeenCalled();
      expect(rejected.mock.calls[0][0].detail.reason).toBe('source');
    });

    // Extensions, devtools and other embeds post to window too; none of it should make noise.
    it('should stay silent for messages that are not banxa messages', () => {
      mountWith(element);
      const rejected = vi.fn();
      element.addEventListener('banxa:kyc-message-rejected', rejected);

      postToWindow({ type: 'webpackHotUpdate' }, 'https://evil.example.com', { name: 'x' });
      postToWindow('a string', 'https://evil.example.com', { name: 'x' });
      postToWindow(null, SESSION_ORIGIN, { name: 'x' });

      expect(rejected).not.toHaveBeenCalled();
    });

    it('should accept an origin listed in allowedOrigins', () => {
      element.allowedOrigins = 'https://eu.banxa-sandbox.com';
      const frameWindow = mountWith(element);
      const handler = vi.fn();
      element.addEventListener('banxa:kyc-complete', handler);

      postToWindow({ type: 'banxa:kyc-complete' }, 'https://eu.banxa-sandbox.com', frameWindow);

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('expiry', () => {
    it('should refuse to mount an expired session', () => {
      element.expiresAt = '2020-01-01T00:00:00+00:00';
      element.sessionUrl = SESSION_URL;

      expect(iframeOf(element)).toBeNull();
      expect(element.shadowRoot?.querySelector('.error')?.textContent).toContain('expired');
    });

    it('should dispatch banxa:kyc-error when the session has expired', () => {
      const handler = vi.fn();
      element.addEventListener('banxa:kyc-error', handler);

      element.expiresAt = '2020-01-01T00:00:00+00:00';
      element.sessionUrl = SESSION_URL;

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail.code).toBe('session_expired');
    });

    it('should mount a session that has not expired yet', () => {
      element.expiresAt = new Date(Date.now() + 60_000).toISOString();
      element.sessionUrl = SESSION_URL;

      expect(iframeOf(element)).not.toBeNull();
    });
  });
});
