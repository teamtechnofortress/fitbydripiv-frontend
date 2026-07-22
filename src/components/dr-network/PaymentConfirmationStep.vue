<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { confirmCheckoutPayment } from '@/api/checkoutApi'
import DrNetworkStepShell from './DrNetworkStepShell.vue'

const props = defineProps({
  orderUuid: {
    type: String,
    required: true,
  },
  journey: {
    type: Object,
    default: null,
  },
  sessionId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['refreshJourney'])

const state = ref('idle')
const error = ref('')
const paymentPayload = ref(null)
const retryInSeconds = ref(null)
const pollTimer = ref(null)
const lastCheckedAt = ref(null)

const clearPollTimer = () => {
  if (pollTimer.value) {
    clearTimeout(pollTimer.value)
    pollTimer.value = null
  }
}

const schedulePoll = seconds => {
  clearPollTimer()
  retryInSeconds.value = Math.max(Number(seconds) || 3, 1)

  pollTimer.value = setTimeout(() => {
    confirmPayment()
  }, retryInSeconds.value * 1000)
}

const payment = computed(() => paymentPayload.value?.data?.payment || null)
const responseJourney = computed(() => paymentPayload.value?.data?.journey || null)

const headline = computed(() => {
  if (state.value === 'failed') return 'Payment could not be verified'
  if (state.value === 'error') return 'We could not verify payment'
  if (!props.sessionId) return 'Waiting for payment confirmation'

  return 'Verifying payment'
})

const message = computed(() => {
  if (error.value) return error.value
  if (!props.sessionId) return props.journey?.message || 'We are waiting for your payment confirmation.'
  if (responseJourney.value?.message) return responseJourney.value.message
  if (props.journey?.message) return props.journey.message

  return 'We are checking the Stripe checkout session before opening your consultation journey.'
})

const retryLabel = computed(() => {
  if (!retryInSeconds.value || state.value !== 'pending') return ''

  return `Checking again in ${retryInSeconds.value}s`
})

const checkedAtLabel = computed(() => {
  if (!lastCheckedAt.value) return ''

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(lastCheckedAt.value)
})

const prettyLabel = value => String(value || '-')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase())

const statusLabel = computed(() => prettyLabel(payment.value?.status || props.journey?.payment_status || state.value || 'pending'))

const actionLabel = computed(() => {
  if (state.value === 'checking') return 'Checking payment'
  if (state.value === 'pending') return 'Check again'

  return 'Check payment'
})

const handlePayload = data => {
  paymentPayload.value = data
  lastCheckedAt.value = new Date()

  const nextPayment = data?.data?.payment || {}
  const nextJourney = data?.data?.journey || {}

  if (nextPayment.failed || nextJourney.current_step_key === 'payment_failed' || nextJourney.next_action === 'payment_failed') {
    state.value = 'failed'
    retryInSeconds.value = null
    error.value = nextJourney.message || data?.message || 'Your payment could not be confirmed.'

    return
  }

  if (nextPayment.confirmed || data?.journey_ready) {
    state.value = 'confirmed'
    retryInSeconds.value = null
    error.value = ''
    emit('refreshJourney')

    return
  }

  if (nextPayment.pending || nextJourney.next_action === 'wait') {
    state.value = 'pending'
    error.value = ''
    schedulePoll(nextPayment.poll_after_seconds || nextJourney.retry_after_seconds || 3)

    return
  }

  state.value = 'pending'
  error.value = ''
  schedulePoll(nextPayment.poll_after_seconds || nextJourney.retry_after_seconds || 3)
}

async function confirmPayment() {
  if (!props.sessionId) {
    state.value = 'pending'
    retryInSeconds.value = null
    error.value = ''

    return
  }

  state.value = paymentPayload.value ? 'pending' : 'checking'
  error.value = ''

  try {
    const data = await confirmCheckoutPayment(props.sessionId)

    if (data?.success === false) {
      throw new Error(data?.message || 'Unable to confirm payment.')
    }

    handlePayload(data)
  } catch (err) {
    const responseData = err?.response?.data

    state.value = 'error'
    retryInSeconds.value = null
    error.value = responseData?.message
      || err?.message
      || 'Unable to confirm your payment right now. Please refresh or contact support.'
  }
}

watch(
  () => props.sessionId,
  () => {
    clearPollTimer()
    paymentPayload.value = null
    retryInSeconds.value = null
    error.value = ''
    confirmPayment()
  },
)

onMounted(confirmPayment)
onBeforeUnmount(clearPollTimer)
</script>

<template>
  <DrNetworkStepShell
    :title="headline"
    :subtitle="message"
    badge="Payment"
    aside-title="Payment status"
    aside-text="This step uses the checkout confirmation endpoint until payment is confirmed."
    :order-uuid="orderUuid"
  >
    <section class="payment-card">
      <div class="payment-card__top">
        <div
          class="status-icon"
          :class="{
            'status-icon--loading': state === 'checking' || state === 'pending',
            'status-icon--success': state === 'confirmed',
            'status-icon--error': state === 'failed' || state === 'error',
          }"
        >
          <span
            v-if="state === 'checking' || state === 'pending'"
            class="dn-spinner"
          />
          <span v-else-if="state === 'confirmed'">✓</span>
          <span v-else>!</span>
        </div>

        <div class="payment-card__copy">
          <p class="payment-eyebrow">
            Checkout session
          </p>
          <h2>{{ statusLabel }}</h2>
          <span
            v-if="retryLabel"
            class="status-pill"
          >
            {{ retryLabel }}
          </span>
        </div>
      </div>

      <div class="payment-meta">
        <div>
          <span>Session</span>
          <strong>{{ sessionId || 'Waiting for Stripe redirect' }}</strong>
        </div>
        <div v-if="checkedAtLabel">
          <span>Last checked</span>
          <strong>{{ checkedAtLabel }}</strong>
        </div>
        <div>
          <span>Journey status</span>
          <strong>{{ prettyLabel(responseJourney?.journey_status || journey?.journey_status || 'processing') }}</strong>
        </div>
      </div>

      <p
        v-if="!sessionId"
        class="payment-note"
      >
        Return from checkout with a Stripe session to verify this payment automatically.
      </p>

      <div class="payment-actions">
        <button
          type="button"
          class="secondary-btn"
          :disabled="state === 'checking'"
          @click="confirmPayment"
        >
          <span
            v-if="state === 'checking'"
            class="button-spinner"
            aria-hidden="true"
          />
          {{ actionLabel }}
        </button>
        <button
          type="button"
          class="primary-btn"
          @click="emit('refreshJourney')"
        >
          Refresh journey
        </button>
      </div>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.payment-card {
  --accent: #0071e3;
  --accent-soft: rgba(0, 113, 227, 0.1);
  --success: #0a7f45;
  --success-soft: rgba(52, 199, 89, 0.12);
  --danger: #d92d20;
  --danger-soft: rgba(255, 59, 48, 0.08);
  --ink: #1d1d1f;
  --muted: #637098;
  --line: #e4e8f5;
  --surface: #ffffff;
  --surface-soft: #f7f7fb;
  display: grid;
  gap: 1.05rem;
  width: min(660px, 100%);
  padding: 1.25rem;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: 0 18px 48px rgba(26, 38, 74, 0.08), 0 2px 10px rgba(26, 38, 74, 0.04);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  animation: payment-card-in 0.34s cubic-bezier(0.28, 0.11, 0.32, 1) both;
}

@keyframes payment-card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.payment-card__top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.9rem;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
}

.status-icon {
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 1.45rem;
  font-weight: 760;
  border-radius: 16px;
}

.status-icon--loading {
  color: var(--accent);
  background: var(--accent-soft);
}

.status-icon--success {
  color: var(--success);
  background: var(--success-soft);
}

.status-icon--error {
  color: var(--danger);
  background: var(--danger-soft);
}

.dn-spinner {
  width: 1.35rem;
  height: 1.35rem;
  border: 2px solid rgba(0, 113, 227, 0.2);
  border-top-color: var(--accent);
  border-radius: 999px;
  animation: spin 0.85s linear infinite;
}

.payment-card__copy {
  min-width: 0;
}

.payment-eyebrow {
  margin: 0 0 0.3rem;
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  line-height: 1.1;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 1.16rem;
  font-weight: 670;
  line-height: 1.2;
}

.status-pill {
  display: inline-flex;
  margin-top: 0.55rem;
  padding: 0.38rem 0.62rem;
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 650;
  background: var(--accent-soft);
  border-radius: 999px;
}

p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

.payment-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.payment-meta div {
  min-width: 0;
  padding: 0.85rem 0.9rem;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 14px;
}

.payment-meta span {
  display: block;
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.payment-meta strong {
  display: block;
  margin-top: 0.25rem;
  color: var(--ink);
  font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.84rem;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.payment-note {
  padding: 0.75rem 0.85rem;
  color: var(--accent);
  font-size: 0.84rem;
  font-weight: 620;
  background: var(--accent-soft);
  border-radius: 12px;
}

.payment-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  padding-top: 0.15rem;
}

.primary-btn,
.secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0 1rem;
  font-size: 0.9rem;
  font-weight: 680;
  line-height: 1;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.primary-btn {
  color: #ffffff;
  background: var(--accent);
  box-shadow: 0 10px 22px rgba(0, 113, 227, 0.18);
}

.secondary-btn {
  color: var(--ink);
  background: #ffffff;
  border: 1px solid var(--line);
}

.primary-btn:hover,
.secondary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.primary-btn:hover {
  background: #0068d6;
  box-shadow: 0 14px 28px rgba(0, 113, 227, 0.22);
}

.secondary-btn:hover:not(:disabled) {
  background: var(--surface-soft);
  border-color: rgba(0, 113, 227, 0.2);
}

.primary-btn:disabled,
.secondary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  transform: none;
  box-shadow: none;
}

.button-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(29, 29, 31, 0.14);
  border-top-color: var(--ink);
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 560px) {
  .payment-card {
    padding: 1rem;
    border-radius: 18px;
  }

  .payment-card__top,
  .payment-meta,
  .payment-actions {
    grid-template-columns: 1fr;
  }

  .payment-card__top {
    align-items: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .payment-card,
  .dn-spinner,
  .button-spinner {
    animation: none;
  }
}
</style>
