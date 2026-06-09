<script setup>
import axios from 'axios'
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getOrderBySessionUrl } from '@/network/const'

const router = useRouter()
const route = useRoute()
const sessionId = route.query.session_id ? String(route.query.session_id) : null

const loading = ref(false)
const error = ref('')
const order = ref(null)

const goHome = () => {
  router.push('/')
  window.scrollTo(0, 0)
}

const goSupport = () => {
  router.push('/contact')
  window.scrollTo(0, 0)
}

const pricingLabel = computed(() => {
  if (!order.value) return ''
  
  return order.value.pricing_option?.label || order.value.pricing_type || 'Selected'
})

const amountPaid = computed(() => {
  const price = order.value?.pricing_option?.final_price ?? order.value?.pricing_option?.price ?? null
  
  return price != null ? Number(price) : null
})

const formattedAmount = computed(() => {
  const amount = amountPaid.value
  const currency = order.value?.currency || 'USD'
  if (amount == null || Number.isNaN(amount)) return null
  
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
})

const cadence = computed(() => {
  if (!order.value) return ''
  if (order.value.purchase_type === 'subscription') {
    const months = order.value.frequency_months || 1
    
    return months === 1 ? 'Every month' : `Every ${months} months`
  }
  
  return 'One-time purchase'
})

const sessionRef = computed(() => order.value?.order_uuid || sessionId)

const fetchOrder = async () => {
  if (!sessionId) {
    error.value = 'Missing checkout reference.'
    
    return
  }
  loading.value = true
  error.value = ''
  try {
    const { data } = await axios.get(
      getOrderBySessionUrl(sessionId),
      { headers: { Accept: 'application/json' } },
    )

    order.value = data?.data || data
  } catch (err) {
    if (err?.response?.status === 404) {
      error.value = 'We couldn’t locate this order. Please reach out to support.'
    } else {
      error.value = 'Something went wrong while loading your order. Please refresh or contact support.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchOrder)
</script>

<template>
  <div class="payment-page">
    <div class="card">
      <template v-if="loading">
        <div class="icon loading">
          <div class="spinner" />
        </div>
        <h1>Loading your order…</h1>
        <p>Give us a second while we confirm your checkout details.</p>
      </template>

      <template v-else-if="error">
        <div class="icon error">
          <svg
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
        <h1>Order not found</h1>
        <p>{{ error }}</p>
        <div class="actions">
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
      </template>

      <template v-else-if="order">
        <div class="icon success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1>Order confirmed</h1>
        <p>
          Thanks for completing checkout. Your plan is locked in and our team will begin the next steps.
        </p>

        <div class="order-card">
          <div class="row">
            <span class="label">Product</span>
            <span class="value">{{ order.product?.name || '—' }}</span>
          </div>
          <div class="row">
            <span class="label">Plan</span>
            <span class="value">{{ pricingLabel }} · {{ cadence }}</span>
          </div>
          <div class="row highlight">
            <span class="label">Amount charged</span>
            <span class="value">{{ formattedAmount || '—' }}</span>
          </div>
          <div
            v-if="sessionRef"
            class="row muted"
          >
            <span class="label">Reference ID</span>
            <span class="value monospace">{{ sessionRef }}</span>
          </div>
        </div>

        <button
          class="primary"
          @click="goHome"
        >
          Go to Home
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.payment-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: linear-gradient(135deg, #eef2ff, #f8fafc);
}

.card {
  width: 100%;
  max-width: 520px;
  text-align: center;
  background: white;
  border-radius: 1.25rem;
  padding: 2.5rem 2rem;
  box-shadow: 0 25px 65px rgba(15, 23, 42, 0.08);
}

.icon {
  width: 72px;
  height: 72px;
  border-radius: 999px;
  margin: 0 auto 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.icon.success {
  background: linear-gradient(135deg, #10b981, #059669);
}

.icon.error {
  background: linear-gradient(135deg, #f97316, #ef4444);
}

.icon.loading {
  background: linear-gradient(135deg, #6366f1, #0ea5e9);
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

p {
  color: #475569;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.order-card {
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  text-align: left;
  margin: 0 auto 1.5rem;
  background: #f8fafc;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.5rem 0;
  border-bottom: 1px dashed #e2e8f0;
}

.row:last-child {
  border-bottom: none;
}

.row.highlight {
  color: #0f172a;
  font-weight: 700;
}

.row.muted {
  color: #94a3b8;
  font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.9rem;
}

.label {
  color: #64748b;
  font-weight: 600;
}

.value {
  color: #0f172a;
  font-weight: 600;
  text-align: right;
}

.value.monospace {
  font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-weight: 500;
}

.actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.primary,
.secondary {
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 0.9rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.primary {
  color: white;
  background: linear-gradient(120deg, #0ea5e9, #6366f1);
  box-shadow: 0 12px 30px rgba(14, 165, 233, 0.3);
}

.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 34px rgba(99, 102, 241, 0.3);
}

.secondary {
  color: #0f172a;
  background: #e2e8f0;
}

.secondary:hover {
  opacity: 0.95;
  transform: translateY(-1px);
}

.spinner {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
