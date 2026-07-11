import axios from 'axios'
import {
  ADMIN_DR_NETWORK_DOCUMENT_TYPES_URL,
  ADMIN_DR_NETWORK_STATE_MAPPINGS_URL,
  ADMIN_DR_NETWORK_STATES_URL,
  ADMIN_DR_NETWORKS_URL,
  getAdminDrNetworkCasesUrl,
  getAdminDrNetworkCaseUrl,
  getAdminDrNetworkCoverageCheckUrl,
  getAdminDrNetworkCredentialsTestUrl,
  getAdminDrNetworkCredentialsUrl,
  getAdminDrNetworkDocumentRulePreviewUrl,
  getAdminDrNetworkDocumentRuleUrl,
  getAdminDrNetworkDocumentRulesUrl,
  getAdminDrNetworkFinancePayoutsUrl,
  getAdminDrNetworkFinanceSummaryUrl,
  getAdminDrNetworkFinanceTransactionVoidUrl,
  getAdminDrNetworkFinanceTransactionsUrl,
  getAdminDrNetworkFlowCloneUrl,
  getAdminDrNetworkFlowContentCoverageUrl,
  getAdminDrNetworkFlowUrl,
  getAdminDrNetworkFlowValidateUrl,
  getAdminDrNetworkFlowsUrl,
  getAdminDrNetworkProductMappingToggleUrl,
  getAdminDrNetworkProductMappingUrl,
  getAdminDrNetworkProductMappingsMatrixUrl,
  getAdminDrNetworkProductMappingsUrl,
  getAdminDrNetworkQuestionBlockingRuleTestUrl,
  getAdminDrNetworkQuestionReorderUrl,
  getAdminDrNetworkQuestionSetArchiveUrl,
  getAdminDrNetworkQuestionSetBulkReorderUrl,
  getAdminDrNetworkQuestionSetCloneUrl,
  getAdminDrNetworkQuestionSetPreviewUrl,
  getAdminDrNetworkQuestionSetPublishUrl,
  getAdminDrNetworkQuestionSetQuestionsUrl,
  getAdminDrNetworkQuestionSetUrl,
  getAdminDrNetworkQuestionSetValidateUrl,
  getAdminDrNetworkQuestionSetsUrl,
  getAdminDrNetworkQuestionUrl,
  getAdminDrNetworkStateMappingToggleUrl,
  getAdminDrNetworkStateMappingUrl,
  getAdminDrNetworkToggleUrl,
  getAdminDrNetworkUrl,
} from '@/network/const'
import { getApiToken } from '@/store/authData'

export const getAdminDrNetworkAuthHeaders = (extraHeaders = {}) => {
  const token = getApiToken()
  if (!token) throw new Error('Authentication token missing. Please login again.')

  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...extraHeaders,
  }
}

export const unwrapAdminDrNetworkResponse = response => response?.data?.data || response?.data || response

export const normalizeAdminDrNetworkRows = body => {
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body?.data?.data)) return body.data.data
  if (Array.isArray(body)) return body

  return []
}

export const normalizeAdminDrNetworkMeta = (body, fallback = {}) => (
  body?.meta
  || body?.data?.meta
  || (body?.current_page
    ? {
      current_page: body.current_page,
      last_page: body.last_page || 1,
      per_page: body.per_page || fallback.per_page || normalizeAdminDrNetworkRows(body).length || 10,
      total: body.total || normalizeAdminDrNetworkRows(body).length,
    }
    : null)
  || {
    current_page: fallback.page || 1,
    last_page: 1,
    per_page: fallback.per_page || normalizeAdminDrNetworkRows(body).length || 10,
    total: normalizeAdminDrNetworkRows(body).length,
  }
)

export const extractAdminDrNetworkErrors = error => {
  const responseData = error?.response?.data
  const messages = []

  if (responseData?.message)
    messages.push(responseData.message)

  if (responseData?.errors && typeof responseData.errors === 'object') {
    Object.entries(responseData.errors).forEach(([field, entries]) => {
      const list = Array.isArray(entries) ? entries : [entries]

      list.filter(Boolean).forEach(entry => {
        messages.push(`${field}: ${entry}`)
      })
    })
  }

  if (!messages.length) {
    if (error?.response?.status === 401)
      messages.push('Login required. Please sign in again.')
    else if (error?.response?.status === 403)
      messages.push('Your role is not allowed to perform this action.')
    else if (error?.response?.status === 404)
      messages.push('The requested Dr Network resource was not found.')
    else
      messages.push(error?.message || 'Request failed. Please try again.')
  }

  return messages
}

export const getAdminDrNetworkErrorMessage = error => extractAdminDrNetworkErrors(error)[0]

export const DR_NETWORK_FLOW_STEP_OPTIONS = [
  { title: 'Checkout', value: 'checkout' },
  { title: 'Awaiting Payment Confirmation', value: 'awaiting_payment_confirmation' },
  { title: 'Document Upload', value: 'document_upload' },
  { title: 'Intake', value: 'intake' },
  { title: 'Intake Questions', value: 'intake_questions' },
  { title: 'Slot Selection', value: 'slot_selection' },
  { title: 'Review And Submit', value: 'review_and_submit' },
  { title: 'Provider Review', value: 'provider_review' },
  { title: 'Video Consultation', value: 'video_consultation' },
]

export const DR_NETWORK_QUESTION_INPUT_TYPES = [
  'text',
  'long_text',
  'number',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'boolean',
  'date',
  'file',
  'nested',
]

export const DR_NETWORK_CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'in',
  'not_in',
  'exists',
  'missing',
  'greater_than',
  'less_than',
]

export const DR_NETWORK_HARD_STOP_TYPES = [
  'refer_out',
  'provider_review_required',
]

export const DR_NETWORK_DOCUMENT_REQUIREMENT_TYPES = [
  'identity',
  'verification',
  'medical',
  'condition_specific',
  'insurance',
  'consent',
  'prescription',
]

export const DR_NETWORK_DOCUMENT_OPERATORS = [
  'any',
  'all',
  'exact',
]

export const DR_NETWORK_TRANSACTION_STATUS_OPTIONS = [
  { title: 'All Statuses', value: '' },
  { title: 'Active', value: 'active' },
  { title: 'Void', value: 'void' },
  { title: 'Refunded', value: 'refunded' },
]

export const DR_NETWORK_PAYOUT_STATUS_OPTIONS = [
  { title: 'All Statuses', value: '' },
  { title: 'Pending', value: 'pending' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' },
]

export const DR_NETWORK_PAYOUT_METHOD_OPTIONS = [
  { title: 'Bank Transfer', value: 'bank_transfer' },
  { title: 'Wire', value: 'wire' },
  { title: 'Check', value: 'check' },
  { title: 'Other', value: 'other' },
]

const request = async config => {
  const response = await axios({
    ...config,
    headers: getAdminDrNetworkAuthHeaders(config.headers),
  })

  return response?.data || response
}

export const listDrNetworks = params => request({
  method: 'GET',
  url: ADMIN_DR_NETWORKS_URL,
  params,
})

export const createDrNetwork = payload => request({
  method: 'POST',
  url: ADMIN_DR_NETWORKS_URL,
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const fetchDrNetwork = networkId => request({
  method: 'GET',
  url: getAdminDrNetworkUrl(networkId),
})

export const updateDrNetwork = (networkId, payload) => request({
  method: 'PATCH',
  url: getAdminDrNetworkUrl(networkId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const toggleDrNetwork = (networkId, payload = {}) => request({
  method: 'POST',
  url: getAdminDrNetworkToggleUrl(networkId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const deleteDrNetwork = networkId => request({
  method: 'DELETE',
  url: getAdminDrNetworkUrl(networkId),
})

export const fetchDrNetworkCredentials = networkId => request({
  method: 'GET',
  url: getAdminDrNetworkCredentialsUrl(networkId),
})

export const updateDrNetworkCredentials = (networkId, payload) => request({
  method: 'PUT',
  url: getAdminDrNetworkCredentialsUrl(networkId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const testDrNetworkCredentials = networkId => request({
  method: 'POST',
  url: getAdminDrNetworkCredentialsTestUrl(networkId),
})

export const listDrNetworkFlows = networkId => request({
  method: 'GET',
  url: getAdminDrNetworkFlowsUrl(networkId),
})

export const fetchDrNetworkFlow = flowId => request({
  method: 'GET',
  url: getAdminDrNetworkFlowUrl(flowId),
})

export const fetchDrNetworkFlowContentCoverage = (networkId, flowId) => request({
  method: 'GET',
  url: getAdminDrNetworkFlowContentCoverageUrl(networkId, flowId),
})

export const fetchDrNetworkFinanceSummary = (networkId, params) => request({
  method: 'GET',
  url: getAdminDrNetworkFinanceSummaryUrl(networkId),
  params,
})

export const listDrNetworkFinanceTransactions = (networkId, params) => request({
  method: 'GET',
  url: getAdminDrNetworkFinanceTransactionsUrl(networkId),
  params,
})

export const voidDrNetworkFinanceTransaction = (networkId, transactionId, payload) => request({
  method: 'POST',
  url: getAdminDrNetworkFinanceTransactionVoidUrl(networkId, transactionId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const listDrNetworkFinancePayouts = (networkId, params) => request({
  method: 'GET',
  url: getAdminDrNetworkFinancePayoutsUrl(networkId),
  params,
})

export const createDrNetworkFinancePayout = (networkId, payload) => request({
  method: 'POST',
  url: getAdminDrNetworkFinancePayoutsUrl(networkId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const listDrNetworkCases = (networkId, params) => request({
  method: 'GET',
  url: getAdminDrNetworkCasesUrl(networkId),
  params,
})

export const fetchDrNetworkCase = (networkId, orderId) => request({
  method: 'GET',
  url: getAdminDrNetworkCaseUrl(networkId, orderId),
})

export const createDrNetworkFlow = (networkId, payload) => request({
  method: 'POST',
  url: getAdminDrNetworkFlowsUrl(networkId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const updateDrNetworkFlow = (flowId, payload) => request({
  method: 'PATCH',
  url: getAdminDrNetworkFlowUrl(flowId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const deleteDrNetworkFlow = flowId => request({
  method: 'DELETE',
  url: getAdminDrNetworkFlowUrl(flowId),
})

export const validateDrNetworkFlow = flowId => request({
  method: 'POST',
  url: getAdminDrNetworkFlowValidateUrl(flowId),
})

export const cloneDrNetworkFlow = (flowId, payload) => request({
  method: 'POST',
  url: getAdminDrNetworkFlowCloneUrl(flowId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const listDrNetworkStates = params => request({
  method: 'GET',
  url: ADMIN_DR_NETWORK_STATES_URL,
  params,
})

export const createDrNetworkState = payload => request({
  method: 'POST',
  url: ADMIN_DR_NETWORK_STATES_URL,
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const listDrNetworkStateMappings = params => request({
  method: 'GET',
  url: ADMIN_DR_NETWORK_STATE_MAPPINGS_URL,
  params,
})

export const createDrNetworkStateMapping = payload => request({
  method: 'POST',
  url: ADMIN_DR_NETWORK_STATE_MAPPINGS_URL,
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const updateDrNetworkStateMapping = (mappingId, payload) => request({
  method: 'PATCH',
  url: getAdminDrNetworkStateMappingUrl(mappingId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const deleteDrNetworkStateMapping = mappingId => request({
  method: 'DELETE',
  url: getAdminDrNetworkStateMappingUrl(mappingId),
})

export const toggleDrNetworkStateMapping = mappingId => request({
  method: 'POST',
  url: getAdminDrNetworkStateMappingToggleUrl(mappingId),
})

export const fetchDrNetworkCoverage = networkId => request({
  method: 'GET',
  url: getAdminDrNetworkCoverageCheckUrl(networkId),
})

export const fetchDrNetworkProductMappingsMatrix = networkId => request({
  method: 'GET',
  url: getAdminDrNetworkProductMappingsMatrixUrl(networkId),
})

export const listDrNetworkProductMappings = (networkId, params) => request({
  method: 'GET',
  url: getAdminDrNetworkProductMappingsUrl(networkId),
  params,
})

export const createDrNetworkProductMapping = (networkId, payload) => request({
  method: 'POST',
  url: getAdminDrNetworkProductMappingsUrl(networkId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const updateDrNetworkProductMapping = (mappingId, payload) => request({
  method: 'PATCH',
  url: getAdminDrNetworkProductMappingUrl(mappingId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const deleteDrNetworkProductMapping = mappingId => request({
  method: 'DELETE',
  url: getAdminDrNetworkProductMappingUrl(mappingId),
})

export const toggleDrNetworkProductMapping = mappingId => request({
  method: 'POST',
  url: getAdminDrNetworkProductMappingToggleUrl(mappingId),
})

export const listDrNetworkQuestionSets = (networkId, params) => request({
  method: 'GET',
  url: getAdminDrNetworkQuestionSetsUrl(networkId),
  params,
})

export const createDrNetworkQuestionSet = (networkId, payload) => request({
  method: 'POST',
  url: getAdminDrNetworkQuestionSetsUrl(networkId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const fetchDrNetworkQuestionSet = setId => request({
  method: 'GET',
  url: getAdminDrNetworkQuestionSetUrl(setId),
})

export const updateDrNetworkQuestionSet = (setId, payload) => request({
  method: 'PATCH',
  url: getAdminDrNetworkQuestionSetUrl(setId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const validateDrNetworkQuestionSet = setId => request({
  method: 'POST',
  url: getAdminDrNetworkQuestionSetValidateUrl(setId),
})

export const publishDrNetworkQuestionSet = setId => request({
  method: 'POST',
  url: getAdminDrNetworkQuestionSetPublishUrl(setId),
})

export const archiveDrNetworkQuestionSet = setId => request({
  method: 'POST',
  url: getAdminDrNetworkQuestionSetArchiveUrl(setId),
})

export const cloneDrNetworkQuestionSet = (setId, payload = {}) => request({
  method: 'POST',
  url: getAdminDrNetworkQuestionSetCloneUrl(setId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const previewDrNetworkQuestionSet = (setId, payload) => request({
  method: 'POST',
  url: getAdminDrNetworkQuestionSetPreviewUrl(setId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const listDrNetworkQuestions = setId => request({
  method: 'GET',
  url: getAdminDrNetworkQuestionSetQuestionsUrl(setId),
})

export const createDrNetworkQuestion = (setId, payload) => request({
  method: 'POST',
  url: getAdminDrNetworkQuestionSetQuestionsUrl(setId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const updateDrNetworkQuestion = (questionId, payload) => request({
  method: 'PATCH',
  url: getAdminDrNetworkQuestionUrl(questionId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const deleteDrNetworkQuestion = questionId => request({
  method: 'DELETE',
  url: getAdminDrNetworkQuestionUrl(questionId),
})

export const reorderDrNetworkQuestion = (questionId, newSortOrder) => request({
  method: 'POST',
  url: getAdminDrNetworkQuestionReorderUrl(questionId),
  data: { new_sort_order: newSortOrder },
  headers: { 'Content-Type': 'application/json' },
})

export const reorderDrNetworkQuestionsBulk = (setId, orders) => request({
  method: 'POST',
  url: getAdminDrNetworkQuestionSetBulkReorderUrl(setId),
  data: { orders },
  headers: { 'Content-Type': 'application/json' },
})

export const testDrNetworkQuestionBlockingRule = (questionId, payload) => request({
  method: 'POST',
  url: getAdminDrNetworkQuestionBlockingRuleTestUrl(questionId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const listDrNetworkDocumentRules = (networkId, params) => request({
  method: 'GET',
  url: getAdminDrNetworkDocumentRulesUrl(networkId),
  params,
})

export const createDrNetworkDocumentRule = (networkId, payload) => request({
  method: 'POST',
  url: getAdminDrNetworkDocumentRulesUrl(networkId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const updateDrNetworkDocumentRule = (ruleId, payload) => request({
  method: 'PATCH',
  url: getAdminDrNetworkDocumentRuleUrl(ruleId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const deleteDrNetworkDocumentRule = ruleId => request({
  method: 'DELETE',
  url: getAdminDrNetworkDocumentRuleUrl(ruleId),
})

export const previewDrNetworkDocumentRule = (ruleId, payload) => request({
  method: 'POST',
  url: getAdminDrNetworkDocumentRulePreviewUrl(ruleId),
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})

export const listDrNetworkDocumentTypes = params => request({
  method: 'GET',
  url: ADMIN_DR_NETWORK_DOCUMENT_TYPES_URL,
  params,
})

export const createDrNetworkDocumentType = payload => request({
  method: 'POST',
  url: ADMIN_DR_NETWORK_DOCUMENT_TYPES_URL,
  data: payload,
  headers: { 'Content-Type': 'application/json' },
})
