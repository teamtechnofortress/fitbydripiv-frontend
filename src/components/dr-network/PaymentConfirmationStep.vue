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

const emit = defineEmits(['refresh-journey'])

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
    emit('refresh-journey')

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
    <section class="dn-card">
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

      <div>
        <span class="dn-chip">{{ payment?.status || journey?.payment_status || 'pending' }}</span>
        <h2>{{ headline }}</h2>
        <p>{{ message }}</p>
      </div>

      <div class="dn-meta">
        <div>
          <span>Session</span>
          <strong>{{ sessionId || 'Waiting for Stripe redirect' }}</strong>
        </div>
        <div v-if="checkedAtLabel">
          <span>Last checked</span>
          <strong>{{ checkedAtLabel }}</strong>
        </div>
      </div>

      <p
        v-if="retryLabel"
        class="dn-retry"
      >
        {{ retryLabel }}
      </p>

      <div class="dn-actions">
        <button
          type="button"
          class="dn-button dn-button--secondary"
          :disabled="state === 'checking'"
          @click="confirmPayment"
        >
          Check payment
        </button>
        <button
          type="button"
          class="dn-button"
          @click="emit('refresh-journey')"
        >
          Refresh journey
        </button>
      </div>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.dn-card {
  display: grid;
  gap: 1rem;
  max-width: 680px;
  padding: 1.25rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04);
}

.status-icon {
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 1.8rem;
  font-weight: 900;
  border-radius: 999px;
}

.status-icon--loading {
  background: linear-gradient(135deg, #0284c7, #4f46e5);
}

.status-icon--success {
  background: linear-gradient(135deg, #059669, #10b981);
}

.status-icon--error {
  background: linear-gradient(135deg, #f97316, #dc2626);
}

.dn-spinner {
  width: 1.7rem;
  height: 1.7rem;
  border: 3px solid rgba(255, 255, 255, 0.4);
  border-top-color: #ffffff;
  border-radius: 999px;
  animation: spin 0.85s linear infinite;
}

.dn-chip {
  display: inline-flex;
  padding: 0.45rem 0.7rem;
  color: #075985;
  font-weight: 850;
  text-transform: capitalize;
  background: #e0f2fe;
  border: 1px solid #bae6fd;
  border-radius: 999px;
}

h2 {
  margin: 1rem 0 0.4rem;
  color: #0f172a;
  font-size: 1.25rem;
  font-weight: 850;
}

p {
  margin: 0;
  color: #475569;
  line-height: 1.65;
}

.dn-meta {
  display: grid;
  gap: 0.75rem;
}

.dn-meta div {
  min-width: 0;
  padding: 0.85rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.dn-meta span {
  display: block;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dn-meta strong {
  display: block;
  margin-top: 0.25rem;
  color: #0f172a;
  font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.86rem;
  overflow-wrap: anywhere;
}

.dn-retry {
  color: #075985;
  font-weight: 800;
}

.dn-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.dn-button {
  min-height: 44px;
  padding: 0.75rem 1rem;
  color: #ffffff;
  font-weight: 850;
  background: linear-gradient(135deg, #059669, #0284c7);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.dn-button--secondary {
  color: #0f172a;
  background: #e2e8f0;
}

.dn-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
