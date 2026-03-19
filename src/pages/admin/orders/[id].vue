<script setup>
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAdminOrderDetailUrl, getAdminWebhookDetailUrl } from '@/network/const'
import { getApiToken } from '@/store/authData'
import { formatDate, formatDateTime, formatMoney, prettyLabel, statusColor } from '@/views/pages/admin/payments/detailShared'
import WebhookPayloadDialog from '@/views/pages/admin/payments/WebhookPayloadDialog.vue'
import PaymentWebhooksDialog from '@/views/pages/admin/payments/PaymentWebhooksDialog.vue'

const route  = useRoute()
const router = useRouter()

const loading            = ref(false)
const error              = ref('')
const order              = ref(null)
const webhookDialogOpen  = ref(false)
const webhookLoading     = ref(false)
const webhookError       = ref('')
const selectedWebhook    = ref(null)
const webhookParentLabel = ref('')

// ── Payment webhooks modal ───────────────────────────
const paymentWebhooksDialogOpen = ref(false)
const selectedPayment           = ref(null)

const openPaymentWebhooks = payment => {
  selectedPayment.value           = payment
  paymentWebhooksDialogOpen.value = true
}

const orderId = computed(() => String(route.params.id || ''))

const authHeaders = computed(() => ({
  Authorization: `Bearer ${getApiToken()}`,
  Accept: 'application/json',
}))

// ── Data ────────────────────────────────────────────────
const loadOrder = async () => {
  if (!orderId.value) { error.value = 'Missing order ID.'; return }
  loading.value = true
  error.value   = ''
  order.value   = null
  try {
    const { data } = await axios.get(getAdminOrderDetailUrl(orderId.value), { headers: authHeaders.value })
    order.value = data
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to load order details.'
  } finally {
    loading.value = false
  }
}

// ── Navigation ──────────────────────────────────────────
const goBack            = ()  => router.push('/admin/payments')
const openSubscription  = id  => id && router.push(`/admin/subscriptions/${id}`)

// ── Webhooks ────────────────────────────────────────────
const viewWebhookPayload = async (webhookId, parentLabel = 'View order') => {
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
  if (!selectedWebhook.value) return
  if (selectedWebhook.value.webhookable_type === 'subscriptions' && order.value?.subscription?.id)
    return openSubscription(order.value.subscription.id)
  router.push(`/admin/orders/${order.value?.id}`)
}

onMounted(loadOrder)
watch(() => route.params.id, loadOrder)
</script>

<template>
  <div class="detail-page">
    <div class="detail-shell">

      <!-- ── Back bar ──────────────────────────────────── -->
      <div class="hero-bar">
        <button class="back-btn" @click="goBack">
          <span class="mdi mdi-arrow-left" />
          Back to Payments
        </button>
      </div>

      <!-- ── Loading ──────────────────────────────────── -->
      <div v-if="loading" class="state-card">
        <VProgressCircular indeterminate color="primary" :size="52" :width="5" />
        <h2>Loading order…</h2>
        <p>Fetching the latest order, payment, and webhook details.</p>
      </div>

      <!-- ── Error ──────────────────────────────────── -->
      <div v-else-if="error" class="state-card">
        <VAlert type="error" variant="tonal">{{ error }}</VAlert>
        <VBtn color="primary" @click="loadOrder">Retry</VBtn>
      </div>

      <!-- ── Content ──────────────────────────────────── -->
      <template v-else-if="order">

        <!-- Hero card -->
        <div class="hero-card">
          <div class="hero-copy">
            <p class="eyebrow">Admin · Order</p>
            <h1 class="hero-uuid">{{ order.order_uuid }}</h1>
            <p class="hero-sub">
              Order #{{ order.id }} — {{ order.product?.name || 'Unknown product' }}
              placed by {{ order.patient?.name || 'Unknown patient' }}
            </p>
            <div class="chip-row">
              <VChip :color="statusColor(order.status)" variant="flat" size="small">
                {{ prettyLabel(order.status) }}
              </VChip>
              <VChip :color="statusColor(order.payment_status)" variant="tonal" size="small">
                {{ prettyLabel(order.payment_status) }}
              </VChip>
              <VChip variant="outlined" size="small">
                {{ prettyLabel(order.purchase_type) }}
              </VChip>
            </div>
          </div>
          <div class="hero-amount">
            <span class="amount-label">Total Charged</span>
            <span class="amount-value">{{ formatMoney(order.price, order.currency || 'USD') }}</span>
            <span class="amount-currency">{{ order.currency || 'USD' }}</span>
          </div>
        </div>

        <!-- Stat row -->
        <div class="stat-row">
          <div class="stat-tile">
            <span class="stat-label">Pricing type</span>
            <strong>{{ prettyLabel(order.pricing_type) }}</strong>
          </div>
          <div class="stat-tile">
            <span class="stat-label">Patient email</span>
            <strong>{{ order.patient?.email || '—' }}</strong>
          </div>
          <div class="stat-tile">
            <span class="stat-label">Payments</span>
            <strong>{{ order.payments?.length || 0 }}</strong>
          </div>
          <div class="stat-tile">
            <span class="stat-label">Webhooks</span>
            <strong>{{ order.webhooks?.length || 0 }}</strong>
          </div>
        </div>

        <!-- Patient + Product -->
        <div class="two-col">
          <div class="detail-card">
            <div class="card-head">
              <span class="mdi mdi-account-outline card-icon" />
              <h3>Patient</h3>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Name</span>
                <strong>{{ order.patient?.name || '—' }}</strong>
              </div>
              <div class="info-item">
                <span class="info-label">Email</span>
                <strong>{{ order.patient?.email || '—' }}</strong>
              </div>
              <div class="info-item">
                <span class="info-label">Phone</span>
                <strong>{{ order.patient?.phone || '—' }}</strong>
              </div>
              <div class="info-item">
                <span class="info-label">Patient ID</span>
                <strong>{{ order.patient?.id || '—' }}</strong>
              </div>
            </div>
          </div>

          <div class="detail-card">
            <div class="card-head">
              <span class="mdi mdi-pill card-icon" />
              <h3>Product</h3>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Name</span>
                <strong>{{ order.product?.name || '—' }}</strong>
              </div>
              <div class="info-item">
                <span class="info-label">Slug</span>
                <strong>{{ order.product?.slug || '—' }}</strong>
              </div>
              <div class="info-item full-col">
                <span class="info-label">Product ID</span>
                <strong class="break-all">{{ order.product?.id || '—' }}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Linked subscription -->
        <div v-if="order.subscription" class="detail-card accent-card">
          <div class="card-head">
            <div class="card-head-left">
              <span class="mdi mdi-calendar-sync-outline card-icon" />
              <h3>Linked Subscription</h3>
            </div>
            <button class="outline-btn" @click="openSubscription(order.subscription.id)">
              <span class="mdi mdi-open-in-new" />
              Open subscription
            </button>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Status</span>
              <VChip :color="statusColor(order.subscription.status)" variant="tonal" size="small">
                {{ prettyLabel(order.subscription.status) }}
              </VChip>
            </div>
            <div class="info-item">
              <span class="info-label">Cycle progress</span>
              <div class="cycle-wrap">
                <div class="cycle-bar">
                  <div
                    class="cycle-fill"
                    :style="{ width: order.subscription.total_cycles
                      ? `${(order.subscription.current_cycle_number / order.subscription.total_cycles) * 100}%`
                      : '0%' }"
                  />
                </div>
                <strong>{{ order.subscription.current_cycle_number }} / {{ order.subscription.total_cycles || '—' }}</strong>
              </div>
            </div>
            <div class="info-item">
              <span class="info-label">Billing frequency</span>
              <strong>Every {{ order.subscription.billing_frequency_months || '—' }} months</strong>
            </div>
            <div class="info-item">
              <span class="info-label">Next billing</span>
              <strong>{{ formatDate(order.subscription.next_billing_date) }}</strong>
            </div>
            <div class="info-item">
              <span class="info-label">End date</span>
              <strong>{{ formatDate(order.subscription.end_date) || 'No end date' }}</strong>
            </div>
          </div>
        </div>

        <!-- Payments -->
        <div class="detail-card">
          <div class="card-head">
            <div class="card-head-left">
              <span class="mdi mdi-cash-multiple card-icon" />
              <h3>Payments</h3>
              <span class="count-badge">{{ order.payments?.length || 0 }}</span>
            </div>
          </div>
          <div v-if="order.payments?.length" class="timeline">
            <div v-for="payment in order.payments" :key="payment.id" class="timeline-item">
              <div class="timeline-row">
                <div class="timeline-left">
                  <div class="timeline-dot" />
                  <div>
                    <strong class="timeline-amount">{{ formatMoney(payment.amount, payment.currency || order.currency || 'USD') }}</strong>
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

              <!-- Inline webhook summary (status only, no payload) -->
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
          <p v-else class="empty-msg">No payments recorded for this order.</p>
        </div>

        <!-- Order webhooks -->
        <div class="detail-card">
          <div class="card-head">
            <div class="card-head-left">
              <span class="mdi mdi-webhook card-icon" />
              <h3>Order Webhooks</h3>
              <span class="count-badge">{{ order.webhooks?.length || 0 }}</span>
            </div>
          </div>
          <div v-if="order.webhooks?.length" class="webhook-table">
            <div
              v-for="hook in order.webhooks"
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
                <button class="payload-btn" @click="viewWebhookPayload(hook.id, 'View order')">
                  <span class="mdi mdi-code-json" />
                  View payload
                </button>
              </div>
            </div>
          </div>
          <p v-else class="empty-msg">No order-level webhooks available.</p>
        </div>

      </template>
    </div>

    <!-- Webhook modal -->
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

/* ── Back button ─────────────────────────────────────── */
.hero-bar { display: flex; }
.back-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface)); color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 0.15s;
}
.back-btn:hover { background: rgba(var(--v-theme-on-surface), 0.05); }

/* ── State cards ─────────────────────────────────────── */
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
  display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: center;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.07) 0%, rgb(var(--v-theme-surface)) 60%);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 24px; padding: 28px 32px;
  box-shadow: 0 4px 24px rgba(var(--v-shadow-key-umbra-color), 0.06);
}
.eyebrow {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: rgb(var(--v-theme-primary)); margin: 0 0 10px;
}
.hero-uuid {
  font-size: clamp(1.2rem, 2.5vw, 1.8rem); font-weight: 800; letter-spacing: -0.02em;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  word-break: break-all; margin: 0 0 8px;
}
.hero-sub {
  font-size: 0.875rem; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  margin: 0 0 14px; line-height: 1.6;
}
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }

.hero-amount {
  background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary));
  border-radius: 20px; padding: 22px 28px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 160px;
  box-shadow: 0 6px 20px rgba(var(--v-theme-primary), 0.3);
}
.amount-label    { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.75; }
.amount-value    { font-size: 2rem; font-weight: 800; line-height: 1; }
.amount-currency { font-size: 0.75rem; opacity: 0.7; }

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
.stat-tile strong { font-size: 0.95rem; font-weight: 700; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); }

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
  display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px;
}
.card-head-left { display: flex; align-items: center; gap: 10px; }
.card-head h3, .card-head-left h3 {
  font-size: 1rem; font-weight: 700; margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}
.card-icon {
  font-size: 20px; color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1); border-radius: 8px; padding: 5px; width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
}
.count-badge {
  font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;
  background: rgba(var(--v-theme-primary), 0.1); color: rgb(var(--v-theme-primary));
}

/* ── Info grid ───────────────────────────────────────── */
.info-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.info-item   { display: flex; flex-direction: column; gap: 4px; }
.full-col    { grid-column: 1 / -1; }
.info-label  {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.info-item strong { font-size: 0.875rem; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); }
.break-all { word-break: break-all; }

/* ── Cycle bar ───────────────────────────────────────── */
.cycle-wrap { display: flex; flex-direction: column; gap: 6px; }
.cycle-bar  { height: 5px; background: rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 4px; overflow: hidden; width: 120px; }
.cycle-fill { height: 100%; background: rgb(var(--v-theme-primary)); border-radius: 4px; transition: width 0.4s; }

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
.timeline-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
}
.timeline-left    { display: flex; align-items: flex-start; gap: 14px; }
.timeline-dot     {
  width: 10px; height: 10px; border-radius: 50%; background: rgb(var(--v-theme-primary));
  margin-top: 5px; flex-shrink: 0;
}
.timeline-amount  { display: block; font-size: 1rem; font-weight: 700; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); }
.timeline-id      { display: block; font-size: 0.78rem; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); margin-top: 2px; }
.timeline-date    { display: block; font-size: 0.78rem; color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity)); margin-top: 2px; }

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

/* ── Webhook table ───────────────────────────────────── */
.webhook-table   { display: grid; gap: 10px; }
.webhook-table-row,
.webhook-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.webhook-info { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
.webhook-icon { font-size: 18px; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); margin-top: 2px; flex-shrink: 0; }
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
  .hero-card    { grid-template-columns: 1fr; }
  .hero-amount  { flex-direction: row; padding: 16px 20px; min-width: unset; justify-content: space-between; }
  .stat-row     { grid-template-columns: repeat(2, 1fr); }
  .two-col      { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .detail-page  { padding: 14px; }
  .stat-row     { grid-template-columns: 1fr 1fr; }
  .info-grid    { grid-template-columns: 1fr; }
  .timeline-row { flex-direction: column; }
  .webhook-table-row, .webhook-row { flex-direction: column; }
}
</style>

<route lang="yaml">
meta:
  navActiveLink: admin-tab
</route>