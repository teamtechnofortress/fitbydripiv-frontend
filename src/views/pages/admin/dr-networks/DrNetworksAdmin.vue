<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  cloneDrNetworkFlow,
  createDrNetwork,
  createDrNetworkDocumentType,
  createDrNetworkFlow,
  createDrNetworkProductMapping,
  createDrNetworkState,
  createDrNetworkStateMapping,
  deleteDrNetworkFlow,
  deleteDrNetworkProductMapping,
  deleteDrNetworkStateMapping,
  extractAdminDrNetworkErrors,
  fetchDrNetwork,
  fetchDrNetworkCoverage,
  fetchDrNetworkCredentials,
  fetchDrNetworkProductMappingsMatrix,
  getAdminDrNetworkErrorMessage,
  listDrNetworkDocumentTypes,
  listDrNetworks,
  listDrNetworkFlows,
  listDrNetworkStateMappings,
  listDrNetworkStates,
  normalizeAdminDrNetworkMeta,
  normalizeAdminDrNetworkRows,
  testDrNetworkCredentials,
  toggleDrNetwork,
  toggleDrNetworkProductMapping,
  toggleDrNetworkStateMapping,
  updateDrNetwork,
  updateDrNetworkCredentials,
  updateDrNetworkFlow,
  updateDrNetworkProductMapping,
  updateDrNetworkStateMapping,
  unwrapAdminDrNetworkResponse,
  validateDrNetworkFlow,
} from '@/api/adminDrNetworksApi'

const toast = useToast()
const router = useRouter()
const route = useRoute()

const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Paused', value: 'paused' },
]

const integrationModeOptions = [
  { title: 'API', value: 'api' },
  { title: 'Manual', value: 'manual' },
]

const flowStepOptions = [
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

const documentTypeCategoryOptions = [
  { title: 'Identity', value: 'identity' },
  { title: 'Verification', value: 'verification' },
  { title: 'Medical', value: 'medical' },
  { title: 'Insurance', value: 'insurance' },
  { title: 'Consent', value: 'consent' },
  { title: 'Prescription', value: 'prescription' },
]

const detailTabKeys = new Set(['credentials', 'flows', 'state-routing', 'product-matrix'])
const mainSectionKeys = new Set(['states', 'document-types'])

const getRouteDetailTab = () => {
  const tab = String(route.query.network_tab || '')

  return detailTabKeys.has(tab) ? tab : 'credentials'
}

const getRouteMainSection = () => {
  const section = String(route.query.section || '')

  return mainSectionKeys.has(section) ? section : ''
}

const isDrNetworksIndexRoute = () => route.path === '/admin/dr-networks'

const replaceDrNetworkQuery = queryPatch => {
  if (!isDrNetworksIndexRoute()) return

  const query = {
    ...route.query,
    ...queryPatch,
  }

  Object.keys(query).forEach(key => {
    if (query[key] === undefined || query[key] === null || query[key] === '')
      delete query[key]
  })

  router.replace({
    path: '/admin/dr-networks',
    query,
  })
}

const mainView = ref('networks')
const activeDetailTab = ref('credentials')
const loadingNetworks = ref(false)
const loadingDetail = ref(false)
const savingNetwork = ref(false)
const networkActionId = ref('')
const networks = ref([])
const selectedNetwork = ref(null)
const selectedNetworkId = ref('')
const networkErrors = ref([])
const networkFilters = reactive({
  page: 1,
  per_page: 20,
})

const networkMeta = ref({
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
})

const networkDialog = ref(false)
const networkDialogMode = ref('create')
const networkForm = reactive({
  id: '',
  name: '',
  slug: '',
  adapter_key: '',
  integration_mode: 'api',
  status: 'inactive',
  is_default: false,
  settingsJson: '{}',
  metadataJson: '{}',
  featureFlagsJson: '{}',
})

const credentialsLoading = ref(false)
const credentialsSaving = ref(false)
const credentialsTesting = ref(false)
const credentialsRows = ref([])
const credentialErrors = ref([])
const credentialsForm = reactive({
  auth_token: '',
  secret_token: '',
  tenant: '',
  api_base_url: '',
  webhook_endpoint_token: '',
  webhook_signatures_enabled: false,
})
const credentialsInitial = reactive({
  tenant: '',
  api_base_url: '',
  webhook_signatures_enabled: false,
})
const credentialTestResult = ref(null)

const flowsLoading = ref(false)
const flows = ref([])
const flowDialog = ref(false)
const flowDialogMode = ref('create')
const flowSaving = ref(false)
const flowActionId = ref('')
const flowErrors = ref([])
const flowForm = reactive({
  id: '',
  flow_key: '',
  name: '',
  description: '',
  network_fee_amount: '0.00',
  patient_fee_amount: '0.00',
  is_active: true,
  steps: [],
})

const cloneDialog = ref(false)
const cloneSaving = ref(false)
const cloneFlowSource = ref(null)
const cloneForm = reactive({
  flow_key: '',
  name: '',
})

const statesLoading = ref(false)
const states = ref([])
const stateDialog = ref(false)
const stateSaving = ref(false)
const stateErrors = ref([])
const stateForm = reactive({
  country_code: 'US',
  state_code: '',
  state_name: '',
  is_active: true,
})

const mappingsLoading = ref(false)
const coverageLoading = ref(false)
const stateMappings = ref([])
const coverage = ref(null)
const mappingDialog = ref(false)
const mappingDialogMode = ref('create')
const mappingSaving = ref(false)
const mappingActionId = ref('')
const mappingErrors = ref([])
const mappingForm = reactive({
  id: '',
  state_id: '',
  flow_id: '',
  priority: 1,
  is_active: true,
})

const matrixLoading = ref(false)
const matrix = ref({
  network: null,
  flows: [],
  rows: [],
})
const matrixErrors = ref([])
const matrixCellDialog = ref(false)
const matrixSaving = ref(false)
const matrixActionId = ref('')
const matrixContext = ref({
  row: null,
  flow: null,
  cell: null,
})
const matrixForm = reactive({
  mapping_id: '',
  product_id: '',
  flow_id: '',
  external_service_id: '',
  external_service_key: '',
  is_active: true,
  externalConfigMode: 'rows',
  externalConfigJson: '{}',
  externalConfigRows: [],
})

const documentTypesLoading = ref(false)
const documentTypes = ref([])
const documentTypeDialog = ref(false)
const documentTypeSaving = ref(false)
const documentTypeErrors = ref([])
const documentTypeForm = reactive({
  key: '',
  name: '',
  category: 'medical',
  description: '',
  metadataJson: '{}',
  is_active: true,
})

const networkTotalPages = computed(() => networkMeta.value?.last_page || 1)
const hasSelectedNetwork = computed(() => Boolean(selectedNetworkId.value))
const flowOptions = computed(() => flows.value.map(flow => ({
  title: `${flow.name || flow.flow_key} (${flow.flow_key})`,
  value: flow.id,
})))
const stateOptions = computed(() => states.value.map(state => ({
  title: `${state.state_code} - ${state.state_name}`,
  value: state.id,
})))
const selectedNetworkTitle = computed(() => selectedNetwork.value?.name || 'Dr Network')

const resetNetworkForm = () => {
  Object.assign(networkForm, {
    id: '',
    name: '',
    slug: '',
    adapter_key: '',
    integration_mode: 'api',
    status: 'inactive',
    is_default: false,
    settingsJson: '{}',
    metadataJson: '{}',
    featureFlagsJson: '{}',
  })
  networkErrors.value = []
}

const resetCredentialsForm = () => {
  Object.assign(credentialsForm, {
    auth_token: '',
    secret_token: '',
    tenant: '',
    api_base_url: '',
    webhook_endpoint_token: '',
    webhook_signatures_enabled: false,
  })
  Object.assign(credentialsInitial, {
    tenant: '',
    api_base_url: '',
    webhook_signatures_enabled: false,
  })
  credentialErrors.value = []
  credentialTestResult.value = null
}

const resetFlowForm = () => {
  Object.assign(flowForm, {
    id: '',
    flow_key: '',
    name: '',
    description: '',
    network_fee_amount: '0.00',
    patient_fee_amount: '0.00',
    is_active: true,
    steps: [],
  })
  flowErrors.value = []
}

const resetStateForm = () => {
  Object.assign(stateForm, {
    country_code: 'US',
    state_code: '',
    state_name: '',
    is_active: true,
  })
  stateErrors.value = []
}

const resetMappingForm = () => {
  Object.assign(mappingForm, {
    id: '',
    state_id: '',
    flow_id: '',
    priority: 1,
    is_active: true,
  })
  mappingErrors.value = []
}

const resetMatrixForm = () => {
  Object.assign(matrixForm, {
    mapping_id: '',
    product_id: '',
    flow_id: '',
    external_service_id: '',
    external_service_key: '',
    is_active: true,
    externalConfigMode: 'rows',
    externalConfigJson: '{}',
    externalConfigRows: [],
  })
  matrixErrors.value = []
}

const resetDocumentTypeForm = () => {
  Object.assign(documentTypeForm, {
    key: '',
    name: '',
    category: 'medical',
    description: '',
    metadataJson: '{}',
    is_active: true,
  })
  documentTypeErrors.value = []
}

const parseJsonField = (value, fallback = {}) => {
  const raw = String(value || '').trim()
  if (!raw) return fallback

  return JSON.parse(raw)
}

const prettyJson = value => JSON.stringify(value && typeof value === 'object' ? value : {}, null, 2)

const normalizeMoney = value => {
  const raw = String(value ?? '').replace(/[^0-9.]/g, '')
  const parts = raw.split('.')
  const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0]
  const numeric = Number(normalized || 0)

  if (!Number.isFinite(numeric) || numeric < 0) return '0.00'

  return numeric.toFixed(2)
}

const showErrors = (target, error) => {
  const messages = extractAdminDrNetworkErrors(error)
  target.value = messages
  toast.error(messages[0])
}

const getStatusColor = status => {
  if (status === 'active') return 'success'
  if (status === 'paused') return 'warning'
  if (status === 'inactive') return 'secondary'

  return 'default'
}

const getStateLabel = stateId => stateOptions.value.find(item => String(item.value) === String(stateId))?.title || stateId || 'State'
const getFlowLabel = flowId => flowOptions.value.find(item => String(item.value) === String(flowId))?.title || flowId || 'Flow'
const formatCoverageState = state => {
  if (!state) return ''
  if (typeof state === 'string') return state
  if (typeof state !== 'object') return String(state)

  const code = state.state_code || state.code || state.abbreviation || ''
  const name = state.state_name || state.name || state.label || ''

  if (code && name) return `${code} - ${name}`

  return code || name || state.id || ''
}

const formatCoverageStates = states => (
  Array.isArray(states)
    ? states.map(formatCoverageState).filter(Boolean).join(', ')
    : ''
)

const fetchNetworks = async () => {
  loadingNetworks.value = true
  networkErrors.value = []

  try {
    const body = await listDrNetworks({
      page: networkFilters.page,
      per_page: networkFilters.per_page,
    })

    networks.value = normalizeAdminDrNetworkRows(body)
    networkMeta.value = {
      ...networkMeta.value,
      ...normalizeAdminDrNetworkMeta(body, networkFilters),
    }
  } catch (error) {
    showErrors(networkErrors, error)
  } finally {
    loadingNetworks.value = false
  }
}

const openCreateNetwork = () => {
  resetNetworkForm()
  networkDialogMode.value = 'create'
  networkDialog.value = true
}

const openEditNetwork = network => {
  resetNetworkForm()
  networkDialogMode.value = 'edit'
  Object.assign(networkForm, {
    id: network?.id || '',
    name: network?.name || '',
    slug: network?.slug || '',
    adapter_key: network?.adapter_key || '',
    integration_mode: network?.integration_mode || 'api',
    status: network?.status || 'inactive',
    is_default: !!network?.is_default,
    settingsJson: prettyJson(network?.settings),
    metadataJson: prettyJson(network?.metadata),
    featureFlagsJson: prettyJson(network?.feature_flags),
  })
  networkDialog.value = true
}

const buildNetworkPayload = () => {
  const payload = {
    name: networkForm.name,
    integration_mode: networkForm.integration_mode,
    status: networkForm.status,
    is_default: !!networkForm.is_default,
    settings: parseJsonField(networkForm.settingsJson),
    metadata: parseJsonField(networkForm.metadataJson),
    feature_flags: parseJsonField(networkForm.featureFlagsJson),
  }

  if (networkDialogMode.value === 'create') {
    payload.slug = networkForm.slug
    payload.adapter_key = networkForm.adapter_key
  }

  return payload
}

const saveNetwork = async () => {
  savingNetwork.value = true
  networkErrors.value = []

  try {
    const payload = buildNetworkPayload()

    if (networkDialogMode.value === 'edit')
      await updateDrNetwork(networkForm.id, payload)
    else
      await createDrNetwork(payload)

    toast.success(networkDialogMode.value === 'edit' ? 'Network updated.' : 'Network created.')
    networkDialog.value = false
    await fetchNetworks()

    if (selectedNetworkId.value && String(selectedNetworkId.value) === String(networkForm.id))
      await fetchSelectedNetwork()
  } catch (error) {
    showErrors(networkErrors, error)
  } finally {
    savingNetwork.value = false
  }
}

const fetchSelectedNetwork = async () => {
  if (!selectedNetworkId.value) return

  loadingDetail.value = true

  try {
    const body = await fetchDrNetwork(selectedNetworkId.value)
    selectedNetwork.value = unwrapAdminDrNetworkResponse(body)
  } catch (error) {
    toast.error(getAdminDrNetworkErrorMessage(error))
  } finally {
    loadingDetail.value = false
  }
}

const openNetwork = async (network, tab = 'credentials') => {
  if (!network?.id) return
  selectedNetworkId.value = network.id
  selectedNetwork.value = network
  mainView.value = 'detail'
  activeDetailTab.value = detailTabKeys.has(tab) ? tab : 'credentials'
  replaceDrNetworkQuery({
    section: null,
    network_id: network.id,
    network_tab: activeDetailTab.value,
  })
  await fetchSelectedNetwork()
  await loadDetailTab(activeDetailTab.value)
}

const backToNetworks = () => {
  selectedNetworkId.value = ''
  selectedNetwork.value = null
  mainView.value = 'networks'
  activeDetailTab.value = 'credentials'
  replaceDrNetworkQuery({
    section: null,
    network_id: null,
    networkId: null,
    network_tab: null,
  })
}

const applyCredentialRows = rows => {
  resetCredentialsForm()
  credentialsRows.value = rows

  rows.forEach(row => {
    if (row?.key === 'tenant' && row.value !== null && row.value !== undefined) {
      credentialsForm.tenant = row.value
      credentialsInitial.tenant = row.value
    }

    if (row?.key === 'api_base_url' && row.value !== null && row.value !== undefined) {
      credentialsForm.api_base_url = row.value
      credentialsInitial.api_base_url = row.value
    }

    if (row?.key === 'webhook_signatures_enabled' && row.value !== null && row.value !== undefined) {
      const value = row.value === true || row.value === 'true' || row.value === 1 || row.value === '1'
      credentialsForm.webhook_signatures_enabled = value
      credentialsInitial.webhook_signatures_enabled = value
    }
  })
}

const loadCredentials = async () => {
  if (!selectedNetworkId.value) return
  credentialsLoading.value = true
  credentialErrors.value = []

  try {
    const body = await fetchDrNetworkCredentials(selectedNetworkId.value)
    applyCredentialRows(normalizeAdminDrNetworkRows(body))
  } catch (error) {
    showErrors(credentialErrors, error)
  } finally {
    credentialsLoading.value = false
  }
}

const buildCredentialPayload = () => {
  const payload = {}

  ;['auth_token', 'secret_token', 'webhook_endpoint_token'].forEach(key => {
    const value = String(credentialsForm[key] || '').trim()
    if (value) payload[key] = value
  })

  ;['tenant', 'api_base_url'].forEach(key => {
    const value = String(credentialsForm[key] || '').trim()
    if (value !== String(credentialsInitial[key] || '').trim()) payload[key] = value
  })

  if (credentialsForm.webhook_signatures_enabled !== credentialsInitial.webhook_signatures_enabled)
    payload.webhook_signatures_enabled = !!credentialsForm.webhook_signatures_enabled

  return payload
}

const saveCredentials = async () => {
  const payload = buildCredentialPayload()

  if (!Object.keys(payload).length) {
    toast.info('No credential changes to save.')

    return
  }

  credentialsSaving.value = true
  credentialErrors.value = []

  try {
    await updateDrNetworkCredentials(selectedNetworkId.value, payload)
    toast.success('Credentials updated.')
    await loadCredentials()
  } catch (error) {
    showErrors(credentialErrors, error)
  } finally {
    credentialsSaving.value = false
  }
}

const testCredentials = async () => {
  credentialsTesting.value = true
  credentialErrors.value = []
  credentialTestResult.value = null

  try {
    const body = await testDrNetworkCredentials(selectedNetworkId.value)
    credentialTestResult.value = unwrapAdminDrNetworkResponse(body)
    toast.success('Connection test succeeded.')
  } catch (error) {
    showErrors(credentialErrors, error)
  } finally {
    credentialsTesting.value = false
  }
}

const loadFlows = async () => {
  if (!selectedNetworkId.value) return
  flowsLoading.value = true
  flowErrors.value = []

  try {
    const body = await listDrNetworkFlows(selectedNetworkId.value)
    flows.value = normalizeAdminDrNetworkRows(body)
  } catch (error) {
    showErrors(flowErrors, error)
  } finally {
    flowsLoading.value = false
  }
}

const openCreateFlow = () => {
  resetFlowForm()
  flowDialogMode.value = 'create'
  flowDialog.value = true
}

const normalizeStepRows = steps => {
  if (!Array.isArray(steps)) return []

  return steps.map((step, index) => ({
    step_key: step?.step_key || step?.key || '',
    name: step?.name || '',
    description: step?.description || '',
    required: step?.required !== false,
    order: Number(step?.order || index + 1),
  }))
}

const openEditFlow = flow => {
  resetFlowForm()
  flowDialogMode.value = 'edit'
  Object.assign(flowForm, {
    id: flow?.id || '',
    flow_key: flow?.flow_key || '',
    name: flow?.name || '',
    description: flow?.description || '',
    network_fee_amount: normalizeMoney(flow?.network_fee_amount),
    patient_fee_amount: normalizeMoney(flow?.patient_fee_amount),
    is_active: flow?.is_active !== false,
    steps: normalizeStepRows(flow?.steps),
  })
  flowDialog.value = true
}

const addFlowStep = () => {
  flowForm.steps.push({
    step_key: '',
    name: '',
    description: '',
    required: true,
    order: flowForm.steps.length + 1,
  })
}

const removeFlowStep = index => {
  flowForm.steps.splice(index, 1)
  flowForm.steps.forEach((step, stepIndex) => {
    step.order = stepIndex + 1
  })
}

const moveFlowStep = (index, direction) => {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= flowForm.steps.length) return

  const [step] = flowForm.steps.splice(index, 1)
  flowForm.steps.splice(nextIndex, 0, step)
  flowForm.steps.forEach((item, stepIndex) => {
    item.order = stepIndex + 1
  })
}

const buildFlowPayload = () => {
  const payload = {
    name: flowForm.name,
    description: flowForm.description,
    network_fee_amount: normalizeMoney(flowForm.network_fee_amount),
    patient_fee_amount: normalizeMoney(flowForm.patient_fee_amount),
    is_active: !!flowForm.is_active,
    steps: flowForm.steps
      .filter(step => step.step_key)
      .map((step, index) => ({
        step_key: step.step_key,
        name: step.name || flowStepOptions.find(item => item.value === step.step_key)?.title || step.step_key,
        description: step.description || '',
        required: !!step.required,
        order: index + 1,
      })),
  }

  if (flowDialogMode.value === 'create')
    payload.flow_key = flowForm.flow_key

  return payload
}

const saveFlow = async () => {
  flowSaving.value = true
  flowErrors.value = []

  try {
    const payload = buildFlowPayload()

    if (flowDialogMode.value === 'edit')
      await updateDrNetworkFlow(flowForm.id, payload)
    else
      await createDrNetworkFlow(selectedNetworkId.value, payload)

    toast.success(flowDialogMode.value === 'edit' ? 'Flow updated.' : 'Flow created.')
    flowDialog.value = false
    await loadFlows()
    if (activeDetailTab.value === 'state-routing')
      await loadStateRouting()
    if (activeDetailTab.value === 'product-matrix')
      await loadProductMatrix()
  } catch (error) {
    showErrors(flowErrors, error)
  } finally {
    flowSaving.value = false
  }
}

const validateFlow = async flow => {
  if (!flow?.id) return

  flowActionId.value = `validate-${flow.id}`
  flowErrors.value = []

  try {
    await validateDrNetworkFlow(flow.id)
    toast.success('Flow validation passed.')
  } catch (error) {
    showErrors(flowErrors, error)
  } finally {
    flowActionId.value = ''
  }
}

const openCloneFlow = flow => {
  cloneFlowSource.value = flow
  cloneForm.flow_key = `${flow?.flow_key || 'flow'}_copy`
  cloneForm.name = flow?.name ? `${flow.name} Copy` : ''
  flowErrors.value = []
  cloneDialog.value = true
}

const saveFlowClone = async () => {
  if (!cloneFlowSource.value?.id) return
  cloneSaving.value = true
  flowErrors.value = []

  try {
    await cloneDrNetworkFlow(cloneFlowSource.value.id, {
      flow_key: cloneForm.flow_key,
      name: cloneForm.name || undefined,
    })
    toast.success('Flow cloned.')
    cloneDialog.value = false
    await loadFlows()
  } catch (error) {
    showErrors(flowErrors, error)
  } finally {
    cloneSaving.value = false
  }
}

const removeFlow = async flow => {
  if (!flow?.id) return
  if (!window.confirm(`Delete flow "${flow.flow_key}"? Active mappings may block this.`)) return

  flowActionId.value = `delete-${flow.id}`
  flowErrors.value = []

  try {
    await deleteDrNetworkFlow(flow.id)
    toast.success('Flow deleted.')
    await loadFlows()
  } catch (error) {
    showErrors(flowErrors, error)
  } finally {
    flowActionId.value = ''
  }
}

const openFlowStepsCoverage = flow => {
  if (!selectedNetworkId.value || !flow?.id) return

  router.push(`/admin/dr-networks/${selectedNetworkId.value}/flows/${flow.id}/steps`)
}

const toggleNetworkStatus = async (network, enabled) => {
  if (!network?.id) return
  networkActionId.value = `toggle-${network.id}`
  networkErrors.value = []

  try {
    const body = await toggleDrNetwork(network.id, { enabled: !!enabled })
    const updated = unwrapAdminDrNetworkResponse(body)
    const nextStatus = updated.status || (updated.enabled ? 'active' : 'inactive')

    networks.value = networks.value.map(row => {
      if (String(row.id) !== String(network.id)) return row

      return {
        ...row,
        status: nextStatus,
        enabled: updated.enabled ?? nextStatus === 'active',
        config_version: updated.config_version ?? row.config_version,
      }
    })

    if (selectedNetwork.value && String(selectedNetwork.value.id) === String(network.id)) {
      selectedNetwork.value = {
        ...selectedNetwork.value,
        status: nextStatus,
        enabled: updated.enabled ?? nextStatus === 'active',
        config_version: updated.config_version ?? selectedNetwork.value.config_version,
      }
    }

    toast.success(`Dr Network ${nextStatus === 'active' ? 'activated' : 'deactivated'}.`)
  } catch (error) {
    showErrors(networkErrors, error)
  } finally {
    networkActionId.value = ''
  }
}

const openNetworkFinance = network => {
  const networkId = network?.id || selectedNetworkId.value
  if (!networkId) return

  router.push(`/admin/dr-networks/${networkId}/finance`)
}

const openNetworkCases = network => {
  const networkId = network?.id || selectedNetworkId.value
  if (!networkId) return

  router.push(`/admin/dr-networks/${networkId}/cases`)
}

const loadStates = async () => {
  statesLoading.value = true
  stateErrors.value = []

  try {
    const body = await listDrNetworkStates({ country_code: 'US', per_page: 100 })
    states.value = normalizeAdminDrNetworkRows(body)
  } catch (error) {
    showErrors(stateErrors, error)
  } finally {
    statesLoading.value = false
  }
}

const loadStateMappings = async () => {
  if (!selectedNetworkId.value) return
  mappingsLoading.value = true
  mappingErrors.value = []

  try {
    const body = await listDrNetworkStateMappings({
      network_id: selectedNetworkId.value,
      per_page: 100,
    })
    stateMappings.value = normalizeAdminDrNetworkRows(body)
  } catch (error) {
    showErrors(mappingErrors, error)
  } finally {
    mappingsLoading.value = false
  }
}

const loadCoverage = async () => {
  if (!selectedNetworkId.value) return
  coverageLoading.value = true

  try {
    const body = await fetchDrNetworkCoverage(selectedNetworkId.value)
    coverage.value = unwrapAdminDrNetworkResponse(body)
  } catch (error) {
    toast.error(getAdminDrNetworkErrorMessage(error))
  } finally {
    coverageLoading.value = false
  }
}

const loadStateRouting = async () => {
  await Promise.all([
    loadStates(),
    loadFlows(),
    loadStateMappings(),
    loadCoverage(),
  ])
}

const openCreateMapping = () => {
  resetMappingForm()
  mappingDialogMode.value = 'create'
  mappingDialog.value = true
}

const openEditMapping = mapping => {
  resetMappingForm()
  mappingDialogMode.value = 'edit'
  Object.assign(mappingForm, {
    id: mapping?.id || '',
    state_id: mapping?.state_id || mapping?.state?.id || '',
    flow_id: mapping?.flow_id || mapping?.flow?.id || '',
    priority: mapping?.priority ?? 1,
    is_active: mapping?.is_active !== false,
  })
  mappingDialog.value = true
}

const saveMapping = async () => {
  mappingSaving.value = true
  mappingErrors.value = []

  const payload = {
    state_id: mappingForm.state_id,
    dr_network_id: selectedNetworkId.value,
    flow_id: mappingForm.flow_id,
    priority: Number(mappingForm.priority || 1),
    is_active: !!mappingForm.is_active,
  }

  try {
    if (mappingDialogMode.value === 'edit')
      await updateDrNetworkStateMapping(mappingForm.id, payload)
    else
      await createDrNetworkStateMapping(payload)

    toast.success(mappingDialogMode.value === 'edit' ? 'State mapping updated.' : 'State mapping created.')
    mappingDialog.value = false
    await Promise.all([loadStateMappings(), loadCoverage()])
  } catch (error) {
    showErrors(mappingErrors, error)
  } finally {
    mappingSaving.value = false
  }
}

const toggleMapping = async mapping => {
  if (!mapping?.id) return
  mappingActionId.value = `toggle-${mapping.id}`
  mappingErrors.value = []

  try {
    await toggleDrNetworkStateMapping(mapping.id)
    toast.success('State mapping toggled.')
    await Promise.all([loadStateMappings(), loadCoverage()])
  } catch (error) {
    showErrors(mappingErrors, error)
  } finally {
    mappingActionId.value = ''
  }
}

const removeMapping = async mapping => {
  if (!mapping?.id) return
  if (!window.confirm('Delete this state mapping?')) return

  mappingActionId.value = `delete-${mapping.id}`
  mappingErrors.value = []

  try {
    await deleteDrNetworkStateMapping(mapping.id)
    toast.success('State mapping deleted.')
    await Promise.all([loadStateMappings(), loadCoverage()])
  } catch (error) {
    showErrors(mappingErrors, error)
  } finally {
    mappingActionId.value = ''
  }
}

const openStatesView = async () => {
  selectedNetworkId.value = ''
  selectedNetwork.value = null
  activeDetailTab.value = 'credentials'
  mainView.value = 'states'
  replaceDrNetworkQuery({
    section: 'states',
    network_id: null,
    networkId: null,
    network_tab: null,
  })
  await loadStates()
}

const openCreateState = () => {
  resetStateForm()
  stateDialog.value = true
}

const saveState = async () => {
  stateSaving.value = true
  stateErrors.value = []

  try {
    await createDrNetworkState({
      country_code: stateForm.country_code,
      state_code: stateForm.state_code,
      state_name: stateForm.state_name,
      is_active: !!stateForm.is_active,
    })
    toast.success('State created.')
    stateDialog.value = false
    await loadStates()
  } catch (error) {
    showErrors(stateErrors, error)
  } finally {
    stateSaving.value = false
  }
}

const loadProductMatrix = async () => {
  if (!selectedNetworkId.value) return
  matrixLoading.value = true
  matrixErrors.value = []

  try {
    const body = await fetchDrNetworkProductMappingsMatrix(selectedNetworkId.value)
    const payload = unwrapAdminDrNetworkResponse(body) || {}

    matrix.value = {
      network: payload.network || null,
      flows: Array.isArray(payload.flows) ? payload.flows : [],
      rows: Array.isArray(payload.rows) ? payload.rows : [],
    }
  } catch (error) {
    showErrors(matrixErrors, error)
  } finally {
    matrixLoading.value = false
  }
}

const configObjectToRows = config => Object.entries(config && typeof config === 'object' ? config : {})
  .map(([key, value]) => ({
    key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
  }))

const configRowsToObject = rows => {
  const config = {}

  rows.forEach(row => {
    const key = String(row?.key || '').trim()
    if (!key) return

    const rawValue = String(row?.value ?? '').trim()

    try {
      config[key] = rawValue ? JSON.parse(rawValue) : ''
    } catch {
      config[key] = rawValue
    }
  })

  return config
}

const openMatrixCell = (row, flow) => {
  resetMatrixForm()
  const cell = row?.cells?.[flow?.flow_key] || null
  const externalConfig = cell?.external_config && typeof cell.external_config === 'object'
    ? cell.external_config
    : {}

  matrixContext.value = { row, flow, cell }
  Object.assign(matrixForm, {
    mapping_id: cell?.mapping_id || '',
    product_id: row?.product_id || '',
    flow_id: flow?.id || cell?.flow_id || '',
    external_service_id: cell?.external_service_id || '',
    external_service_key: cell?.external_service_key || '',
    is_active: cell?.is_active !== false,
    externalConfigMode: 'rows',
    externalConfigJson: prettyJson(externalConfig),
    externalConfigRows: configObjectToRows(externalConfig),
  })
  matrixCellDialog.value = true
}

const addExternalConfigRow = () => {
  matrixForm.externalConfigRows.push({ key: '', value: '' })
}

const removeExternalConfigRow = index => {
  matrixForm.externalConfigRows.splice(index, 1)
}

const buildMatrixPayload = () => ({
  product_id: matrixForm.product_id,
  flow_id: matrixForm.flow_id,
  external_service_id: matrixForm.external_service_id,
  external_service_key: matrixForm.external_service_key,
  external_config: matrixForm.externalConfigMode === 'json'
    ? parseJsonField(matrixForm.externalConfigJson)
    : configRowsToObject(matrixForm.externalConfigRows),
  is_active: !!matrixForm.is_active,
})

const saveMatrixCell = async () => {
  matrixSaving.value = true
  matrixErrors.value = []

  try {
    const payload = buildMatrixPayload()

    if (matrixForm.mapping_id)
      await updateDrNetworkProductMapping(matrixForm.mapping_id, payload)
    else
      await createDrNetworkProductMapping(selectedNetworkId.value, payload)

    toast.success(matrixForm.mapping_id ? 'Product mapping updated.' : 'Product mapping created.')
    matrixCellDialog.value = false
    await loadProductMatrix()
  } catch (error) {
    showErrors(matrixErrors, error)
  } finally {
    matrixSaving.value = false
  }
}

const toggleMatrixCell = async cell => {
  if (!cell?.mapping_id) return
  matrixActionId.value = `toggle-${cell.mapping_id}`
  matrixErrors.value = []

  try {
    await toggleDrNetworkProductMapping(cell.mapping_id)
    toast.success('Product mapping toggled.')
    await loadProductMatrix()
  } catch (error) {
    showErrors(matrixErrors, error)
  } finally {
    matrixActionId.value = ''
  }
}

const removeMatrixCell = async cell => {
  if (!cell?.mapping_id) return
  if (!window.confirm('Delete this product mapping?')) return

  matrixActionId.value = `delete-${cell.mapping_id}`
  matrixErrors.value = []

  try {
    await deleteDrNetworkProductMapping(cell.mapping_id)
    toast.success('Product mapping deleted.')
    await loadProductMatrix()
  } catch (error) {
    showErrors(matrixErrors, error)
  } finally {
    matrixActionId.value = ''
  }
}

const openProductMappingDetail = (row, flow) => {
  if (!selectedNetworkId.value || !row?.product_id || !flow?.id) return

  router.push(`/admin/dr-networks/${selectedNetworkId.value}/products/${row.product_id}/flows/${flow.id}`)
}

const openDocumentTypesView = async () => {
  selectedNetworkId.value = ''
  selectedNetwork.value = null
  activeDetailTab.value = 'credentials'
  mainView.value = 'document-types'
  replaceDrNetworkQuery({
    section: 'document-types',
    network_id: null,
    networkId: null,
    network_tab: null,
  })
  await loadDocumentTypes()
}

const loadDocumentTypes = async () => {
  documentTypesLoading.value = true
  documentTypeErrors.value = []

  try {
    const body = await listDrNetworkDocumentTypes({ per_page: 100 })
    documentTypes.value = normalizeAdminDrNetworkRows(body)
  } catch (error) {
    showErrors(documentTypeErrors, error)
  } finally {
    documentTypesLoading.value = false
  }
}

const openCreateDocumentType = () => {
  resetDocumentTypeForm()
  documentTypeDialog.value = true
}

const saveDocumentType = async () => {
  documentTypeSaving.value = true
  documentTypeErrors.value = []

  try {
    await createDrNetworkDocumentType({
      key: documentTypeForm.key,
      name: documentTypeForm.name,
      category: documentTypeForm.category,
      description: documentTypeForm.description,
      metadata: parseJsonField(documentTypeForm.metadataJson),
      is_active: !!documentTypeForm.is_active,
    })
    toast.success('Document type created.')
    documentTypeDialog.value = false
    await loadDocumentTypes()
  } catch (error) {
    showErrors(documentTypeErrors, error)
  } finally {
    documentTypeSaving.value = false
  }
}

const loadDetailTab = async tab => {
  if (!hasSelectedNetwork.value) return

  if (tab === 'credentials')
    await loadCredentials()
  else if (tab === 'flows')
    await loadFlows()
  else if (tab === 'state-routing')
    await loadStateRouting()
  else if (tab === 'product-matrix')
    await loadProductMatrix()
}

const openMainSectionFromRoute = async () => {
  if (route.query.network_id || route.query.networkId) return false

  const section = getRouteMainSection()

  if (section === 'states') {
    selectedNetworkId.value = ''
    selectedNetwork.value = null
    activeDetailTab.value = 'credentials'
    mainView.value = 'states'
    await loadStates()

    return true
  }

  if (section === 'document-types') {
    selectedNetworkId.value = ''
    selectedNetwork.value = null
    activeDetailTab.value = 'credentials'
    mainView.value = 'document-types'
    await loadDocumentTypes()

    return true
  }

  return false
}

const openNetworkFromRoute = async () => {
  const routeNetworkId = route.query.network_id || route.query.networkId
  if (!routeNetworkId) return

  selectedNetworkId.value = routeNetworkId
  selectedNetwork.value = networks.value.find(network => String(network.id) === String(routeNetworkId)) || null
  mainView.value = 'detail'
  activeDetailTab.value = getRouteDetailTab()

  await fetchSelectedNetwork()
  await loadDetailTab(activeDetailTab.value)
}

watch(activeDetailTab, tab => {
  if (mainView.value === 'detail' && selectedNetworkId.value)
    replaceDrNetworkQuery({
      section: null,
      network_id: selectedNetworkId.value,
      network_tab: tab,
    })

  loadDetailTab(tab)
})

watch(
  () => [route.query.section, route.query.network_id, route.query.networkId, route.query.network_tab],
  async ([section, networkId, legacyNetworkId, tab]) => {
    if (!isDrNetworksIndexRoute()) return

    const nextNetworkId = networkId || legacyNetworkId

    if (!nextNetworkId) {
      if (mainSectionKeys.has(String(section || ''))) {
        if (mainView.value !== section)
          await openMainSectionFromRoute()

        return
      }

      if (mainView.value === 'detail' || mainView.value === 'states' || mainView.value === 'document-types')
        backToNetworks()

      return
    }

    if (String(nextNetworkId) !== String(selectedNetworkId.value)) {
      openNetworkFromRoute()

      return
    }

    const nextTab = detailTabKeys.has(String(tab || '')) ? String(tab) : 'credentials'
    if (mainView.value === 'detail' && activeDetailTab.value !== nextTab)
      activeDetailTab.value = nextTab
  },
)

onMounted(async () => {
  await fetchNetworks()
  if (!await openMainSectionFromRoute())
    await openNetworkFromRoute()
})
</script>

<template>
  <section class="dr-networks-admin">
    <div class="dr-network-header">
      <div>
        <div class="text-h5 font-weight-bold">
          Dr Network Admin
        </div>
        <p class="mb-0 text-body-2 text-medium-emphasis">
          Configure network identity, credentials, flows, routing, and product service mappings.
        </p>
      </div>

      <div class="dr-network-header__actions">
        <VBtn
          v-if="mainView === 'networks'"
          variant="tonal"
          prepend-icon="tabler-map-2"
          @click="openStatesView"
        >
          States
        </VBtn>
        <VBtn
          v-if="mainView === 'networks'"
          variant="tonal"
          prepend-icon="tabler-file-description"
          @click="openDocumentTypesView"
        >
          Document Types
        </VBtn>
        <VBtn
          v-if="mainView !== 'networks'"
          variant="outlined"
          prepend-icon="tabler-arrow-left"
          @click="backToNetworks"
        >
          Networks
        </VBtn>
      </div>
    </div>

    <VAlert
      v-if="networkErrors.length && mainView === 'networks'"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      <ul class="mb-0">
        <li
          v-for="error in networkErrors"
          :key="error"
        >
          {{ error }}
        </li>
      </ul>
    </VAlert>

    <VCard v-if="mainView === 'networks'">
      <VCardText class="pa-6">
        <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between gap-4 mb-5">
          <div>
            <div class="text-h6 font-weight-bold">
              Networks
            </div>
            <p class="mb-0 text-body-2 text-medium-emphasis">
              Open a network to manage its credentials, flows, state routing, and product wiring.
            </p>
          </div>

          <VBtn
            color="primary"
            prepend-icon="tabler-plus"
            @click="openCreateNetwork"
          >
            Create Network
          </VBtn>
        </div>

        <VProgressLinear
          v-if="loadingNetworks"
          indeterminate
          color="primary"
          rounded
          class="mb-4"
        />

        <div class="dr-network-table-wrap">
          <table class="dr-network-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Adapter</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Enabled</th>
                <th>Flows</th>
                <th>State Mappings</th>
                <th>Product Mappings</th>
                <th class="text-end">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="network in networks"
                :key="network.id"
              >
                <td>
                  <button
                    type="button"
                    class="dr-network-link"
                    @click="openNetwork(network)"
                  >
                    {{ network.name }}
                  </button>
                </td>
                <td>{{ network.slug }}</td>
                <td>{{ network.adapter_key }}</td>
                <td>{{ network.integration_mode }}</td>
                <td>
                  <VChip
                    size="small"
                    :color="getStatusColor(network.status)"
                    variant="tonal"
                  >
                    {{ network.status }}
                  </VChip>
                </td>
                <td>
                  <VSwitch
                    :model-value="network.status === 'active'"
                    :aria-label="`${network.name} enabled`"
                    color="success"
                    density="compact"
                    hide-details
                    inset
                    :loading="networkActionId === `toggle-${network.id}`"
                    :disabled="networkActionId === `toggle-${network.id}`"
                    @update:model-value="enabled => toggleNetworkStatus(network, enabled)"
                  />
                </td>
                <td>{{ network.flow_definitions_count ?? '-' }}</td>
                <td>{{ network.mappings_count ?? '-' }}</td>
                <td>{{ network.product_mappings_count ?? '-' }}</td>
                <td>
                  <div class="d-flex justify-end gap-2">
                    <VBtn
                      size="small"
                      variant="text"
                      icon="tabler-report-money"
                      @click="openNetworkFinance(network)"
                    />
                    <VBtn
                      size="small"
                      variant="text"
                      icon="tabler-briefcase"
                      @click="openNetworkCases(network)"
                    />
                    <VBtn
                      size="small"
                      variant="text"
                      icon="tabler-settings"
                      @click="openNetwork(network)"
                    />
                    <VBtn
                      size="small"
                      variant="text"
                      icon="tabler-pencil"
                      @click="openEditNetwork(network)"
                    />
                  </div>
                </td>
              </tr>
              <tr v-if="!loadingNetworks && !networks.length">
                <td
                  colspan="10"
                  class="text-center text-medium-emphasis py-8"
                >
                  No Dr Networks found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-end mt-4">
          <VPagination
            v-model="networkFilters.page"
            :length="networkTotalPages"
            total-visible="5"
            @update:model-value="fetchNetworks"
          />
        </div>
      </VCardText>
    </VCard>

    <VCard v-else-if="mainView === 'detail'">
      <VCardText class="pa-6">
        <VProgressLinear
          v-if="loadingDetail"
          indeterminate
          color="primary"
          rounded
          class="mb-4"
        />

        <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between gap-4 mb-6">
          <div>
            <div class="d-flex align-center gap-3 mb-1">
              <div class="text-h5 font-weight-bold">
                {{ selectedNetworkTitle }}
              </div>
              <VChip
                size="small"
                :color="getStatusColor(selectedNetwork?.status)"
                variant="tonal"
              >
                {{ selectedNetwork?.status || 'unknown' }}
              </VChip>
            </div>
            <p class="mb-0 text-body-2 text-medium-emphasis">
              {{ selectedNetwork?.slug }} · {{ selectedNetwork?.adapter_key }} · config v{{ selectedNetwork?.config_version || 1 }}
            </p>
          </div>

          <div class="d-flex flex-wrap gap-2">
            <VBtn
              variant="tonal"
              color="primary"
              prepend-icon="tabler-report-money"
              @click="openNetworkFinance"
            >
              Finance
            </VBtn>
            <VBtn
              variant="tonal"
              color="primary"
              prepend-icon="tabler-briefcase"
              @click="openNetworkCases"
            >
              Cases
            </VBtn>
            <VBtn
              variant="outlined"
              prepend-icon="tabler-pencil"
              @click="openEditNetwork(selectedNetwork)"
            >
              Edit Network
            </VBtn>
          </div>
        </div>

        <VTabs
          v-model="activeDetailTab"
          class="v-tabs-pill mb-6"
        >
          <VTab value="credentials">
            <VIcon
              icon="tabler-key"
              size="18"
              start
            />
            Credentials
          </VTab>
          <VTab value="flows">
            <VIcon
              icon="tabler-route"
              size="18"
              start
            />
            Flows
          </VTab>
          <VTab value="state-routing">
            <VIcon
              icon="tabler-map-pin"
              size="18"
              start
            />
            State Routing
          </VTab>
          <VTab value="product-matrix">
            <VIcon
              icon="tabler-grid-dots"
              size="18"
              start
            />
            Product Mapping Matrix
          </VTab>
        </VTabs>

        <VWindow
          v-model="activeDetailTab"
          :touch="false"
        >
          <VWindowItem value="credentials">
            <VAlert
              v-if="credentialErrors.length"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              <ul class="mb-0">
                <li
                  v-for="error in credentialErrors"
                  :key="error"
                >
                  {{ error }}
                </li>
              </ul>
            </VAlert>

            <div class="dr-network-panel-grid">
              <div class="dr-network-panel">
                <div class="d-flex justify-space-between align-center mb-4">
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">
                      Masked Credential State
                    </div>
                    <p class="mb-0 text-body-2 text-medium-emphasis">
                      Raw secret values are never returned by the API.
                    </p>
                  </div>
                  <VBtn
                    variant="text"
                    icon="tabler-refresh"
                    :loading="credentialsLoading"
                    @click="loadCredentials"
                  />
                </div>

                <div class="dr-network-table-wrap">
                  <table class="dr-network-table dr-network-table--compact">
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Configured</th>
                        <th>Fingerprint / Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="credential in credentialsRows"
                        :key="credential.key"
                      >
                        <td>{{ credential.key }}</td>
                        <td>
                          <VChip
                            size="small"
                            :color="credential.configured ? 'success' : 'secondary'"
                            variant="tonal"
                          >
                            {{ credential.configured ? 'Configured' : 'Missing' }}
                          </VChip>
                        </td>
                        <td>{{ credential.fingerprint || credential.value || '-' }}</td>
                      </tr>
                      <tr v-if="!credentialsLoading && !credentialsRows.length">
                        <td
                          colspan="3"
                          class="text-center text-medium-emphasis py-6"
                        >
                          No credential metadata returned.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="dr-network-panel">
                <div class="text-subtitle-1 font-weight-bold mb-4">
                  Rotate Credentials
                </div>
                <VRow>
                  <VCol
                    cols="12"
                    md="6"
                  >
                    <VTextField
                      v-model="credentialsForm.auth_token"
                      label="Auth Token"
                      type="password"
                      variant="outlined"
                      hide-details="auto"
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="6"
                  >
                    <VTextField
                      v-model="credentialsForm.secret_token"
                      label="Secret Token"
                      type="password"
                      variant="outlined"
                      hide-details="auto"
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="6"
                  >
                    <VTextField
                      v-model="credentialsForm.tenant"
                      label="Tenant"
                      variant="outlined"
                      hide-details="auto"
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="6"
                  >
                    <VTextField
                      v-model="credentialsForm.api_base_url"
                      label="API Base URL"
                      variant="outlined"
                      hide-details="auto"
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="6"
                  >
                    <VTextField
                      v-model="credentialsForm.webhook_endpoint_token"
                      label="Webhook Endpoint Token"
                      type="password"
                      variant="outlined"
                      hide-details="auto"
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="6"
                    class="d-flex align-center"
                  >
                    <VSwitch
                      v-model="credentialsForm.webhook_signatures_enabled"
                      label="Webhook signatures enabled"
                      color="primary"
                      hide-details
                    />
                  </VCol>
                </VRow>

                <div class="d-flex flex-wrap justify-end gap-3 mt-5">
                  <VBtn
                    variant="tonal"
                    prepend-icon="tabler-plug-connected"
                    :loading="credentialsTesting"
                    @click="testCredentials"
                  >
                    Test Connection
                  </VBtn>
                  <VBtn
                    color="primary"
                    prepend-icon="tabler-device-floppy"
                    :loading="credentialsSaving"
                    @click="saveCredentials"
                  >
                    Save Changed Values
                  </VBtn>
                </div>

                <VAlert
                  v-if="credentialTestResult"
                  type="success"
                  variant="tonal"
                  class="mt-4"
                >
                  Connection OK for {{ credentialTestResult.adapter_key || selectedNetwork?.adapter_key }}.
                  <span v-if="credentialTestResult.base_url">Base URL: {{ credentialTestResult.base_url }}.</span>
                </VAlert>
              </div>
            </div>
          </VWindowItem>

          <VWindowItem value="flows">
            <VAlert
              v-if="flowErrors.length"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              <ul class="mb-0">
                <li
                  v-for="error in flowErrors"
                  :key="error"
                >
                  {{ error }}
                </li>
              </ul>
            </VAlert>

            <div class="d-flex justify-space-between align-center mb-4">
              <div>
                <div class="text-subtitle-1 font-weight-bold">
                  Flow Definitions
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  Async and video behavior is determined by flow key and ordered steps.
                </p>
              </div>
              <VBtn
                color="primary"
                prepend-icon="tabler-plus"
                @click="openCreateFlow"
              >
                Create Flow
              </VBtn>
            </div>

            <VProgressLinear
              v-if="flowsLoading"
              indeterminate
              color="primary"
              rounded
              class="mb-4"
            />

            <div class="dr-network-table-wrap">
              <table class="dr-network-table">
                <thead>
                  <tr>
                    <th>Flow</th>
                    <th>Network Fee</th>
                    <th>Patient Fee</th>
                    <th>Steps</th>
                    <th>Status</th>
                    <th class="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="flow in flows"
                    :key="flow.id"
                  >
                    <td>
                      <div class="font-weight-semibold">
                        {{ flow.name || flow.flow_key }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ flow.flow_key }}
                      </div>
                    </td>
                    <td>{{ normalizeMoney(flow.network_fee_amount) }}</td>
                    <td>{{ normalizeMoney(flow.patient_fee_amount) }}</td>
                    <td>{{ Array.isArray(flow.steps) ? flow.steps.length : 0 }}</td>
                    <td>
                      <VChip
                        size="small"
                        :color="flow.is_active === false ? 'secondary' : 'success'"
                        variant="tonal"
                      >
                        {{ flow.is_active === false ? 'Inactive' : 'Active' }}
                      </VChip>
                    </td>
                    <td>
                      <div class="d-flex justify-end gap-2">
                        <VBtn
                          size="small"
                          variant="text"
                          icon="tabler-list-details"
                          @click="openFlowStepsCoverage(flow)"
                        />
                        <VBtn
                          size="small"
                          variant="text"
                          icon="tabler-circle-check"
                          :loading="flowActionId === `validate-${flow.id}`"
                          @click="validateFlow(flow)"
                        />
                        <VBtn
                          size="small"
                          variant="text"
                          icon="tabler-copy"
                          @click="openCloneFlow(flow)"
                        />
                        <VBtn
                          size="small"
                          variant="text"
                          icon="tabler-pencil"
                          @click="openEditFlow(flow)"
                        />
                        <VBtn
                          size="small"
                          variant="text"
                          color="error"
                          icon="tabler-trash"
                          :loading="flowActionId === `delete-${flow.id}`"
                          @click="removeFlow(flow)"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!flowsLoading && !flows.length">
                    <td
                      colspan="6"
                      class="text-center text-medium-emphasis py-6"
                    >
                      No flows configured.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </VWindowItem>

          <VWindowItem value="state-routing">
            <VAlert
              v-if="mappingErrors.length"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              <ul class="mb-0">
                <li
                  v-for="error in mappingErrors"
                  :key="error"
                >
                  {{ error }}
                </li>
              </ul>
            </VAlert>

            <VAlert
              v-if="coverage"
              :type="coverage.unmapped_count ? 'warning' : 'success'"
              variant="tonal"
              class="mb-4"
            >
              {{ coverage.covered_states }} of {{ coverage.total_states }} states covered.
              <span v-if="coverage.unmapped_count">
                Missing {{ coverage.unmapped_count }}: {{ formatCoverageStates(coverage.unmapped_states) || 'No state details returned' }}.
              </span>
            </VAlert>

            <div class="d-flex justify-space-between align-center mb-4">
              <div>
                <div class="text-subtitle-1 font-weight-bold">
                  State Routing
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  Choose the target flow per state. Video routing is represented by the selected flow.
                </p>
              </div>
              <VBtn
                color="primary"
                prepend-icon="tabler-plus"
                @click="openCreateMapping"
              >
                Add Mapping
              </VBtn>
            </div>

            <VProgressLinear
              v-if="mappingsLoading || coverageLoading"
              indeterminate
              color="primary"
              rounded
              class="mb-4"
            />

            <div class="dr-network-table-wrap">
              <table class="dr-network-table">
                <thead>
                  <tr>
                    <th>State</th>
                    <th>Flow</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th class="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="mapping in stateMappings"
                    :key="mapping.id"
                  >
                    <td>{{ mapping.state?.state_code || mapping.state_code || getStateLabel(mapping.state_id) }}</td>
                    <td>{{ mapping.flow?.flow_key || getFlowLabel(mapping.flow_id) }}</td>
                    <td>{{ mapping.priority }}</td>
                    <td>
                      <VChip
                        size="small"
                        :color="mapping.is_active === false ? 'secondary' : 'success'"
                        variant="tonal"
                      >
                        {{ mapping.is_active === false ? 'Inactive' : 'Active' }}
                      </VChip>
                    </td>
                    <td>
                      <div class="d-flex justify-end gap-2">
                        <VBtn
                          size="small"
                          variant="text"
                          icon="tabler-power"
                          :loading="mappingActionId === `toggle-${mapping.id}`"
                          @click="toggleMapping(mapping)"
                        />
                        <VBtn
                          size="small"
                          variant="text"
                          icon="tabler-pencil"
                          @click="openEditMapping(mapping)"
                        />
                        <VBtn
                          size="small"
                          variant="text"
                          color="error"
                          icon="tabler-trash"
                          :loading="mappingActionId === `delete-${mapping.id}`"
                          @click="removeMapping(mapping)"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!mappingsLoading && !stateMappings.length">
                    <td
                      colspan="5"
                      class="text-center text-medium-emphasis py-6"
                    >
                      No state routing mappings configured.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </VWindowItem>

          <VWindowItem value="product-matrix">
            <VAlert
              v-if="matrixErrors.length"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              <ul class="mb-0">
                <li
                  v-for="error in matrixErrors"
                  :key="error"
                >
                  {{ error }}
                </li>
              </ul>
            </VAlert>

            <div class="d-flex justify-space-between align-center mb-4">
              <div>
                <div class="text-subtitle-1 font-weight-bold">
                  Product Mapping Matrix
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  Products are rows, flows are columns, and each cell controls external service wiring.
                </p>
              </div>
              <VBtn
                variant="tonal"
                prepend-icon="tabler-refresh"
                :loading="matrixLoading"
                @click="loadProductMatrix"
              >
                Refresh
              </VBtn>
            </div>

            <VProgressLinear
              v-if="matrixLoading"
              indeterminate
              color="primary"
              rounded
              class="mb-4"
            />

            <div class="dr-network-table-wrap dr-network-table-wrap--wide">
              <table class="dr-network-table dr-network-matrix">
                <thead>
                  <tr>
                    <th class="dr-network-matrix__product">
                      Product
                    </th>
                    <th
                      v-for="flow in matrix.flows"
                      :key="flow.id || flow.flow_key"
                    >
                      <div class="font-weight-semibold">
                        {{ flow.flow_key }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        Patient fee {{ normalizeMoney(flow.patient_fee_amount) }}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in matrix.rows"
                    :key="row.product_id"
                  >
                    <td class="dr-network-matrix__product">
                      <div class="font-weight-semibold">
                        {{ row.product_name }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ row.product_slug }}
                      </div>
                    </td>
                    <td
                      v-for="flow in matrix.flows"
                      :key="`${row.product_id}-${flow.flow_key}`"
                    >
                      <div
                        v-if="row.cells && row.cells[flow.flow_key]"
                        class="dr-network-matrix-cell"
                      >
                        <div>
                          <VChip
                            size="x-small"
                            :color="row.cells[flow.flow_key].is_active === false ? 'secondary' : 'success'"
                            variant="tonal"
                            class="mb-2"
                          >
                            {{ row.cells[flow.flow_key].is_active === false ? 'Inactive' : 'Mapped' }}
                          </VChip>
                          <div class="text-body-2 font-weight-medium">
                            {{ row.cells[flow.flow_key].external_service_id || '-' }}
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            {{ row.cells[flow.flow_key].external_service_key || '-' }}
                          </div>
                        </div>
                        <div class="d-flex gap-1">
                          <VBtn
                            size="x-small"
                            variant="text"
                            icon="tabler-settings"
                            @click="openProductMappingDetail(row, flow)"
                          />
                          <VBtn
                            size="x-small"
                            variant="text"
                            icon="tabler-pencil"
                            @click="openMatrixCell(row, flow)"
                          />
                          <VBtn
                            size="x-small"
                            variant="text"
                            icon="tabler-power"
                            :loading="matrixActionId === `toggle-${row.cells[flow.flow_key].mapping_id}`"
                            @click="toggleMatrixCell(row.cells[flow.flow_key])"
                          />
                          <VBtn
                            size="x-small"
                            variant="text"
                            color="error"
                            icon="tabler-trash"
                            :loading="matrixActionId === `delete-${row.cells[flow.flow_key].mapping_id}`"
                            @click="removeMatrixCell(row.cells[flow.flow_key])"
                          />
                        </div>
                      </div>
                      <button
                        v-else
                        type="button"
                        class="dr-network-unmapped"
                        @click="openMatrixCell(row, flow)"
                      >
                        <VIcon
                          icon="tabler-plus"
                          size="16"
                        />
                        Unmapped
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!matrixLoading && !matrix.rows.length">
                    <td
                      :colspan="(matrix.flows.length || 0) + 1"
                      class="text-center text-medium-emphasis py-6"
                    >
                      No product mapping matrix returned.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>

    <VCard v-else-if="mainView === 'states'">
      <VCardText class="pa-6">
        <VAlert
          v-if="stateErrors.length"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          <ul class="mb-0">
            <li
              v-for="error in stateErrors"
              :key="error"
            >
              {{ error }}
            </li>
          </ul>
        </VAlert>

        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <div class="text-h6 font-weight-bold">
              States
            </div>
            <p class="mb-0 text-body-2 text-medium-emphasis">
              Master state list used by Dr Network routing.
            </p>
          </div>
          <VBtn
            color="primary"
            prepend-icon="tabler-plus"
            @click="openCreateState"
          >
            Add State
          </VBtn>
        </div>

        <VProgressLinear
          v-if="statesLoading"
          indeterminate
          color="primary"
          rounded
          class="mb-4"
        />

        <div class="dr-network-table-wrap">
          <table class="dr-network-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>State Code</th>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="state in states"
                :key="state.id"
              >
                <td>{{ state.country_code }}</td>
                <td>{{ state.state_code }}</td>
                <td>{{ state.state_name }}</td>
                <td>
                  <VChip
                    size="small"
                    :color="state.is_active === false ? 'secondary' : 'success'"
                    variant="tonal"
                  >
                    {{ state.is_active === false ? 'Inactive' : 'Active' }}
                  </VChip>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCardText>
    </VCard>

    <VCard v-else-if="mainView === 'document-types'">
      <VCardText class="pa-6">
        <VAlert
          v-if="documentTypeErrors.length"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          <ul class="mb-0">
            <li
              v-for="error in documentTypeErrors"
              :key="error"
            >
              {{ error }}
            </li>
          </ul>
        </VAlert>

        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <div class="text-h6 font-weight-bold">
              Document Types
            </div>
            <p class="mb-0 text-body-2 text-medium-emphasis">
              Master document type list used by document rules.
            </p>
          </div>
          <VBtn
            color="primary"
            prepend-icon="tabler-plus"
            @click="openCreateDocumentType"
          >
            Add Document Type
          </VBtn>
        </div>

        <VProgressLinear
          v-if="documentTypesLoading"
          indeterminate
          color="primary"
          rounded
          class="mb-4"
        />

        <div class="dr-network-table-wrap">
          <table class="dr-network-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Name</th>
                <th>Category</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="type in documentTypes"
                :key="type.id || type.key"
              >
                <td>{{ type.key }}</td>
                <td>{{ type.name }}</td>
                <td>{{ type.category }}</td>
                <td>{{ type.description || '-' }}</td>
                <td>
                  <VChip
                    size="small"
                    :color="type.is_active === false ? 'secondary' : 'success'"
                    variant="tonal"
                  >
                    {{ type.is_active === false ? 'Inactive' : 'Active' }}
                  </VChip>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCardText>
    </VCard>

    <VDialog
      v-model="networkDialog"
      max-width="860"
    >
      <VCard>
        <VCardTitle>
          {{ networkDialogMode === 'edit' ? 'Edit Network' : 'Create Network' }}
        </VCardTitle>
        <VCardText>
          <VAlert
            v-if="networkErrors.length"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            <ul class="mb-0">
              <li
                v-for="error in networkErrors"
                :key="error"
              >
                {{ error }}
              </li>
            </ul>
          </VAlert>

          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="networkForm.name"
                label="Name"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="networkForm.slug"
                label="Slug"
                variant="outlined"
                :disabled="networkDialogMode === 'edit'"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="networkForm.adapter_key"
                label="Adapter Key"
                variant="outlined"
                :disabled="networkDialogMode === 'edit'"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VSelect
                v-model="networkForm.integration_mode"
                label="Mode"
                :items="integrationModeOptions"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VSelect
                v-model="networkForm.status"
                label="Status"
                :items="statusOptions"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol cols="12">
              <VSwitch
                v-model="networkForm.is_default"
                label="Default network"
                color="primary"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextarea
                v-model="networkForm.settingsJson"
                label="Settings JSON"
                variant="outlined"
                rows="5"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextarea
                v-model="networkForm.metadataJson"
                label="Metadata JSON"
                variant="outlined"
                rows="5"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextarea
                v-model="networkForm.featureFlagsJson"
                label="Feature Flags JSON"
                variant="outlined"
                rows="5"
                hide-details="auto"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="networkDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="savingNetwork"
            @click="saveNetwork"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="flowDialog"
      max-width="980"
    >
      <VCard>
        <VCardTitle>
          {{ flowDialogMode === 'edit' ? 'Edit Flow' : 'Create Flow' }}
        </VCardTitle>
        <VCardText>
          <VAlert
            v-if="flowErrors.length"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            <ul class="mb-0">
              <li
                v-for="error in flowErrors"
                :key="error"
              >
                {{ error }}
              </li>
            </ul>
          </VAlert>

          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="flowForm.flow_key"
                label="Flow Key"
                variant="outlined"
                :disabled="flowDialogMode === 'edit'"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="flowForm.name"
                label="Name"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="flowForm.description"
                label="Description"
                variant="outlined"
                rows="2"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="flowForm.network_fee_amount"
                label="Network Fee Amount"
                variant="outlined"
                prefix="$"
                hide-details="auto"
                @blur="flowForm.network_fee_amount = normalizeMoney(flowForm.network_fee_amount)"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="flowForm.patient_fee_amount"
                label="Patient Fee Amount"
                variant="outlined"
                prefix="$"
                hide-details="auto"
                @blur="flowForm.patient_fee_amount = normalizeMoney(flowForm.patient_fee_amount)"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
              class="d-flex align-center"
            >
              <VSwitch
                v-model="flowForm.is_active"
                label="Active"
                color="primary"
                hide-details
              />
            </VCol>
          </VRow>

          <div class="d-flex justify-space-between align-center mt-6 mb-3">
            <div class="text-subtitle-1 font-weight-bold">
              Steps
            </div>
            <VBtn
              size="small"
              variant="tonal"
              prepend-icon="tabler-plus"
              @click="addFlowStep"
            >
              Add Step
            </VBtn>
          </div>

          <div
            v-for="(step, index) in flowForm.steps"
            :key="index"
            class="dr-network-step-row"
          >
            <VSelect
              v-model="step.step_key"
              :items="flowStepOptions"
              label="Step"
              variant="outlined"
              hide-details="auto"
            />
            <VTextField
              v-model="step.name"
              label="Name"
              variant="outlined"
              hide-details="auto"
            />
            <VSwitch
              v-model="step.required"
              label="Required"
              color="primary"
              hide-details
            />
            <VBtn
              size="small"
              variant="text"
              icon="tabler-arrow-up"
              :disabled="index === 0"
              @click="moveFlowStep(index, -1)"
            />
            <VBtn
              size="small"
              variant="text"
              icon="tabler-arrow-down"
              :disabled="index === flowForm.steps.length - 1"
              @click="moveFlowStep(index, 1)"
            />
            <VBtn
              size="small"
              variant="text"
              color="error"
              icon="tabler-trash"
              @click="removeFlowStep(index)"
            />
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="flowDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="flowSaving"
            @click="saveFlow"
          >
            Save Flow
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="cloneDialog"
      max-width="560"
    >
      <VCard>
        <VCardTitle>Clone Flow</VCardTitle>
        <VCardText>
          <VTextField
            v-model="cloneForm.flow_key"
            label="New Flow Key"
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VTextField
            v-model="cloneForm.name"
            label="Optional Name"
            variant="outlined"
            hide-details="auto"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="cloneDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="cloneSaving"
            @click="saveFlowClone"
          >
            Clone
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="mappingDialog"
      max-width="620"
    >
      <VCard>
        <VCardTitle>
          {{ mappingDialogMode === 'edit' ? 'Edit State Mapping' : 'Create State Mapping' }}
        </VCardTitle>
        <VCardText>
          <VAlert
            v-if="mappingErrors.length"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            <ul class="mb-0">
              <li
                v-for="error in mappingErrors"
                :key="error"
              >
                {{ error }}
              </li>
            </ul>
          </VAlert>

          <VSelect
            v-model="mappingForm.state_id"
            :items="stateOptions"
            label="State"
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VSelect
            v-model="mappingForm.flow_id"
            :items="flowOptions"
            label="Flow"
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VTextField
            v-model="mappingForm.priority"
            type="number"
            label="Priority"
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VSwitch
            v-model="mappingForm.is_active"
            label="Active"
            color="primary"
            hide-details
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="mappingDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="mappingSaving"
            @click="saveMapping"
          >
            Save Mapping
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="matrixCellDialog"
      max-width="760"
    >
      <VCard>
        <VCardTitle>
          Product Mapping
        </VCardTitle>
        <VCardText>
          <VAlert
            v-if="matrixErrors.length"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            <ul class="mb-0">
              <li
                v-for="error in matrixErrors"
                :key="error"
              >
                {{ error }}
              </li>
            </ul>
          </VAlert>

          <div class="mb-4 text-body-2 text-medium-emphasis">
            {{ matrixContext.row?.product_name }} · {{ matrixContext.flow?.flow_key }}
          </div>

          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="matrixForm.external_service_id"
                label="External Service ID"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="matrixForm.external_service_key"
                label="External Service Key"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol cols="12">
              <VSwitch
                v-model="matrixForm.is_active"
                label="Active"
                color="primary"
                hide-details
              />
            </VCol>
          </VRow>

          <div class="d-flex justify-space-between align-center mt-4 mb-3">
            <div class="text-subtitle-1 font-weight-bold">
              External Config
            </div>
            <VBtnToggle
              v-model="matrixForm.externalConfigMode"
              mandatory
              density="compact"
            >
              <VBtn value="rows">
                Fields
              </VBtn>
              <VBtn value="json">
                JSON
              </VBtn>
            </VBtnToggle>
          </div>

          <template v-if="matrixForm.externalConfigMode === 'rows'">
            <div
              v-for="(row, index) in matrixForm.externalConfigRows"
              :key="index"
              class="dr-network-config-row"
            >
              <VTextField
                v-model="row.key"
                label="Key"
                variant="outlined"
                hide-details="auto"
              />
              <VTextField
                v-model="row.value"
                label="Value"
                variant="outlined"
                hide-details="auto"
              />
              <VBtn
                variant="text"
                color="error"
                icon="tabler-trash"
                @click="removeExternalConfigRow(index)"
              />
            </div>
            <VBtn
              size="small"
              variant="tonal"
              prepend-icon="tabler-plus"
              @click="addExternalConfigRow"
            >
              Add Config Field
            </VBtn>
          </template>

          <VTextarea
            v-else
            v-model="matrixForm.externalConfigJson"
            label="External Config JSON"
            variant="outlined"
            rows="8"
            hide-details="auto"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="matrixCellDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="matrixSaving"
            @click="saveMatrixCell"
          >
            Save Mapping
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="stateDialog"
      max-width="560"
    >
      <VCard>
        <VCardTitle>Add State</VCardTitle>
        <VCardText>
          <VTextField
            v-model="stateForm.country_code"
            label="Country Code"
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VTextField
            v-model="stateForm.state_code"
            label="State Code"
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VTextField
            v-model="stateForm.state_name"
            label="State Name"
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VSwitch
            v-model="stateForm.is_active"
            label="Active"
            color="primary"
            hide-details
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="stateDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="stateSaving"
            @click="saveState"
          >
            Save State
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="documentTypeDialog"
      max-width="640"
    >
      <VCard>
        <VCardTitle>Add Document Type</VCardTitle>
        <VCardText>
          <VTextField
            v-model="documentTypeForm.key"
            label="Key"
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VTextField
            v-model="documentTypeForm.name"
            label="Name"
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VSelect
            v-model="documentTypeForm.category"
            :items="documentTypeCategoryOptions"
            label="Category"
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VTextarea
            v-model="documentTypeForm.description"
            label="Description"
            variant="outlined"
            rows="2"
            class="mb-4"
            hide-details="auto"
          />
          <VTextarea
            v-model="documentTypeForm.metadataJson"
            label="Metadata JSON"
            variant="outlined"
            rows="4"
            class="mb-4"
            hide-details="auto"
          />
          <VSwitch
            v-model="documentTypeForm.is_active"
            label="Active"
            color="primary"
            hide-details
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="documentTypeDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="documentTypeSaving"
            @click="saveDocumentType"
          >
            Save Document Type
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>

<style scoped>
.dr-networks-admin {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dr-network-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.dr-network-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
}

.dr-network-table-wrap {
  overflow: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 10px;
}

.dr-network-table-wrap--wide {
  max-height: 70vh;
}

.dr-network-table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
}

.dr-network-table--compact {
  min-width: 520px;
}

.dr-network-table th,
.dr-network-table td {
  padding: 0.85rem 1rem;
  border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  text-align: start;
  vertical-align: top;
}

.dr-network-table th {
  background: rgba(var(--v-theme-on-surface), 0.03);
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.dr-network-link,
.dr-network-unmapped {
  color: rgb(var(--v-theme-primary));
  font: inherit;
  font-weight: 700;
  text-align: start;
}

.dr-network-panel-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 1rem;
}

.dr-network-panel {
  padding: 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 10px;
}

.dr-network-step-row,
.dr-network-config-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) auto auto auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 10px;
}

.dr-network-step-row + .dr-network-step-row,
.dr-network-config-row + .dr-network-config-row {
  margin-block-start: 0.75rem;
}

.dr-network-config-row {
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1.5fr) auto;
  margin-block-end: 0.75rem;
}

.dr-network-matrix {
  min-width: 1120px;
}

.dr-network-matrix th,
.dr-network-matrix td {
  min-width: 260px;
}

.dr-network-matrix__product {
  position: sticky;
  z-index: 1;
  inset-inline-start: 0;
  min-width: 240px;
  background: rgb(var(--v-theme-surface));
}

.dr-network-matrix th.dr-network-matrix__product {
  z-index: 2;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.dr-network-matrix-cell {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  justify-content: space-between;
}

.dr-network-unmapped {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.4rem 0.6rem;
  border: 1px dashed rgba(var(--v-theme-primary), 0.35);
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.05);
}

@media (max-width: 960px) {
  .dr-network-header,
  .dr-network-panel-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .dr-network-header__actions {
    justify-content: flex-start;
  }

  .dr-network-step-row,
  .dr-network-config-row {
    grid-template-columns: 1fr;
  }
}
</style>
