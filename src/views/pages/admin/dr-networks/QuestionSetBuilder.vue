<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  DR_NETWORK_CONDITION_OPERATORS,
  DR_NETWORK_HARD_STOP_TYPES,
  DR_NETWORK_QUESTION_INPUT_TYPES,
  archiveDrNetworkQuestionSet,
  cloneDrNetworkQuestionSet,
  createDrNetworkQuestion,
  deleteDrNetworkQuestion,
  extractAdminDrNetworkErrors,
  fetchDrNetworkQuestionSet,
  listDrNetworkQuestions,
  normalizeAdminDrNetworkRows,
  previewDrNetworkQuestionSet,
  publishDrNetworkQuestionSet,
  reorderDrNetworkQuestionsBulk,
  testDrNetworkQuestionBlockingRule,
  unwrapAdminDrNetworkResponse,
  updateDrNetworkQuestion,
  updateDrNetworkQuestionSet,
  validateDrNetworkQuestionSet,
} from '@/api/adminDrNetworksApi'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const networkId = computed(() => route.params.networkId)
const setId = computed(() => route.params.setId)

const loading = ref(false)
const savingSet = ref(false)
const savingQuestion = ref(false)
const validating = ref(false)
const publishing = ref(false)
const previewLoading = ref(false)
const blockingRuleTesting = ref(false)
const errors = ref([])
const validationErrors = ref([])
const questionSet = ref(null)
const questions = ref([])
const previewResult = ref(null)
const questionDialog = ref(false)
const questionDialogMode = ref('create')
const testDialog = ref(false)
const testQuestion = ref(null)
const testResult = ref(null)

let previewTimer = null

const setForm = reactive({
  set_key: '',
  set_name: '',
  state_code: '*',
  status: 'draft',
  metadataJson: '{}',
})

const samplePatient = reactive({
  gender: 'female',
  age: 35,
})

const previewForm = reactive({
  priorAnswersJson: '{}',
})

const questionForm = reactive({
  id: '',
  question_key: '',
  question_text: '',
  help_text: '',
  sort_order: 10,
  input_type: 'radio',
  options: [],
  is_required: true,
  is_conditional: false,
  condition_rules: [],
  blocking_rules: [],
  metadataJson: '{}',
  frontend_hidden: false,
  auto_fill: '',
  is_active: true,
})

const blockingRuleTestForm = reactive({
  answer_value: '',
  patientJson: '{"gender":"female"}',
  priorAnswersJson: '{}',
})

const questionInputOptions = computed(() => DR_NETWORK_QUESTION_INPUT_TYPES.map(value => ({ title: value, value })))
const conditionOperatorOptions = computed(() => DR_NETWORK_CONDITION_OPERATORS.map(value => ({ title: value, value })))
const hardStopTypeOptions = computed(() => DR_NETWORK_HARD_STOP_TYPES.map(value => ({ title: value, value })))
const autoFillOptions = [
  { title: 'None', value: '' },
  { title: 'Calculated BMI', value: 'calculated_bmi' },
]
const optionInputTypes = new Set(['select', 'multiselect', 'radio', 'checkbox'])
const needsOptions = computed(() => optionInputTypes.has(questionForm.input_type))
const sortedQuestions = computed(() => questions.value.slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)))

const conditionSourceOptions = computed(() => [
  { title: 'Patient Gender', value: 'patient.gender' },
  { title: 'Patient Age', value: 'patient.age' },
  ...sortedQuestions.value
    .filter(question => question.question_key && question.question_key !== questionForm.question_key)
    .map(question => ({
      title: `Answer: ${question.question_key}`,
      value: `answers.${question.question_key}`,
    })),
])

const visiblePreviewQuestions = computed(() => {
  const payload = unwrapAdminDrNetworkResponse(previewResult.value) || previewResult.value || {}
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.questions)) return payload.questions
  if (Array.isArray(payload.visible_questions)) return payload.visible_questions
  if (Array.isArray(payload.question_set?.questions)) return payload.question_set.questions

  return []
})

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

const buildQuestionMetadata = () => {
  const metadata = parseJsonField(questionForm.metadataJson, {})

  if (questionForm.frontend_hidden)
    metadata.frontend_hidden = true
  else
    delete metadata.frontend_hidden

  if (questionForm.auto_fill)
    metadata.auto_fill = questionForm.auto_fill
  else
    delete metadata.auto_fill

  return metadata
}

const applyQuestionSet = payload => {
  questionSet.value = payload
  Object.assign(setForm, {
    set_key: payload?.set_key || '',
    set_name: payload?.set_name || payload?.name || '',
    state_code: payload?.state_code || '*',
    status: payload?.status || 'draft',
    metadataJson: prettyJson(payload?.metadata),
  })
}

const loadQuestionSet = async () => {
  loading.value = true
  errors.value = []

  try {
    const [setResponse, questionsResponse] = await Promise.all([
      fetchDrNetworkQuestionSet(setId.value),
      listDrNetworkQuestions(setId.value),
    ])

    const payload = unwrapAdminDrNetworkResponse(setResponse)
    applyQuestionSet(payload)

    const rows = normalizeAdminDrNetworkRows(questionsResponse)
    questions.value = rows.length ? rows : Array.isArray(payload?.questions) ? payload.questions : []

    queuePreview()
  } catch (error) {
    showErrors(error)
  } finally {
    loading.value = false
  }
}

const saveQuestionSet = async () => {
  savingSet.value = true
  errors.value = []

  try {
    const body = await updateDrNetworkQuestionSet(setId.value, {
      set_key: setForm.set_key,
      set_name: setForm.set_name,
      state_code: setForm.state_code || '*',
      metadata: parseJsonField(setForm.metadataJson, {}),
    })

    applyQuestionSet(unwrapAdminDrNetworkResponse(body))
    toast.success('Question set saved.')
    queuePreview()
  } catch (error) {
    showErrors(error)
  } finally {
    savingSet.value = false
  }
}

const resetQuestionForm = () => {
  Object.assign(questionForm, {
    id: '',
    question_key: '',
    question_text: '',
    help_text: '',
    sort_order: (sortedQuestions.value.length + 1) * 10,
    input_type: 'radio',
    options: [
      { id: 'yes', label: 'Yes', value: 'yes' },
      { id: 'no', label: 'No', value: 'no' },
    ],
    is_required: true,
    is_conditional: false,
    condition_rules: [],
    blocking_rules: [],
    metadataJson: '{}',
    frontend_hidden: false,
    auto_fill: '',
    is_active: true,
  })
}

const openCreateQuestion = () => {
  resetQuestionForm()
  questionDialogMode.value = 'create'
  questionDialog.value = true
}

const normalizeBlockingRules = question => {
  const validation = question?.network_validation || {}

  return Array.isArray(validation.blocking_rules)
    ? validation.blocking_rules.map(rule => ({
      rule_key: rule.rule_key || '',
      reason: rule.reason || '',
      hard_stop_type: rule.hard_stop_type || 'refer_out',
      message: rule.message || '',
      conditions: Array.isArray(rule.conditions) ? rule.conditions.map(condition => ({ ...condition })) : [],
    }))
    : []
}

const openEditQuestion = question => {
  resetQuestionForm()
  questionDialogMode.value = 'edit'
  Object.assign(questionForm, {
    id: question?.id || '',
    question_key: question?.question_key || '',
    question_text: question?.question_text || '',
    help_text: question?.help_text || '',
    sort_order: question?.sort_order ?? 10,
    input_type: question?.input_type || 'text',
    options: Array.isArray(question?.options) ? question.options.map(option => ({ ...option })) : [],
    is_required: question?.is_required !== false,
    is_conditional: !!question?.is_conditional,
    condition_rules: Array.isArray(question?.condition_rules) ? question.condition_rules.map(condition => ({ ...condition })) : [],
    blocking_rules: normalizeBlockingRules(question),
    metadataJson: prettyJson(question?.metadata),
    frontend_hidden: question?.metadata?.frontend_hidden === true,
    auto_fill: question?.metadata?.auto_fill || '',
    is_active: question?.is_active !== false,
  })
  questionDialog.value = true
}

const addOption = () => {
  questionForm.options.push({ id: '', label: '', value: '' })
}

const removeOption = index => {
  questionForm.options.splice(index, 1)
}

const addCondition = target => {
  target.push({
    source: 'patient.gender',
    operator: 'equals',
    value: '',
  })
}

const removeCondition = (target, index) => {
  target.splice(index, 1)
}

const addBlockingRule = () => {
  questionForm.blocking_rules.push({
    rule_key: '',
    reason: '',
    hard_stop_type: 'refer_out',
    message: '',
    conditions: [],
  })
}

const removeBlockingRule = index => {
  questionForm.blocking_rules.splice(index, 1)
}

const buildQuestionPayload = () => ({
  question_key: questionForm.question_key,
  question_text: questionForm.question_text,
  help_text: questionForm.help_text || null,
  sort_order: Number(questionForm.sort_order || 10),
  input_type: questionForm.input_type,
  options: needsOptions.value ? questionForm.options : [],
  is_required: !!questionForm.is_required,
  is_conditional: !!questionForm.is_conditional,
  condition_rules: questionForm.is_conditional ? questionForm.condition_rules : null,
  network_validation: {
    blocking_rules: questionForm.blocking_rules,
  },
  metadata: buildQuestionMetadata(),
  is_active: !!questionForm.is_active,
})

const saveQuestion = async () => {
  savingQuestion.value = true
  errors.value = []

  try {
    if (questionDialogMode.value === 'edit')
      await updateDrNetworkQuestion(questionForm.id, buildQuestionPayload())
    else
      await createDrNetworkQuestion(setId.value, buildQuestionPayload())

    toast.success(questionDialogMode.value === 'edit' ? 'Question updated.' : 'Question created.')
    questionDialog.value = false
    await loadQuestionSet()
  } catch (error) {
    showErrors(error)
  } finally {
    savingQuestion.value = false
  }
}

const deactivateQuestion = async question => {
  if (!question?.id) return
  if (!window.confirm(`Deactivate question "${question.question_key}"?`)) return

  try {
    await deleteDrNetworkQuestion(question.id)
    toast.success('Question deactivated.')
    await loadQuestionSet()
  } catch (error) {
    showErrors(error)
  }
}

const moveQuestion = async (index, direction) => {
  const nextIndex = index + direction
  const list = sortedQuestions.value
  if (nextIndex < 0 || nextIndex >= list.length) return

  const reordered = list.slice()
  const [item] = reordered.splice(index, 1)
  reordered.splice(nextIndex, 0, item)

  const orders = {}
  reordered.forEach((question, questionIndex) => {
    orders[question.id] = (questionIndex + 1) * 10
  })

  try {
    await reorderDrNetworkQuestionsBulk(setId.value, orders)
    toast.success('Question order saved.')
    await loadQuestionSet()
  } catch (error) {
    showErrors(error)
  }
}

const runPreview = async () => {
  previewLoading.value = true

  try {
    const body = await previewDrNetworkQuestionSet(setId.value, {
      patient: {
        gender: samplePatient.gender,
        age: Number(samplePatient.age || 0),
      },
      prior_answers: parseJsonField(previewForm.priorAnswersJson, {}),
    })

    previewResult.value = body
  } catch (error) {
    showErrors(error)
  } finally {
    previewLoading.value = false
  }
}

const queuePreview = () => {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(runPreview, 500)
}

const validateSet = async () => {
  validating.value = true
  validationErrors.value = []
  errors.value = []

  try {
    const body = await validateDrNetworkQuestionSet(setId.value)
    const payload = unwrapAdminDrNetworkResponse(body) || body
    const returnedErrors = payload?.errors || payload?.validation_errors || []

    validationErrors.value = Array.isArray(returnedErrors)
      ? returnedErrors.map(error => typeof error === 'string' ? error : JSON.stringify(error))
      : []

    if (validationErrors.value.length)
      toast.error('Question set validation returned blocking errors.')
    else
      toast.success('Question set validation passed.')

    return validationErrors.value.length === 0
  } catch (error) {
    validationErrors.value = extractAdminDrNetworkErrors(error)
    toast.error(validationErrors.value[0])

    return false
  } finally {
    validating.value = false
  }
}

const publishSet = async () => {
  publishing.value = true

  try {
    const valid = await validateSet()
    if (!valid) return

    await publishDrNetworkQuestionSet(setId.value)
    toast.success('Question set published.')
    await loadQuestionSet()
  } catch (error) {
    showErrors(error)
  } finally {
    publishing.value = false
  }
}

const archiveSet = async () => {
  if (!window.confirm('Archive this question set?')) return

  try {
    await archiveDrNetworkQuestionSet(setId.value)
    toast.success('Question set archived.')
    await loadQuestionSet()
  } catch (error) {
    showErrors(error)
  }
}

const cloneSet = async () => {
  try {
    const body = await cloneDrNetworkQuestionSet(setId.value)
    const cloned = unwrapAdminDrNetworkResponse(body)
    toast.success('Question set cloned.')

    if (cloned?.id)
      router.push(`/admin/dr-networks/${networkId.value}/question-sets/${cloned.id}`)
    else
      await loadQuestionSet()
  } catch (error) {
    showErrors(error)
  }
}

const openBlockingRuleTest = question => {
  testQuestion.value = question
  testResult.value = null
  Object.assign(blockingRuleTestForm, {
    answer_value: '',
    patientJson: '{"gender":"female"}',
    priorAnswersJson: '{}',
  })
  testDialog.value = true
}

const runBlockingRuleTest = async () => {
  if (!testQuestion.value?.id) return
  blockingRuleTesting.value = true

  try {
    const body = await testDrNetworkQuestionBlockingRule(testQuestion.value.id, {
      answer_value: blockingRuleTestForm.answer_value,
      patient: parseJsonField(blockingRuleTestForm.patientJson, {}),
      prior_answers: parseJsonField(blockingRuleTestForm.priorAnswersJson, {}),
    })

    testResult.value = unwrapAdminDrNetworkResponse(body)
  } catch (error) {
    showErrors(error)
  } finally {
    blockingRuleTesting.value = false
  }
}

watch(
  () => [samplePatient.gender, samplePatient.age, previewForm.priorAnswersJson],
  queuePreview,
)

onMounted(loadQuestionSet)
onBeforeUnmount(() => clearTimeout(previewTimer))
</script>

<template>
  <section class="question-builder">
    <div class="builder-header">
      <div>
        <VBtn
          variant="text"
          prepend-icon="tabler-arrow-left"
          class="mb-2"
          @click="router.back()"
        >
          Back
        </VBtn>
        <div class="text-h5 font-weight-bold">
          {{ setForm.set_name || setForm.set_key || 'Question Set Builder' }}
        </div>
        <p class="mb-0 text-body-2 text-medium-emphasis">
          {{ setForm.set_key }} · state {{ setForm.state_code || '*' }}
        </p>
      </div>

      <div class="builder-actions">
        <VChip
          :color="setForm.status === 'published' ? 'success' : setForm.status === 'draft' ? 'warning' : 'secondary'"
          variant="tonal"
        >
          {{ setForm.status || 'draft' }}
        </VChip>
        <VBtn
          variant="tonal"
          prepend-icon="tabler-copy"
          @click="cloneSet"
        >
          Clone
        </VBtn>
        <VBtn
          variant="tonal"
          color="secondary"
          prepend-icon="tabler-archive"
          @click="archiveSet"
        >
          Archive
        </VBtn>
        <VBtn
          variant="tonal"
          prepend-icon="tabler-circle-check"
          :loading="validating"
          @click="validateSet"
        >
          Validate
        </VBtn>
        <VBtn
          color="primary"
          prepend-icon="tabler-cloud-upload"
          :loading="publishing"
          @click="publishSet"
        >
          Publish
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

    <VAlert
      v-if="validationErrors.length"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      <div class="font-weight-bold mb-2">
        Blocking validation checklist
      </div>
      <ul class="mb-0">
        <li
          v-for="error in validationErrors"
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

    <div class="builder-layout">
      <main class="builder-main">
        <VCard class="mb-4">
          <VCardText class="pa-5">
            <div class="d-flex justify-space-between align-center mb-4">
              <div class="text-h6 font-weight-bold">
                Set Metadata
              </div>
              <VBtn
                color="primary"
                prepend-icon="tabler-device-floppy"
                :loading="savingSet"
                @click="saveQuestionSet"
              >
                Save Set
              </VBtn>
            </div>
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="setForm.set_key"
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
                  v-model="setForm.set_name"
                  label="Set Name"
                  variant="outlined"
                  hide-details="auto"
                />
              </VCol>
              <VCol
                cols="12"
                md="4"
              >
                <VTextField
                  v-model="setForm.state_code"
                  label="State Code"
                  hint="Use * for all-state coverage."
                  persistent-hint
                  variant="outlined"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="setForm.metadataJson"
                  label="Metadata JSON"
                  variant="outlined"
                  rows="4"
                  hide-details="auto"
                />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <VCard>
          <VCardText class="pa-5">
            <div class="d-flex justify-space-between align-center mb-4">
              <div>
                <div class="text-h6 font-weight-bold">
                  Questions
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  Reorder with arrows, then edit each question's options, display conditions, and hard-stop rules.
                </p>
              </div>
              <VBtn
                color="primary"
                prepend-icon="tabler-plus"
                @click="openCreateQuestion"
              >
                Add Question
              </VBtn>
            </div>

            <div class="question-list">
              <div
                v-for="(question, index) in sortedQuestions"
                :key="question.id"
                class="question-row"
              >
                <div class="question-row__order">
                  <VBtn
                    size="x-small"
                    variant="text"
                    icon="tabler-arrow-up"
                    :disabled="index === 0"
                    @click="moveQuestion(index, -1)"
                  />
                  <VBtn
                    size="x-small"
                    variant="text"
                    icon="tabler-arrow-down"
                    :disabled="index === sortedQuestions.length - 1"
                    @click="moveQuestion(index, 1)"
                  />
                </div>
                <div class="question-row__content">
                  <div class="font-weight-semibold">
                    {{ question.question_text || question.question_key }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ question.question_key }} · {{ question.input_type }} · sort {{ question.sort_order }}
                  </div>
                </div>
                <VChip
                  size="small"
                  :color="question.is_active === false ? 'secondary' : 'success'"
                  variant="tonal"
                >
                  {{ question.is_active === false ? 'Inactive' : 'Active' }}
                </VChip>
                <div class="question-row__actions">
                  <VBtn
                    size="small"
                    variant="text"
                    icon="tabler-player-play"
                    @click="openBlockingRuleTest(question)"
                  />
                  <VBtn
                    size="small"
                    variant="text"
                    icon="tabler-pencil"
                    @click="openEditQuestion(question)"
                  />
                  <VBtn
                    size="small"
                    variant="text"
                    color="error"
                    icon="tabler-trash"
                    @click="deactivateQuestion(question)"
                  />
                </div>
              </div>

              <div
                v-if="!sortedQuestions.length"
                class="text-center text-medium-emphasis py-8"
              >
                No questions yet.
              </div>
            </div>
          </VCardText>
        </VCard>
      </main>

      <aside class="builder-preview">
        <VCard>
          <VCardText class="pa-5">
            <div class="d-flex justify-space-between align-center mb-4">
              <div>
                <div class="text-h6 font-weight-bold">
                  Preview
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  Runs the backend preview endpoint with sample patient context.
                </p>
              </div>
              <VBtn
                variant="tonal"
                icon="tabler-refresh"
                :loading="previewLoading"
                @click="runPreview"
              />
            </div>

            <VSelect
              v-model="samplePatient.gender"
              :items="['female', 'male', 'other']"
              label="Gender"
              variant="outlined"
              class="mb-4"
              hide-details="auto"
            />
            <VTextField
              v-model="samplePatient.age"
              label="Age"
              type="number"
              variant="outlined"
              class="mb-4"
              hide-details="auto"
            />
            <VTextarea
              v-model="previewForm.priorAnswersJson"
              label="Prior Answers JSON"
              variant="outlined"
              rows="5"
              class="mb-4"
              hide-details="auto"
            />

            <VAlert
              type="info"
              variant="tonal"
              class="mb-4"
            >
              Visible questions: {{ visiblePreviewQuestions.length }} of {{ questions.length }}
            </VAlert>

            <div class="preview-question-list">
              <div
                v-for="question in visiblePreviewQuestions"
                :key="question.id || question.question_key"
                class="preview-question"
              >
                <div class="font-weight-semibold">
                  {{ question.question_text || question.question_key }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ question.question_key }} · {{ question.input_type }}
                </div>
              </div>
              <div
                v-if="!visiblePreviewQuestions.length"
                class="text-body-2 text-medium-emphasis"
              >
                Preview has no visible questions yet.
              </div>
            </div>
          </VCardText>
        </VCard>
      </aside>
    </div>

    <VDialog
      v-model="questionDialog"
      max-width="980"
    >
      <VCard>
        <VCardTitle>
          {{ questionDialogMode === 'edit' ? 'Edit Question' : 'Add Question' }}
        </VCardTitle>
        <VCardText>
          <VRow>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="questionForm.question_key"
                label="Question Key"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VSelect
                v-model="questionForm.input_type"
                :items="questionInputOptions"
                label="Input Type"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="questionForm.sort_order"
                label="Sort Order"
                type="number"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="questionForm.question_text"
                label="Question Text"
                variant="outlined"
                rows="2"
                hide-details="auto"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="questionForm.help_text"
                label="Help Text"
                variant="outlined"
                rows="2"
                hide-details="auto"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VSwitch
                v-model="questionForm.is_required"
                label="Required"
                color="primary"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VSwitch
                v-model="questionForm.is_conditional"
                label="Conditional"
                color="primary"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VSwitch
                v-model="questionForm.is_active"
                label="Active"
                color="primary"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VSwitch
                v-model="questionForm.frontend_hidden"
                label="Hidden From Patient"
                color="primary"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VSelect
                v-model="questionForm.auto_fill"
                :items="autoFillOptions"
                label="Auto Fill"
                variant="outlined"
                hide-details="auto"
              />
            </VCol>
          </VRow>

          <div
            v-if="needsOptions"
            class="builder-section"
          >
            <div class="section-heading">
              <div class="text-subtitle-1 font-weight-bold">
                Options
              </div>
              <VBtn
                size="small"
                variant="tonal"
                prepend-icon="tabler-plus"
                @click="addOption"
              >
                Add Option
              </VBtn>
            </div>
            <div
              v-for="(option, index) in questionForm.options"
              :key="index"
              class="option-row"
            >
              <VTextField
                v-model="option.id"
                label="ID"
                variant="outlined"
                hide-details="auto"
              />
              <VTextField
                v-model="option.label"
                label="Label"
                variant="outlined"
                hide-details="auto"
              />
              <VTextField
                v-model="option.value"
                label="Value"
                variant="outlined"
                hide-details="auto"
              />
              <VBtn
                variant="text"
                color="error"
                icon="tabler-trash"
                @click="removeOption(index)"
              />
            </div>
          </div>

          <div
            v-if="questionForm.is_conditional"
            class="builder-section"
          >
            <div class="section-heading">
              <div class="text-subtitle-1 font-weight-bold">
                Display Conditions
              </div>
              <VBtn
                size="small"
                variant="tonal"
                prepend-icon="tabler-plus"
                @click="addCondition(questionForm.condition_rules)"
              >
                Add Condition
              </VBtn>
            </div>
            <div
              v-for="(condition, index) in questionForm.condition_rules"
              :key="index"
              class="condition-row"
            >
              <VSelect
                v-model="condition.source"
                :items="conditionSourceOptions"
                label="Source"
                variant="outlined"
                hide-details="auto"
              />
              <VSelect
                v-model="condition.operator"
                :items="conditionOperatorOptions"
                label="Operator"
                variant="outlined"
                hide-details="auto"
              />
              <VTextField
                v-model="condition.value"
                label="Value"
                variant="outlined"
                hide-details="auto"
              />
              <VBtn
                variant="text"
                color="error"
                icon="tabler-trash"
                @click="removeCondition(questionForm.condition_rules, index)"
              />
            </div>
          </div>

          <div class="builder-section">
            <div class="section-heading">
              <div class="text-subtitle-1 font-weight-bold">
                Hard Stop Rules
              </div>
              <VBtn
                size="small"
                variant="tonal"
                prepend-icon="tabler-plus"
                @click="addBlockingRule"
              >
                Add Rule
              </VBtn>
            </div>

            <div
              v-for="(rule, ruleIndex) in questionForm.blocking_rules"
              :key="ruleIndex"
              class="blocking-rule"
            >
              <div class="blocking-rule__header">
                <VTextField
                  v-model="rule.rule_key"
                  label="Rule Key"
                  variant="outlined"
                  hide-details="auto"
                />
                <VTextField
                  v-model="rule.reason"
                  label="Reason"
                  variant="outlined"
                  hide-details="auto"
                />
                <VSelect
                  v-model="rule.hard_stop_type"
                  :items="hardStopTypeOptions"
                  label="Hard Stop Type"
                  variant="outlined"
                  hide-details="auto"
                />
                <VBtn
                  variant="text"
                  color="error"
                  icon="tabler-trash"
                  @click="removeBlockingRule(ruleIndex)"
                />
              </div>
              <VTextarea
                v-model="rule.message"
                label="Patient Message"
                variant="outlined"
                rows="2"
                class="mt-3"
                hide-details="auto"
              />

              <div class="section-heading mt-3">
                <div class="text-subtitle-2 font-weight-bold">
                  Rule Conditions
                </div>
                <VBtn
                  size="small"
                  variant="tonal"
                  prepend-icon="tabler-plus"
                  @click="addCondition(rule.conditions)"
                >
                  Add Condition
                </VBtn>
              </div>
              <div
                v-for="(condition, conditionIndex) in rule.conditions"
                :key="conditionIndex"
                class="condition-row"
              >
                <VSelect
                  v-model="condition.source"
                  :items="conditionSourceOptions"
                  label="Source"
                  variant="outlined"
                  hide-details="auto"
                />
                <VSelect
                  v-model="condition.operator"
                  :items="conditionOperatorOptions"
                  label="Operator"
                  variant="outlined"
                  hide-details="auto"
                />
                <VTextField
                  v-model="condition.value"
                  label="Value"
                  variant="outlined"
                  hide-details="auto"
                />
                <VBtn
                  variant="text"
                  color="error"
                  icon="tabler-trash"
                  @click="removeCondition(rule.conditions, conditionIndex)"
                />
              </div>
            </div>
          </div>

          <VTextarea
            v-model="questionForm.metadataJson"
            label="Metadata JSON"
            variant="outlined"
            rows="4"
            class="mt-4"
            hide-details="auto"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="questionDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="savingQuestion"
            @click="saveQuestion"
          >
            Save Question
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="testDialog"
      max-width="680"
    >
      <VCard>
        <VCardTitle>Test Blocking Rule</VCardTitle>
        <VCardText>
          <div class="text-body-2 text-medium-emphasis mb-4">
            {{ testQuestion?.question_key }}
          </div>
          <VTextField
            v-model="blockingRuleTestForm.answer_value"
            label="Answer Value"
            variant="outlined"
            class="mb-4"
            hide-details="auto"
          />
          <VTextarea
            v-model="blockingRuleTestForm.patientJson"
            label="Patient JSON"
            variant="outlined"
            rows="4"
            class="mb-4"
            hide-details="auto"
          />
          <VTextarea
            v-model="blockingRuleTestForm.priorAnswersJson"
            label="Prior Answers JSON"
            variant="outlined"
            rows="4"
            class="mb-4"
            hide-details="auto"
          />
          <VBtn
            color="primary"
            prepend-icon="tabler-player-play"
            :loading="blockingRuleTesting"
            @click="runBlockingRuleTest"
          >
            Run Test
          </VBtn>
          <VAlert
            v-if="testResult"
            type="info"
            variant="tonal"
            class="mt-4"
          >
            <pre class="result-json">{{ JSON.stringify(testResult, null, 2) }}</pre>
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="testDialog = false"
          >
            Close
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>

<style scoped>
.question-builder {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.builder-header,
.builder-actions,
.section-heading,
.question-row,
.blocking-rule__header {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  justify-content: space-between;
}

.builder-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.builder-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.38fr);
  gap: 1rem;
  align-items: start;
}

.builder-preview {
  position: sticky;
  top: 1rem;
}

.question-list,
.preview-question-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-row,
.preview-question,
.builder-section,
.blocking-rule {
  padding: 0.85rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
}

.question-row__order,
.question-row__actions {
  display: flex;
  gap: 0.25rem;
}

.question-row__content {
  flex: 1;
}

.builder-section {
  margin-block-start: 1rem;
}

.option-row,
.condition-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 0.75rem;
  align-items: center;
  margin-block-start: 0.75rem;
}

.blocking-rule {
  margin-block-start: 0.75rem;
}

.blocking-rule__header {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
}

.result-json {
  margin: 0;
  white-space: pre-wrap;
}

@media (max-width: 1100px) {
  .builder-layout {
    grid-template-columns: 1fr;
  }

  .builder-preview {
    position: static;
  }
}

@media (max-width: 760px) {
  .builder-header,
  .question-row,
  .section-heading {
    flex-direction: column;
  }

  .option-row,
  .condition-row,
  .blocking-rule__header {
    grid-template-columns: 1fr;
  }
}
</style>
