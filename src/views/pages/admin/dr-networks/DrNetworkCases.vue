<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  extractAdminDrNetworkErrors,
  fetchDrNetwork,
  listDrNetworkCases,
  normalizeAdminDrNetworkMeta,
  normalizeAdminDrNetworkRows,
  unwrapAdminDrNetworkResponse,
} from '@/api/adminDrNetworksApi'
import { formatDateTime, formatMoney, prettyLabel, statusColor } from '@/views/pages/admin/payments/detailShared'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const networkId = computed(() => String(route.params.networkId || ''))
const network = ref(null)
const loadingNetwork = ref(false)
const loadingCases = ref(false)
const errors = ref([])
const cases = ref([])
const caseMeta = ref({ current_page: 1, last_page: 1, per_page: 25, total: 0 })

const filters = reactive({
  search: '',
  status: '',
  payment_status: '',
  flow_status: '',
  current_step_key: '',
  state_code: '',
  product_id: '',
  date_from: '',
  date_to: '',
  page: 1,
  per_page: 25,
})

const flowStatusOptions = [
  { title: 'All Flow Statuses', value: '' },
  { title: 'Pending', value: 'pending' },
  { title: 'Running', value: 'running' },
  { title: 'Paused', value: 'paused' },
  { title: 'Completed', value: 'completed' },
  { title: 'Failed', value: 'failed' },
  { title: 'Cancelled', value: 'cancelled' },
]

const totalPages = computed(() => caseMeta.value?.last_page || 1)
const networkTitle = computed(() => network.value?.name || 'Dr Network')

const showErrors = error => {
  const messages = extractAdminDrNetworkErrors(error)
  errors.value = messages
  toast.error(messages[0])
}

const buildCaseParams = () => {
  const params = {
    page: filters.page,
    per_page: filters.per_page,
  }

  ;[
    'search',
    'status',
    'payment_status',
    'flow_status',
    'current_step_key',
    'state_code',
    'product_id',
    'date_from',
    'date_to',
  ].forEach(key => {
    if (filters[key]) params[key] = filters[key]
  })

  return params
}

const loadNetwork = async () => {
  if (!networkId.value) return
  loadingNetwork.value = true

  try {
    const body = await fetchDrNetwork(networkId.value)
    network.value = unwrapAdminDrNetworkResponse(body)
  } catch (error) {
    showErrors(error)
  } finally {
    loadingNetwork.value = false
  }
}

const loadCases = async () => {
  if (!networkId.value) return
  loadingCases.value = true
  errors.value = []

  try {
    const body = await listDrNetworkCases(networkId.value, buildCaseParams())

    cases.value = normalizeAdminDrNetworkRows(body)
    caseMeta.value = {
      ...caseMeta.value,
      ...normalizeAdminDrNetworkMeta(body, filters),
    }
  } catch (error) {
    showErrors(error)
  } finally {
    loadingCases.value = false
  }
}

const applyFilters = () => {
  filters.page = 1
  loadCases()
}

const resetFilters = () => {
  Object.assign(filters, {
    search: '',
    status: '',
    payment_status: '',
    flow_status: '',
    current_step_key: '',
    state_code: '',
    product_id: '',
    date_from: '',
    date_to: '',
    page: 1,
  })
  loadCases()
}

const openCase = row => {
  const orderId = row?.order_id || row?.id
  if (!orderId) return

  router.push(`/admin/dr-networks/${networkId.value}/cases/${orderId}`)
}

const getPatientJourneyLink = row => {
  if (!row?.order_uuid) return ''

  return new URL(`/orders/${encodeURIComponent(row.order_uuid)}/journey`, window.location.origin).toString()
}

const writeClipboard = async text => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)

    return
  }

  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}

const copyPatientJourneyLink = async row => {
  const link = getPatientJourneyLink(row)
  if (!link) {
    toast.error('Order UUID is missing for this case.')

    return
  }

  try {
    await writeClipboard(link)
    toast.success('Patient journey link copied.')
  } catch (error) {
    toast.error('Unable to copy patient journey link.')
  }
}

const goBack = () => {
  router.push({
    path: '/admin/dr-networks',
    query: {
      network_id: networkId.value,
      network_tab: 'flows',
    },
  })
}

watch(
  () => filters.per_page,
  () => {
    filters.page = 1
    loadCases()
  },
)

onMounted(async () => {
  await loadNetwork()
  await loadCases()
})
</script>

<template>
  <section class="dr-cases-page">
    <div class="dr-cases-header">
      <div>
        <VBtn
          variant="text"
          prepend-icon="tabler-arrow-left"
          class="mb-2"
          @click="goBack"
        >
          Back to Network
        </VBtn>
        <div class="text-h4 font-weight-bold">
          {{ networkTitle }} Cases
        </div>
        <p class="mb-0 text-body-2 text-medium-emphasis">
          Review Dr Network orders, case state, flow progress, and financial amounts.
        </p>
      </div>
      <VBtn
        variant="tonal"
        prepend-icon="tabler-refresh"
        :loading="loadingNetwork || loadingCases"
        @click="loadCases"
      >
        Refresh
      </VBtn>
    </div>

    <VAlert
      v-if="errors.length"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      <ul class="mb-0">
        <li
          v-for="error in errors"
          :key="error"
        >
          {{ error }}
        </li>
      </ul>
    </VAlert>

    <VCard class="mb-5">
      <VCardText>
        <div class="dr-cases-filters">
          <VTextField
            v-model="filters.search"
            label="Search"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            @keydown.enter="applyFilters"
          />
          <VTextField
            v-model="filters.status"
            label="Order Status"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            @keydown.enter="applyFilters"
          />
          <VTextField
            v-model="filters.payment_status"
            label="Payment Status"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            @keydown.enter="applyFilters"
          />
          <VSelect
            v-model="filters.flow_status"
            :items="flowStatusOptions"
            label="Flow Status"
            density="compact"
            variant="outlined"
            hide-details
          />
          <VTextField
            v-model="filters.current_step_key"
            label="Current Step"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            @keydown.enter="applyFilters"
          />
          <VTextField
            v-model="filters.state_code"
            label="State"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            @keydown.enter="applyFilters"
          />
          <VTextField
            v-model="filters.product_id"
            label="Product UUID"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            @keydown.enter="applyFilters"
          />
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
          <VSelect
            v-model="filters.per_page"
            :items="[10, 25, 50, 100]"
            label="Per Page"
            density="compact"
            variant="outlined"
            hide-details
          />
          <div class="dr-cases-filter-actions">
            <VBtn
              color="primary"
              :loading="loadingCases"
              @click="applyFilters"
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

    <VCard>
      <VCardText>
        <div class="d-flex justify-space-between align-center mb-4">
          <div class="text-subtitle-1 font-weight-bold">
            Cases
          </div>
          <div class="text-body-2 text-medium-emphasis">
            {{ caseMeta.total || 0 }} total
          </div>
        </div>

        <VProgressLinear
          v-if="loadingCases"
          indeterminate
          color="primary"
          rounded
          class="mb-4"
        />

        <div class="dr-cases-table-wrap">
          <table class="dr-cases-table">
            <thead>
              <tr>
                <th>Order UUID</th>
                <th>Patient</th>
                <th>Product</th>
                <th>State</th>
                <th>Order Status</th>
                <th>Payment Status</th>
                <th>Flow Status</th>
                <th>Current Step</th>
                <th>Network Case ID</th>
                <th>Final Amount</th>
                <th>Total Paid</th>
                <th>Patient Network Fee</th>
                <th>Network Owed Fee</th>
                <th>Created At</th>
                <th class="text-end">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in cases"
                :key="row.order_id || row.id"
              >
                <td>
                  <button
                    type="button"
                    class="dr-cases-link"
                    @click="openCase(row)"
                  >
                    {{ row.order_uuid || row.order_id || '-' }}
                  </button>
                </td>
                <td>
                  <div class="font-weight-medium">
                    {{ row.patient?.name || '-' }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ row.patient?.email || row.patient?.phone || '-' }}
                  </div>
                </td>
                <td>{{ row.product?.name || row.product?.slug || '-' }}</td>
                <td>{{ row.state_code || '-' }}</td>
                <td>
                  <VChip
                    size="small"
                    :color="statusColor(row.status)"
                    variant="tonal"
                  >
                    {{ prettyLabel(row.status) }}
                  </VChip>
                </td>
                <td>
                  <VChip
                    size="small"
                    :color="statusColor(row.payment_status)"
                    variant="tonal"
                  >
                    {{ prettyLabel(row.payment_status) }}
                  </VChip>
                </td>
                <td>
                  <VChip
                    size="small"
                    :color="statusColor(row.flow_run?.status)"
                    variant="tonal"
                  >
                    {{ prettyLabel(row.flow_run?.status) }}
                  </VChip>
                </td>
                <td>{{ prettyLabel(row.flow_run?.current_step_key || row.current_step_key) }}</td>
                <td>{{ row.network_case_id || '-' }}</td>
                <td>{{ formatMoney(row.final_amount) }}</td>
                <td>{{ formatMoney(row.total_paid_amount) }}</td>
                <td>{{ formatMoney(row.dr_network_patient_fee_amount) }}</td>
                <td>{{ formatMoney(row.dr_network_fee_amount) }}</td>
                <td>{{ formatDateTime(row.created_at) }}</td>
                <td>
                  <div class="d-flex justify-end gap-2">
                    <VBtn
                      size="x-small"
                      variant="text"
                      prepend-icon="tabler-copy"
                      :disabled="!row.order_uuid"
                      @click="copyPatientJourneyLink(row)"
                    >
                      Copy Link
                    </VBtn>
                    <VBtn
                      size="x-small"
                      variant="tonal"
                      prepend-icon="tabler-eye"
                      @click="openCase(row)"
                    >
                      Open
                    </VBtn>
                  </div>
                </td>
              </tr>
              <tr v-if="!loadingCases && !cases.length">
                <td
                  colspan="15"
                  class="text-center text-medium-emphasis py-8"
                >
                  No Dr Network cases found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-end mt-4">
          <VPagination
            v-model="filters.page"
            :length="totalPages"
            total-visible="5"
            @update:model-value="loadCases"
          />
        </div>
      </VCardText>
    </VCard>
  </section>
</template>

<style scoped>
.dr-cases-page {
  display: flex;
  flex-direction: column;
}

.dr-cases-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-block-end: 20px;
}

.dr-cases-filters {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  align-items: center;
  gap: 12px;
}

.dr-cases-filter-actions {
  display: flex;
  gap: 12px;
}

.dr-cases-table-wrap {
  overflow-x: auto;
}

.dr-cases-table {
  width: 100%;
  min-width: 1680px;
  border-collapse: collapse;
}

.dr-cases-table th,
.dr-cases-table td {
  padding: 12px 14px;
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.875rem;
  vertical-align: top;
}

.dr-cases-table th {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-weight: 700;
  text-align: start;
  white-space: nowrap;
}

.dr-cases-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: start;
}

@media (max-width: 1200px) {
  .dr-cases-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .dr-cases-header,
  .dr-cases-filter-actions {
    flex-direction: column;
  }

  .dr-cases-filters {
    grid-template-columns: 1fr;
  }
}
</style>
