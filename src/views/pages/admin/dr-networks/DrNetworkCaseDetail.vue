<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  extractAdminDrNetworkErrors,
  fetchDrNetworkCase,
  getAdminDrNetworkAuthHeaders,
  unwrapAdminDrNetworkResponse,
} from '@/api/adminDrNetworksApi'
import { formatDateTime, formatMoney, prettyLabel, statusColor } from '@/views/pages/admin/payments/detailShared'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const networkId = computed(() => String(route.params.networkId || ''))
const orderId = computed(() => String(route.params.orderId || ''))
const loading = ref(false)
const errors = ref([])
const record = ref(null)
const activeTab = ref(String(route.query.tab || 'flow'))
const documentPreviewDialog = ref(false)
const previewDocument = ref(null)
const previewObjectUrl = ref('')
const previewMimeType = ref('')
const previewLoading = ref(false)
const previewError = ref('')

const networkTitle = computed(() => record.value?.dr_network?.name || 'Dr Network')
const patient = computed(() => record.value?.patient || {})
const product = computed(() => record.value?.product || {})
const flow = computed(() => record.value?.flow || {})
const flowRun = computed(() => record.value?.flow_run || {})
const flowSteps = computed(() => Array.isArray(flow.value?.steps) ? flow.value.steps : [])
const intakeAnswers = computed(() => Array.isArray(record.value?.intake_answers) ? record.value.intake_answers : [])
const documents = computed(() => Array.isArray(record.value?.documents) ? record.value.documents : [])
const payments = computed(() => Array.isArray(record.value?.payments) ? record.value.payments : [])
const consultationRecord = computed(() => record.value?.consultation_record || null)
const financeTransaction = computed(() => record.value?.finance_transaction || null)

const documentDisplayName = document => document?.download_filename || document?.original_filename || document?.file_path || 'document'

const previewFileName = computed(() => documentDisplayName(previewDocument.value))
const previewMime = computed(() => previewMimeType.value || previewDocument.value?.mime_type || '')
const isPreviewImage = computed(() => String(previewMime.value || '').startsWith('image/'))
const isPreviewPdf = computed(() => String(previewMime.value || '').toLowerCase() === 'application/pdf' || /\.pdf$/i.test(previewFileName.value))

const summaryCards = computed(() => [
  {
    title: 'Final Amount',
    value: formatMoney(record.value?.final_amount, record.value?.currency || 'USD'),
    icon: 'tabler-receipt',
    color: 'primary',
  },
  {
    title: 'Total Paid',
    value: formatMoney(record.value?.total_paid_amount, record.value?.currency || 'USD'),
    icon: 'tabler-credit-card',
    color: 'success',
  },
  {
    title: 'Patient Network Fee',
    value: formatMoney(record.value?.dr_network_patient_fee_amount, record.value?.currency || 'USD'),
    icon: 'tabler-user-dollar',
    color: 'info',
  },
  {
    title: 'Network Owed Fee',
    value: formatMoney(record.value?.dr_network_fee_amount, record.value?.currency || 'USD'),
    icon: 'tabler-building-bank',
    color: 'warning',
  },
])

const showErrors = error => {
  const messages = extractAdminDrNetworkErrors(error)
  errors.value = messages
  toast.error(messages[0])
}

const loadCase = async () => {
  if (!networkId.value || !orderId.value) return
  loading.value = true
  errors.value = []

  try {
    const body = await fetchDrNetworkCase(networkId.value, orderId.value)
    record.value = unwrapAdminDrNetworkResponse(body)
  } catch (error) {
    showErrors(error)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push(`/admin/dr-networks/${networkId.value}/cases`)
}

const openOrder = () => {
  if (!record.value?.order_id) return

  router.push({
    path: `/admin/orders/${record.value.order_id}`,
    query: {
      back: `/admin/dr-networks/${networkId.value}/cases/${record.value.order_id}`,
      back_label: `${networkTitle.value} Case`,
    },
  })
}

const formatValue = value => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)

  return String(value)
}

const stepTone = step => {
  if (step?.is_current) return 'primary'

  return statusColor(step?.status)
}

const revokePreviewObjectUrl = () => {
  if (previewObjectUrl.value) {
    URL.revokeObjectURL(previewObjectUrl.value)
    previewObjectUrl.value = ''
  }
}

const fetchDocumentBlob = async url => {
  const response = await fetch(url, {
    headers: getAdminDrNetworkAuthHeaders({ Accept: '*/*' }),
  })

  if (!response.ok) {
    const message = response.status === 403
      ? 'You are not allowed to access this document.'
      : response.status === 404
        ? 'This document was not found for this case.'
        : 'Unable to load this document.'

    throw new Error(message)
  }

  return response.blob()
}

const openDocumentPreview = async document => {
  if (!document?.preview_url || document.can_preview === false) {
    toast.error('Preview is not available for this document.')

    return
  }

  revokePreviewObjectUrl()
  previewDocument.value = document
  previewMimeType.value = document.mime_type || ''
  previewError.value = ''
  previewLoading.value = true
  documentPreviewDialog.value = true

  try {
    const blob = await fetchDocumentBlob(document.preview_url)
    previewMimeType.value = blob.type || document.mime_type || ''
    previewObjectUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    previewError.value = error?.message || 'Unable to preview this document.'
    toast.error(previewError.value)
  } finally {
    previewLoading.value = false
  }
}

const closeDocumentPreview = () => {
  documentPreviewDialog.value = false
  previewDocument.value = null
  previewMimeType.value = ''
  previewError.value = ''
  previewLoading.value = false
  revokePreviewObjectUrl()
}

const downloadDocument = async document => {
  if (!document?.download_url || document.can_download === false) {
    toast.error('Download is not available for this document.')

    return
  }

  try {
    const blob = await fetchDocumentBlob(document.download_url)
    const objectUrl = URL.createObjectURL(blob)
    const link = window.document.createElement('a')

    link.href = objectUrl
    link.download = document.download_filename || document.original_filename || `case-document-${document.id || Date.now()}`
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
    URL.revokeObjectURL(objectUrl)
  } catch (error) {
    toast.error(error?.message || 'Unable to download this document.')
  }
}

const openDocumentInNewTab = async document => {
  if (!document?.preview_url || document.can_preview === false) {
    toast.error('Preview is not available for this document.')

    return
  }

  try {
    const blob = await fetchDocumentBlob(document.preview_url)
    const objectUrl = URL.createObjectURL(blob)

    window.open(objectUrl, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000)
  } catch (error) {
    toast.error(error?.message || 'Unable to open this document.')
  }
}

watch(activeTab, tab => {
  router.replace({
    path: `/admin/dr-networks/${networkId.value}/cases/${orderId.value}`,
    query: { ...route.query, tab },
  })
})

watch(
  () => route.query.tab,
  tab => {
    const nextTab = String(tab || 'flow')
    if (['flow', 'answers', 'documents', 'payments', 'finance', 'debug'].includes(nextTab) && nextTab !== activeTab.value)
      activeTab.value = nextTab
  },
)

onMounted(loadCase)
onBeforeUnmount(revokePreviewObjectUrl)
</script>

<template>
  <section class="dr-case-page">
    <div class="dr-case-header">
      <div>
        <VBtn
          variant="text"
          prepend-icon="tabler-arrow-left"
          class="mb-2"
          @click="goBack"
        >
          Back to Cases
        </VBtn>
        <div class="text-h4 font-weight-bold">
          Case {{ record?.network_case_id || record?.order_uuid || orderId }}
        </div>
        <p class="mb-0 text-body-2 text-medium-emphasis">
          {{ networkTitle }} · {{ product.name || product.slug || 'Product' }} · {{ formatDateTime(record?.created_at) }}
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <VBtn
          variant="tonal"
          prepend-icon="tabler-refresh"
          :loading="loading"
          @click="loadCase"
        >
          Refresh
        </VBtn>
        <VBtn
          color="primary"
          prepend-icon="tabler-file-invoice"
          @click="openOrder"
        >
          Open Order
        </VBtn>
      </div>
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

    <VProgressLinear
      v-if="loading"
      indeterminate
      color="primary"
      rounded
      class="mb-4"
    />

    <template v-if="record">
      <div class="dr-case-status-strip">
        <div>
          <div class="text-caption text-medium-emphasis text-uppercase">
            Order
          </div>
          <div class="font-weight-bold">
            {{ record.order_uuid || record.order_id }}
          </div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis text-uppercase">
            Patient
          </div>
          <div class="font-weight-bold">
            {{ patient.name || [patient.first_name, patient.last_name].filter(Boolean).join(' ') || '-' }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ patient.email || patient.phone || '-' }}
          </div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis text-uppercase">
            Order Status
          </div>
          <VChip
            size="small"
            :color="statusColor(record.status)"
            variant="tonal"
          >
            {{ prettyLabel(record.status) }}
          </VChip>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis text-uppercase">
            Flow Status
          </div>
          <VChip
            size="small"
            :color="statusColor(flowRun.status)"
            variant="tonal"
          >
            {{ prettyLabel(flowRun.status) }}
          </VChip>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis text-uppercase">
            Current Step
          </div>
          <div class="font-weight-bold">
            {{ prettyLabel(flow.current_step?.step_key || flowRun.current_step_key) }}
          </div>
        </div>
      </div>

      <div class="dr-case-summary">
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
                  {{ card.value }}
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

      <VCard class="mt-5">
        <VCardText>
          <VTabs
            v-model="activeTab"
            class="v-tabs-pill mb-5"
          >
            <VTab value="flow">
              Flow
            </VTab>
            <VTab value="answers">
              Answers
              <VChip
                size="x-small"
                class="ms-2"
                variant="tonal"
              >
                {{ intakeAnswers.length }}
              </VChip>
            </VTab>
            <VTab value="documents">
              Documents
              <VChip
                size="x-small"
                class="ms-2"
                variant="tonal"
              >
                {{ documents.length }}
              </VChip>
            </VTab>
            <VTab value="payments">
              Payments
              <VChip
                size="x-small"
                class="ms-2"
                variant="tonal"
              >
                {{ payments.length }}
              </VChip>
            </VTab>
            <VTab value="finance">
              Finance
            </VTab>
            <VTab value="debug">
              Runtime
            </VTab>
          </VTabs>

          <VWindow v-model="activeTab">
            <VWindowItem value="flow">
              <div class="dr-case-two-column">
                <div>
                  <div class="text-subtitle-1 font-weight-bold mb-3">
                    Progress
                  </div>
                  <div class="dr-case-steps">
                    <div
                      v-for="step in flowSteps"
                      :key="`${step.step_key}-${step.run_step_id || step.order}`"
                      class="dr-case-step"
                      :class="{ 'dr-case-step--current': step.is_current }"
                    >
                      <div class="dr-case-step__rail">
                        <VAvatar
                          size="30"
                          :color="stepTone(step)"
                          variant="tonal"
                        >
                          <VIcon
                            :icon="step.status === 'completed' ? 'tabler-check' : step.is_current ? 'tabler-player-play' : 'tabler-circle'"
                            size="16"
                          />
                        </VAvatar>
                      </div>
                      <div class="dr-case-step__body">
                        <div class="d-flex flex-wrap align-center gap-2">
                          <div class="font-weight-bold">
                            {{ step.name || prettyLabel(step.step_key) }}
                          </div>
                          <VChip
                            size="x-small"
                            :color="stepTone(step)"
                            variant="tonal"
                          >
                            {{ prettyLabel(step.status) }}
                          </VChip>
                          <VChip
                            v-if="step.required"
                            size="x-small"
                            color="info"
                            variant="tonal"
                          >
                            Required
                          </VChip>
                        </div>
                        <p
                          v-if="step.description"
                          class="mb-2 text-body-2 text-medium-emphasis"
                        >
                          {{ step.description }}
                        </p>
                        <div class="dr-case-step__meta">
                          <span>Started {{ formatDateTime(step.started_at) }}</span>
                          <span>Completed {{ formatDateTime(step.completed_at) }}</span>
                          <span>Run Step {{ step.run_step_id || '-' }}</span>
                        </div>
                        <VAlert
                          v-if="step.error_message"
                          type="error"
                          variant="tonal"
                          density="compact"
                          class="mt-3"
                        >
                          {{ step.error_message }}
                        </VAlert>
                      </div>
                    </div>
                    <div
                      v-if="!flowSteps.length"
                      class="text-center text-medium-emphasis py-8"
                    >
                      No flow steps returned.
                    </div>
                  </div>
                </div>

                <div class="dr-case-info-panel">
                  <div class="text-subtitle-1 font-weight-bold mb-3">
                    Case Metadata
                  </div>
                  <dl class="dr-case-definition-list">
                    <dt>Flow</dt>
                    <dd>{{ flow.name || flow.flow_key || '-' }}</dd>
                    <dt>Network Case ID</dt>
                    <dd>{{ record.network_case_id || flowRun.context?.network_case_id || '-' }}</dd>
                    <dt>Consultation Status</dt>
                    <dd>{{ prettyLabel(consultationRecord?.internal_status || consultationRecord?.network_status || record.consultation_status) }}</dd>
                    <dt>State</dt>
                    <dd>{{ record.state_code || patient.state || '-' }}</dd>
                    <dt>Network Product ID</dt>
                    <dd>{{ record.network_product_identifier || '-' }}</dd>
                    <dt>Updated</dt>
                    <dd>{{ formatDateTime(record.updated_at) }}</dd>
                  </dl>
                </div>
              </div>
            </VWindowItem>

            <VWindowItem value="answers">
              <div class="dr-case-table-wrap">
                <table class="dr-case-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Key</th>
                      <th>Type</th>
                      <th>Answer</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="answer in intakeAnswers"
                      :key="answer.id || answer.question_key"
                    >
                      <td>{{ answer.question_text || '-' }}</td>
                      <td>{{ answer.question_key || answer.question_id || '-' }}</td>
                      <td>{{ prettyLabel(answer.input_type) }}</td>
                      <td>
                        <pre
                          v-if="typeof answer.answer_value === 'object'"
                          class="dr-case-pre"
                        >{{ formatValue(answer.answer_value) }}</pre>
                        <span v-else>{{ formatValue(answer.answer_value) }}</span>
                      </td>
                      <td>{{ formatDateTime(answer.created_at) }}</td>
                    </tr>
                    <tr v-if="!intakeAnswers.length">
                      <td
                        colspan="5"
                        class="text-center text-medium-emphasis py-8"
                      >
                        No intake answers returned.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </VWindowItem>

            <VWindowItem value="documents">
              <div class="dr-case-table-wrap">
                <table class="dr-case-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>MIME</th>
                      <th>Status</th>
                      <th>Verified At</th>
                      <th>Created At</th>
                      <th class="text-end">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="document in documents"
                      :key="document.id"
                    >
                      <td>
                        <div class="font-weight-medium">
                          {{ documentDisplayName(document) }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          Original: {{ document.original_filename || '-' }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          Path: {{ document.file_path || '-' }}
                        </div>
                      </td>
                      <td>{{ document.document_type?.name || document.document_type?.key || document.document_type_id || '-' }}</td>
                      <td>{{ prettyLabel(document.document_type?.category) }}</td>
                      <td>{{ document.mime_type || '-' }}</td>
                      <td>
                        <VChip
                          size="small"
                          :color="statusColor(document.status)"
                          variant="tonal"
                        >
                          {{ prettyLabel(document.status) }}
                        </VChip>
                      </td>
                      <td>{{ formatDateTime(document.verified_at) }}</td>
                      <td>{{ formatDateTime(document.created_at) }}</td>
                      <td>
                        <div class="d-flex justify-end gap-2">
                          <VBtn
                            size="x-small"
                            variant="tonal"
                            prepend-icon="tabler-eye"
                            :disabled="!document.preview_url || document.can_preview === false"
                            @click="openDocumentPreview(document)"
                          >
                            Preview
                          </VBtn>
                          <VBtn
                            size="x-small"
                            variant="text"
                            prepend-icon="tabler-external-link"
                            :disabled="!document.preview_url || document.can_preview === false"
                            @click="openDocumentInNewTab(document)"
                          >
                            Link
                          </VBtn>
                          <VBtn
                            size="x-small"
                            variant="text"
                            prepend-icon="tabler-download"
                            :disabled="!document.download_url || document.can_download === false"
                            @click="downloadDocument(document)"
                          >
                            Download
                          </VBtn>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!documents.length">
                      <td
                        colspan="8"
                        class="text-center text-medium-emphasis py-8"
                      >
                        No documents returned.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </VWindowItem>

            <VWindowItem value="payments">
              <div class="dr-case-table-wrap">
                <table class="dr-case-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Amount</th>
                      <th>Currency</th>
                      <th>Status</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="payment in payments"
                      :key="payment.id"
                    >
                      <td>{{ payment.id }}</td>
                      <td>{{ formatMoney(payment.amount, payment.currency || record.currency || 'USD') }}</td>
                      <td>{{ payment.currency || record.currency || 'USD' }}</td>
                      <td>
                        <VChip
                          size="small"
                          :color="statusColor(payment.status)"
                          variant="tonal"
                        >
                          {{ prettyLabel(payment.status) }}
                        </VChip>
                      </td>
                      <td>{{ formatDateTime(payment.created_at) }}</td>
                    </tr>
                    <tr v-if="!payments.length">
                      <td
                        colspan="5"
                        class="text-center text-medium-emphasis py-8"
                      >
                        No payments returned.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </VWindowItem>

            <VWindowItem value="finance">
              <div class="dr-case-two-column">
                <div class="dr-case-info-panel">
                  <div class="text-subtitle-1 font-weight-bold mb-3">
                    Consultation
                  </div>
                  <dl class="dr-case-definition-list">
                    <dt>Network Case ID</dt>
                    <dd>{{ consultationRecord?.network_case_id || '-' }}</dd>
                    <dt>Network Status</dt>
                    <dd>{{ prettyLabel(consultationRecord?.network_status) }}</dd>
                    <dt>Internal Status</dt>
                    <dd>{{ prettyLabel(consultationRecord?.internal_status) }}</dd>
                    <dt>Payable Amount</dt>
                    <dd>{{ formatMoney(consultationRecord?.payable_amount, consultationRecord?.currency || record.currency || 'USD') }}</dd>
                    <dt>Submitted At</dt>
                    <dd>{{ formatDateTime(consultationRecord?.submitted_at) }}</dd>
                    <dt>Resolved At</dt>
                    <dd>{{ formatDateTime(consultationRecord?.resolved_at) }}</dd>
                  </dl>
                </div>
                <div class="dr-case-info-panel">
                  <div class="text-subtitle-1 font-weight-bold mb-3">
                    Finance Transaction
                  </div>
                  <dl class="dr-case-definition-list">
                    <dt>Status</dt>
                    <dd>{{ prettyLabel(financeTransaction?.status) }}</dd>
                    <dt>Patient Paid</dt>
                    <dd>{{ formatMoney(financeTransaction?.patient_paid_amount, financeTransaction?.currency || record.currency || 'USD') }}</dd>
                    <dt>Network Owed</dt>
                    <dd>{{ formatMoney(financeTransaction?.network_owed_amount, financeTransaction?.currency || record.currency || 'USD') }}</dd>
                    <dt>Profit</dt>
                    <dd>{{ formatMoney(financeTransaction?.profit_amount, financeTransaction?.currency || record.currency || 'USD') }}</dd>
                    <dt>Occurred At</dt>
                    <dd>{{ formatDateTime(financeTransaction?.occurred_at) }}</dd>
                    <dt>Void Reason</dt>
                    <dd>{{ financeTransaction?.void_reason || '-' }}</dd>
                  </dl>
                </div>
              </div>
            </VWindowItem>

            <VWindowItem value="debug">
              <div class="dr-case-two-column">
                <div class="dr-case-info-panel">
                  <div class="text-subtitle-1 font-weight-bold mb-3">
                    Flow Run
                  </div>
                  <dl class="dr-case-definition-list">
                    <dt>ID</dt>
                    <dd>{{ flowRun.id || '-' }}</dd>
                    <dt>Status</dt>
                    <dd>{{ prettyLabel(flowRun.status) }}</dd>
                    <dt>Status Reason</dt>
                    <dd>{{ flowRun.status_reason || '-' }}</dd>
                    <dt>Pause Reason</dt>
                    <dd>{{ flowRun.pause_reason || '-' }}</dd>
                    <dt>Failure Reason</dt>
                    <dd>{{ flowRun.failure_reason || '-' }}</dd>
                    <dt>Started At</dt>
                    <dd>{{ formatDateTime(flowRun.started_at) }}</dd>
                    <dt>Updated At</dt>
                    <dd>{{ formatDateTime(flowRun.updated_at) }}</dd>
                  </dl>
                </div>
                <div>
                  <div class="text-subtitle-1 font-weight-bold mb-3">
                    Runtime History
                  </div>
                  <pre class="dr-case-pre dr-case-pre--block">{{ formatValue(flowRun.steps || []) }}</pre>
                  <div class="text-subtitle-1 font-weight-bold mt-5 mb-3">
                    Context
                  </div>
                  <pre class="dr-case-pre dr-case-pre--block">{{ formatValue(flowRun.context || {}) }}</pre>
                </div>
              </div>
            </VWindowItem>
          </VWindow>
        </VCardText>
      </VCard>
    </template>

    <VDialog
      v-model="documentPreviewDialog"
      max-width="1100"
      persistent
    >
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between gap-3">
          <span>{{ previewFileName }}</span>
          <VBtn
            variant="text"
            icon="tabler-x"
            @click="closeDocumentPreview"
          />
        </VCardTitle>
        <VCardText>
          <VProgressLinear
            v-if="previewLoading"
            indeterminate
            color="primary"
            rounded
            class="mb-4"
          />

          <VAlert
            v-if="previewError"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ previewError }}
          </VAlert>

          <div
            v-if="previewObjectUrl && isPreviewImage"
            class="dr-case-document-preview dr-case-document-preview--image"
          >
            <img
              :src="previewObjectUrl"
              :alt="previewFileName"
            >
          </div>
          <iframe
            v-else-if="previewObjectUrl && isPreviewPdf"
            class="dr-case-document-preview dr-case-document-preview--pdf"
            :src="previewObjectUrl"
            title="Case document preview"
          />
          <div
            v-else-if="previewObjectUrl"
            class="dr-case-document-preview dr-case-document-preview--fallback"
          >
            <VIcon
              icon="tabler-file"
              size="42"
            />
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                Preview is not available for this file type.
              </div>
              <p class="mb-0 text-body-2 text-medium-emphasis">
                Use download to view this document with a local app.
              </p>
            </div>
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="tonal"
            prepend-icon="tabler-external-link"
            :disabled="!previewDocument"
            @click="openDocumentInNewTab(previewDocument)"
          >
            Open Link
          </VBtn>
          <VBtn
            color="primary"
            prepend-icon="tabler-download"
            :disabled="!previewDocument"
            @click="downloadDocument(previewDocument)"
          >
            Download
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>

<style scoped>
.dr-case-page {
  display: flex;
  flex-direction: column;
}

.dr-case-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-block-end: 20px;
}

.dr-case-status-strip,
.dr-case-summary,
.dr-case-two-column {
  display: grid;
  gap: 16px;
}

.dr-case-status-strip {
  grid-template-columns: 1.4fr 1.4fr repeat(3, minmax(0, 1fr));
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  margin-block-end: 16px;
}

.dr-case-summary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.dr-case-two-column {
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  align-items: start;
}

.dr-case-info-panel {
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

.dr-case-definition-list {
  display: grid;
  grid-template-columns: minmax(120px, 180px) minmax(0, 1fr);
  gap: 10px 16px;
  margin: 0;
}

.dr-case-definition-list dt {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.8125rem;
  font-weight: 700;
}

.dr-case-definition-list dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.dr-case-steps {
  display: flex;
  flex-direction: column;
}

.dr-case-step {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
}

.dr-case-step__rail {
  position: relative;
  display: flex;
  justify-content: center;
}

.dr-case-step:not(:last-child) .dr-case-step__rail::after {
  position: absolute;
  inset-block-start: 34px;
  inset-block-end: 0;
  width: 2px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  content: "";
}

.dr-case-step__body {
  padding-block-end: 22px;
}

.dr-case-step--current .dr-case-step__body {
  padding: 12px 14px 18px;
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  border-radius: 8px;
  margin-block-end: 14px;
  background: rgba(var(--v-theme-primary), 0.05);
}

.dr-case-step__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.8125rem;
}

.dr-case-table-wrap {
  overflow-x: auto;
}

.dr-case-table {
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
}

.dr-case-table th,
.dr-case-table td {
  padding: 12px 14px;
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.875rem;
  vertical-align: top;
}

.dr-case-table th {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-weight: 700;
  text-align: start;
  white-space: nowrap;
}

.dr-case-pre {
  max-width: 520px;
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.8125rem;
  white-space: pre-wrap;
}

.dr-case-pre--block {
  max-width: none;
  max-height: 360px;
  overflow: auto;
}

.dr-case-document-preview {
  min-height: 420px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.dr-case-document-preview--image {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.dr-case-document-preview--image img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.dr-case-document-preview--pdf {
  width: 100%;
  height: 72vh;
}

.dr-case-document-preview--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: left;
}

@media (max-width: 1100px) {
  .dr-case-status-strip,
  .dr-case-summary,
  .dr-case-two-column {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dr-case-header {
    flex-direction: column;
  }

  .dr-case-definition-list {
    grid-template-columns: 1fr;
  }
}
</style>
