<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  DR_NETWORK_DOCUMENT_OPERATORS,
  DR_NETWORK_DOCUMENT_REQUIREMENT_TYPES,
  createDrNetworkDocumentRule,
  createDrNetworkProductMapping,
  createDrNetworkQuestionSet,
  deleteDrNetworkDocumentRule,
  extractAdminDrNetworkErrors,
  fetchDrNetwork,
  fetchDrNetworkFlowContentCoverage,
  fetchDrNetworkProductMappingsMatrix,
  listDrNetworkDocumentRules,
  listDrNetworkDocumentTypes,
  listDrNetworkFlows,
  listDrNetworkProductMappings,
  listDrNetworkQuestionSets,
  normalizeAdminDrNetworkRows,
  previewDrNetworkDocumentRule,
  toggleDrNetworkProductMapping,
  unwrapAdminDrNetworkResponse,
  updateDrNetworkDocumentRule,
  updateDrNetworkProductMapping,
} from '@/api/adminDrNetworksApi'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const networkId = computed(() => route.params.networkId)
const productId = computed(() => route.params.productId)
const flowId = computed(() => route.params.flowId)

const activeTab = ref('service')
const loading = ref(false)
const serviceSaving = ref(false)
const questionSetSaving = ref(false)
const documentRuleSaving = ref(false)
const documentPreviewLoading = ref(false)
const errors = ref([])
const network = ref(null)
const flow = ref(null)
const product = ref(null)
const mapping = ref(null)
const flows = ref([])
const questionSets = ref([])
const documentRules = ref([])
const documentTypes = ref([])
const coverage = ref(null)

const questionSetDialog = ref(false)
const documentRuleDialog = ref(false)
const documentRuleMode = ref('create')
const documentPreviewDialog = ref(false)
const previewRule = ref(null)
const previewUploadedDocumentIds = ref([])
const previewResult = ref(null)

const serviceForm = reactive({
  mapping_id: '',
  external_service_id: '',
  external_service_key: '',
  externalConfigMode: 'rows',
  externalConfigRows: [],
  externalConfigJson: '{}',
  is_active: true,
})

const questionSetForm = reactive({
  flow_id: '',
  product_id: '',
  product_code: '',
  state_code: '*',
  set_key: '',
  set_name: '',
  metadataJson: '{}',
})

const documentRuleForm = reactive({
  id: '',
  flow_key: '',
  state_code: '',
  product_code: '',
  rule_key: '',
  rule_name: '',
  priority: 1,
  requirement_type: 'identity',
  operator: 'any',
  document_ids: [],
  is_required: true,
  conditionsJson: '[]',
  error_message: '',
  help_text: '',
  is_active: true,
})

const documentTypeOptions = computed(() => documentTypes.value.map(type => ({
  title: `${type.name || type.key} (${type.key})`,
  value: type.id,
})))

const questionCoverage = computed(() => coverage.value?.steps?.intake_questions || null)
const documentCoverage = computed(() => coverage.value?.steps?.document_upload || null)
const productTitle = computed(() => product.value?.product_name || product.value?.name || product.value?.product_slug || 'Product')
const flowTitle = computed(() => flow.value?.name || flow.value?.flow_key || 'Flow')
const flowKey = computed(() => flow.value?.flow_key || mapping.value?.flow?.flow_key || '')
const productSlug = computed(() => product.value?.product_slug || product.value?.slug || mapping.value?.product?.slug || '')
const hasQuestionSets = computed(() => questionSets.value.length > 0)

const showErrors = error => {
  errors.value = extractAdminDrNetworkErrors(error)
  toast.error(errors.value[0])
}

const parseJsonField = (value, fallback) => {
  const raw = String(value || '').trim()
  if (!raw) return fallback

  return JSON.parse(raw)
}

const prettyJson = value => JSON.stringify(value && typeof value === 'object' ? value : {}, null, 2)

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

const normalizeMapping = item => item?.mapping || item

const applyServiceMapping = item => {
  const current = normalizeMapping(item) || {}
  mapping.value = current?.id || current?.mapping_id ? current : null

  const externalConfig = current?.external_config && typeof current.external_config === 'object'
    ? current.external_config
    : {}

  Object.assign(serviceForm, {
    mapping_id: current?.id || current?.mapping_id || '',
    external_service_id: current?.external_service_id || '',
    external_service_key: current?.external_service_key || '',
    externalConfigMode: 'rows',
    externalConfigRows: configObjectToRows(externalConfig),
    externalConfigJson: prettyJson(externalConfig),
    is_active: current?.is_active !== false,
  })
}

const resolveContextFromMatrix = matrix => {
  const rows = Array.isArray(matrix?.rows) ? matrix.rows : []
  const foundProduct = rows.find(row => String(row.product_id) === String(productId.value))
  if (foundProduct)
    product.value = foundProduct

  const foundFlow = (Array.isArray(matrix?.flows) ? matrix.flows : []).find(item => String(item.id) === String(flowId.value))
  if (foundFlow)
    flow.value = foundFlow

  const cell = foundProduct?.cells?.[foundFlow?.flow_key]
  if (cell)
    applyServiceMapping({ ...cell, id: cell.mapping_id })
}

const loadDetail = async () => {
  loading.value = true
  errors.value = []

  try {
    const [
      networkResponse,
      flowsResponse,
      matrixResponse,
      mappingsResponse,
      questionSetsResponse,
      documentTypesResponse,
    ] = await Promise.all([
      fetchDrNetwork(networkId.value),
      listDrNetworkFlows(networkId.value),
      fetchDrNetworkProductMappingsMatrix(networkId.value),
      listDrNetworkProductMappings(networkId.value, {
        product_id: productId.value,
        flow_id: flowId.value,
        per_page: 10,
      }),
      listDrNetworkQuestionSets(networkId.value, {
        flow_id: flowId.value,
        product_id: productId.value,
        per_page: 50,
      }),
      listDrNetworkDocumentTypes({ per_page: 100 }),
    ])

    network.value = unwrapAdminDrNetworkResponse(networkResponse)
    flows.value = normalizeAdminDrNetworkRows(flowsResponse)
    flow.value = flows.value.find(item => String(item.id) === String(flowId.value)) || flow.value

    resolveContextFromMatrix(unwrapAdminDrNetworkResponse(matrixResponse))

    const mappings = normalizeAdminDrNetworkRows(mappingsResponse)
    if (mappings[0])
      applyServiceMapping(mappings[0])

    questionSets.value = normalizeAdminDrNetworkRows(questionSetsResponse)
    documentTypes.value = normalizeAdminDrNetworkRows(documentTypesResponse)

    if (flowKey.value && productSlug.value)
      await loadDocumentRules()

    await loadCoverage()
  } catch (error) {
    showErrors(error)
  } finally {
    loading.value = false
  }
}

const loadCoverage = async () => {
  try {
    const body = await fetchDrNetworkFlowContentCoverage(networkId.value, flowId.value)
    coverage.value = unwrapAdminDrNetworkResponse(body)
  } catch {
    coverage.value = null
  }
}

const loadQuestionSets = async () => {
  const body = await listDrNetworkQuestionSets(networkId.value, {
    flow_id: flowId.value,
    product_id: productId.value,
    per_page: 50,
  })

  questionSets.value = normalizeAdminDrNetworkRows(body)
}

const loadDocumentRules = async () => {
  const body = await listDrNetworkDocumentRules(networkId.value, {
    flow_key: flowKey.value,
    product_code: productSlug.value,
    per_page: 100,
  })

  documentRules.value = normalizeAdminDrNetworkRows(body)
}

const addExternalConfigRow = () => {
  serviceForm.externalConfigRows.push({ key: '', value: '' })
}

const removeExternalConfigRow = index => {
  serviceForm.externalConfigRows.splice(index, 1)
}

const buildServicePayload = () => ({
  product_id: productId.value,
  flow_id: flowId.value,
  external_service_id: serviceForm.external_service_id,
  external_service_key: serviceForm.external_service_key,
  external_config: serviceForm.externalConfigMode === 'json'
    ? parseJsonField(serviceForm.externalConfigJson, {})
    : configRowsToObject(serviceForm.externalConfigRows),
  is_active: !!serviceForm.is_active,
})

const saveServiceMapping = async () => {
  serviceSaving.value = true
  errors.value = []

  try {
    if (serviceForm.mapping_id)
      await updateDrNetworkProductMapping(serviceForm.mapping_id, buildServicePayload())
    else
      await createDrNetworkProductMapping(networkId.value, buildServicePayload())

    toast.success('Service mapping saved.')
    await loadDetail()
  } catch (error) {
    showErrors(error)
  } finally {
    serviceSaving.value = false
  }
}

const toggleServiceMapping = async () => {
  if (!serviceForm.mapping_id) return
  serviceSaving.value = true

  try {
    await toggleDrNetworkProductMapping(serviceForm.mapping_id)
    toast.success('Service mapping toggled.')
    await loadDetail()
  } catch (error) {
    showErrors(error)
  } finally {
    serviceSaving.value = false
  }
}

const openCreateQuestionSet = () => {
  const slug = productSlug.value
  Object.assign(questionSetForm, {
    flow_id: flowId.value,
    product_id: productId.value,
    product_code: slug,
    state_code: '*',
    set_key: `${network.value?.slug || 'network'}_${slug || 'product'}_${flowKey.value || 'flow'}`.replace(/[^a-zA-Z0-9_-]+/g, '_').toLowerCase(),
    set_name: `${productTitle.value} ${flowTitle.value}`,
    metadataJson: '{}',
  })
  questionSetDialog.value = true
}

const createQuestionSet = async () => {
  questionSetSaving.value = true
  errors.value = []

  try {
    const body = await createDrNetworkQuestionSet(networkId.value, {
      flow_id: questionSetForm.flow_id,
      product_id: questionSetForm.product_id,
      product_code: questionSetForm.product_code,
      state_code: questionSetForm.state_code || '*',
      set_key: questionSetForm.set_key,
      set_name: questionSetForm.set_name,
      metadata: parseJsonField(questionSetForm.metadataJson, {}),
    })

    const created = unwrapAdminDrNetworkResponse(body)
    toast.success('Question set created.')
    questionSetDialog.value = false
    await loadQuestionSets()

    if (created?.id)
      router.push(`/admin/dr-networks/${networkId.value}/question-sets/${created.id}`)
  } catch (error) {
    showErrors(error)
  } finally {
    questionSetSaving.value = false
  }
}

const openQuestionSet = set => {
  if (!set?.id) return
  router.push(`/admin/dr-networks/${networkId.value}/question-sets/${set.id}`)
}

const resetDocumentRuleForm = () => {
  Object.assign(documentRuleForm, {
    id: '',
    flow_key: flowKey.value,
    state_code: '',
    product_code: productSlug.value,
    rule_key: '',
    rule_name: '',
    priority: 1,
    requirement_type: 'identity',
    operator: 'any',
    document_ids: [],
    is_required: true,
    conditionsJson: '[]',
    error_message: '',
    help_text: '',
    is_active: true,
  })
}

const openCreateDocumentRule = () => {
  resetDocumentRuleForm()
  documentRuleMode.value = 'create'
  documentRuleDialog.value = true
}

const openEditDocumentRule = rule => {
  resetDocumentRuleForm()
  documentRuleMode.value = 'edit'
  Object.assign(documentRuleForm, {
    id: rule?.id || '',
    flow_key: rule?.flow_key || flowKey.value,
    state_code: rule?.state_code || '',
    product_code: rule?.product_code || productSlug.value,
    rule_key: rule?.rule_key || '',
    rule_name: rule?.rule_name || '',
    priority: rule?.priority ?? 1,
    requirement_type: rule?.requirement_type || 'identity',
    operator: rule?.operator || 'any',
    document_ids: Array.isArray(rule?.document_ids) ? rule.document_ids : [],
    is_required: rule?.is_required !== false,
    conditionsJson: prettyJson(Array.isArray(rule?.conditions) ? rule.conditions : []),
    error_message: rule?.error_message || '',
    help_text: rule?.help_text || '',
    is_active: rule?.is_active !== false,
  })
  documentRuleDialog.value = true
}

const buildDocumentRulePayload = () => ({
  flow_key: documentRuleForm.flow_key,
  state_code: documentRuleForm.state_code || null,
  product_code: documentRuleForm.product_code || null,
  rule_key: documentRuleForm.rule_key,
  rule_name: documentRuleForm.rule_name,
  priority: Number(documentRuleForm.priority || 1),
  requirement_type: documentRuleForm.requirement_type,
  operator: documentRuleForm.operator,
  document_ids: documentRuleForm.document_ids,
  is_required: !!documentRuleForm.is_required,
  conditions: parseJsonField(documentRuleForm.conditionsJson, []),
  error_message: documentRuleForm.error_message,
  help_text: documentRuleForm.help_text,
  is_active: !!documentRuleForm.is_active,
})

const saveDocumentRule = async () => {
  documentRuleSaving.value = true
  errors.value = []

  try {
    if (documentRuleMode.value === 'edit')
      await updateDrNetworkDocumentRule(documentRuleForm.id, buildDocumentRulePayload())
    else
      await createDrNetworkDocumentRule(networkId.value, buildDocumentRulePayload())

    toast.success(documentRuleMode.value === 'edit' ? 'Document rule updated.' : 'Document rule created.')
    documentRuleDialog.value = false
    await loadDocumentRules()
    await loadCoverage()
  } catch (error) {
    showErrors(error)
  } finally {
    documentRuleSaving.value = false
  }
}

const removeDocumentRule = async rule => {
  if (!rule?.id) return
  if (!window.confirm(`Deactivate document rule "${rule.rule_key || rule.rule_name}"?`)) return

  try {
    await deleteDrNetworkDocumentRule(rule.id)
    toast.success('Document rule deactivated.')
    await loadDocumentRules()
    await loadCoverage()
  } catch (error) {
    showErrors(error)
  }
}

const openDocumentPreview = rule => {
  previewRule.value = rule
  previewUploadedDocumentIds.value = []
  previewResult.value = null
  documentPreviewDialog.value = true
}

const runDocumentPreview = async () => {
  if (!previewRule.value?.id) return
  documentPreviewLoading.value = true

  try {
    const body = await previewDrNetworkDocumentRule(previewRule.value.id, {
      uploaded_document_type_ids: previewUploadedDocumentIds.value,
    })

    previewResult.value = unwrapAdminDrNetworkResponse(body)
  } catch (error) {
    showErrors(error)
  } finally {
    documentPreviewLoading.value = false
  }
}

const getDocumentNames = ids => {
  const list = Array.isArray(ids) ? ids : []

  return list
    .map(id => documentTypes.value.find(type => String(type.id) === String(id))?.name || id)
    .join(', ')
}

onMounted(loadDetail)
</script>

<template>
  <section class="product-mapping-detail">
    <div class="detail-header">
      <div>
        <VBtn
          variant="text"
          prepend-icon="tabler-arrow-left"
          class="mb-2"
          @click="router.push('/admin/dr-networks')"
        >
          Dr Networks
        </VBtn>
        <div class="text-h5 font-weight-bold">
          {{ productTitle }}
        </div>
        <p class="mb-0 text-body-2 text-medium-emphasis">
          {{ network?.name || 'Network' }} · {{ flowTitle }} · {{ flowKey }}
        </p>
      </div>
      <VBtn
        variant="tonal"
        prepend-icon="tabler-route"
        @click="router.push(`/admin/dr-networks/${networkId}/flows/${flowId}/steps`)"
      >
        Flow Coverage
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

    <VProgressLinear
      v-if="loading"
      indeterminate
      color="primary"
      rounded
      class="mb-4"
    />

    <VTabs
      v-model="activeTab"
      class="v-tabs-pill mb-6"
    >
      <VTab value="service">
        Service Mapping
      </VTab>
      <VTab value="questions">
        Questions
      </VTab>
      <VTab value="documents">
        Documents
      </VTab>
    </VTabs>

    <VWindow
      v-model="activeTab"
      :touch="false"
    >
      <VWindowItem value="service">
        <VCard>
          <VCardText class="pa-6">
            <div class="d-flex justify-space-between align-center mb-5">
              <div>
                <div class="text-h6 font-weight-bold">
                  Service Mapping
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  External service information used when this product enters the selected network flow.
                </p>
              </div>
              <VChip
                :color="serviceForm.mapping_id ? 'success' : 'warning'"
                variant="tonal"
              >
                {{ serviceForm.mapping_id ? 'Mapped' : 'Unmapped' }}
              </VChip>
            </div>

            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="serviceForm.external_service_id"
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
                  v-model="serviceForm.external_service_key"
                  label="External Service Key"
                  variant="outlined"
                  hide-details="auto"
                />
              </VCol>
              <VCol cols="12">
                <VSwitch
                  v-model="serviceForm.is_active"
                  label="Active"
                  color="primary"
                  hide-details
                />
              </VCol>
            </VRow>

            <div class="d-flex justify-space-between align-center mt-5 mb-3">
              <div class="text-subtitle-1 font-weight-bold">
                External Config
              </div>
              <VBtnToggle
                v-model="serviceForm.externalConfigMode"
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

            <template v-if="serviceForm.externalConfigMode === 'rows'">
              <div
                v-for="(row, index) in serviceForm.externalConfigRows"
                :key="index"
                class="config-row"
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
              v-model="serviceForm.externalConfigJson"
              label="External Config JSON"
              variant="outlined"
              rows="8"
              hide-details="auto"
            />

            <div class="d-flex justify-end gap-3 mt-6">
              <VBtn
                v-if="serviceForm.mapping_id"
                variant="tonal"
                prepend-icon="tabler-power"
                :loading="serviceSaving"
                @click="toggleServiceMapping"
              >
                Toggle Active
              </VBtn>
              <VBtn
                color="primary"
                prepend-icon="tabler-device-floppy"
                :loading="serviceSaving"
                @click="saveServiceMapping"
              >
                Save Mapping
              </VBtn>
            </div>
          </VCardText>
        </VCard>
      </VWindowItem>

      <VWindowItem value="questions">
        <VCard>
          <VCardText class="pa-6">
            <div class="d-flex justify-space-between align-center mb-5">
              <div>
                <div class="text-h6 font-weight-bold">
                  Product-Specific Question Sets
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  Runtime resolves published sets by network, flow, product, and state.
                </p>
              </div>
              <VBtn
                color="primary"
                prepend-icon="tabler-plus"
                @click="openCreateQuestionSet"
              >
                Create Question Set
              </VBtn>
            </div>

            <VAlert
              v-if="!hasQuestionSets"
              :type="questionCoverage?.has_default_set ? 'info' : 'warning'"
              variant="tonal"
              class="mb-4"
            >
              No product-specific question set exists.
              <span v-if="questionCoverage?.has_default_set">This product can use the flow default if coverage marks it as using_default.</span>
              <span v-else>No all-state flow default was reported by coverage.</span>
            </VAlert>

            <div class="detail-table-wrap">
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Product Code</th>
                    <th>State</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th class="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="set in questionSets"
                    :key="set.id"
                  >
                    <td>
                      <div class="font-weight-semibold">
                        {{ set.set_name || set.name || set.set_key }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ set.set_key }}
                      </div>
                    </td>
                    <td>{{ set.product_code || '-' }}</td>
                    <td>{{ set.state_code || '*' }}</td>
                    <td>
                      <VChip
                        size="small"
                        :color="set.status === 'published' ? 'success' : set.status === 'draft' ? 'warning' : 'secondary'"
                        variant="tonal"
                      >
                        {{ set.status || 'draft' }}
                      </VChip>
                    </td>
                    <td>{{ set.config_version || set.version || '-' }}</td>
                    <td>
                      <div class="d-flex justify-end gap-2">
                        <VBtn
                          size="small"
                          variant="text"
                          icon="tabler-list-details"
                          @click="openQuestionSet(set)"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!questionSets.length">
                    <td
                      colspan="6"
                      class="text-center text-medium-emphasis py-6"
                    >
                      No product-specific question sets.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </VCardText>
        </VCard>
      </VWindowItem>

      <VWindowItem value="documents">
        <VCard>
          <VCardText class="pa-6">
            <div class="d-flex justify-space-between align-center mb-5">
              <div>
                <div class="text-h6 font-weight-bold">
                  Product-Specific Document Rules
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  Document rules use flow key and product slug. Add state code only for state-specific requirements.
                </p>
              </div>
              <VBtn
                color="primary"
                prepend-icon="tabler-plus"
                @click="openCreateDocumentRule"
              >
                Add Rule
              </VBtn>
            </div>

            <VAlert
              v-if="!documentRules.length"
              :type="documentCoverage?.has_default_rules || documentCoverage?.has_default_set ? 'info' : 'warning'"
              variant="tonal"
              class="mb-4"
            >
              No product-specific document rules exist.
              <span v-if="documentCoverage?.has_default_rules || documentCoverage?.has_default_set">This product can use the flow default rules if coverage marks it as using_default.</span>
              <span v-else>No all-state flow default document rules were reported by coverage.</span>
            </VAlert>

            <div class="detail-table-wrap">
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>State</th>
                    <th>Requirement</th>
                    <th>Operator</th>
                    <th>Documents</th>
                    <th>Status</th>
                    <th class="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="rule in documentRules"
                    :key="rule.id"
                  >
                    <td>
                      <div class="font-weight-semibold">
                        {{ rule.rule_name || rule.rule_key }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ rule.rule_key }}
                      </div>
                    </td>
                    <td>{{ rule.state_code || 'All' }}</td>
                    <td>{{ rule.requirement_type }}</td>
                    <td>{{ rule.operator }}</td>
                    <td>{{ getDocumentNames(rule.document_ids) || '-' }}</td>
                    <td>
                      <VChip
                        size="small"
                        :color="rule.is_active === false ? 'secondary' : 'success'"
                        variant="tonal"
                      >
                        {{ rule.is_active === false ? 'Inactive' : 'Active' }}
                      </VChip>
                    </td>
                    <td>
                      <div class="d-flex justify-end gap-2">
                        <VBtn
                          size="small"
                          variant="text"
                          icon="tabler-player-play"
                          @click="openDocumentPreview(rule)"
                        />
                        <VBtn
                          size="small"
                          variant="text"
                          icon="tabler-pencil"
                          @click="openEditDocumentRule(rule)"
                        />
                        <VBtn
                          size="small"
                          variant="text"
                          color="error"
                          icon="tabler-trash"
                          @click="removeDocumentRule(rule)"
                        />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!documentRules.length">
                    <td
                      colspan="7"
                      class="text-center text-medium-emphasis py-6"
                    >
                      No product-specific document rules.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </VCardText>
        </VCard>
      </VWindowItem>
    </VWindow>

    <VDialog
      v-model="questionSetDialog"
      max-width="720"
    >
      <VCard>
        <VCardTitle>Create Question Set</VCardTitle>
        <VCardText>
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="questionSetForm.set_key"
                label="Set Key"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="questionSetForm.set_name"
                label="Set Name"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="questionSetForm.state_code"
                label="State Code"
                hint="Use * for all-state coverage."
                persistent-hint
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="questionSetForm.metadataJson"
                label="Metadata JSON"
                variant="outlined"
                rows="4"
                hide-details="auto"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="questionSetDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="questionSetSaving"
            @click="createQuestionSet"
          >
            Create
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="documentRuleDialog"
      max-width="860"
    >
      <VCard>
        <VCardTitle>
          {{ documentRuleMode === 'edit' ? 'Edit Document Rule' : 'Create Document Rule' }}
        </VCardTitle>
        <VCardText>
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="documentRuleForm.rule_key"
                label="Rule Key"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="documentRuleForm.rule_name"
                label="Rule Name"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="documentRuleForm.state_code"
                label="State Code"
                hint="Leave blank for all states."
                persistent-hint
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VSelect
                v-model="documentRuleForm.requirement_type"
                :items="DR_NETWORK_DOCUMENT_REQUIREMENT_TYPES"
                label="Requirement Type"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VSelect
                v-model="documentRuleForm.operator"
                :items="DR_NETWORK_DOCUMENT_OPERATORS"
                label="Operator"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="documentRuleForm.priority"
                label="Priority"
                type="number"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="8"
            >
              <VSelect
                v-model="documentRuleForm.document_ids"
                :items="documentTypeOptions"
                label="Document Types"
                multiple
                chips
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSwitch
                v-model="documentRuleForm.is_required"
                label="Required"
                color="primary"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSwitch
                v-model="documentRuleForm.is_active"
                label="Active"
                color="primary"
                hide-details
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="documentRuleForm.error_message"
                label="Error Message"
                variant="outlined"
                rows="2"
                hide-details="auto"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="documentRuleForm.help_text"
                label="Help Text"
                variant="outlined"
                rows="2"
                hide-details="auto"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="documentRuleForm.conditionsJson"
                label="Conditions JSON"
                variant="outlined"
                rows="4"
                hide-details="auto"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="documentRuleDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="documentRuleSaving"
            @click="saveDocumentRule"
          >
            Save Rule
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="documentPreviewDialog"
      max-width="640"
    >
      <VCard>
        <VCardTitle>Preview Document Rule</VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis">
            Select uploaded document types and run the same preview endpoint the admin API exposes.
          </p>
          <VSelect
            v-model="previewUploadedDocumentIds"
            :items="documentTypeOptions"
            label="Uploaded Document Types"
            multiple
            chips
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VBtn
            color="primary"
            prepend-icon="tabler-player-play"
            :loading="documentPreviewLoading"
            @click="runDocumentPreview"
          >
            Run Preview
          </VBtn>
          <VAlert
            v-if="previewResult"
            type="info"
            variant="tonal"
            class="mt-4"
          >
            <pre class="preview-json">{{ JSON.stringify(previewResult, null, 2) }}</pre>
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="documentPreviewDialog = false"
          >
            Close
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>

<style scoped>
.product-mapping-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.config-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1.5fr) auto;
  gap: 0.75rem;
  align-items: center;
  margin-block-end: 0.75rem;
}

.detail-table-wrap {
  overflow: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
}

.detail-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}

.detail-table th,
.detail-table td {
  padding: 0.85rem 1rem;
  border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  text-align: start;
  vertical-align: top;
}

.detail-table th {
  background: rgba(var(--v-theme-on-surface), 0.03);
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.preview-json {
  margin: 0;
  white-space: pre-wrap;
}

@media (max-width: 960px) {
  .detail-header,
  .config-row {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>

