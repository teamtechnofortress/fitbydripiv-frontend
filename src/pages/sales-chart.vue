<script setup>
import axios from 'axios'
import VueApexCharts from 'vue3-apexcharts'
import { useTheme } from 'vuetify'
import { CMS_ADMIN_ORDER_STATS_URL } from '@/network/const'
import { getApiToken } from '@/store/authData'
import { formatMoney, prettyLabel } from '@/views/pages/admin/payments/detailShared'

const vuetifyTheme = useTheme()

const loading = ref(false)
const error = ref('')
const stats = ref(null)

const today = new Date()
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

const formatInputDate = date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const filters = reactive({
  date_from: formatInputDate(monthStart),
  date_to: formatInputDate(today),
  product_id: '',
  status: '',
  payment_status: '',
})

const statusOptions = [
  { title: 'All Statuses', value: '' },
  { title: 'Created', value: 'created' },
  { title: 'Completed', value: 'completed' },
  { title: 'Pending', value: 'pending' },
  { title: 'Failed', value: 'failed' },
  { title: 'Cancelled', value: 'cancelled' },
]

const paymentStatusOptions = [
  { title: 'All Payment Statuses', value: '' },
  { title: 'Paid', value: 'paid' },
  { title: 'Pending', value: 'pending' },
  { title: 'Failed', value: 'failed' },
  { title: 'Refunded', value: 'refunded' },
]

const summary = computed(() => stats.value?.summary || {})
const productSales = computed(() => Array.isArray(stats.value?.product_sales) ? stats.value.product_sales : [])
const statusCounts = computed(() => Array.isArray(stats.value?.status_counts) ? stats.value.status_counts : [])
const paymentStatusCounts = computed(() => Array.isArray(stats.value?.payment_status_counts) ? stats.value.payment_status_counts : [])

const soldRate = computed(() => {
  const total = Number(summary.value.total_orders || 0)
  const sold = Number(summary.value.sold_orders || 0)

  return total > 0 ? Number(((sold / total) * 100).toFixed(2)) : 0
})

const summaryCards = computed(() => [
  {
    title: 'Gross Revenue',
    value: formatMoney(summary.value.gross_revenue || 0),
    subtitle: 'Paid or completed sales value',
    icon: 'tabler-currency-dollar',
    color: 'success',
  },
  {
    title: 'Total Orders',
    value: summary.value.total_orders || 0,
    subtitle: `${summary.value.created_orders || 0} created`,
    icon: 'tabler-shopping-cart',
    color: 'primary',
  },
  {
    title: 'Sold Orders',
    value: summary.value.sold_orders || 0,
    subtitle: `${soldRate.value}% sold rate`,
    icon: 'tabler-chart-bar',
    color: 'info',
  },
  {
    title: 'Open / Failed',
    value: `${summary.value.pending_orders || 0} / ${summary.value.failed_orders || 0}`,
    subtitle: `${summary.value.cancelled_orders || 0} cancelled`,
    icon: 'tabler-alert-circle',
    color: 'warning',
  },
])

const chartBase = computed(() => ({
  chart: {
    toolbar: { show: false },
    fontFamily: 'Public Sans, sans-serif',
  },
  dataLabels: { enabled: true },
  legend: {
    position: 'bottom',
    fontSize: '13px',
    markers: { radius: 12 },
  },
  stroke: { width: 0 },
  theme: {
    mode: vuetifyTheme.current.value.dark ? 'dark' : 'light',
  },
}))

const statusChartOptions = computed(() => ({
  ...chartBase.value,
  labels: statusCounts.value.map(item => item.label || prettyLabel(item.key)),
  colors: ['#16a34a', '#f59e0b', '#ef4444', '#64748b', '#0ea5e9'],
  plotOptions: {
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Orders',
            formatter: () => String(summary.value.total_orders || 0),
          },
        },
      },
    },
  },
}))

const statusChartSeries = computed(() => statusCounts.value.map(item => Number(item.count || 0)))

const paymentChartOptions = computed(() => ({
  ...chartBase.value,
  labels: paymentStatusCounts.value.map(item => item.label || prettyLabel(item.key)),
  colors: ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  plotOptions: {
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Payments',
            formatter: () => String(paymentStatusCounts.value.reduce((total, item) => total + Number(item.count || 0), 0)),
          },
        },
      },
    },
  },
}))

const paymentChartSeries = computed(() => paymentStatusCounts.value.map(item => Number(item.count || 0)))

const soldRateOptions = computed(() => ({
  ...chartBase.value,
  labels: ['Sold Rate'],
  colors: ['#0ea5e9'],
  plotOptions: {
    radialBar: {
      hollow: { size: '64%' },
      dataLabels: {
        name: { fontSize: '14px' },
        value: {
          fontSize: '28px',
          formatter: value => `${Number(value || 0).toFixed(1)}%`,
        },
      },
    },
  },
}))

const productBarOptions = computed(() => ({
  ...chartBase.value,
  chart: {
    ...chartBase.value.chart,
    type: 'bar',
  },
  colors: ['#2563eb', '#16a34a'],
  plotOptions: {
    bar: {
      horizontal: false,
      borderRadius: 6,
      columnWidth: '46%',
    },
  },
  dataLabels: { enabled: false },
  xaxis: {
    categories: productSales.value.map(item => item.product_name || item.product_slug || 'Product'),
    labels: {
      rotate: -35,
      trim: true,
    },
  },
  yaxis: {
    labels: {
      formatter: value => Number(value || 0).toFixed(0),
    },
  },
  tooltip: {
    y: {
      formatter: value => `${Number(value || 0).toFixed(0)} orders`,
    },
  },
}))

const productBarSeries = computed(() => [
  {
    name: 'Sold',
    data: productSales.value.map(item => Number(item.sold_orders || 0)),
  },
  {
    name: 'Total',
    data: productSales.value.map(item => Number(item.total_orders || 0)),
  },
])

const revenueBarOptions = computed(() => ({
  ...chartBase.value,
  chart: {
    ...chartBase.value.chart,
    type: 'bar',
  },
  colors: ['#16a34a'],
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 6,
      barHeight: '58%',
    },
  },
  dataLabels: {
    enabled: true,
    formatter: value => formatMoney(value),
  },
  xaxis: {
    categories: productSales.value.map(item => item.product_name || item.product_slug || 'Product'),
    labels: {
      formatter: value => formatMoney(value),
    },
  },
  tooltip: {
    y: {
      formatter: value => formatMoney(value),
    },
  },
}))

const revenueBarSeries = computed(() => [
  {
    name: 'Gross Revenue',
    data: productSales.value.map(item => Number(item.gross_revenue || 0)),
  },
])

const buildParams = () => {
  const params = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== '')
      params[key] = value
  })

  return params
}

const loadStats = async () => {
  loading.value = true
  error.value = ''

  try {
    const token = getApiToken()
    const response = await axios.get(CMS_ADMIN_ORDER_STATS_URL, {
      params: buildParams(),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    stats.value = response?.data?.data || response?.data || {}
  } catch (err) {
    error.value = err?.response?.data?.message || 'Unable to load sales chart data.'
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  Object.assign(filters, {
    date_from: formatInputDate(monthStart),
    date_to: formatInputDate(today),
    product_id: '',
    status: '',
    payment_status: '',
  })
  loadStats()
}

onMounted(loadStats)
</script>

<template>
  <section class="sales-chart-page">
    <div class="sales-chart-header">
      <div>
        <div class="text-h4 font-weight-bold">
          Sales Chart
        </div>
        <p class="mb-0 text-body-2 text-medium-emphasis">
          CMS order performance, product sales, payment state, and revenue totals.
        </p>
      </div>
      <VBtn
        color="primary"
        prepend-icon="tabler-refresh"
        :loading="loading"
        @click="loadStats"
      >
        Refresh
      </VBtn>
    </div>

    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ error }}
    </VAlert>

    <VCard class="mb-5">
      <VCardText>
        <div class="sales-chart-filters">
          <VTextField
            v-model="filters.date_from"
            type="date"
            label="Date From"
            density="compact"
            variant="outlined"
            hide-details
          />
          <VTextField
            v-model="filters.date_to"
            type="date"
            label="Date To"
            density="compact"
            variant="outlined"
            hide-details
          />
          <VTextField
            v-model="filters.product_id"
            label="Product UUID"
            density="compact"
            variant="outlined"
            clearable
            hide-details
            @keydown.enter="loadStats"
          />
          <VSelect
            v-model="filters.status"
            :items="statusOptions"
            label="Order Status"
            density="compact"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="filters.payment_status"
            :items="paymentStatusOptions"
            label="Payment Status"
            density="compact"
            variant="outlined"
            hide-details
          />
          <div class="sales-chart-filter-actions">
            <VBtn
              color="primary"
              :loading="loading"
              @click="loadStats"
            >
              Apply
            </VBtn>
            <VBtn
              variant="tonal"
              @click="resetFilters"
            >
              Reset
            </VBtn>
          </div>
        </div>
      </VCardText>
    </VCard>

    <VProgressLinear
      v-if="loading"
      indeterminate
      color="primary"
      rounded
      class="mb-4"
    />

    <div class="sales-summary-grid">
      <VCard
        v-for="card in summaryCards"
        :key="card.title"
      >
        <VCardText>
          <div class="d-flex justify-space-between align-start gap-4">
            <div>
              <div class="text-caption text-medium-emphasis text-uppercase">
                {{ card.title }}
              </div>
              <div class="text-h5 font-weight-bold mt-2">
                {{ card.value }}
              </div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                {{ card.subtitle }}
              </div>
            </div>
            <VAvatar
              :color="card.color"
              variant="tonal"
              rounded
            >
              <VIcon :icon="card.icon" />
            </VAvatar>
          </div>
        </VCardText>
      </VCard>
    </div>

    <div class="sales-chart-grid mt-5">
      <VCard>
        <VCardText>
          <div class="text-subtitle-1 font-weight-bold mb-3">
            Order Status
          </div>
          <VueApexCharts
            v-if="statusChartSeries.length"
            type="donut"
            height="320"
            :options="statusChartOptions"
            :series="statusChartSeries"
          />
          <div
            v-else
            class="sales-empty-chart"
          >
            No status data
          </div>
        </VCardText>
      </VCard>

      <VCard>
        <VCardText>
          <div class="text-subtitle-1 font-weight-bold mb-3">
            Payment Status
          </div>
          <VueApexCharts
            v-if="paymentChartSeries.length"
            type="donut"
            height="320"
            :options="paymentChartOptions"
            :series="paymentChartSeries"
          />
          <div
            v-else
            class="sales-empty-chart"
          >
            No payment data
          </div>
        </VCardText>
      </VCard>

      <VCard>
        <VCardText>
          <div class="text-subtitle-1 font-weight-bold mb-3">
            Sold Rate
          </div>
          <VueApexCharts
            type="radialBar"
            height="320"
            :options="soldRateOptions"
            :series="[soldRate]"
          />
        </VCardText>
      </VCard>
    </div>

    <VCard class="mt-5">
      <VCardText>
        <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
          <div>
            <div class="text-subtitle-1 font-weight-bold">
              Product Sales
            </div>
            <p class="mb-0 text-body-2 text-medium-emphasis">
              Sold orders are paid orders or completed orders.
            </p>
          </div>
          <VChip
            color="primary"
            variant="tonal"
          >
            {{ productSales.length }} products
          </VChip>
        </div>
        <VueApexCharts
          v-if="productSales.length"
          type="bar"
          height="380"
          :options="productBarOptions"
          :series="productBarSeries"
        />
        <div
          v-else
          class="sales-empty-chart"
        >
          No product sales found.
        </div>
      </VCardText>
    </VCard>

    <VCard class="mt-5">
      <VCardText>
        <div class="text-subtitle-1 font-weight-bold mb-4">
          Revenue By Product
        </div>
        <VueApexCharts
          v-if="productSales.length"
          type="bar"
          height="360"
          :options="revenueBarOptions"
          :series="revenueBarSeries"
        />
        <div
          v-else
          class="sales-empty-chart"
        >
          No revenue data found.
        </div>
      </VCardText>
    </VCard>

    <VCard class="mt-5">
      <VCardText>
        <div class="text-subtitle-1 font-weight-bold mb-4">
          Product Detail
        </div>
        <div class="sales-table-wrap">
          <table class="sales-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Total Orders</th>
                <th>Completed</th>
                <th>Pending</th>
                <th>Failed</th>
                <th>Sold</th>
                <th>Sold %</th>
                <th>Gross Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="product in productSales"
                :key="product.product_id || product.product_slug || product.product_name"
              >
                <td>
                  <div class="font-weight-medium">
                    {{ product.product_name || '-' }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ product.product_slug || product.product_id || '-' }}
                  </div>
                </td>
                <td>{{ product.total_orders || 0 }}</td>
                <td>{{ product.completed_orders || 0 }}</td>
                <td>{{ product.pending_orders || 0 }}</td>
                <td>{{ product.failed_orders || 0 }}</td>
                <td>{{ product.sold_orders || 0 }}</td>
                <td>
                  <VChip
                    size="small"
                    color="info"
                    variant="tonal"
                  >
                    {{ Number(product.sold_percentage || 0).toFixed(2) }}%
                  </VChip>
                </td>
                <td>{{ formatMoney(product.gross_revenue || 0) }}</td>
              </tr>
              <tr v-if="!productSales.length">
                <td
                  colspan="8"
                  class="text-center text-medium-emphasis py-8"
                >
                  No products found for the selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCardText>
    </VCard>
  </section>
</template>

<style scoped>
.sales-chart-page {
  display: flex;
  flex-direction: column;
}

.sales-chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-block-end: 20px;
}

.sales-chart-filters {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr)) auto;
  align-items: center;
  gap: 12px;
}

.sales-chart-filter-actions {
  display: flex;
  gap: 10px;
}

.sales-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.sales-chart-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.sales-empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

.sales-table-wrap {
  overflow-x: auto;
}

.sales-table {
  width: 100%;
  min-width: 960px;
  border-collapse: collapse;
}

.sales-table th,
.sales-table td {
  padding: 12px 14px;
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.875rem;
  vertical-align: top;
}

.sales-table th {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-weight: 700;
  text-align: start;
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .sales-chart-filters,
  .sales-chart-grid,
  .sales-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .sales-chart-header,
  .sales-chart-filter-actions {
    flex-direction: column;
  }

  .sales-chart-filters,
  .sales-chart-grid,
  .sales-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<route lang="yaml">
meta:
  navActiveLink: sales-chart
</route>
