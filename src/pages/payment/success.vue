<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { confirmCheckoutPayment } from '@/api/checkoutApi'

const router = useRouter()
const route = useRoute()
const sessionId = route.query.session_id ? String(route.query.session_id) : null
const orderUuidFromQuery = route.query.order_uuid ? String(route.query.order_uuid) : null

const state = ref('checking')
const error = ref('')
const payload = ref(null)
const lastCheckedAt = ref(null)
const retryInSeconds = ref(null)
const pollTimer = ref(null)
const redirectTimer = ref(null)

const clearTimers = () => {
  if (pollTimer.value) {
    clearTimeout(pollTimer.value)
    pollTimer.value = null
  }

  if (redirectTimer.value) {
    clearTimeout(redirectTimer.value)
    redirectTimer.value = null
  }
}

const goHome = () => {
  clearTimers()
  router.push('/')
  window.scrollTo(0, 0)
}

const goSupport = () => {
  clearTimers()
  router.push('/contact')
  window.scrollTo(0, 0)
}

const goToJourney = orderUuid => {
  if (!orderUuid) return
  clearTimers()
  router.push({
    path: `/journey/${encodeURIComponent(orderUuid)}`,
    query: sessionId ? { session_id: sessionId } : {},
  })
  window.scrollTo(0, 0)
}

const payment = computed(() => payload.value?.data?.payment || null)
const journey = computed(() => payload.value?.data?.journey || null)
const order = computed(() => payload.value?.data?.order || null)

const orderUuid = computed(() => order.value?.order_uuid || null)

const statusLabel = computed(() => {
  if (state.value === 'verified') return 'Payment verified'
  if (state.value === 'failed') return 'Payment failed'
  if (state.value === 'error') return 'Confirmation issue'
  if (payment.value?.confirmed) return 'Payment received'

  return 'Verifying payment'
})

const headline = computed(() => {
  if (state.value === 'verified') return 'Payment verified'
  if (state.value === 'failed') return 'Payment could not be verified'
  if (state.value === 'error') return 'We could not confirm your payment'
  if (payment.value?.confirmed) return 'Payment received'

  return 'Your payment is being verified'
})

const message = computed(() => {
  if (error.value) return error.value
  if (journey.value?.message) return journey.value.message
  if (payment.value?.confirmed) return 'We are preparing your next steps. Please stay on this screen.'

  return 'Please stay on this screen while we confirm your checkout with Stripe.'
})

const retryLabel = computed(() => {
  if (retryInSeconds.value == null || state.value !== 'pending') return ''

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

const progressSteps = computed(() => [
  {
    label: 'Checkout completed',
    state: 'done',
  },
  {
    label: payment.value?.confirmed ? 'Payment verified' : 'Verifying payment',
    state: payment.value?.confirmed ? 'done' : state.value === 'failed' || state.value === 'error' ? 'blocked' : 'active',
  },
  {
    label: journey.value?.next_action === 'open_workflow' || journey.value?.next_action === 'complete'
      ? 'Next step ready'
      : 'Preparing next step',
    state: state.value === 'verified' ? 'done' : payment.value?.confirmed ? 'active' : 'pending',
  },
])

const schedulePoll = delaySeconds => {
  clearTimeout(pollTimer.value)

  const seconds = Math.max(Number(delaySeconds) || 3, 1)
  retryInSeconds.value = seconds

  pollTimer.value = setTimeout(() => {
    confirmPayment()
  }, seconds * 1000)
}

const handleConfirmationPayload = data => {
  payload.value = data
  lastCheckedAt.value = new Date()

  const nextPayment = data?.data?.payment || {}
  const nextJourney = data?.data?.journey || {}
  const nextOrder = data?.data?.order || {}
  const uuid = nextOrder.order_uuid || orderUuidFromQuery

  if (nextPayment.failed || nextJourney.journey_status === 'failed') {
    state.value = 'failed'
    retryInSeconds.value = null
    error.value = nextJourney.message || data?.message || 'Your payment could not be confirmed.'

    return
  }

  if (uuid) {
    state.value = nextPayment.confirmed ? 'verified' : 'pending'
    retryInSeconds.value = null
    error.value = ''
    redirectTimer.value = setTimeout(() => {
      goToJourney(uuid)
    }, nextPayment.confirmed ? 700 : 300)

    return
  }

  if (nextJourney.next_action === 'wait') {
    state.value = 'pending'
    error.value = ''
    schedulePoll(nextJourney.retry_after_seconds || nextPayment.poll_after_seconds || 3)

    return
  }

  if (nextJourney.next_action === 'open_workflow' || nextJourney.next_action === 'complete') {
    state.value = 'verified'
    retryInSeconds.value = null
    error.value = ''
    return
  }

  state.value = nextPayment.confirmed ? 'verified' : 'pending'
  retryInSeconds.value = null
  error.value = ''
}

async function confirmPayment() {
  if (!sessionId) {
    state.value = 'error'
    error.value = 'Missing checkout reference.'

    return
  }

  if (!payload.value) {
    state.value = 'checking'
  }

  try {
    const data = await confirmCheckoutPayment(sessionId)

    if (data?.success === false) {
      throw new Error(data?.message || 'Unable to confirm payment.')
    }

    handleConfirmationPayload(data)
  } catch (err) {
    const responseData = err?.response?.data

    state.value = 'error'
    retryInSeconds.value = null
    error.value = responseData?.message
      || err?.message
      || 'Unable to confirm your payment right now. Please refresh or contact support.'
  }
}

onMounted(() => {
  if (orderUuidFromQuery && !sessionId) {
    goToJourney(orderUuidFromQuery)

    return
  }

  confirmPayment()
})
onBeforeUnmount(clearTimers)
</script>

<template>
  <div class="payment-page">
    <section class="confirmation-panel">
      <div class="status-shell">
        <div
          class="status-icon"
          :class="{
            'status-icon--success': state === 'verified',
            'status-icon--error': state === 'failed' || state === 'error',
            'status-icon--loading': state === 'checking' || state === 'pending',
          }"
        >
          <div
            v-if="state === 'checking' || state === 'pending'"
            class="spinner"
          />
          <svg
            v-else-if="state === 'verified'"
            xmlns="http://www.w3.org/2000/svg"
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            />
            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            />
          </svg>
        </div>

        <p class="eyebrow">
          {{ statusLabel }}
        </p>
        <h1>{{ headline }}</h1>
        <p class="lead">
          {{ message }}
        </p>

        <div class="progress-list">
          <div
            v-for="step in progressSteps"
            :key="step.label"
            class="progress-step"
            :class="`progress-step--${step.state}`"
          >
            <span class="progress-dot" />
            <span>{{ step.label }}</span>
          </div>
        </div>

        <div class="meta-card">
          <div class="meta-row">
            <span>Checkout session</span>
            <strong>{{ sessionId || '-' }}</strong>
          </div>
          <div
            v-if="orderUuid"
            class="meta-row"
          >
            <span>Order reference</span>
            <strong>{{ orderUuid }}</strong>
          </div>
          <div
            v-if="checkedAtLabel"
            class="meta-row"
          >
            <span>Last checked</span>
            <strong>{{ checkedAtLabel }}</strong>
          </div>
        </div>

        <p
          v-if="retryLabel"
          class="retry-text"
        >
          {{ retryLabel }}
        </p>

        <div
          v-if="state === 'verified' && orderUuid"
          class="actions"
        >
          <button
            class="primary"
            @click="goToJourney(orderUuid)"
          >
            Continue to next step
          </button>
        </div>

        <div
          v-else-if="state === 'failed' || state === 'error'"
          class="actions actions--split"
        >
          <button
            class="secondary"
            @click="goHome"
          >
            Go to Home
          </button>
          <button
            class="primary"
            @click="goSupport"
          >
            Contact Support
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.payment-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.18), transparent 34rem),
    linear-gradient(135deg, #f8fafc, #eef2ff);
}

.confirmation-panel {
  width: 100%;
  max-width: 560px;
  padding: 2.5rem 2rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 1.25rem;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.09);
}

.status-shell {
  width: 100%;
}

.status-icon {
  width: 78px;
  height: 78px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.25rem;
  color: white;
  border-radius: 999px;
}

.status-icon--success {
  background: linear-gradient(135deg, #10b981, #059669);
}

.status-icon--error {
  background: linear-gradient(135deg, #f97316, #ef4444);
}

.status-icon--loading {
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
}

.eyebrow {
  margin: 0 0 0.5rem;
  color: #2563eb;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 0.75rem;
  color: #0f172a;
  font-size: 1.85rem;
  font-weight: 800;
  line-height: 1.2;
}

.lead {
  max-width: 440px;
  margin: 0 auto 1.5rem;
  color: #475569;
  font-size: 1rem;
  line-height: 1.65;
}

.progress-list {
  display: grid;
  gap: 0.75rem;
  margin: 0 0 1.25rem;
  text-align: left;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 42px;
  padding: 0.7rem 0.85rem;
  color: #64748b;
  font-weight: 700;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
}

.progress-step--done {
  color: #065f46;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.progress-step--active {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.progress-step--blocked {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.progress-dot {
  width: 0.7rem;
  height: 0.7rem;
  flex: 0 0 auto;
  background: currentColor;
  border-radius: 999px;
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.14);
}

.progress-step--active .progress-dot {
  animation: pulse 1.2s ease-in-out infinite;
}

.meta-card {
  padding: 0.95rem 1rem;
  margin: 0 0 1rem;
  text-align: left;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.9rem;
}

.meta-row {
  display: grid;
  grid-template-columns: minmax(120px, 0.8fr) minmax(0, 1.2fr);
  gap: 0.85rem;
  align-items: baseline;
  padding: 0.45rem 0;
  border-bottom: 1px dashed #e2e8f0;
}

.meta-row:last-child {
  border-bottom: 0;
}

.meta-row span {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 700;
}

.meta-row strong {
  min-width: 0;
  color: #0f172a;
  font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.86rem;
  font-weight: 600;
  overflow-wrap: anywhere;
  text-align: right;
}

.retry-text {
  margin: 0 0 1rem;
  color: #64748b;
  font-size: 0.95rem;
  font-weight: 700;
}

.actions {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.actions--split {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.primary,
.secondary {
  width: 100%;
  min-height: 48px;
  padding: 0.85rem 1.25rem;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 800;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.primary {
  color: white;
  background: linear-gradient(120deg, #0ea5e9, #6366f1);
  box-shadow: 0 12px 30px rgba(14, 165, 233, 0.3);
}

.secondary {
  color: #0f172a;
  background: #e2e8f0;
}

.primary:hover,
.secondary:hover {
  transform: translateY(-1px);
}

.primary:hover {
  box-shadow: 0 16px 34px rgba(99, 102, 241, 0.3);
}

.secondary:hover {
  opacity: 0.94;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.35);
  border-top-color: white;
  border-radius: 999px;
  animation: spin 0.9s linear infinite;
}

@media (max-width: 540px) {
  .confirmation-panel {
    padding: 2rem 1.15rem;
  }

  h1 {
    font-size: 1.55rem;
  }

  .meta-row {
    grid-template-columns: 1fr;
    gap: 0.2rem;
  }

  .meta-row strong {
    text-align: left;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.16); }
  50% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.08); }
}
</style>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
