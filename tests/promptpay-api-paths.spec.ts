/**
 * Regression: the host api client already carries baseURL `/api/v1`, so the
 * view must pass paths relative to it. A `/api/v1/...` literal produced
 * `/api/v1/api/v1/...` -> 404 in production.
 *
 * The fake sits at the transport (axios adapter) so the asserted path is the
 * one that would actually hit the wire.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { api } from '@/api';
import PromptPayView from '../PromptPayView.vue';

const { routerPush, routeQuery } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routeQuery: { invoice: 'INV-1', amount: '100.00' },
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ push: routerPush }),
}));

const POLL_INTERVAL_MS = 3000;
// The production baseURL (vue/src/api/index.ts fallback); pinned so a local
// VITE_API_URL override cannot mask a doubled prefix.
const PRODUCTION_BASE_URL = '/api/v1';
const requestedPaths: string[] = [];

function installFakeTransport(responseFor: (path: string) => unknown): void {
  const transport = (api as unknown as { axiosInstance: AxiosInstance }).axiosInstance;
  transport.defaults.baseURL = PRODUCTION_BASE_URL;
  transport.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const path = `${config.baseURL ?? ''}${config.url ?? ''}`;
    requestedPaths.push(path);
    return { data: responseFor(path), status: 200, statusText: 'OK', headers: {}, config };
  };
}

const PAYMENT = {
  qr_payload: 'PROMPTPAY-QR-1',
  reference: 'REF-1',
  amount: '100.00',
  currency: 'THB',
  status: 'pending',
};
const mountOptions = { global: { mocks: { $t: (key: string) => key } } };

describe('PromptPayView api paths', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    requestedPaths.length = 0;
    installFakeTransport((path) => (path.endsWith('/status') ? { status: 'completed' } : PAYMENT));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('issues the payment on the single-prefixed backend route and renders it', async () => {
    const wrapper = mount(PromptPayView, mountOptions);
    await flushPromises();

    expect(requestedPaths[0]).toBe('/api/v1/plugins/promptpay/payments');
    expect(wrapper.text()).toContain('PROMPTPAY-QR-1');
  });

  it('polls the single-prefixed status route', async () => {
    mount(PromptPayView, mountOptions);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    await flushPromises();

    expect(requestedPaths[1]).toBe('/api/v1/plugins/promptpay/payments/INV-1/status');
    expect(routerPush).toHaveBeenCalledWith({ path: '/dashboard' });
  });
});
