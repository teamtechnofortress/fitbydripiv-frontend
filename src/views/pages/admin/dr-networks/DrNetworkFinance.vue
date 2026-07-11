<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  createDrNetworkFinancePayout,
  DR_NETWORK_PAYOUT_METHOD_OPTIONS,
  DR_NETWORK_PAYOUT_STATUS_OPTIONS,
  DR_NETWORK_TRANSACTION_STATUS_OPTIONS,
  extractAdminDrNetworkErrors,
  fetchDrNetwork,
  fetchDrNetworkFinanceSummary,
  listDrNetworkFinancePayouts,
  listDrNetworkFinanceTransactions,
  normalizeAdminDrNetworkMeta,
  normalizeAdminDrNetworkRows,
  unwrapAdminDrNetworkResponse,
  voidDrNetworkFinanceTransaction,
} from '@/api/adminDrNetworksApi'
import { formatDateTime, formatMoney, prettyLabel, statusColor } from '@/views/pages/admin/payments/detailShared'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const networkId = computed(() => String(route.params.networkId || ''))
const network = ref(null)
const activeTab = ref(String(route.query.tab || 'transactions'))
const loadingNetwork = ref(false)
const loadingSummary = ref(false)
const loadingTransactions = ref(false)
const loadingPayouts = ref(false)
const errors = ref([])
const actionErrors = ref([])

const filters = reactive({
  date_from: '',
  date_to: '',
})

const summary = ref({
  total_patient_paid: '0.00',
  total_network_owed: '0.00',
  profit: '0.00',
  total_paid_out: '0.00',
  remaining_balance: '0.00',
  transaction_count: 0,
  payout_count: 0,
})

const transactionFilters = reactive({
  status: '',
  page: 1,
  per_page: 25,
})

const payoutFilters = reactive({
  status: '',
  page: 1,
  per_page: 25,
})

const transactions = ref([])
const payouts = ref([])
const transactionsMeta = ref({ current_page: 1, last_page: 1, per_page: 25, total: 0 })
const payoutsMeta = ref({ current_page: 1, last_page: 1, per_page: 25, total: 0 })

const payoutDialog = ref(false)
const payoutSaving = ref(false)
const payoutForm = reactive({
  amount: '',
  currency: 'USD',
  method: 'bank_transfer',
  reference_number: '',
  note: '',
  status: 'completed',
  paid_at: '',
})

const voidDialog = ref(false)
const voidSaving = ref(false)
const selectedTransaction = ref(null)
const voidForm = reactive({
  reason: '',
})

const summaryCards = computed(() => [
  {
    title: 'Total Patient Paid',
    value: summary.value.total_patient_paid,
    icon: 'tabler-credit-card',
    color: 'success',
  },
  {
    title: 'Owed to Network',
    value: summary.value.total_network_owed,
    icon: 'tabler-receipt-dollar',
    color: 'warning',
  },
  {
    title: 'Total Paid Out',
    value: summary.value.total_paid_out,
    icon: 'tabler-building-bank',
    color: 'info',
  },
  {
    title: 'Profit',
    value: summary.value.profit,
    icon: 'tabler-chart-line',
    color: 'primary',
  },
])

const transactionTotalPages = computed(() => transactionsMeta.value?.last_page || 1)
const payoutTotalPages = computed(() => payoutsMeta.value?.last_page || 1)
const networkTitle = computed(() => network.value?.name || 'Dr Network')

const showErrors = (target, error) => {
  const messages = extractAdminDrNetworkErrors(error)
  target.value = messages
  toast.error(messages[0])
}

const financeQuery = computed(() => {
  const query = {}

  if (filters.date_from) query.date_from = filters.date_from
  if (filters.date_to) query.date_to = filters.date_to

  return query
})

const loadNetwork = async () => {
  if (!networkId.value) return
  loadingNetwork.value = true

  try {
    const body = await fetchDrNetwork(networkId.value)
    network.value = unwrapAdminDrNetworkResponse(body)
  } catch (error) {
    showErrors(errors, error)
  } finally {
    loadingNetwork.value = false
  }
}

const loadSummary = async () => {
  if (!networkId.value) return
  loadingSummary.value = true
  errors.value = []

  try {
    const body = await fetchDrNetworkFinanceSummary(networkId.value, financeQuery.value)
    summary.value = {
      ...summary.value,
      ...unwrapAdminDrNetworkResponse(body),
    }
  } catch (error) {
    showErrors(errors, error)
  } finally {
    loadingSummary.value = false
  }
}

const loadTransactions = async () => {
  if (!networkId.value) return
  loadingTransactions.value = true
  errors.value = []

  try {
    const params = {
      ...financeQuery.value,
      page: transactionFilters.page,
      per_page: transactionFilters.per_page,
    }

    if (transactionFilters.status) params.status = transactionFilters.status

    const body = await listDrNetworkFinanceTransactions(networkId.value, params)

    transactions.value = normalizeAdminDrNetworkRows(body)
    transactionsMeta.value = {
      ...transactionsMeta.value,
      ...normalizeAdminDrNetworkMeta(body, transactionFilters),
    }
  } catch (error) {
    showErrors(errors, error)
  } finally {
    loadingTransactions.value = false
  }
}

const loadPayouts = async () => {
  if (!networkId.value) return
  loadingPayouts.value = true
  errors.value = []

  try {
    const params = {
      ...financeQuery.value,
      page: payoutFilters.page,
      per_page: payoutFilters.per_page,
    }

    if (payoutFilters.status) params.status = payoutFilters.status

    const body = await listDrNetworkFinancePayouts(networkId.value, params)

    payouts.value = normalizeAdminDrNetworkRows(body)
    payoutsMeta.value = {
      ...payoutsMeta.value,
      ...normalizeAdminDrNetworkMeta(body, payoutFilters),
    }
  } catch (error) {
    showErrors(errors, error)
  } finally {
    loadingPayouts.value = false
  }
}

const refreshCurrentTab = async () => {
  if (activeTab.value === 'payouts')
    await loadPayouts()
  else
    await loadTransactions()
}

const refreshFinance = async () => {
  await Promise.all([loadSummary(), refreshCurrentTab()])
}

const applyDateFilter = async () => {
  transactionFilters.page = 1
  payoutFilters.page = 1
  await refreshFinance()
}

const resetDateFilter = async () => {
  filters.date_from = ''
  filters.date_to = ''
  await applyDateFilter()
}

const openPayoutDialog = () => {
  Object.assign(payoutForm, {
    amount: '',
    currency: 'USD',
    method: 'bank_transfer',
    reference_number: '',
    note: '',
    status: 'completed',
    paid_at: '',
  })
  actionErrors.value = []
  payoutDialog.value = true
}

const savePayout = async () => {
  payoutSaving.value = true
  actionErrors.value = []

  try {
    const payload = {
      amount: payoutForm.amount,
      currency: payoutForm.currency || 'USD',
      method: payoutForm.method,
      reference_number: payoutForm.reference_number || null,
      note: payoutForm.note || null,
      status: payoutForm.status || 'completed',
    }

    if (payoutForm.paid_at)
      payload.paid_at = payoutForm.paid_at

    await createDrNetworkFinancePayout(networkId.value, payload)
    toast.success('Payout recorded.')
    payoutDialog.value = false
    await Promise.all([loadSummary(), loadPayouts()])
  } catch (error) {
    showErrors(actionErrors, error)
  } finally {
    payoutSaving.value = false
  }
}

const openVoidDialog = transaction => {
  selectedTransaction.value = transaction
  voidForm.reason = ''
  actionErrors.value = []
  voidDialog.value = true
}

const saveVoidTransaction = async () => {
  if (!selectedTransaction.value?.id) return
  voidSaving.value = true
  actionErrors.value = []

  try {
    await voidDrNetworkFinanceTransaction(networkId.value, selectedTransaction.value.id, {
      reason: voidForm.reason,
    })
    toast.success('Transaction voided.')
    voidDialog.value = false
    await Promise.all([loadSummary(), loadTransactions()])
  } catch (error) {
    showErrors(actionErrors, error)
  } finally {
    voidSaving.value = false
  }
}

const openOrder = transaction => {
  const orderId = transaction?.order?.id || transaction?.order_id
  if (!orderId) return

  router.push({
    path: `/admin/orders/${orderId}`,
    query: {
      back: `/admin/dr-networks/${networkId.value}/finance?tab=transactions`,
      back_label: `${networkTitle.value} Finance`,
    },
  })
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

watch(activeTab, async tab => {
  router.replace({
    path: `/admin/dr-networks/${networkId.value}/finance`,
    query: { ...route.query, tab },
  })
  await refreshCurrentTab()
})

watch(
  () => route.query.tab,
  tab => {
    const nextTab = String(tab || 'transactions')
    if (['transactions', 'payouts'].includes(nextTab) && nextTab !== activeTab.value)
      activeTab.value = nextTab
  },
)

onMounted(async () => {
  await loadNetwork()
  await Promise.all([loadSummary(), loadTransactions()])
})
</script>

<template>
  <section class="dr-finance-page">
    <div class="dr-finance-header">
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
          {{ networkTitle }} — Finance
        </div>
        <p class="mb-0 text-body-2 text-medium-emphasis">
          Track submitted Dr Network cases, money owed to the network, and payout history.
        </p>
      </div>
      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        @click="openPayoutDialog"
      >
        Record Payout
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
        <div class="dr-finance-filters">
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
          <VBtn
            color="primary"
            :loading="loadingSummary"
            @click="applyDateFilter"
          >
            Apply
          </VBtn>
          <VBtn
            variant="tonal"
            @click="resetDateFilter"
          >
            All Time
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <div class="dr-finance-summary">
      <VCard
        v-for="card in summaryCards"
        :key="card.title"
      >
        <VCardText>
          <div class="d-flex justify-space-between align-start">
            <div>
              <div class="text-caption text-medium-emphasis text-uppercase">
                {{ card.title }}
              </div>
              <div class="text-h5 font-weight-bold mt-2">
                {{ formatMoney(card.value) }}
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

    <VCard class="my-5 dr-finance-balance">
      <VCardText>
        <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between gap-4">
          <div>
            <div class="text-caption text-medium-emphasis text-uppercase">
              Remaining Balance
            </div>
            <div class="text-h4 font-weight-bold mt-1">
              {{ formatMoney(summary.remaining_balance) }}
            </div>
            <p class="mb-0 text-body-2 text-medium-emphasis">
              Currently owed to {{ networkTitle }}. This is always all-time and does not use the date filter.
            </p>
          </div>
          <VBtn
            color="primary"
            prepend-icon="tabler-plus"
            @click="openPayoutDialog"
          >
            Record Payout
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <VCard>
      <VCardText>
        <VTabs
          v-model="activeTab"
          class="v-tabs-pill mb-5"
        >
          <VTab value="transactions">
            Transactions
            <VChip
              size="x-small"
              class="ms-2"
              variant="tonal"
            >
              {{ summary.transaction_count || transactionsMeta.total || 0 }}
            </VChip>
          </VTab>
          <VTab value="payouts">
            Payouts
            <VChip
              size="x-small"
              class="ms-2"
              variant="tonal"
            >
              {{ summary.payout_count || payoutsMeta.total || 0 }}
            </VChip>
          </VTab>
        </VTabs>

        <VWindow v-model="activeTab">
          <VWindowItem value="transactions">
            <div class="dr-finance-toolbar">
              <VSelect
                v-model="transactionFilters.status"
                :items="DR_NETWORK_TRANSACTION_STATUS_OPTIONS"
                label="Status"
                density="compact"
                variant="outlined"
                hide-details
                @update:model-value="() => { transactionFilters.page = 1; loadTransactions() }"
              />
            </div>

            <VProgressLinear
              v-if="loadingTransactions"
              indeterminate
              color="primary"
              rounded
              class="mb-4"
            />

            <div class="dr-finance-table-wrap">
              <table class="dr-finance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order</th>
                    <th>Product</th>
                    <th>Flow</th>
                    <th>Network Case</th>
                    <th>Patient Paid</th>
                    <th>Network Owed</th>
                    <th>Profit</th>
                    <th>Status</th>
                    <th class="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="transaction in transactions"
                    :key="transaction.id"
                  >
                    <td>{{ formatDateTime(transaction.occurred_at) }}</td>
                    <td>
                      <button
                        type="button"
                        class="dr-finance-link"
                        @click="openOrder(transaction)"
                      >
                        {{ transaction.order?.order_uuid || transaction.metadata?.order_uuid || transaction.order_id || '-' }}
                      </button>
                    </td>
                    <td>{{ transaction.order?.product?.name || '-' }}</td>
                    <td>{{ transaction.flow?.name || transaction.flow?.flow_key || '-' }}</td>
                    <td>{{ transaction.consultation_record?.network_case_id || transaction.metadata?.network_case_id || '-' }}</td>
                    <td>{{ formatMoney(transaction.patient_paid_amount, transaction.currency || 'USD') }}</td>
                    <td>{{ formatMoney(transaction.network_owed_amount, transaction.currency || 'USD') }}</td>
                    <td>{{ formatMoney(transaction.profit_amount, transaction.currency || 'USD') }}</td>
                    <td>
                      <VChip
                        size="small"
                        :color="statusColor(transaction.status)"
                        variant="tonal"
                      >
                        {{ prettyLabel(transaction.status) }}
                      </VChip>
                    </td>
                    <td>
                      <div class="d-flex justify-end gap-2">
                        <VBtn
                          size="x-small"
                          variant="text"
                          prepend-icon="tabler-eye"
                          @click="openOrder(transaction)"
                        >
                          View Order
                        </VBtn>
                        <VBtn
                          v-if="transaction.status === 'active'"
                          size="x-small"
                          color="error"
                          variant="tonal"
                          prepend-icon="tabler-circle-off"
                          @click="openVoidDialog(transaction)"
                        >
                          Void
                        </VBtn>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!loadingTransactions && !transactions.length">
                    <td
                      colspan="10"
                      class="text-center text-medium-emphasis py-8"
                    >
                      No finance transactions found.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="d-flex justify-end mt-4">
              <VPagination
                v-model="transactionFilters.page"
                :length="transactionTotalPages"
                total-visible="5"
                @update:model-value="loadTransactions"
              />
            </div>
          </VWindowItem>

          <VWindowItem value="payouts">
            <div class="dr-finance-toolbar">
              <VSelect
                v-model="payoutFilters.status"
                :items="DR_NETWORK_PAYOUT_STATUS_OPTIONS"
                label="Status"
                density="compact"
                variant="outlined"
                hide-details
                @update:model-value="() => { payoutFilters.page = 1; loadPayouts() }"
              />
            </div>

            <VProgressLinear
              v-if="loadingPayouts"
              indeterminate
              color="primary"
              rounded
              class="mb-4"
            />

            <div class="dr-finance-table-wrap">
              <table class="dr-finance-table">
                <thead>
                  <tr>
                    <th>Paid At</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Initiated By</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="payout in payouts"
                    :key="payout.id"
                  >
                    <td>{{ formatDateTime(payout.paid_at) }}</td>
                    <td>{{ formatMoney(payout.amount, payout.currency || 'USD') }}</td>
                    <td>{{ prettyLabel(payout.method) }}</td>
                    <td>{{ payout.reference_number || '-' }}</td>
                    <td>
                      <VChip
                        size="small"
                        :color="statusColor(payout.status)"
                        variant="tonal"
                      >
                        {{ prettyLabel(payout.status) }}
                      </VChip>
                    </td>
                    <td>
                      {{ [payout.initiator?.firstName, payout.initiator?.lastName].filter(Boolean).join(' ') || payout.initiator?.email || '-' }}
                    </td>
                    <td>{{ payout.note || '-' }}</td>
                  </tr>
                  <tr v-if="!loadingPayouts && !payouts.length">
                    <td
                      colspan="7"
                      class="text-center text-medium-emphasis py-8"
                    >
                      No payouts found.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="d-flex justify-end mt-4">
              <VPagination
                v-model="payoutFilters.page"
                :length="payoutTotalPages"
                total-visible="5"
                @update:model-value="loadPayouts"
              />
            </div>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>

    <VDialog
      v-model="payoutDialog"
      max-width="640"
    >
      <VCard>
        <VCardTitle>Record Payout</VCardTitle>
        <VCardText>
          <VAlert
            v-if="actionErrors.length"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            <ul class="mb-0">
              <li
                v-for="error in actionErrors"
                :key="error"
              >
                {{ error }}
              </li>
            </ul>
          </VAlert>
          <div class="dr-finance-form-grid">
            <VTextField
              v-model="payoutForm.amount"
              label="Amount"
              type="number"
              min="0.01"
              step="0.01"
              variant="outlined"
            />
            <VTextField
              v-model="payoutForm.currency"
              label="Currency"
              maxlength="3"
              variant="outlined"
            />
            <VSelect
              v-model="payoutForm.method"
              :items="DR_NETWORK_PAYOUT_METHOD_OPTIONS"
              label="Method"
              variant="outlined"
            />
            <VSelect
              v-model="payoutForm.status"
              :items="DR_NETWORK_PAYOUT_STATUS_OPTIONS.filter(item => item.value)"
              label="Status"
              variant="outlined"
            />
            <VTextField
              v-model="payoutForm.reference_number"
              label="Reference Number"
              variant="outlined"
            />
            <VTextField
              v-model="payoutForm.paid_at"
              type="datetime-local"
              label="Paid At"
              variant="outlined"
            />
            <VTextarea
              v-model="payoutForm.note"
              label="Note"
              rows="3"
              variant="outlined"
              class="dr-finance-form-span"
            />
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="payoutDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="payoutSaving"
            @click="savePayout"
          >
            Save Payout
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="voidDialog"
      max-width="560"
    >
      <VCard>
        <VCardTitle>Void Transaction</VCardTitle>
        <VCardText>
          <VAlert
            v-if="actionErrors.length"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            <ul class="mb-0">
              <li
                v-for="error in actionErrors"
                :key="error"
              >
                {{ error }}
              </li>
            </ul>
          </VAlert>
          <p class="text-body-2 text-medium-emphasis">
            This removes the transaction from finance totals. Enter the reason for the audit trail.
          </p>
          <VTextarea
            v-model="voidForm.reason"
            label="Void Reason"
            rows="4"
            variant="outlined"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="voidDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="error"
            :loading="voidSaving"
            :disabled="!String(voidForm.reason || '').trim()"
            @click="saveVoidTransaction"
          >
            Void Transaction
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>

<style scoped>
.dr-finance-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.dr-finance-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-block-end: 20px;
}

.dr-finance-filters,
.dr-finance-toolbar {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(180px, 240px) auto auto;
  align-items: center;
  gap: 12px;
}

.dr-finance-toolbar {
  grid-template-columns: minmax(180px, 240px);
  margin-block-end: 16px;
}

.dr-finance-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.dr-finance-balance {
  border: 1px solid rgba(var(--v-theme-primary), 0.24);
}

.dr-finance-table-wrap {
  overflow-x: auto;
}

.dr-finance-table {
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
}

.dr-finance-table th,
.dr-finance-table td {
  padding: 12px 14px;
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.875rem;
  vertical-align: top;
}

.dr-finance-table th {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-weight: 700;
  text-align: start;
  white-space: nowrap;
}

.dr-finance-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.dr-finance-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.dr-finance-form-span {
  grid-column: 1 / -1;
}

@media (max-width: 960px) {
  .dr-finance-header {
    flex-direction: column;
  }

  .dr-finance-summary,
  .dr-finance-filters,
  .dr-finance-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
