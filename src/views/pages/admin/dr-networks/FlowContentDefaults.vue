<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  DR_NETWORK_DOCUMENT_OPERATORS,
  DR_NETWORK_DOCUMENT_REQUIREMENT_TYPES,
  createDrNetworkDocumentRule,
  createDrNetworkQuestionSet,
  deleteDrNetworkDocumentRule,
  extractAdminDrNetworkErrors,
  fetchDrNetwork,
  fetchDrNetworkFlowContentCoverage,
  listDrNetworkDocumentRules,
  listDrNetworkDocumentTypes,
  listDrNetworkFlows,
  listDrNetworkQuestionSets,
  normalizeAdminDrNetworkRows,
  previewDrNetworkDocumentRule,
  unwrapAdminDrNetworkResponse,
  updateDrNetworkDocumentRule,
} from '@/api/adminDrNetworksApi'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const networkId = computed(() => route.params.networkId)
const flowId = computed(() => route.params.flowId)

const activeTab = ref(route.query.tab === 'documents' ? 'documents' : 'questions')
const loading = ref(false)
const questionSetSaving = ref(false)
const documentRuleSaving = ref(false)
const previewLoading = ref(false)
const errors = ref([])
const network = ref(null)
const flow = ref(null)
const coverage = ref(null)
const questionSets = ref([])
const documentRules = ref([])
const documentTypes = ref([])
const questionSetDialog = ref(false)
const documentRuleDialog = ref(false)
const documentRuleMode = ref('create')
const previewDialog = ref(false)
const previewRule = ref(null)
const previewUploadedDocumentIds = ref([])
const previewResult = ref(null)

const questionSetForm = reactive({
  flow_id: '',
  product_code: '*',
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

const flowKey = computed(() => flow.value?.flow_key || coverage.value?.flow?.flow_key || '')
const flowTitle = computed(() => flow.value?.name || flow.value?.flow_key || 'Flow Defaults')
const questionCoverage = computed(() => coverage.value?.steps?.intake_questions || null)
const documentCoverage = computed(() => coverage.value?.steps?.document_upload || null)
const defaultDocumentRules = computed(() => documentRules.value.filter(rule => !rule.product_code))
const documentTypeOptions = computed(() => documentTypes.value.map(type => ({
  title: `${type.name || type.key} (${type.key})`,
  value: type.id,
})))

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

const loadDefaults = async () => {
  loading.value = true
  errors.value = []

  try {
    const [
      networkResponse,
      flowsResponse,
      coverageResponse,
      questionSetsResponse,
      documentTypesResponse,
    ] = await Promise.all([
      fetchDrNetwork(networkId.value),
      listDrNetworkFlows(networkId.value),
      fetchDrNetworkFlowContentCoverage(networkId.value, flowId.value),
      listDrNetworkQuestionSets(networkId.value, {
        flow_id: flowId.value,
        product_code: '*',
        per_page: 50,
      }),
      listDrNetworkDocumentTypes({ per_page: 100 }),
    ])

    network.value = unwrapAdminDrNetworkResponse(networkResponse)
    flow.value = normalizeAdminDrNetworkRows(flowsResponse).find(item => String(item.id) === String(flowId.value)) || null
    coverage.value = unwrapAdminDrNetworkResponse(coverageResponse)
    if (!flow.value && coverage.value?.flow)
      flow.value = coverage.value.flow

    questionSets.value = normalizeAdminDrNetworkRows(questionSetsResponse).filter(set => !set.product_code || set.product_code === '*')
    documentTypes.value = normalizeAdminDrNetworkRows(documentTypesResponse)

    if (flowKey.value)
      await loadDocumentRules()
  } catch (error) {
    showErrors(error)
  } finally {
    loading.value = false
  }
}

const loadQuestionSets = async () => {
  const body = await listDrNetworkQuestionSets(networkId.value, {
    flow_id: flowId.value,
    product_code: '*',
    per_page: 50,
  })

  questionSets.value = normalizeAdminDrNetworkRows(body).filter(set => !set.product_code || set.product_code === '*')
}

const loadDocumentRules = async () => {
  const body = await listDrNetworkDocumentRules(networkId.value, {
    flow_key: flowKey.value,
    per_page: 100,
  })

  documentRules.value = normalizeAdminDrNetworkRows(body)
}

const openCreateQuestionSet = () => {
  const baseKey = `${network.value?.slug || 'network'}_${flowKey.value || 'flow'}_default_questions`

  Object.assign(questionSetForm, {
    flow_id: flowId.value,
    product_code: '*',
    state_code: '*',
    set_key: baseKey.replace(/[^a-zA-Z0-9_-]+/g, '_').toLowerCase(),
    set_name: `${flowTitle.value} Default Questions`,
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
      product_code: questionSetForm.product_code || '*',
      state_code: questionSetForm.state_code || '*',
      set_key: questionSetForm.set_key,
      set_name: questionSetForm.set_name,
      metadata: parseJsonField(questionSetForm.metadataJson, {}),
    })

    const created = unwrapAdminDrNetworkResponse(body)
    toast.success('Default question set created.')
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
    product_code: '',
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
  product_code: null,
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

    toast.success(documentRuleMode.value === 'edit' ? 'Default document rule updated.' : 'Default document rule created.')
    documentRuleDialog.value = false
    await loadDocumentRules()
  } catch (error) {
    showErrors(error)
  } finally {
    documentRuleSaving.value = false
  }
}

const removeDocumentRule = async rule => {
  if (!rule?.id) return
  if (!window.confirm(`Deactivate default document rule "${rule.rule_key || rule.rule_name}"?`)) return

  try {
    await deleteDrNetworkDocumentRule(rule.id)
    toast.success('Default document rule deactivated.')
    await loadDocumentRules()
  } catch (error) {
    showErrors(error)
  }
}

const getDocumentNames = ids => {
  const list = Array.isArray(ids) ? ids : []

  return list
    .map(id => documentTypes.value.find(type => String(type.id) === String(id))?.name || id)
    .join(', ')
}

const openPreview = rule => {
  previewRule.value = rule
  previewUploadedDocumentIds.value = []
  previewResult.value = null
  previewDialog.value = true
}

const runPreview = async () => {
  if (!previewRule.value?.id) return
  previewLoading.value = true

  try {
    const body = await previewDrNetworkDocumentRule(previewRule.value.id, {
      uploaded_document_type_ids: previewUploadedDocumentIds.value,
    })

    previewResult.value = unwrapAdminDrNetworkResponse(body)
  } catch (error) {
    showErrors(error)
  } finally {
    previewLoading.value = false
  }
}

onMounted(loadDefaults)
</script>

<template>
  <section class="flow-defaults-page">
    <div class="defaults-header">
      <div>
        <VBtn
          variant="text"
          prepend-icon="tabler-arrow-left"
          class="mb-2"
          @click="router.push(`/admin/dr-networks/${networkId}/flows/${flowId}/steps`)"
        >
          Flow Coverage
        </VBtn>
        <div class="text-h5 font-weight-bold">
          {{ flowTitle }} Defaults
        </div>
        <p class="mb-0 text-body-2 text-medium-emphasis">
          {{ network?.name || 'Network' }} · fallback content used when no product-specific override exists.
        </p>
      </div>
      <VBtn
        variant="tonal"
        prepend-icon="tabler-refresh"
        :loading="loading"
        @click="loadDefaults"
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
      <VTab value="questions">
        Default Questions
      </VTab>
      <VTab value="documents">
        Default Documents
      </VTab>
    </VTabs>

    <VWindow
      v-model="activeTab"
      :touch="false"
    >
      <VWindowItem value="questions">
        <VCard>
          <VCardText class="pa-6">
            <div class="d-flex justify-space-between align-center mb-5">
              <div>
                <div class="text-h6 font-weight-bold">
                  Flow Default Question Sets
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  Use `product_code: *` and `state_code: *` for the all-state fallback. State-specific defaults do not count as global fallback coverage.
                </p>
              </div>
              <VBtn
                color="primary"
                prepend-icon="tabler-plus"
                @click="openCreateQuestionSet"
              >
                Create Default Set
              </VBtn>
            </div>

            <VAlert
              :type="questionCoverage?.has_default_set ? 'success' : 'warning'"
              variant="tonal"
              class="mb-4"
            >
              {{ questionCoverage?.has_default_set ? `${questionCoverage.default_set_count || 0} all-state default set(s) found.` : 'No all-state default question set found.' }}
              <span v-if="questionCoverage?.state_specific_default_set_count">
                {{ questionCoverage.state_specific_default_set_count }} state-specific default set(s) exist.
              </span>
            </VAlert>

            <div class="defaults-table-wrap">
              <table class="defaults-table">
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Product Code</th>
                    <th>State</th>
                    <th>Status</th>
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
                    <td>{{ set.product_code || '*' }}</td>
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
                      colspan="5"
                      class="text-center text-medium-emphasis py-6"
                    >
                      No default question sets returned.
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
                  Flow Default Document Rules
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  These rules use `product_code: null`; add a state code only for state-specific default requirements.
                </p>
              </div>
              <VBtn
                color="primary"
                prepend-icon="tabler-plus"
                @click="openCreateDocumentRule"
              >
                Add Default Rule
              </VBtn>
            </div>

            <VAlert
              :type="documentCoverage?.has_default_rules || documentCoverage?.has_default_set ? 'success' : 'warning'"
              variant="tonal"
              class="mb-4"
            >
              {{ documentCoverage?.has_default_rules || documentCoverage?.has_default_set ? `${documentCoverage.default_rule_count || defaultDocumentRules.length} all-state default rule(s) found.` : 'No all-state default document rules found.' }}
              <span v-if="documentCoverage?.state_specific_default_rule_count">
                {{ documentCoverage.state_specific_default_rule_count }} state-specific default rule(s) exist.
              </span>
            </VAlert>

            <div class="defaults-table-wrap">
              <table class="defaults-table">
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
                    v-for="rule in defaultDocumentRules"
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
                          @click="openPreview(rule)"
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
                  <tr v-if="!defaultDocumentRules.length">
                    <td
                      colspan="7"
                      class="text-center text-medium-emphasis py-6"
                    >
                      No default document rules returned.
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
        <VCardTitle>Create Flow Default Question Set</VCardTitle>
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
                v-model="questionSetForm.product_code"
                label="Product Code"
                hint="Use * for flow default."
                persistent-hint
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="questionSetForm.state_code"
                label="State Code"
                hint="Use * for all states."
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
          {{ documentRuleMode === 'edit' ? 'Edit Default Document Rule' : 'Create Default Document Rule' }}
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
      v-model="previewDialog"
      max-width="640"
    >
      <VCard>
        <VCardTitle>Preview Default Document Rule</VCardTitle>
        <VCardText>
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
            :loading="previewLoading"
            @click="runPreview"
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
            @click="previewDialog = false"
          >
            Close
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>

<style scoped>
.flow-defaults-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.defaults-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.defaults-table-wrap {
  overflow: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
}

.defaults-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}

.defaults-table th,
.defaults-table td {
  padding: 0.85rem 1rem;
  border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  text-align: start;
  vertical-align: top;
}

.defaults-table th {
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
  .defaults-header {
    flex-direction: column;
  }
}
</style>
