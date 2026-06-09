<script setup>
import axios from 'axios'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CouponEditor from '@/views/pages/admin/payments/CouponEditor.vue'
import {
  ADMIN_COUPONS_URL,
  ADMIN_ORDERS_URL,
  ADMIN_SUBSCRIPTIONS_URL,
  cancelSubscriptionUrl,
  getAdminCouponDeleteUrl,
  getAdminCouponToggleActiveUrl,
} from '@/network/const'
import { getApiToken } from '@/store/authData'

const route = useRoute()
const router = useRouter()
const tab = ref('orders')

const couponDeleteDialogVisible = ref(false)
const pendingDeleteCouponId = ref('')
const togglingCouponId = ref('')

const editingCouponId = computed(() => typeof route.query.coupon_id === 'string' ? route.query.coupon_id : '')

const isCouponEditor = computed(() => {
  const section = String(route.query.section || '')
  
  return section === 'add-coupon' || (section === 'edit-coupon' && !!editingCouponId.value)
})

watch(
  () => route.query.section,
  section => {
    if (String(section || '').includes('coupon'))
      tab.value = 'coupons'
  },
  { immediate: true },
)

const setTab = nextTab => {
  tab.value = nextTab

  if (nextTab === 'coupons' && isCouponEditor.value)
    router.replace('/admin/payments')
  else if (nextTab !== 'coupons' && isCouponEditor.value)
    router.replace('/admin/payments')
}

const authHeaders = computed(() => ({
  Authorization: `Bearer ${getApiToken()}`,
  Accept: 'application/json',
}))

const normalizeRows = body => {
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body?.data?.data)) return body.data.data
  
  return []
}

const normalizeMeta = (body, page, perPage) => (
  body?.meta
  || body?.data?.meta
  || {
    current_page: page,
    last_page: 1,
    per_page: perPage,
    total: normalizeRows(body).length,
    from: normalizeRows(body).length ? 1 : 0,
    to: normalizeRows(body).length,
  }
)

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
    paid: { color: 'rgb(var(--v-theme-success))', bg: 'rgba(var(--v-theme-success), 0.12)', label: 'Paid' },
    unpaid: { color: 'rgb(var(--v-theme-warning))', bg: 'rgba(var(--v-theme-warning), 0.12)', label: 'Unpaid' },
    failed: { color: 'rgb(var(--v-theme-error))', bg: 'rgba(var(--v-theme-error), 0.12)', label: 'Failed' },
    pending: { color: 'rgb(var(--v-theme-info))', bg: 'rgba(var(--v-theme-info), 0.12)', label: 'Pending' },
    completed: { color: 'rgb(var(--v-theme-success))', bg: 'rgba(var(--v-theme-success), 0.12)', label: 'Completed' },
    cancelled: { color: 'rgba(var(--v-theme-on-surface), 0.5)', bg: 'rgba(var(--v-theme-on-surface), 0.07)', label: 'Cancelled' },
    active: { color: 'rgb(var(--v-theme-success))', bg: 'rgba(var(--v-theme-success), 0.12)', label: 'Active' },
    paused: { color: 'rgb(var(--v-theme-warning))', bg: 'rgba(var(--v-theme-warning), 0.12)', label: 'Paused' },
  }

  return map[status] || { color: 'rgba(var(--v-theme-on-surface), 0.5)', bg: 'rgba(var(--v-theme-on-surface), 0.07)', label: status || '—' }
}

const getCouponScopeLabel = coupon => coupon?.scope === 'product_specific' ? 'Product Specific' : 'Global'

const getCouponAppliesToLabel = coupon => {
  const value = coupon?.applies_to
  if (value === 'subscription') return 'Subscriptions'
  if (value === 'one_time') return 'One-Time Orders'
  
  return 'All Orders'
}

const getCouponValueLabel = coupon => {
  if (!coupon) return '—'
  
  return coupon.type === 'percent' ? `${coupon.value}%` : formatMoney(coupon.value)
}

const getCouponProductSummary = coupon => {
  if (coupon?.scope === 'global')
    return 'Global'

  const names = Array.isArray(coupon?.products) ? coupon.products.map(product => product?.name).filter(Boolean) : []
  if (names.length) return names.join(', ')
  if (coupon?.products_count) return `${coupon.products_count} selected products`
  
  return 'Product-specific'
}

// Orders
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
      Object.entries({ ...orderFilters }).filter(([, value]) => value !== null && value !== ''),
    )

    const { data } = await axios.get(ADMIN_ORDERS_URL, { params, headers: authHeaders.value })

    orders.value = data?.data || []
    ordersMeta.value = data?.meta || ordersMeta.value
  } catch (err) {
    ordersError.value = err?.response?.data?.message || 'Failed to load orders'
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

// Subscriptions
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
      Object.entries({ ...subscriptionFilters }).filter(([, value]) => value !== null && value !== '' && value !== false),
    )

    const { data } = await axios.get(ADMIN_SUBSCRIPTIONS_URL, { params, headers: authHeaders.value })

    subscriptions.value = data?.data || []
    subscriptionsMeta.value = data?.meta || subscriptionsMeta.value
  } catch (err) {
    subscriptionsError.value = err?.response?.data?.message || 'Failed to load subscriptions'
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
  } catch (err) {
    subscriptionsError.value = err?.response?.data?.message || 'Failed to cancel subscription'
  } finally {
    cancellingSubscriptions[id] = false
    targetSubscriptionId.value = null
  }
}

// Coupons
const coupons = ref([])
const couponsMeta = ref({ current_page: 1, per_page: 15, total: 0, last_page: 1 })
const couponsLoading = ref(false)
const couponsError = ref('')
const couponsMessage = ref('')
const couponSearchInput = ref('')

const couponFilters = reactive({
  page: 1,
  per_page: 15,
  scope: '',
  type: '',
  applies_to: '',
  is_active: '',
  search: '',
})

const couponRangeText = computed(() => {
  const total = couponsMeta.value?.total || 0
  if (!total) return 'No results'
  const start = (couponsMeta.value.current_page - 1) * couponsMeta.value.per_page + 1
  const end = Math.min(couponsMeta.value.current_page * couponsMeta.value.per_page, total)
  
  return `${start}–${end} of ${total}`
})

const couponsTotalPages = computed(() => couponsMeta.value?.last_page || 1)

const fetchCoupons = async () => {
  couponsLoading.value = true
  couponsError.value = ''
  try {
    const params = Object.fromEntries(
      Object.entries({
        search: couponFilters.search || undefined,
        scope: couponFilters.scope || undefined,
        type: couponFilters.type || undefined,
        applies_to: couponFilters.applies_to || undefined,
        is_active: couponFilters.is_active || undefined,
        per_page: couponFilters.per_page,
        page: couponFilters.page,
      }).filter(([, value]) => value !== undefined && value !== ''),
    )

    const response = await axios.get(ADMIN_COUPONS_URL, {
      headers: authHeaders.value,
      params,
    })

    const body = response?.data || {}

    coupons.value = normalizeRows(body)
    couponsMeta.value = {
      ...couponsMeta.value,
      ...normalizeMeta(body, couponFilters.page, couponFilters.per_page),
    }
  } catch (err) {
    couponsError.value = err?.response?.data?.message || 'Failed to load coupons'
  } finally {
    couponsLoading.value = false
  }
}

const applyCouponSearch = () => {
  couponFilters.search = couponSearchInput.value || ''
  couponFilters.page = 1
  fetchCoupons()
}

const resetCouponFilters = () => {
  Object.assign(couponFilters, {
    page: 1,
    per_page: 15,
    scope: '',
    type: '',
    applies_to: '',
    is_active: '',
    search: '',
  })
  couponSearchInput.value = ''
  couponsMessage.value = ''
  fetchCoupons()
}

const openCouponManager = () => {
  tab.value = 'coupons'
  if (isCouponEditor.value)
    router.replace('/admin/payments')
}

const openCouponCreate = () => {
  tab.value = 'coupons'
  router.push({
    path: '/admin/payments',
    query: { section: 'add-coupon' },
  })
}

const openCouponEdit = coupon => {
  if (!coupon?.id) return

  tab.value = 'coupons'
  router.push({
    path: '/admin/payments',
    query: {
      section: 'edit-coupon',
      coupon_id: coupon.id,
    },
  })
}

const closeCouponEditor = () => {
  tab.value = 'coupons'
  router.replace('/admin/payments')
}

const handleCouponSaved = async () => {
  await fetchCoupons()
  closeCouponEditor()
}

const askDeleteCoupon = coupon => {
  if (!coupon?.id) return
  pendingDeleteCouponId.value = coupon.id
  couponDeleteDialogVisible.value = true
}

const deleteCoupon = async confirmed => {
  if (!confirmed || !pendingDeleteCouponId.value) return

  couponsError.value = ''
  couponsMessage.value = ''
  try {
    const response = await axios.delete(getAdminCouponDeleteUrl(pendingDeleteCouponId.value), {
      headers: authHeaders.value,
    })

    couponsMessage.value = response?.data?.message || 'Coupon deleted successfully.'

    if (coupons.value.length === 1 && couponFilters.page > 1)
      couponFilters.page -= 1

    await fetchCoupons()
  } catch (err) {
    couponsError.value = err?.response?.data?.message || 'Failed to delete coupon.'
  } finally {
    pendingDeleteCouponId.value = ''
  }
}

const toggleCouponActive = async coupon => {
  if (!coupon?.id) return

  togglingCouponId.value = coupon.id
  couponsError.value = ''
  couponsMessage.value = ''
  try {
    const response = await axios.post(getAdminCouponToggleActiveUrl(coupon.id), {}, {
      headers: authHeaders.value,
    })

    const payload = response?.data?.data || {}
    const updatedCoupon = payload.coupon || {}
    const target = coupons.value.find(item => item?.id === coupon.id)

    if (target) {
      target.is_active = typeof payload.is_active === 'boolean' ? payload.is_active : !target.is_active
      if (Object.keys(updatedCoupon).length)
        Object.assign(target, updatedCoupon)
    }

    couponsMessage.value = response?.data?.message || 'Coupon status updated successfully.'
  } catch (err) {
    couponsError.value = err?.response?.data?.message || 'Failed to update coupon status.'
  } finally {
    togglingCouponId.value = ''
  }
}

const openOrderDetail = id => router.push(`/admin/orders/${id}`)
const openSubscriptionDetail = id => router.push(`/admin/subscriptions/${id}`)

onMounted(() => {
  fetchOrders()
  fetchSubscriptions()
  fetchCoupons()
})
</script>

<template>
  <section class="admin-billing-page">
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <span class="mdi mdi-credit-card-outline" />
        </div>
        <div>
          <h1 class="page-title">
            Payments & Billing
          </h1>
          <p class="page-subtitle">
            Manage orders, subscriptions, coupons, and billing records
          </p>
        </div>
      </div>
      <div class="header-actions">
        <VBtn
          v-if="tab !== 'coupons' && !isCouponEditor"
          variant="tonal"
          prepend-icon="tabler-ticket"
          class="action-btn action-btn--secondary"
          @click="openCouponManager"
        >
          Coupon Manager
        </VBtn>

        <VBtn
          v-else-if="tab === 'coupons' && !isCouponEditor"
          color="primary"
          prepend-icon="tabler-plus"
          class="action-btn"
          @click="openCouponCreate"
        >
          Create Coupon
        </VBtn>

        <VBtn
          v-if="!isCouponEditor"
          color="primary"
          prepend-icon="tabler-refresh"
          class="action-btn"
          @click="tab === 'orders' ? fetchOrders() : tab === 'subscriptions' ? fetchSubscriptions() : fetchCoupons()"
        >
          Refresh
        </VBtn>
      </div>
    </div>

    <div class="tab-nav">
      <button
        class="tab-btn"
        :class="[{ 'tab-btn--active': tab === 'orders' }]"
        @click="setTab('orders')"
      >
        <span class="mdi mdi-receipt-outline tab-icon" />
        Orders
        <span
          v-if="ordersMeta.total"
          class="tab-badge"
        >{{ ordersMeta.total }}</span>
      </button>
      <button
        class="tab-btn"
        :class="[{ 'tab-btn--active': tab === 'subscriptions' }]"
        @click="setTab('subscriptions')"
      >
        <span class="mdi mdi-calendar-sync-outline tab-icon" />
        Subscriptions
        <span
          v-if="subscriptionsMeta.total"
          class="tab-badge"
        >{{ subscriptionsMeta.total }}</span>
      </button>
      <button
        class="tab-btn"
        :class="[{ 'tab-btn--active': tab === 'coupons' }]"
        @click="setTab('coupons')"
      >
        <span class="mdi mdi-ticket-percent-outline tab-icon" />
        Coupons
        <span
          v-if="couponsMeta.total"
          class="tab-badge"
        >{{ couponsMeta.total }}</span>
      </button>
    </div>

    <CouponEditor
      v-if="isCouponEditor"
      :coupon-id="editingCouponId"
      @cancel="closeCouponEditor"
      @saved="handleCouponSaved"
    />

    <template v-else>
      <div
        v-show="tab === 'orders'"
        class="tab-content"
      >
        <div class="filter-bar">
          <div class="filter-search">
            <span class="mdi mdi-magnify search-icon" />
            <input
              v-model="orderSearchInput"
              class="filter-input"
              placeholder="Search UUID, patient name or email…"
              @keyup.enter="applyOrderSearch"
            >
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
            <button
              class="btn-apply"
              @click="applyOrderSearch"
            >
              Apply
            </button>
            <button
              class="btn-reset"
              @click="resetOrderFilters"
            >
              Reset
            </button>
          </div>
        </div>

        <VAlert
          v-if="ordersError"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
        >
          {{ ordersError }}
        </VAlert>

        <div
          v-if="ordersLoading"
          class="loading-bar"
        >
          <div class="loading-bar__fill" />
        </div>

        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Patient</th>
                <th>Product</th>
                <th>Type</th>
                <th>Payment</th>
                <th class="text-right">
                  Amount
                </th>
                <th class="text-right">
                  Actions
                </th>
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
                  <div class="cell-primary font-mono">
                    {{ item.order_uuid }}
                  </div>
                  <div class="cell-meta">
                    #{{ item.id }}
                  </div>
                  <span
                    class="status-pill"
                    :style="{ color: statusConfig(item.status).color, background: statusConfig(item.status).bg }"
                  >
                    {{ statusConfig(item.status).label }}
                  </span>
                </td>
                <td>
                  <div class="cell-primary">
                    {{ item.patient?.name || '—' }}
                  </div>
                  <div class="cell-meta">
                    {{ item.patient?.email || '—' }}
                  </div>
                </td>
                <td>
                  <div class="cell-primary">
                    {{ item.product?.name || '—' }}
                  </div>
                  <div class="cell-meta">
                    {{ item.product?.slug || '—' }}
                  </div>
                </td>
                <td>
                  <span class="type-badge">
                    <span
                      v-if="item.purchase_type === 'subscription'"
                      class="mdi mdi-calendar-sync-outline"
                    />
                    <span
                      v-else
                      class="mdi mdi-shopping-outline"
                    />
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
                <td
                  class="text-right"
                  @click.stop
                >
                  <button
                    class="action-icon-btn"
                    @click="openOrderDetail(item.id)"
                  >
                    <span class="mdi mdi-eye-outline" />
                    View
                  </button>
                </td>
              </tr>
              <tr v-if="!ordersLoading && orders.length === 0">
                <td
                  colspan="7"
                  class="empty-state"
                >
                  <span class="mdi mdi-inbox-outline empty-icon" />
                  <span>No orders found</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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

      <div
        v-show="tab === 'subscriptions'"
        class="tab-content"
      >
        <div class="filter-bar">
          <div class="filter-search">
            <span class="mdi mdi-magnify search-icon" />
            <input
              v-model="subscriptionSearchInput"
              class="filter-input"
              placeholder="Search by order UUID or patient…"
              @keyup.enter="applySubscriptionSearch"
            >
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
            <button
              class="btn-apply"
              @click="applySubscriptionSearch"
            >
              Apply
            </button>
            <button
              class="btn-reset"
              @click="resetSubscriptionFilters"
            >
              Reset
            </button>
          </div>
        </div>

        <VAlert
          v-if="subscriptionsMessage"
          type="success"
          variant="tonal"
          class="mb-4"
          closable
        >
          {{ subscriptionsMessage }}
        </VAlert>
        <VAlert
          v-if="subscriptionsError"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
        >
          {{ subscriptionsError }}
        </VAlert>

        <div
          v-if="subscriptionsLoading"
          class="loading-bar"
        >
          <div class="loading-bar__fill" />
        </div>

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
                <th class="text-right">
                  Next billing
                </th>
                <th class="text-right">
                  Actions
                </th>
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
                  <div class="cell-primary">
                    #{{ item.id }}
                  </div>
                  <div class="cell-meta font-mono">
                    {{ item.order?.order_uuid || '—' }}
                  </div>
                </td>
                <td>
                  <div class="cell-primary">
                    {{ item.patient?.name || '—' }}
                  </div>
                  <div class="cell-meta">
                    {{ item.patient?.email || '—' }}
                  </div>
                </td>
                <td>
                  <div class="cell-primary">
                    {{ item.order?.product?.name || '—' }}
                  </div>
                  <div class="cell-meta">
                    {{ item.order?.product?.slug || '—' }}
                  </div>
                </td>
                <td>
                  <div class="cell-primary">
                    {{ item.billing_frequency_months ? `Every ${item.billing_frequency_months} mo` : '—' }}
                  </div>
                  <div
                    v-if="item.discount_percentage"
                    class="cell-meta discount"
                  >
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
                  <div class="cell-meta">
                    {{ item.current_cycle_number || 0 }} / {{ item.total_cycles || '—' }}
                  </div>
                </td>
                <td @click.stop>
                  <span
                    class="status-pill"
                    :style="{ color: statusConfig(item.status).color, background: statusConfig(item.status).bg }"
                  >
                    {{ statusConfig(item.status).label }}
                  </span>
                </td>
                <td
                  class="text-right"
                  @click.stop
                >
                  <div class="cell-primary">
                    {{ formatDate(item.next_billing_date) }}
                  </div>
                  <div class="cell-meta">
                    {{ formatMoney(item.order?.price, item.order?.currency || 'USD') }}
                  </div>
                </td>
                <td
                  class="text-right actions-cell"
                  @click.stop
                >
                  <button
                    class="action-icon-btn"
                    @click="openSubscriptionDetail(item.id)"
                  >
                    <span class="mdi mdi-eye-outline" />
                    View
                  </button>
                  <button
                    v-if="item.status !== 'cancelled'"
                    class="action-icon-btn action-icon-btn--danger"
                    :disabled="!!cancellingSubscriptions[item.id]"
                    @click="askCancelSubscription(item.id)"
                  >
                    <span :class="cancellingSubscriptions[item.id] ? 'mdi mdi-loading mdi-spin' : 'mdi mdi-cancel'" />
                    Cancel
                  </button>
                </td>
              </tr>
              <tr v-if="!subscriptionsLoading && subscriptions.length === 0">
                <td
                  colspan="8"
                  class="empty-state"
                >
                  <span class="mdi mdi-inbox-outline empty-icon" />
                  <span>No subscriptions found</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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

      <div
        v-show="tab === 'coupons'"
        class="tab-content"
      >
        <div class="filter-bar">
          <div class="filter-search">
            <span class="mdi mdi-magnify search-icon" />
            <input
              v-model="couponSearchInput"
              class="filter-input"
              placeholder="Search coupon code, name, or description…"
              @keyup.enter="applyCouponSearch"
            >
          </div>
          <div class="filter-selects">
            <VSelect
              v-model="couponFilters.scope"
              :items="[{ title: 'All scopes', value: '' }, { title: 'Global', value: 'global' }, { title: 'Product Specific', value: 'product_specific' }]"
              item-title="title"
              item-value="value"
              label="Scope"
              variant="outlined"
              density="compact"
              hide-details
              class="filter-select"
              @update:model-value="() => { couponFilters.page = 1; fetchCoupons() }"
            />
            <VSelect
              v-model="couponFilters.type"
              :items="[{ title: 'All types', value: '' }, { title: 'Percent', value: 'percent' }, { title: 'Fixed', value: 'fixed' }]"
              item-title="title"
              item-value="value"
              label="Type"
              variant="outlined"
              density="compact"
              hide-details
              class="filter-select"
              @update:model-value="() => { couponFilters.page = 1; fetchCoupons() }"
            />
            <VSelect
              v-model="couponFilters.applies_to"
              :items="[{ title: 'All targets', value: '' }, { title: 'All Orders', value: 'all' }, { title: 'One-Time Orders', value: 'one_time' }, { title: 'Subscriptions', value: 'subscription' }]"
              item-title="title"
              item-value="value"
              label="Applies To"
              variant="outlined"
              density="compact"
              hide-details
              class="filter-select"
              @update:model-value="() => { couponFilters.page = 1; fetchCoupons() }"
            />
            <VSelect
              v-model="couponFilters.is_active"
              :items="[{ title: 'All statuses', value: '' }, { title: 'Active', value: 'true' }, { title: 'Inactive', value: 'false' }]"
              item-title="title"
              item-value="value"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
              class="filter-select"
              @update:model-value="() => { couponFilters.page = 1; fetchCoupons() }"
            />
          </div>
          <div class="filter-actions">
            <button
              class="btn-apply"
              @click="applyCouponSearch"
            >
              Apply
            </button>
            <button
              class="btn-reset"
              @click="resetCouponFilters"
            >
              Reset
            </button>
          </div>
        </div>

        <VAlert
          v-if="couponsMessage"
          type="success"
          variant="tonal"
          class="mb-4"
          closable
        >
          {{ couponsMessage }}
        </VAlert>
        <VAlert
          v-if="couponsError"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
        >
          {{ couponsError }}
        </VAlert>

        <div
          v-if="couponsLoading"
          class="loading-bar"
        >
          <div class="loading-bar__fill" />
        </div>

        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Coupon</th>
                <th>Scope</th>
                <th>Applies To</th>
                <th>Discount</th>
                <th>Products</th>
                <th>Usage</th>
                <th>Status</th>
                <th class="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="coupon in coupons"
                :key="coupon.id"
                class="data-row"
              >
                <td>
                  <div class="cell-primary font-mono">
                    {{ coupon.code }}
                  </div>
                  <div class="cell-meta">
                    {{ coupon.name || '—' }}
                  </div>
                  <div
                    v-if="coupon.description"
                    class="cell-meta"
                  >
                    {{ coupon.description }}
                  </div>
                </td>
                <td>
                  <span class="type-badge">
                    <span :class="coupon.scope === 'product_specific' ? 'mdi mdi-package-variant-closed' : 'mdi mdi-earth'" />
                    {{ getCouponScopeLabel(coupon) }}
                  </span>
                </td>
                <td>
                  <div class="cell-primary">
                    {{ getCouponAppliesToLabel(coupon) }}
                  </div>
                  <div class="cell-meta">
                    {{ coupon.first_order_only ? 'First order only' : 'No first-order restriction' }}
                  </div>
                </td>
                <td>
                  <div class="cell-primary">
                    {{ getCouponValueLabel(coupon) }}
                  </div>
                  <div class="cell-meta">
                    Min: {{ coupon.min_order_amount ? formatMoney(coupon.min_order_amount) : 'None' }}
                  </div>
                </td>
                <td>
                  <div class="cell-primary coupon-products">
                    {{ getCouponProductSummary(coupon) }}
                  </div>
                  <div class="cell-meta">
                    {{ coupon.products_count || 0 }} product{{ Number(coupon.products_count || 0) === 1 ? '' : 's' }}
                  </div>
                </td>
                <td>
                  <div class="cell-primary">
                    {{ coupon.redemptions_count || 0 }} redeemed
                  </div>
                  <div class="cell-meta">
                    Limit: {{ coupon.usage_limit_total || 'Unlimited' }}
                  </div>
                </td>
                <td @click.stop>
                  <div class="coupon-status">
                    <VSwitch
                      :model-value="!!coupon.is_active"
                      color="primary"
                      inset
                      hide-details
                      density="compact"
                      :loading="togglingCouponId === coupon.id"
                      @update:model-value="toggleCouponActive(coupon)"
                    />
                    <span class="coupon-status__label">{{ coupon.is_active ? 'Active' : 'Inactive' }}</span>
                  </div>
                </td>
                <td
                  class="text-right actions-cell"
                  @click.stop
                >
                  <button
                    class="action-icon-btn"
                    @click="openCouponEdit(coupon)"
                  >
                    <span class="mdi mdi-pencil-outline" />
                    Edit
                  </button>
                  <button
                    class="action-icon-btn action-icon-btn--danger"
                    @click="askDeleteCoupon(coupon)"
                  >
                    <span class="mdi mdi-trash-can-outline" />
                    Delete
                  </button>
                </td>
              </tr>
              <tr v-if="!couponsLoading && coupons.length === 0">
                <td
                  colspan="8"
                  class="empty-state"
                >
                  <span class="mdi mdi-ticket-outline empty-icon" />
                  <span>No coupons found</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <div class="pagination-size">
            <span class="pagination-label">Rows</span>
            <VSelect
              v-model="couponFilters.per_page"
              :items="[10, 15, 25, 50]"
              density="compact"
              variant="outlined"
              hide-details
              style="width: 80px;"
              @update:model-value="() => { couponFilters.page = 1; fetchCoupons() }"
            />
          </div>
          <span class="pagination-range">{{ couponRangeText }}</span>
          <VPagination
            v-model="couponFilters.page"
            size="small"
            :total-visible="5"
            :length="couponsTotalPages"
            @update:model-value="fetchCoupons"
          />
        </div>
      </div>
    </template>

    <ConfirmDialog
      v-model:isDialogVisible="cancelDialogVisible"
      confirmation-msg="Are you sure you want to cancel this subscription? This action cannot be undone."
      @confirm="cancelSubscription"
    />

    <ConfirmDialog
      v-model:isDialogVisible="couponDeleteDialogVisible"
      confirmation-msg="Are you sure you want to delete this coupon? This action cannot be undone."
      @confirm="deleteCoupon"
    />
  </section>
</template>

<style scoped>
.admin-billing-page {
  padding: 28px 32px;
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
  font-family: 'DM Sans', 'Outfit', system-ui, sans-serif;
}

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
  flex-wrap: wrap;
}

.action-btn {
  border-radius: 10px !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}

.action-btn--secondary {
  background: rgba(var(--v-theme-on-surface), 0.06) !important;
}

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
  flex-wrap: wrap;
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
  background: rgba(255, 255, 255, 0.25);
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

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

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
  0% { transform: translateX(-120%); }
  100% { transform: translateX(380%); }
}

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

.font-mono {
  font-family: 'JetBrains Mono', 'Fira Mono', monospace;
  font-size: 0.8rem;
}

.cell-amount {
  font-weight: 700;
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}

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

.coupon-products {
  max-width: 240px;
  white-space: normal;
}

.coupon-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.coupon-status__label {
  font-size: 0.8rem;
  font-weight: 600;
}

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

@media (max-width: 960px) {
  .admin-billing-page {
    padding: 20px 16px;
  }

  .tab-nav {
    width: 100%;
  }

  .actions-cell {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
  }

  .action-icon-btn {
    margin-left: 0;
  }
}
</style>
