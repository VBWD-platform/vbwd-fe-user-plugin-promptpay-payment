<template>
  <div class="promptpay">
    <div v-if="loading">
      {{ $t('promptpay.loading') }}
    </div>
    <div
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </div>
    <div v-else-if="payment">
      <h2>{{ $t('promptpay.scan') }}</h2>
      <div class="qr-payload">
        {{ payment.qr_payload }}
      </div>
      <p>{{ payment.amount }} {{ payment.currency }}</p>
      <p class="ref">
        {{ $t('promptpay.ref') }}: {{ payment.reference }}
      </p>
      <p
        v-if="status"
        class="status"
      >
        {{ status }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api';

interface Payment {
  qr_payload: string;
  reference: string;
  amount: string;
  currency: string;
  status: string;
}

interface PaymentStatus {
  status: string;
}

// Relative to the api client's `/api/v1` baseURL.
const API_PREFIX = '/plugins/promptpay';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref<string | null>(null);
const payment = ref<Payment | null>(null);
const status = ref<string | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;

async function issue() {
  const invoiceNo = (route.query.invoice as string) || '';
  const amount = route.query.amount;
  try {
    payment.value = await api.post<Payment>(`${API_PREFIX}/payments`, {
      invoice_no: invoiceNo,
      amount,
    });
    startPolling(invoiceNo);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'failed';
  } finally {
    loading.value = false;
  }
}

function startPolling(invoiceNo: string) {
  timer = setInterval(async () => {
    const body = await api.get<PaymentStatus>(`${API_PREFIX}/payments/${invoiceNo}/status`);
    status.value = body.status;
    if (body.status === 'completed') {
      stopPolling();
      router.push({ path: '/dashboard' });
    }
  }, 3000);
}

function stopPolling() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

onMounted(issue);
onBeforeUnmount(stopPolling);
</script>

<style scoped>
.promptpay { max-width: 480px; margin: 2rem auto; padding: 1.5rem; text-align: center; }
.qr-payload { font-family: monospace; padding: 1rem; border: 1px dashed var(--vbwd-color-border, #ccc); word-break: break-all; font-size: 0.75rem; }
.error { color: var(--vbwd-color-danger, #b22); }
</style>
