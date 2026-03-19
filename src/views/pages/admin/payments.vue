<script setup>
import axios from 'axios'
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ADMIN_ORDERS_URL, ADMIN_SUBSCRIPTIONS_URL, cancelSubscriptionUrl } from '@/network/const'
import { getApiToken } from '@/store/authData'

const router = useRouter()
const tab = ref('orders')

// ─── Helpers ───────────────────────────────────────────────────────────────
const authHeaders = computed(() => ({
  Authorization: `Bearer ${getApiToken()}`,
  Accept: 'application/json',
}))

const formatMoney = (amount, currency = 'USD') => {
  if (amount == null || amount === '') return '—'
  const value = Number(amount)
  if (Number.isNaN(value)) return amount
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
}

const formatDate = dateStr => {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr))
}

const statusConfig = status => {
  const map = {
    // order / payment statuses
    paid:      { color: 'rgb(var(--v-theme-success))',  bg: 'rgba(var(--v-theme-success), 0.12)',  label: 'Paid' },
    unpaid:    { color: 'rgb(var(--v-theme-warning))',  bg: 'rgba(var(--v-theme-warning), 0.12)',  label: 'Unpaid' },
    failed:    { color: 'rgb(var(--v-theme-error))',    bg: 'rgba(var(--v-theme-error), 0.12)',    label: 'Failed' },
    pending:   { color: 'rgb(var(--v-theme-info))',     bg: 'rgba(var(--v-theme-info), 0.12)',     label: 'Pending' },
    completed: { color: 'rgb(var(--v-theme-success))',  bg: 'rgba(var(--v-theme-success), 0.12)',  label: 'Completed' },
    cancelled: { color: 'rgba(var(--v-theme-on-surface), 0.5)', bg: 'rgba(var(--v-theme-on-surface), 0.07)', label: 'Cancelled' },
    // subscription statuses
    active:    { color: 'rgb(var(--v-theme-success))',  bg: 'rgba(var(--v-theme-success), 0.12)',  label: 'Active' },
    paused:    { color: 'rgb(var(--v-theme-warning))',  bg: 'rgba(var(--v-theme-warning), 0.12)',  label: 'Paused' },
  }
  return map[status] || { color: 'rgba(var(--v-theme-on-surface), 0.5)', bg: 'rgba(var(--v-theme-on-surface), 0.07)', label: status || '—' }
}

// ─── Orders ────────────────────────────────────────────────────────────────
const orders = ref([])
const ordersMeta = ref({ current_page: 1, per_page: 20, total: 0, last_page: 1 })
const ordersLoading = ref(false)
const ordersError = ref('')
const orderSearchInput = ref('')

const orderFilters = reactive({
  page: 1,
  per_page: 20,
  purchase_type: null,
  status: null,
  payment_status: null,
  search: null,
})

const orderRangeText = computed(() => {
  const total = ordersMeta.value?.total || 0
  if (!total) return 'No results'
  const start = (ordersMeta.value.current_page - 1) * ordersMeta.value.per_page + 1
  const end = Math.min(ordersMeta.value.current_page * ordersMeta.value.per_page, total)
  return `${start}–${end} of ${total}`
})

const ordersTotalPages = computed(() => ordersMeta.value?.last_page || 1)

const fetchOrders = async () => {
  ordersLoading.value = true
  ordersError.value = ''
  try {
    const params = Object.fromEntries(
      Object.entries({ ...orderFilters }).filter(([, v]) => v !== null && v !== ''),
    )
    const { data } = await axios.get(ADMIN_ORDERS_URL, { params, headers: authHeaders.value })
    orders.value = data?.data || []
    ordersMeta.value = data?.meta || ordersMeta.value
  } catch (e) {
    ordersError.value = e?.response?.data?.message || 'Failed to load orders'
  } finally {
    ordersLoading.value = false
  }
}

const applyOrderSearch = () => {
  orderFilters.search = orderSearchInput.value || null
  orderFilters.page = 1
  fetchOrders()
}

const resetOrderFilters = () => {
  Object.assign(orderFilters, { purchase_type: null, status: null, payment_status: null, search: null, page: 1, per_page: 20 })
  orderSearchInput.value = ''
  fetchOrders()
}

// ─── Subscriptions ─────────────────────────────────────────────────────────
const subscriptions = ref([])
const subscriptionsMeta = ref({ current_page: 1, per_page: 20, total: 0, last_page: 1 })
const subscriptionsLoading = ref(false)
const subscriptionsError = ref('')
const subscriptionsMessage = ref('')
const subscriptionSearchInput = ref('')
const cancelDialogVisible = ref(false)
const targetSubscriptionId = ref(null)
const cancellingSubscriptions = reactive({})

const subscriptionFilters = reactive({
  page: 1,
  per_page: 20,
  status: null,
  product_id: null,
  active_only: null,
  search: null,
})

const subscriptionRangeText = computed(() => {
  const total = subscriptionsMeta.value?.total || 0
  if (!total) return 'No results'
  const start = (subscriptionsMeta.value.current_page - 1) * subscriptionsMeta.value.per_page + 1
  const end = Math.min(subscriptionsMeta.value.current_page * subscriptionsMeta.value.per_page, total)
  return `${start}–${end} of ${total}`
})

const subscriptionsTotalPages = computed(() => subscriptionsMeta.value?.last_page || 1)

const fetchSubscriptions = async () => {
  subscriptionsLoading.value = true
  subscriptionsError.value = ''
  try {
    const params = Object.fromEntries(
      Object.entries({ ...subscriptionFilters }).filter(([, v]) => v !== null && v !== '' && v !== false),
    )
    const { data } = await axios.get(ADMIN_SUBSCRIPTIONS_URL, { params, headers: authHeaders.value })
    subscriptions.value = data?.data || []
    subscriptionsMeta.value = data?.meta || subscriptionsMeta.value
  } catch (e) {
    subscriptionsError.value = e?.response?.data?.message || 'Failed to load subscriptions'
  } finally {
    subscriptionsLoading.value = false
  }
}

const applySubscriptionSearch = () => {
  subscriptionFilters.search = subscriptionSearchInput.value || null
  subscriptionFilters.page = 1
  subscriptionsMessage.value = ''
  fetchSubscriptions()
}

const resetSubscriptionFilters = () => {
  Object.assign(subscriptionFilters, { status: null, product_id: null, active_only: null, search: null, page: 1, per_page: 20 })
  subscriptionSearchInput.value = ''
  subscriptionsMessage.value = ''
  fetchSubscriptions()
}

const askCancelSubscription = id => {
  targetSubscriptionId.value = id
  cancelDialogVisible.value = true
}

const cancelSubscription = async confirmed => {
  if (!confirmed || !targetSubscriptionId.value) return
  const id = targetSubscriptionId.value
  cancellingSubscriptions[id] = true
  subscriptionsError.value = ''
  subscriptionsMessage.value = ''
  try {
    const { data } = await axios.post(cancelSubscriptionUrl(id), {}, { headers: authHeaders.value })
    subscriptionsMessage.value = data?.message || 'Subscription cancelled successfully'
    await fetchSubscriptions()
  } catch (e) {
    subscriptionsError.value = e?.response?.data?.message || 'Failed to cancel subscription'
  } finally {
    cancellingSubscriptions[id] = false
    targetSubscriptionId.value = null
  }
}

const openOrderDetail = id => router.push(`/admin/orders/${id}`)
const openSubscriptionDetail = id => router.push(`/admin/subscriptions/${id}`)

onMounted(() => {
  fetchOrders()
  fetchSubscriptions()
})
</script>

<template>
  <section class="admin-billing-page">

    <!-- ── Page Header ──────────────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <span class="mdi mdi-credit-card-outline" />
        </div>
        <div>
          <h1 class="page-title">Payments & Billing</h1>
          <p class="page-subtitle">Manage orders, subscriptions and billing records</p>
        </div>
      </div>
      <div class="header-actions">
        <!-- <VBtn
          variant="tonal"
          prepend-icon="tabler-plus"
          class="action-btn action-btn--secondary"
          @click="router.push('/admin/orders/create')"
        >
          New Order
        </VBtn> -->
        <VBtn
          color="primary"
          prepend-icon="tabler-refresh"
          class="action-btn"
          @click="tab === 'orders' ? fetchOrders() : fetchSubscriptions()"
        >
          Refresh
        </VBtn>
      </div>
    </div>

    <!-- ── Tab Navigation ───────────────────────────────── -->
    <div class="tab-nav">
      <button
        :class="['tab-btn', { 'tab-btn--active': tab === 'orders' }]"
        @click="tab = 'orders'"
      >
        <span class="mdi mdi-receipt-outline tab-icon" />
        Orders
        <span v-if="ordersMeta.total" class="tab-badge">{{ ordersMeta.total }}</span>
      </button>
      <button
        :class="['tab-btn', { 'tab-btn--active': tab === 'subscriptions' }]"
        @click="tab = 'subscriptions'"
      >
        <span class="mdi mdi-calendar-sync-outline tab-icon" />
        Subscriptions
        <span v-if="subscriptionsMeta.total" class="tab-badge">{{ subscriptionsMeta.total }}</span>
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- ORDERS TAB                                         -->
    <!-- ══════════════════════════════════════════════════ -->
    <div v-show="tab === 'orders'" class="tab-content">

      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="filter-search">
          <span class="mdi mdi-magnify search-icon" />
          <input
            v-model="orderSearchInput"
            class="filter-input"
            placeholder="Search UUID, patient name or email…"
            @keyup.enter="applyOrderSearch"
          />
        </div>
        <div class="filter-selects">
          <VSelect
            v-model="orderFilters.purchase_type"
            :items="[{ title: 'All types', value: null }, { title: 'Subscription', value: 'subscription' }, { title: 'One-time', value: 'one_time' }]"
            item-title="title"
            item-value="value"
            label="Type"
            variant="outlined"
            density="compact"
            hide-details
            class="filter-select"
            @update:model-value="() => { orderFilters.page = 1; fetchOrders() }"
          />
          <VSelect
            v-model="orderFilters.status"
            :items="[{ title: 'All statuses', value: null }, 'pending', 'completed', 'cancelled']"
            label="Status"
            variant="outlined"
            density="compact"
            hide-details
            class="filter-select"
            @update:model-value="() => { orderFilters.page = 1; fetchOrders() }"
          />
          <VSelect
            v-model="orderFilters.payment_status"
            :items="[{ title: 'All payments', value: null }, 'paid', 'unpaid', 'failed']"
            label="Payment"
            variant="outlined"
            density="compact"
            hide-details
            class="filter-select"
            @update:model-value="() => { orderFilters.page = 1; fetchOrders() }"
          />
        </div>
        <div class="filter-actions">
          <button class="btn-apply" @click="applyOrderSearch">Apply</button>
          <button class="btn-reset" @click="resetOrderFilters">Reset</button>
        </div>
      </div>

      <!-- Alerts -->
      <VAlert v-if="ordersError" type="error" variant="tonal" class="mb-4" closable>
        {{ ordersError }}
      </VAlert>

      <!-- Loading bar -->
      <div v-if="ordersLoading" class="loading-bar">
        <div class="loading-bar__fill" />
      </div>

      <!-- Table -->
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Patient</th>
              <th>Product</th>
              <th>Type</th>
              <th>Payment</th>
              <th class="text-right">Amount</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in orders"
              :key="item.id"
              class="data-row"
              @click="openOrderDetail(item.id)"
            >
              <td>
                <div class="cell-primary font-mono">{{ item.order_uuid }}</div>
                <div class="cell-meta">#{{ item.id }}</div>
                <span
                  class="status-pill"
                  :style="{ color: statusConfig(item.status).color, background: statusConfig(item.status).bg }"
                >
                  {{ statusConfig(item.status).label }}
                </span>
              </td>
              <td>
                <div class="cell-primary">{{ item.patient?.name || '—' }}</div>
                <div class="cell-meta">{{ item.patient?.email || '—' }}</div>
              </td>
              <td>
                <div class="cell-primary">{{ item.product?.name || '—' }}</div>
                <div class="cell-meta">{{ item.product?.slug || '—' }}</div>
              </td>
              <td>
                <span class="type-badge">
                  <span
                    v-if="item.purchase_type === 'subscription'"
                    class="mdi mdi-calendar-sync-outline"
                  />
                  <span v-else class="mdi mdi-shopping-outline" />
                  {{ item.purchase_type === 'subscription' ? 'Subscription' : 'One-time' }}
                </span>
              </td>
              <td @click.stop>
                <span
                  class="status-pill"
                  :style="{ color: statusConfig(item.payment_status).color, background: statusConfig(item.payment_status).bg }"
                >
                  {{ statusConfig(item.payment_status).label }}
                </span>
              </td>
              <td class="text-right cell-amount">
                {{ formatMoney(item.price, item.currency || 'USD') }}
              </td>
              <td class="text-right" @click.stop>
                <button class="action-icon-btn" @click="openOrderDetail(item.id)">
                  <span class="mdi mdi-eye-outline" />
                  View
                </button>
              </td>
            </tr>
            <tr v-if="!ordersLoading && orders.length === 0">
              <td colspan="7" class="empty-state">
                <span class="mdi mdi-inbox-outline empty-icon" />
                <span>No orders found</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination-bar">
        <div class="pagination-size">
          <span class="pagination-label">Rows</span>
          <VSelect
            v-model="orderFilters.per_page"
            :items="[10, 20, 50, 100]"
            density="compact"
            variant="outlined"
            hide-details
            style="width: 80px;"
            @update:model-value="() => { orderFilters.page = 1; fetchOrders() }"
          />
        </div>
        <span class="pagination-range">{{ orderRangeText }}</span>
        <VPagination
          v-model="orderFilters.page"
          size="small"
          :total-visible="5"
          :length="ordersTotalPages"
          @update:model-value="fetchOrders"
        />
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- SUBSCRIPTIONS TAB                                  -->
    <!-- ══════════════════════════════════════════════════ -->
    <div v-show="tab === 'subscriptions'" class="tab-content">

      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="filter-search">
          <span class="mdi mdi-magnify search-icon" />
          <input
            v-model="subscriptionSearchInput"
            class="filter-input"
            placeholder="Search by order UUID or patient…"
            @keyup.enter="applySubscriptionSearch"
          />
        </div>
        <div class="filter-selects">
          <VSelect
            v-model="subscriptionFilters.status"
            :items="[{ title: 'All statuses', value: null }, 'active', 'cancelled', 'completed', 'paused']"
            label="Status"
            variant="outlined"
            density="compact"
            hide-details
            class="filter-select"
            @update:model-value="() => { subscriptionFilters.page = 1; fetchSubscriptions() }"
          />
          <div class="active-toggle">
            <VSwitch
              v-model="subscriptionFilters.active_only"
              label="Active only"
              color="primary"
              inset
              hide-details
              density="compact"
              @update:model-value="() => { subscriptionFilters.page = 1; fetchSubscriptions() }"
            />
          </div>
        </div>
        <div class="filter-actions">
          <button class="btn-apply" @click="applySubscriptionSearch">Apply</button>
          <button class="btn-reset" @click="resetSubscriptionFilters">Reset</button>
        </div>
      </div>

      <!-- Alerts -->
      <VAlert v-if="subscriptionsMessage" type="success" variant="tonal" class="mb-4" closable>
        {{ subscriptionsMessage }}
      </VAlert>
      <VAlert v-if="subscriptionsError" type="error" variant="tonal" class="mb-4" closable>
        {{ subscriptionsError }}
      </VAlert>

      <div v-if="subscriptionsLoading" class="loading-bar">
        <div class="loading-bar__fill" />
      </div>

      <!-- Table -->
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Subscription</th>
              <th>Patient</th>
              <th>Product</th>
              <th>Billing</th>
              <th>Cycles</th>
              <th>Status</th>
              <th class="text-right">Next billing</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in subscriptions"
              :key="item.id"
              class="data-row"
              @click="openSubscriptionDetail(item.id)"
            >
              <td>
                <div class="cell-primary">#{{ item.id }}</div>
                <div class="cell-meta font-mono">{{ item.order?.order_uuid || '—' }}</div>
              </td>
              <td>
                <div class="cell-primary">{{ item.patient?.name || '—' }}</div>
                <div class="cell-meta">{{ item.patient?.email || '—' }}</div>
              </td>
              <td>
                <div class="cell-primary">{{ item.order?.product?.name || '—' }}</div>
                <div class="cell-meta">{{ item.order?.product?.slug || '—' }}</div>
              </td>
              <td>
                <div class="cell-primary">
                  {{ item.billing_frequency_months ? `Every ${item.billing_frequency_months} mo` : '—' }}
                </div>
                <div class="cell-meta discount" v-if="item.discount_percentage">
                  {{ item.discount_percentage }}% off
                </div>
              </td>
              <td>
                <div class="cycle-track">
                  <div
                    class="cycle-fill"
                    :style="{ width: item.total_cycles ? `${(item.current_cycle_number / item.total_cycles) * 100}%` : '0%' }"
                  />
                </div>
                <div class="cell-meta">{{ item.current_cycle_number || 0 }} / {{ item.total_cycles || '—' }}</div>
              </td>
              <td @click.stop>
                <span
                  class="status-pill"
                  :style="{ color: statusConfig(item.status).color, background: statusConfig(item.status).bg }"
                >
                  {{ statusConfig(item.status).label }}
                </span>
              </td>
              <td class="text-right" @click.stop>
                <div class="cell-primary">{{ formatDate(item.next_billing_date) }}</div>
                <div class="cell-meta">{{ formatMoney(item.order?.price, item.order?.currency || 'USD') }}</div>
              </td>
              <td class="text-right actions-cell" @click.stop>
                <button class="action-icon-btn" @click="openSubscriptionDetail(item.id)">
                  <span class="mdi mdi-eye-outline" />
                  View
                </button>
                <button
                  v-if="item.status !== 'cancelled'"
                  class="action-icon-btn action-icon-btn--danger"
                  :disabled="!!cancellingSubscriptions[item.id]"
                  @click="askCancelSubscription(item.id)"
                >
                  <span
                    :class="cancellingSubscriptions[item.id] ? 'mdi mdi-loading mdi-spin' : 'mdi mdi-cancel'"
                  />
                  Cancel
                </button>
              </td>
            </tr>
            <tr v-if="!subscriptionsLoading && subscriptions.length === 0">
              <td colspan="8" class="empty-state">
                <span class="mdi mdi-inbox-outline empty-icon" />
                <span>No subscriptions found</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination-bar">
        <div class="pagination-size">
          <span class="pagination-label">Rows</span>
          <VSelect
            v-model="subscriptionFilters.per_page"
            :items="[10, 20, 50, 100]"
            density="compact"
            variant="outlined"
            hide-details
            style="width: 80px;"
            @update:model-value="() => { subscriptionFilters.page = 1; fetchSubscriptions() }"
          />
        </div>
        <span class="pagination-range">{{ subscriptionRangeText }}</span>
        <VPagination
          v-model="subscriptionFilters.page"
          size="small"
          :total-visible="5"
          :length="subscriptionsTotalPages"
          @update:model-value="fetchSubscriptions"
        />
      </div>
    </div>

    <!-- ── Cancel Dialog ────────────────────────────────── -->
    <ConfirmDialog
      v-model:isDialogVisible="cancelDialogVisible"
      confirmation-msg="Are you sure you want to cancel this subscription? This action cannot be undone."
      @confirm="cancelSubscription"
    />
  </section>
</template>

<style scoped>
/* ── Base ─────────────────────────────────────────────── */
.admin-billing-page {
  padding: 28px 32px;
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
  font-family: 'DM Sans', 'Outfit', system-ui, sans-serif;
}

/* ── Page Header ──────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgba(var(--v-theme-primary), 0.75));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: rgb(var(--v-theme-on-primary));
  box-shadow: 0 4px 14px rgba(var(--v-theme-primary), 0.35);
  flex-shrink: 0;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  margin: 0;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  margin: 2px 0 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.action-btn {
  border-radius: 10px !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}

/* ── Tab Nav ──────────────────────────────────────────── */
.tab-nav {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: rgb(var(--v-theme-surface));
  border-radius: 14px;
  padding: 6px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  width: fit-content;
  box-shadow: 0 1px 4px rgba(var(--v-shadow-key-umbra-color), 0.06);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  background: transparent;
  transition: all 0.18s ease;
  position: relative;
}

.tab-btn:hover {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.tab-btn--active {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgba(var(--v-theme-primary), 0.8)) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
  box-shadow: 0 3px 10px rgba(var(--v-theme-primary), 0.3);
}

.tab-icon {
  font-size: 16px;
}

.tab-badge {
  background: rgba(255,255,255,0.25);
  color: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 20px;
  min-width: 22px;
  text-align: center;
}

.tab-btn:not(.tab-btn--active) .tab-badge {
  background: rgba(var(--v-theme-on-surface), 0.1);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* ── Tab Content ──────────────────────────────────────── */
.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Filter Bar ───────────────────────────────────────── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  box-shadow: 0 1px 4px rgba(var(--v-shadow-key-umbra-color), 0.05);
}

.filter-search {
  position: relative;
  flex: 1;
  min-width: 220px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
  font-size: 18px;
  pointer-events: none;
}

.filter-input {
  width: 100%;
  padding: 9px 12px 9px 38px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  background: rgba(var(--v-theme-on-surface), 0.04);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.filter-input:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.12);
  background: rgb(var(--v-theme-surface));
}

.filter-selects {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-select {
  min-width: 140px;
}

.active-toggle {
  padding: 0 8px;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.btn-apply {
  padding: 9px 18px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border: none;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.3);
}

.btn-apply:hover { opacity: 0.92; transform: translateY(-1px); }
.btn-apply:active { transform: translateY(0); }

.btn-reset {
  padding: 9px 18px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-reset:hover { background: rgba(var(--v-theme-on-surface), 0.1); }

/* ── Loading Bar ──────────────────────────────────────── */
.loading-bar {
  height: 3px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}

.loading-bar__fill {
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)), rgba(var(--v-theme-primary), 0.6));
  border-radius: 2px;
  animation: slide 1.2s ease-in-out infinite;
}

@keyframes slide {
  0%   { transform: translateX(-120%); }
  100% { transform: translateX(380%); }
}

/* ── Table ────────────────────────────────────────────── */
.data-table-wrap {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(var(--v-shadow-key-umbra-color), 0.05);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table thead tr {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.data-table thead th {
  padding: 13px 16px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  white-space: nowrap;
  text-align: left;
}

.data-table thead th.text-right { text-align: right; }

.data-table tbody .data-row {
  border-bottom: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.6));
  cursor: pointer;
  transition: background 0.12s;
}

.data-table tbody .data-row:last-child { border-bottom: none; }
.data-table tbody .data-row:hover { background: rgba(var(--v-theme-primary), 0.04); }

.data-table tbody td {
  padding: 14px 16px;
  vertical-align: middle;
}

.data-table tbody td.text-right { text-align: right; }

.cell-primary {
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  line-height: 1.3;
}

.cell-meta {
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
  margin-top: 2px;
}

.font-mono { font-family: 'JetBrains Mono', 'Fira Mono', monospace; font-size: 0.8rem; }

.cell-amount {
  font-weight: 700;
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}

/* ── Status Pill ──────────────────────────────────────── */
.status-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin-top: 4px;
  white-space: nowrap;
}

/* ── Type Badge ───────────────────────────────────────── */
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  background: rgba(var(--v-theme-on-surface), 0.07);
  padding: 4px 10px;
  border-radius: 20px;
}

/* ── Cycle Track ──────────────────────────────────────── */
.cycle-track {
  height: 4px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  overflow: hidden;
  width: 80px;
  margin-bottom: 4px;
}

.cycle-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)), rgba(var(--v-theme-primary), 0.7));
  border-radius: 4px;
  transition: width 0.4s ease;
}

.discount {
  color: rgb(var(--v-theme-success)) !important;
  font-weight: 600;
}

/* ── Actions Cell ─────────────────────────────────────── */
.actions-cell {
  white-space: nowrap;
}

.action-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  margin-left: 6px;
}

.action-icon-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-color: rgba(var(--v-border-color), calc(var(--v-border-opacity) * 2));
}

.action-icon-btn--danger {
  color: rgb(var(--v-theme-error));
  border-color: rgba(var(--v-theme-error), 0.3);
  background: rgba(var(--v-theme-error), 0.05);
}

.action-icon-btn--danger:hover {
  background: rgba(var(--v-theme-error), 0.1);
  border-color: rgb(var(--v-theme-error));
}

.action-icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Empty State ──────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 48px 24px !important;
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.empty-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 6px;
  opacity: 0.5;
}

/* ── Pagination ───────────────────────────────────────── */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0 4px;
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-size {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-label {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-weight: 500;
  white-space: nowrap;
}

.pagination-range {
  font-size: 0.82rem;
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
}
</style>
