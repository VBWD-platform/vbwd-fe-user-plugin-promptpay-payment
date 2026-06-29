import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import en from './locales/en.json';
import th from './locales/th.json';

export const promptPayPaymentPlugin: IPlugin = {
  name: 'promptpay-payment',
  version: '26.6',
  description: 'PromptPay direct QR (Thailand) — scan to pay, bank webhook confirms',
  _active: false,

  install(sdk: IPlatformSDK) {
    sdk.addRoute({
      path: '/pay/promptpay',
      name: 'promptpay-payment',
      component: () => import('./PromptPayView.vue'),
      meta: { requiresAuth: true, noLayout: true },
    });
    sdk.addTranslations('en', en);
    sdk.addTranslations('th', th);
  },

  activate() { this._active = true; },
  deactivate() { this._active = false; },
};
