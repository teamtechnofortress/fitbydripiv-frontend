<script setup>
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAdminSubscriptionDetailUrl, getAdminWebhookDetailUrl, cancelSubscriptionUrl } from '@/network/const'
import { getApiToken } from '@/store/authData'
import { formatDate, formatDateTime, formatMoney, prettyLabel, statusColor } from '@/views/pages/admin/payments/detailShared'
import WebhookPayloadDialog from '@/views/pages/admin/payments/WebhookPayloadDialog.vue'
import PaymentWebhooksDialog from '@/views/pages/admin/payments/PaymentWebhooksDialog.vue'

const route  = useRoute()
const router = useRouter()

const loading             = ref(false)
const error               = ref('')
const subscription        = ref(null)
const cancelling          = ref(false)
const cancelDialogVisible = ref(false)
const successMsg          = ref('')
const webhookDialogOpen   = ref(false)
const webhookLoading      = ref(false)
const webhookError        = ref('')
const selectedWebhook     = ref(null)
const webhookParentLabel  = ref('')

// ── Payment webhooks modal ───────────────────────────
const paymentWebhooksDialogOpen = ref(false)
const selectedPayment           = ref(null)

const openPaymentWebhooks = payment => {
  selectedPayment.value           = payment
  paymentWebhooksDialogOpen.value = true
}

const subscriptionId = computed(() => String(route.params.id || ''))

const authHeaders = computed(() => ({
  Authorization: `Bearer ${getApiToken()}`,
  Accept: 'application/json',
}))

// ── Helpers ──────────────────────────────────────────────
const stripeDate = ts => ts
  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ts * 1000))
  : '—'

const cyclePercent = computed(() => {
  if (!subscription.value) return 0
  const { current_cycle_number, total_cycles } = subscription.value
  return total_cycles ? Math.round((current_cycle_number / total_cycles) * 100) : 0
})

// ── Data ─────────────────────────────────────────────────
const loadSubscription = async () => {
  if (!subscriptionId.value) { error.value = 'Missing subscription ID.'; return }
  loading.value      = true
  error.value        = ''
  subscription.value = null
  try {
    const { data } = await axios.get(getAdminSubscriptionDetailUrl(subscriptionId.value), { headers: authHeaders.value })
    subscription.value = data
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to load subscription details.'
  } finally {
    loading.value = false
  }
}

// ── Cancel ───────────────────────────────────────────────
const doCancel = async confirmed => {
  if (!confirmed) return
  cancelling.value = true
  successMsg.value = ''
  error.value      = ''
  try {
    const { data } = await axios.post(cancelSubscriptionUrl(subscriptionId.value), {}, { headers: authHeaders.value })
    successMsg.value = data?.message || 'Subscription cancelled successfully.'
    await loadSubscription()
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to cancel subscription.'
  } finally {
    cancelling.value = false
  }
}

// ── Navigation ───────────────────────────────────────────
const goBack       = () => router.push('/admin/payments')
const openOrder    = id => id && router.push(`/admin/orders/${id}`)

// ── Webhooks ─────────────────────────────────────────────
const viewWebhookPayload = async (webhookId, parentLabel = 'View subscription') => {
  if (!webhookId) return
  webhookDialogOpen.value  = true
  webhookLoading.value     = true
  webhookError.value       = ''
  selectedWebhook.value    = null
  webhookParentLabel.value = parentLabel
  try {
    const { data } = await axios.get(getAdminWebhookDetailUrl(webhookId), { headers: authHeaders.value })
    selectedWebhook.value = data
  } catch (err) {
    webhookError.value = err?.response?.data?.message || 'Failed to load webhook payload.'
  } finally {
    webhookLoading.value = false
  }
}

const openWebhookParent = () => {
  if (!selectedWebhook.value || !subscription.value) return
  if (selectedWebhook.value.webhookable_type === 'orders')
    return openOrder(subscription.value.order?.id)
  router.push(`/admin/subscriptions/${subscription.value.id}`)
}

onMounted(loadSubscription)
watch(() => route.params.id, loadSubscription)
</script>

<template>
  <div class="detail-page">
    <div class="detail-shell">

      <!-- Back bar -->
      <div class="hero-bar">
        <button class="back-btn" @click="goBack">
          <span class="mdi mdi-arrow-left" />
          Back to Payments
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="state-card">
        <VProgressCircular indeterminate color="primary" :size="52" :width="5" />
        <h2>Loading subscription…</h2>
        <p>Fetching subscription, billing, and webhook details.</p>
      </div>

      <!-- Error -->
      <div v-else-if="error && !subscription" class="state-card">
        <VAlert type="error" variant="tonal">{{ error }}</VAlert>
        <VBtn color="primary" @click="loadSubscription">Retry</VBtn>
      </div>

      <!-- Content -->
      <template v-else-if="subscription">

        <!-- Alerts -->
        <VAlert v-if="successMsg" type="success" variant="tonal" closable @click:close="successMsg = ''">
          {{ successMsg }}
        </VAlert>
        <VAlert v-if="error" type="error" variant="tonal" closable @click:close="error = ''">
          {{ error }}
        </VAlert>

        <!-- Hero card -->
        <div class="hero-card">
          <div class="hero-copy">
            <p class="eyebrow">Admin · Subscription</p>
            <h1 class="hero-id">#{{ subscription.id }}</h1>
            <p class="hero-sub">
              {{ subscription.order?.product?.name || 'Unknown product' }}
              for {{ subscription.patient?.name || 'Unknown patient' }}
            </p>
            <div class="chip-row">
              <VChip :color="statusColor(subscription.status)" variant="flat" size="small">
                {{ prettyLabel(subscription.status) }}
              </VChip>
              <VChip variant="tonal" size="small">
                Every {{ subscription.billing_frequency_months || '—' }} months
              </VChip>
              <VChip v-if="subscription.discount_percentage" color="success" variant="tonal" size="small">
                {{ subscription.discount_percentage }}% off
              </VChip>
            </div>
          </div>

          <!-- Cycle panel -->
          <div class="hero-meta-panel">
            <div class="panel-row">
              <div class="panel-stat">
                <span class="panel-label">Current cycle</span>
                <strong>{{ subscription.current_cycle_number }} / {{ subscription.total_cycles || '—' }}</strong>
              </div>
              <div class="panel-stat">
                <span class="panel-label">Next billing</span>
                <strong>{{ formatDate(subscription.next_billing_date) }}</strong>
              </div>
            </div>
            <div class="cycle-progress-wrap">
              <div class="cycle-track">
                <div class="cycle-fill" :style="{ width: `${cyclePercent}%` }" />
              </div>
              <span class="cycle-pct">{{ cyclePercent }}%</span>
            </div>

            <!-- Cancel action -->
            <button
              v-if="subscription.status !== 'cancelled'"
              class="cancel-btn"
              :disabled="cancelling"
              @click="cancelDialogVisible = true"
            >
              <span :class="cancelling ? 'mdi mdi-loading mdi-spin' : 'mdi mdi-cancel'" />
              {{ cancelling ? 'Cancelling…' : 'Cancel subscription' }}
            </button>
            <span v-else class="cancelled-note">
              <span class="mdi mdi-check-circle-outline" /> Subscription is cancelled
            </span>
          </div>
        </div>

        <!-- Stat row -->
        <div class="stat-row">
          <div class="stat-tile">
            <span class="stat-label">Start date</span>
            <strong>{{ formatDate(subscription.start_date) }}</strong>
          </div>
          <div class="stat-tile">
            <span class="stat-label">End date</span>
            <strong>{{ formatDate(subscription.end_date) || 'No end date' }}</strong>
          </div>
          <div class="stat-tile">
            <span class="stat-label">Stripe ID</span>
            <strong class="mono">{{ subscription.stripe_subscription_id || '—' }}</strong>
          </div>
          <div class="stat-tile">
            <span class="stat-label">Discount</span>
            <strong>{{ subscription.discount_percentage ? `${subscription.discount_percentage}%` : 'None' }}</strong>
          </div>
        </div>

        <!-- Patient + Order -->
        <div class="two-col">
          <div class="detail-card">
            <div class="card-head">
              <span class="mdi mdi-account-outline card-icon" />
              <h3>Patient</h3>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Name</span>
                <strong>{{ subscription.patient?.name || '—' }}</strong>
              </div>
              <div class="info-item">
                <span class="info-label">Email</span>
                <strong>{{ subscription.patient?.email || '—' }}</strong>
              </div>
              <div class="info-item">
                <span class="info-label">Phone</span>
                <strong>{{ subscription.patient?.phone || '—' }}</strong>
              </div>
              <div class="info-item">
                <span class="info-label">Patient ID</span>
                <strong>{{ subscription.patient?.id || '—' }}</strong>
              </div>
            </div>
          </div>

          <div class="detail-card">
            <div class="card-head-row">
              <div class="card-head">
                <span class="mdi mdi-receipt-outline card-icon" />
                <h3>Linked Order</h3>
              </div>
              <button class="outline-btn" @click="openOrder(subscription.order?.id)">
                <span class="mdi mdi-open-in-new" />
                View order
              </button>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Order UUID</span>
                <strong class="mono small">{{ subscription.order?.order_uuid || '—' }}</strong>
              </div>
              <div class="info-item">
                <span class="info-label">Status</span>
                <VChip :color="statusColor(subscription.order?.status)" variant="tonal" size="small">
                  {{ prettyLabel(subscription.order?.status) }}
                </VChip>
              </div>
              <div class="info-item">
                <span class="info-label">Amount</span>
                <strong>{{ formatMoney(subscription.order?.price, subscription.order?.currency || 'USD') }}</strong>
              </div>
              <div class="info-item">
                <span class="info-label">Payment</span>
                <VChip :color="statusColor(subscription.order?.payment_status)" variant="tonal" size="small">
                  {{ prettyLabel(subscription.order?.payment_status) }}
                </VChip>
              </div>
              <div class="info-item full-col">
                <span class="info-label">Product</span>
                <strong>{{ subscription.order?.product?.name || '—' }}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Stripe data -->
        <div v-if="subscription.stripe" class="detail-card accent-card">
          <div class="card-head">
            <span class="mdi mdi-credit-card-outline card-icon" />
            <h3>Stripe Subscription</h3>
          </div>
          <div class="info-grid four-col">
            <div class="info-item">
              <span class="info-label">Stripe status</span>
              <VChip :color="subscription.stripe.status === 'active' ? 'success' : 'warning'" variant="tonal" size="small">
                {{ subscription.stripe.status || '—' }}
              </VChip>
            </div>
            <div class="info-item">
              <span class="info-label">Period start</span>
              <strong>{{ stripeDate(subscription.stripe.current_period_start) }}</strong>
            </div>
            <div class="info-item">
              <span class="info-label">Period end</span>
              <strong>{{ stripeDate(subscription.stripe.current_period_end) }}</strong>
            </div>
            <div class="info-item">
              <span class="info-label">Cancel at</span>
              <strong>{{ stripeDate(subscription.stripe.cancel_at) }}</strong>
            </div>
          </div>
        </div>

        <!-- Order payments -->
        <div v-if="subscription.order?.payments?.length" class="detail-card">
          <div class="card-head">
            <div class="card-head-left">
              <span class="mdi mdi-cash-multiple card-icon" />
              <h3>Payments</h3>
              <span class="count-badge">{{ subscription.order.payments.length }}</span>
            </div>
          </div>
          <div class="timeline">
            <div
              v-for="payment in subscription.order.payments"
              :key="payment.id"
              class="timeline-item"
            >
              <div class="timeline-row">
                <div class="timeline-left">
                  <div class="timeline-dot" />
                  <div>
                    <strong class="timeline-amount">{{ formatMoney(payment.amount, payment.currency || 'USD') }}</strong>
                    <span class="timeline-id">Payment #{{ payment.id }}</span>
                    <span class="timeline-date">{{ formatDateTime(payment.created_at) }}</span>
                  </div>
                </div>
                <div class="timeline-actions">
                  <VChip :color="statusColor(payment.status)" variant="flat" size="small">
                    {{ prettyLabel(payment.status) }}
                  </VChip>
                  <button
                    v-if="payment.webhooks?.length"
                    class="webhooks-trigger-btn"
                    @click="openPaymentWebhooks(payment)"
                  >
                    <span class="mdi mdi-webhook" />
                    Webhooks
                    <span class="wh-count">{{ payment.webhooks.length }}</span>
                  </button>
                </div>
              </div>

              <!-- Inline webhook summary (status only, click to open modal) -->
              <div v-if="payment.webhooks?.length" class="webhook-summary">
                <div
                  v-for="hook in payment.webhooks"
                  :key="hook.id"
                  class="webhook-summary-chip"
                  :title="hook.stripe_event_id"
                  @click="openPaymentWebhooks(payment)"
                >
                  <span
                    class="wh-dot"
                    :class="hook.processed ? 'wh-dot--ok' : 'wh-dot--warn'"
                  />
                  <span class="wh-event">{{ hook.event_type }}</span>
                  <span class="wh-id">#{{ hook.id }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Subscription webhooks -->
        <div class="detail-card">
          <div class="card-head">
            <div class="card-head-left">
              <span class="mdi mdi-webhook card-icon" />
              <h3>Subscription Webhooks</h3>
              <span class="count-badge">{{ subscription.webhooks?.length || 0 }}</span>
            </div>
          </div>
          <div v-if="subscription.webhooks?.length" class="webhook-table">
            <div
              v-for="hook in subscription.webhooks"
              :key="hook.id"
              class="webhook-table-row"
            >
              <div class="webhook-info">
                <span class="mdi mdi-webhook webhook-icon" />
                <div>
                  <strong>{{ hook.event_type }}</strong>
                  <span class="webhook-stripe-id">{{ hook.stripe_event_id || '—' }}</span>
                  <span class="webhook-meta">Created {{ formatDateTime(hook.created_at) }}</span>
                  <span v-if="hook.processed_at" class="webhook-meta">
                    Processed {{ formatDateTime(hook.processed_at) }}
                  </span>
                </div>
              </div>
              <div class="webhook-actions">
                <VChip :color="hook.processed ? 'success' : 'warning'" variant="tonal" size="x-small">
                  {{ hook.processed ? 'Processed' : 'Pending' }}
                </VChip>
                <button class="payload-btn" @click="viewWebhookPayload(hook.id, 'View subscription')">
                  <span class="mdi mdi-code-json" /> View payload
                </button>
              </div>
            </div>
          </div>
          <p v-else class="empty-msg">No subscription-level webhooks available.</p>
        </div>

      </template>
    </div>

    <!-- Cancel confirm dialog -->
    <ConfirmDialog
      v-model:isDialogVisible="cancelDialogVisible"
      confirmation-msg="Are you sure you want to cancel this subscription? This action cannot be undone."
      @confirm="doCancel"
    />

    <!-- Webhook payload dialog -->
    <WebhookPayloadDialog
      v-model="webhookDialogOpen"
      :webhook="selectedWebhook"
      :loading="webhookLoading"
      :error="webhookError"
      :parent-label="webhookParentLabel"
      @open-parent="openWebhookParent"
    />

    <!-- Payment webhooks modal -->
    <PaymentWebhooksDialog
      v-model="paymentWebhooksDialogOpen"
      :payment="selectedPayment"
    />
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────── */
.detail-page   { background: rgb(var(--v-theme-background)); min-height: 100vh; padding: 24px 28px; }
.detail-shell  { max-width: 1280px; margin: 0 auto; display: grid; gap: 20px; }

/* ── Back ────────────────────────────────────────────── */
.hero-bar { display: flex; }
.back-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 0.15s;
}
.back-btn:hover { background: rgba(var(--v-theme-on-surface), 0.05); }

/* ── State ───────────────────────────────────────────── */
.state-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 24px; padding: 64px 32px;
  display: grid; place-items: center; gap: 16px; text-align: center;
}
.state-card h2 { font-size: 1.4rem; font-weight: 700; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); margin: 0; }
.state-card p  { color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); margin: 0; }

/* ── Hero card ───────────────────────────────────────── */
.hero-card {
  display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.07) 0%, rgb(var(--v-theme-surface)) 60%);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 24px; padding: 28px 32px;
  box-shadow: 0 4px 24px rgba(var(--v-shadow-key-umbra-color), 0.06);
}
.eyebrow {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: rgb(var(--v-theme-primary)); margin: 0 0 10px;
}
.hero-id {
  font-size: 2.5rem; font-weight: 800; letter-spacing: -0.03em;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); margin: 0 0 8px;
}
.hero-sub {
  font-size: 0.875rem; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  margin: 0 0 14px; line-height: 1.6;
}
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }

/* Hero meta panel */
.hero-meta-panel {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 18px; padding: 20px; display: grid; gap: 16px;
}
.panel-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.panel-stat  { display: flex; flex-direction: column; gap: 4px; }
.panel-label {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.panel-stat strong { font-size: 0.9rem; font-weight: 700; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); }

.cycle-progress-wrap { display: flex; align-items: center; gap: 10px; }
.cycle-track  { flex: 1; height: 6px; background: rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 4px; overflow: hidden; }
.cycle-fill   { height: 100%; background: rgb(var(--v-theme-primary)); border-radius: 4px; transition: width 0.4s; }
.cycle-pct    { font-size: 0.75rem; font-weight: 700; color: rgb(var(--v-theme-primary)); white-space: nowrap; }

.cancel-btn {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px; border-radius: 12px; width: 100%;
  border: 1px solid rgba(var(--v-theme-error), 0.35);
  background: rgba(var(--v-theme-error), 0.06);
  color: rgb(var(--v-theme-error));
  font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.cancel-btn:hover:not(:disabled) { background: rgba(var(--v-theme-error), 0.12); }
.cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.cancelled-note {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 0.82rem; font-weight: 500;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* ── Stat row ────────────────────────────────────────── */
.stat-row {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
}
.stat-tile {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px; padding: 18px 20px;
  display: flex; flex-direction: column; gap: 6px;
}
.stat-label {
  font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.stat-tile strong { font-size: 0.9rem; font-weight: 700; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); }
.mono  { font-family: monospace; font-size: 0.78rem !important; word-break: break-all; }
.small { font-size: 0.78rem !important; }

/* ── Two-col ─────────────────────────────────────────── */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

/* ── Detail cards ────────────────────────────────────── */
.detail-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 20px; padding: 24px;
  box-shadow: 0 2px 12px rgba(var(--v-shadow-key-umbra-color), 0.04);
}
.accent-card {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05) 0%, rgb(var(--v-theme-surface)) 60%);
}

/* ── Card head ───────────────────────────────────────── */
.card-head {
  display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
}
.card-head-row {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
}
.card-head-left { display: flex; align-items: center; gap: 10px; }
.card-head h3, .card-head-left h3 {
  font-size: 1rem; font-weight: 700; margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}
.card-icon {
  font-size: 18px; color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1); border-radius: 8px;
  width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.count-badge {
  font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;
  background: rgba(var(--v-theme-primary), 0.1); color: rgb(var(--v-theme-primary));
}

/* ── Info grid ───────────────────────────────────────── */
.info-grid     { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.four-col      { grid-template-columns: repeat(4, 1fr); }
.info-item     { display: flex; flex-direction: column; gap: 4px; }
.full-col      { grid-column: 1 / -1; }
.info-label    {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.info-item strong { font-size: 0.875rem; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); }

/* ── Outline btn ─────────────────────────────────────── */
.outline-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.outline-btn:hover { background: rgba(var(--v-theme-on-surface), 0.05); }

/* ── Timeline ────────────────────────────────────────── */
.timeline     { display: grid; gap: 12px; }
.timeline-item {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px; padding: 16px; background: rgba(var(--v-theme-on-surface), 0.02);
}
.timeline-row   { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.timeline-left  { display: flex; align-items: flex-start; gap: 14px; }
.timeline-dot   { width: 10px; height: 10px; border-radius: 50%; background: rgb(var(--v-theme-primary)); margin-top: 5px; flex-shrink: 0; }
.timeline-amount { display: block; font-size: 1rem; font-weight: 700; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); }
.timeline-id     { display: block; font-size: 0.78rem; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); margin-top: 2px; }
.timeline-date   { display: block; font-size: 0.78rem; color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity)); margin-top: 2px; }

.timeline-actions {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end;
}

/* ── Webhooks trigger button ─────────────────────────── */
.webhooks-trigger-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  background: rgba(var(--v-theme-primary), 0.07);
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.webhooks-trigger-btn:hover {
  background: rgba(var(--v-theme-primary), 0.14);
  border-color: rgb(var(--v-theme-primary));
}
.wh-count {
  background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary));
  font-size: 0.65rem; font-weight: 700;
  padding: 1px 6px; border-radius: 20px; min-width: 18px; text-align: center;
}

/* ── Webhook inline summary ──────────────────────────── */
.webhook-summary {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-top: 12px; padding-top: 12px;
  border-top: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
}
.webhook-summary-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.03);
  font-size: 0.75rem; cursor: pointer; transition: background 0.12s;
}
.webhook-summary-chip:hover {
  background: rgba(var(--v-theme-primary), 0.07);
  border-color: rgba(var(--v-theme-primary), 0.3);
}
.wh-dot       { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.wh-dot--ok   { background: rgb(var(--v-theme-success)); }
.wh-dot--warn { background: rgb(var(--v-theme-warning)); }
.wh-event     { font-weight: 600; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); }
.wh-id        { font-family: monospace; font-size: 0.7rem; color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity)); }

/* ── Webhooks (subscription-level table) ─────────────── */
.webhook-list      { display: grid; gap: 8px; margin-top: 14px; border-top: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity)); padding-top: 14px; }
.webhook-table     { display: grid; gap: 10px; }
.webhook-table-row,
.webhook-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.webhook-info      { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
.webhook-icon      { font-size: 18px; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); margin-top: 2px; flex-shrink: 0; }
.webhook-info strong { display: block; font-size: 0.85rem; font-weight: 600; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); }
.webhook-stripe-id { display: block; font-size: 0.75rem; color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity)); font-family: monospace; margin-top: 2px; }
.webhook-meta      { display: block; font-size: 0.75rem; color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity)); margin-top: 2px; }
.webhook-actions   { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.payload-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 11px; border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 0.78rem; font-weight: 500; cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.payload-btn:hover { background: rgba(var(--v-theme-primary), 0.08); border-color: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-primary)); }

/* ── Empty ───────────────────────────────────────────── */
.empty-msg { font-size: 0.875rem; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); margin: 0; }

/* ── Responsive ──────────────────────────────────────── */
@media (max-width: 960px) {
  .hero-card  { grid-template-columns: 1fr; }
  .stat-row   { grid-template-columns: repeat(2, 1fr); }
  .two-col    { grid-template-columns: 1fr; }
  .four-col   { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .detail-page { padding: 14px; }
  .stat-row    { grid-template-columns: 1fr 1fr; }
  .info-grid   { grid-template-columns: 1fr; }
  .four-col    { grid-template-columns: 1fr 1fr; }
  .timeline-row, .webhook-table-row, .webhook-row { flex-direction: column; }
}
</style>

<route lang="yaml">
meta:
  navActiveLink: admin-tab
</route>