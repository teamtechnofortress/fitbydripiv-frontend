<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { saveIntakeAnswer } from '@/api/drNetworkApi'

const props = defineProps({
  orderUuid: {
    type: String,
    required: true,
  },
  workflow: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['refresh-journey', 'refresh-workflow'])

const answers = reactive({})
const saving = ref(false)
const message = ref('')
const error = ref('')
const currentIndex = ref(0)
const reviewMode = ref(false)

const HEIGHT_FEET_KEY = 'glp1_height_feet'
const HEIGHT_INCHES_KEY = 'glp1_height_inches'
const BMI_KEY = 'glp1_bmi'

const questionSet = computed(() => props.workflow?.step_data?.question_set || props.workflow?.question_set || null)

const questions = computed(() => {
  const list = questionSet.value?.questions || []

  return Array.isArray(list)
    ? [...list].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    : []
})

const questionByKey = computed(() => questions.value.reduce((acc, question) => {
  if (question.question_key) acc[question.question_key] = question

  return acc
}, {}))

const questionMetadata = question => question?.metadata || {}

const isFrontendHiddenQuestion = question => (
  question?.question_key === BMI_KEY
  || questionMetadata(question).frontend_hidden === true
  || Boolean(questionMetadata(question).auto_fill)
)

const isHeightFeetQuestion = question => question?.question_key === HEIGHT_FEET_KEY

const isHeightInchesQuestion = question => question?.question_key === HEIGHT_INCHES_KEY

const heightInchesQuestion = computed(() => questionByKey.value[HEIGHT_INCHES_KEY] || null)

const patientFacingQuestions = computed(() => questions.value.filter(question => (
  !isFrontendHiddenQuestion(question)
  && !isHeightInchesQuestion(question)
)))

watch(
  questions,
  list => {
    list.forEach(question => {
      if (!(question.id in answers)) {
        const answerValue = question.answer_value
        const inputType = String(question.input_type || question.type || 'text').toLowerCase()
        const isMultiAnswer = ['checkbox', 'checkboxes', 'multiselect', 'multi-select', 'multi_select', 'multiple_select', 'multiple_choice', 'multi_choice'].includes(inputType)

        if (isMultiAnswer) {
          if (Array.isArray(answerValue))
            answers[question.id] = answerValue
          else if (typeof answerValue === 'string' && answerValue.includes(','))
            answers[question.id] = answerValue.split(',').map(item => item.trim()).filter(Boolean)
          else if (answerValue)
            answers[question.id] = [answerValue]
          else
            answers[question.id] = []
        } else {
          answers[question.id] = answerValue ?? ''
        }
      }
    })
  },
  { immediate: true },
)

const questionLabel = question => isHeightFeetQuestion(question)
  ? 'Height'
  : question.question_text || question.label || question.question_key || 'Question'

const questionInputType = question => question.input_type || question.type || 'text'

const optionsFor = question => {
  const options = question.options || question.choices || []

  return Array.isArray(options) ? options : []
}

const optionValue = option => {
  if (option && typeof option === 'object') return option.value ?? option.id ?? option.key ?? option.label

  return option
}

const optionLabel = option => {
  if (option && typeof option === 'object') return option.label ?? option.title ?? option.value ?? option.id

  return option
}

const answerForQuestionKey = key => {
  const question = questionByKey.value[key]
  if (!question) return undefined

  return answers[question.id]
}

const conditionMatches = condition => {
  if (!condition?.when) return true

  const answer = answerForQuestionKey(condition.when)
  const normalizedAnswers = Array.isArray(answer) ? answer.map(String) : [String(answer ?? '')]

  if (Object.prototype.hasOwnProperty.call(condition, 'equals')) {
    return normalizedAnswers.includes(String(condition.equals))
  }

  if (Array.isArray(condition.in)) {
    return condition.in.map(String).some(value => normalizedAnswers.includes(value))
  }

  if (Object.prototype.hasOwnProperty.call(condition, 'not_equals')) {
    return !normalizedAnswers.includes(String(condition.not_equals))
  }

  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer)
}

const isQuestionVisible = question => {
  if (!question.is_conditional) return true

  const rules = question.condition_rules || []
  if (!Array.isArray(rules) || !rules.length) return true

  return rules.every(conditionMatches)
}

const visibleQuestions = computed(() => patientFacingQuestions.value.filter(isQuestionVisible))

watch(
  visibleQuestions,
  list => {
    if (!list.length) {
      currentIndex.value = 0
      reviewMode.value = false

      return
    }

    if (currentIndex.value > list.length - 1) currentIndex.value = list.length - 1
  },
  { immediate: true },
)

const currentQuestion = computed(() => visibleQuestions.value[currentIndex.value] || null)

const isFirstQuestion = computed(() => currentIndex.value <= 0)

const progressPercent = computed(() => {
  if (!visibleQuestions.value.length) return 0
  if (reviewMode.value) return 100

  return ((currentIndex.value + 1) / visibleQuestions.value.length) * 100
})

const isAnswered = question => {
  if (isHeightFeetQuestion(question) && heightInchesQuestion.value) {
    const feet = String(answers[question.id] ?? '').trim()
    const inches = String(answers[heightInchesQuestion.value.id] ?? '').trim()

    return Boolean(feet && inches)
  }

  const value = answers[question.id]
  if (Array.isArray(value)) return value.length > 0

  return String(value ?? '').trim() !== ''
}

const inputType = question => {
  const type = questionInputType(question)
  if (type === 'number') return 'number'
  if (type === 'date') return 'date'
  if (type === 'email') return 'email'
  if (type === 'phone') return 'tel'

  return 'text'
}

const placeholder = question => question.metadata?.placeholder || question.placeholder || 'Enter your answer'

const minLength = question => question.metadata?.min_length || question.validation_rules?.min_length || null

const maxLength = question => question.metadata?.max_length || question.validation_rules?.max_length || null

const normalizedInputType = question => String(questionInputType(question) || 'text').toLowerCase()

const isLongText = question => ['long_text', 'textarea'].includes(normalizedInputType(question))

const isSingleChoice = question => ['radio', 'select', 'choice', 'single_choice', 'single-select', 'single_select'].includes(normalizedInputType(question))

const isMultiChoice = question => ['checkbox', 'checkboxes', 'multiselect', 'multi-select', 'multi_select', 'multiple_select', 'multiple_choice', 'multi_choice'].includes(normalizedInputType(question))

const isBoolean = question => ['boolean', 'yes_no'].includes(normalizedInputType(question))

const isCurrentQuestionAnswered = computed(() => currentQuestion.value ? isAnswered(currentQuestion.value) : false)

const isLastQuestion = computed(() => currentIndex.value >= visibleQuestions.value.length - 1)

const setSingleOption = (question, value) => {
  answers[question.id] = value
  error.value = ''
  message.value = ''
}

const isOptionSelected = (question, option) => {
  const value = optionValue(option)
  const answer = answers[question.id]

  if (Array.isArray(answer)) return answer.map(String).includes(String(value))

  return String(answer ?? '') === String(value)
}

const toggleMultiOption = (question, option) => {
  const value = optionValue(option)
  const current = Array.isArray(answers[question.id]) ? [...answers[question.id]] : []
  const selectedValues = current.map(String)
  const isNoneOption = String(value) === 'none'
  const next = selectedValues.includes(String(value))
    ? current.filter(item => String(item) !== String(value))
    : isNoneOption
      ? [value]
      : [...current.filter(item => String(item) !== 'none'), value]

  answers[question.id] = next
  error.value = ''
  message.value = ''
}

const validateQuestion = question => {
  if (isHeightFeetQuestion(question) && heightInchesQuestion.value) {
    const feet = String(answers[question.id] ?? '').trim()
    const inches = String(answers[heightInchesQuestion.value.id] ?? '').trim()
    const isRequired = question.is_required || heightInchesQuestion.value.is_required

    if (isRequired && (!feet || !inches)) return 'Height is required.'

    return ''
  }

  const rawValue = answers[question.id]
  const value = Array.isArray(rawValue) ? rawValue : String(rawValue ?? '').trim()
  const label = questionLabel(question)

  if (question.is_required && (Array.isArray(value) ? !value.length : !value)) return `${label} is required.`

  if (Array.isArray(value) || !value) return ''

  const min = Number(minLength(question))
  const max = Number(maxLength(question))

  if (Number.isFinite(min) && min > 0 && value.length < min) {
    return `${label} must be at least ${min} characters.`
  }

  if (Number.isFinite(max) && max > 0 && value.length > max) {
    return `${label} must be ${max} characters or less.`
  }

  return ''
}

const validate = () => {
  const invalidQuestion = visibleQuestions.value.find(question => validateQuestion(question))

  if (invalidQuestion) {
    error.value = validateQuestion(invalidQuestion)
    currentIndex.value = Math.max(visibleQuestions.value.findIndex(question => question.id === invalidQuestion.id), 0)
    reviewMode.value = false

    return false
  }

  return true
}

const validateCurrentQuestion = () => {
  if (!currentQuestion.value) return false

  const validationError = validateQuestion(currentQuestion.value)
  if (validationError) {
    error.value = validationError

    return false
  }

  error.value = ''

  return true
}

const goPrevious = () => {
  message.value = ''
  error.value = ''

  if (reviewMode.value) {
    reviewMode.value = false
    currentIndex.value = Math.max(visibleQuestions.value.length - 1, 0)

    return
  }

  currentIndex.value = Math.max(currentIndex.value - 1, 0)
}

const goNext = () => {
  if (!validateCurrentQuestion()) return

  message.value = ''
  error.value = ''

  if (isLastQuestion.value) {
    reviewMode.value = true

    return
  }

  currentIndex.value += 1
}

const editQuestion = index => {
  currentIndex.value = index
  reviewMode.value = false
  message.value = ''
  error.value = ''
}

const displayAnswer = question => {
  if (isHeightFeetQuestion(question) && heightInchesQuestion.value) {
    const feet = String(answers[question.id] ?? '').trim()
    const inches = String(answers[heightInchesQuestion.value.id] ?? '').trim()

    return feet || inches ? `${feet || '-'} ft ${inches || '-'} in` : 'Not answered'
  }

  const value = answers[question.id]
  const options = optionsFor(question)

  if (Array.isArray(value)) {
    if (!value.length) return 'Not answered'

    return value
      .map(item => optionLabel(options.find(option => String(optionValue(option)) === String(item))) || item)
      .join(', ')
  }

  if (!String(value ?? '').trim()) return 'Not answered'

  if (isSingleChoice(question) || isBoolean(question)) {
    return optionLabel(options.find(option => String(optionValue(option)) === String(value))) || String(value)
  }

  return String(value)
}

const saveAnswers = async () => {
  if (saving.value || !validate()) return

  saving.value = true
  message.value = ''
  error.value = ''

  try {
    for (const question of visibleQuestions.value) {
      if (isHeightFeetQuestion(question) && heightInchesQuestion.value) {
        const heightQuestions = [question, heightInchesQuestion.value]

        for (const heightQuestion of heightQuestions) {
          const value = answers[heightQuestion.id]
          const isEmpty = String(value ?? '').trim() === ''
          if (isEmpty && !heightQuestion.is_required) continue

          await saveIntakeAnswer(props.orderUuid, heightQuestion.id, value)
        }

        continue
      }

      const value = answers[question.id]
      const isEmpty = Array.isArray(value) ? !value.length : String(value ?? '').trim() === ''
      if (isEmpty && !question.is_required) continue

      await saveIntakeAnswer(props.orderUuid, question.id, value)
    }

    message.value = 'Answers saved. Checking your next consultation step.'
    emit('refresh-journey')
  } catch (err) {
    error.value = err?.response?.data?.message || 'Unable to save your answers. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="dn-intake-page">
    <header class="dn-flow-header">
      <button
        v-if="!isFirstQuestion || reviewMode"
        type="button"
        class="dn-back-button"
        @click="goPrevious"
      >
        <VIcon
          icon="tabler-chevron-left"
          size="24"
        />
        Back
      </button>
      <div class="dn-brand">
        FitBy<span>Shot</span>
      </div>
      <div class="dn-step-count">
        {{ reviewMode ? visibleQuestions.length : currentIndex + 1 }}/{{ visibleQuestions.length || 1 }}
      </div>
    </header>

    <div class="dn-progress-track">
      <span :style="{ width: `${progressPercent}%` }" />
    </div>

    <div
      v-if="!visibleQuestions.length"
      class="dn-empty-state"
    >
      <p class="dn-kicker">
        Clinical intake
      </p>
      <h1>No questions were returned for this step.</h1>
      <p>Refresh the journey if this does not update automatically.</p>
    </div>

    <section
      v-else-if="reviewMode"
      class="dn-review-panel"
    >
      <p class="dn-kicker">
        Review
      </p>
      <h1>Review your answers</h1>
      <p class="dn-subtitle">
        Your answers will be submitted together when you continue.
      </p>

      <div class="dn-review-list">
        <button
          v-for="(question, index) in visibleQuestions"
          :key="question.id"
          type="button"
          class="dn-review-item"
          @click="editQuestion(index)"
        >
          <span>Question {{ index + 1 }}</span>
          <strong>{{ questionLabel(question) }}</strong>
          <em>{{ displayAnswer(question) }}</em>
        </button>
      </div>

      <p
        v-if="message"
        class="dn-message dn-message--success"
      >
        {{ message }}
      </p>
      <p
        v-if="error"
        class="dn-message dn-message--error"
      >
        {{ error }}
      </p>

      <button
        type="button"
        class="dn-primary-button"
        :disabled="saving"
        @click="saveAnswers"
      >
        {{ saving ? 'Submitting answers...' : 'Submit answers' }}
      </button>
    </section>

    <section
      v-else-if="currentQuestion"
      class="dn-question-stage"
    >
      <p class="dn-kicker">
        {{ questionSet?.set_name || 'Clinical intake' }}
      </p>
      <h1>
        {{ questionLabel(currentQuestion) }}
        <span v-if="currentQuestion.is_required">*</span>
      </h1>
      <p
        v-if="currentQuestion.help_text"
        class="dn-subtitle"
      >
        {{ currentQuestion.help_text }}
      </p>
      <p
        v-else-if="isMultiChoice(currentQuestion)"
        class="dn-subtitle"
      >
        Select all that apply.
      </p>

      <div
        v-if="isHeightFeetQuestion(currentQuestion) && heightInchesQuestion"
        class="dn-height-group"
      >
        <label>
          <span>ft</span>
          <input
            v-model="answers[currentQuestion.id]"
            class="dn-input"
            type="number"
            min="0"
            inputmode="numeric"
            placeholder="5"
          >
        </label>
        <label>
          <span>in</span>
          <input
            v-model="answers[heightInchesQuestion.id]"
            class="dn-input"
            type="number"
            min="0"
            max="11"
            inputmode="numeric"
            placeholder="10"
          >
        </label>
      </div>

      <textarea
        v-else-if="isLongText(currentQuestion)"
        v-model="answers[currentQuestion.id]"
        class="dn-textarea"
        rows="6"
        :maxlength="maxLength(currentQuestion) || undefined"
        :minlength="minLength(currentQuestion) || undefined"
        :placeholder="placeholder(currentQuestion)"
      />

      <div
        v-else-if="isSingleChoice(currentQuestion)"
        class="dn-answer-list"
      >
        <button
          v-for="option in optionsFor(currentQuestion)"
          :key="optionValue(option)"
          type="button"
          class="dn-answer-card"
          :class="{ 'dn-answer-card--selected': isOptionSelected(currentQuestion, option) }"
          @click="setSingleOption(currentQuestion, optionValue(option))"
        >
          <span class="dn-choice-box">
            <VIcon
              v-if="isOptionSelected(currentQuestion, option)"
              icon="tabler-check"
              size="14"
            />
          </span>
          <span>{{ optionLabel(option) }}</span>
        </button>
      </div>

      <div
        v-else-if="isMultiChoice(currentQuestion)"
        class="dn-answer-list"
      >
        <button
          v-for="option in optionsFor(currentQuestion)"
          :key="optionValue(option)"
          type="button"
          class="dn-answer-card"
          :class="{ 'dn-answer-card--selected': isOptionSelected(currentQuestion, option) }"
          @click="toggleMultiOption(currentQuestion, option)"
        >
          <span class="dn-choice-box">
            <VIcon
              v-if="isOptionSelected(currentQuestion, option)"
              icon="tabler-check"
              size="14"
            />
          </span>
          <span>{{ optionLabel(option) }}</span>
        </button>
      </div>

      <div
        v-else-if="isBoolean(currentQuestion)"
        class="dn-answer-list dn-answer-list--compact"
      >
        <button
          type="button"
          class="dn-answer-card"
          :class="{ 'dn-answer-card--selected': answers[currentQuestion.id] === 'yes' }"
          @click="setSingleOption(currentQuestion, 'yes')"
        >
          <span class="dn-choice-box">
            <VIcon
              v-if="answers[currentQuestion.id] === 'yes'"
              icon="tabler-check"
              size="14"
            />
          </span>
          <span>Yes</span>
        </button>
        <button
          type="button"
          class="dn-answer-card"
          :class="{ 'dn-answer-card--selected': answers[currentQuestion.id] === 'no' }"
          @click="setSingleOption(currentQuestion, 'no')"
        >
          <span class="dn-choice-box">
            <VIcon
              v-if="answers[currentQuestion.id] === 'no'"
              icon="tabler-check"
              size="14"
            />
          </span>
          <span>No</span>
        </button>
      </div>

      <input
        v-else
        v-model="answers[currentQuestion.id]"
        class="dn-input"
        :type="inputType(currentQuestion)"
        :maxlength="maxLength(currentQuestion) || undefined"
        :minlength="minLength(currentQuestion) || undefined"
        :placeholder="placeholder(currentQuestion)"
      >

      <div
        v-if="maxLength(currentQuestion) && !(isHeightFeetQuestion(currentQuestion) && heightInchesQuestion)"
        class="dn-character-count"
      >
        {{ String(answers[currentQuestion.id] || '').length }} / {{ maxLength(currentQuestion) }}
      </div>

      <p
        v-if="message"
        class="dn-message dn-message--success"
      >
        {{ message }}
      </p>
      <p
        v-if="error"
        class="dn-message dn-message--error"
      >
        {{ error }}
      </p>

      <button
        type="button"
        class="dn-primary-button"
        :disabled="saving || (currentQuestion.is_required && !isCurrentQuestionAnswered)"
        @click="goNext"
      >
        {{ isLastQuestion ? 'Review answers' : 'Continue' }}
      </button>
    </section>
  </section>
</template>

<style scoped>
.dn-intake-page {
  width: min(900px, 100%);
  margin: 0 auto;
  color: var(--text, #171717);
}

.dn-flow-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-bottom: 0.75rem;
}

.dn-back-button,
.dn-step-count {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.dn-back-button {
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  min-height: 36px;
  padding: 0;
  color: var(--green, #059669);
  font-size: 0.9rem;
  font-weight: 700;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.dn-brand {
  color: var(--text, #222);
  font-family: var(--font-display, Georgia, "Times New Roman", serif);
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1;
}

.dn-brand span {
  color: var(--green, #059669);
}

.dn-step-count {
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 30px;
  padding: 0 0.65rem;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  background: var(--green, #059669);
  border-radius: 999px;
}

.dn-progress-track {
  height: 6px;
  overflow: hidden;
  background: var(--border, #e5e7eb);
  border-radius: 999px;
}

.dn-progress-track span {
  display: block;
  height: 100%;
  background: var(--gradient, linear-gradient(135deg, #059669, #2563eb));
  border-radius: inherit;
  transition: width 0.25s ease;
}

.dn-question-stage,
.dn-review-panel,
.dn-empty-state {
  width: min(760px, 100%);
  margin: 1.5rem auto 0;
  padding: 28px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: var(--radius-lg, 18px);
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(15, 23, 42, 0.06));
}

.dn-kicker,
.dn-subtitle,
.dn-message,
h1,
p {
  margin: 0;
}

.dn-kicker {
  margin-bottom: 0.45rem;
  color: var(--green, #059669);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  color: var(--text, #171717);
  font-family: var(--font-display, Georgia, "Times New Roman", serif);
  font-size: 1.55rem;
  font-weight: 650;
  line-height: 1.28;
}

h1 span {
  color: #dc2626;
}

.dn-subtitle {
  margin-top: 0.5rem;
  color: var(--text-3, #5f6368);
  font-size: 0.92rem;
  font-weight: 500;
  line-height: 1.5;
}

.dn-answer-list {
  display: grid;
  gap: 0.65rem;
  margin-top: 1.25rem;
  text-align: left;
}

.dn-answer-list--compact {
  width: min(620px, 100%);
  margin-inline: auto;
}

.dn-answer-card {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.75rem 0.9rem;
  color: var(--text-2, #374151);
  font-size: 0.92rem;
  font-weight: 600;
  text-align: left;
  background: var(--surface-2, #f8fafc) !important;
  border: 1.5px solid var(--border, #d1d5db);
  border-radius: var(--radius-sm, 10px);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.dn-answer-card--selected {
  color: var(--green-dark, #065f46);
  background: var(--green-light, #ecfdf5) !important;
  border-color: var(--green, #059669);
  box-shadow: none;
}

.dn-choice-box {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  border: 1.5px solid currentColor;
  border-radius: 5px;
}

.dn-answer-card--selected .dn-choice-box {
  background: var(--green, #059669);
  border-color: var(--green, #059669);
}

.dn-height-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 160px));
  gap: 0.8rem;
  margin-top: 1.25rem;
}

.dn-height-group label {
  display: grid;
  gap: 0.35rem;
  color: var(--text-3, #5f6368);
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
}

.dn-height-group .dn-input {
  margin-top: 0;
}

.dn-input,
.dn-textarea {
  width: 100%;
  margin-top: 1.25rem;
  padding: 0.65rem 0.8rem;
  color: var(--text, #171717);
  font-size: 0.92rem;
  font-weight: 500;
  background: var(--surface, #ffffff);
  border: 1.5px solid var(--border, #d1d5db);
  border-radius: var(--radius-sm, 10px);
}

.dn-textarea {
  resize: vertical;
}

.dn-input:focus,
.dn-textarea:focus {
  outline: none;
  border-color: var(--green, #059669);
  box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.13);
}

.dn-review-list {
  display: grid;
  gap: 0.65rem;
  margin-top: 1.25rem;
  text-align: left;
}

.dn-review-item {
  width: 100%;
  display: grid;
  gap: 0.25rem;
  padding: 0.85rem 0.95rem;
  text-align: left;
  background: var(--surface-2, #f8fafc);
  border: 1.5px solid var(--border, #d1d5db);
  border-radius: var(--radius-sm, 10px);
  cursor: pointer;
}

.dn-review-item span {
  color: var(--green, #059669);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.dn-review-item strong {
  color: var(--text, #171717);
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.35;
}

.dn-review-item em {
  color: var(--text-3, #4b5563);
  font-size: 0.86rem;
  font-style: normal;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.dn-character-count {
  margin-top: 0.55rem;
  color: var(--text-3, #6b7280);
  font-size: 0.78rem;
  font-weight: 600;
  text-align: right;
}

.dn-primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-top: 1.25rem;
  padding: 0.7rem 1.5rem;
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 700;
  background: var(--gradient, linear-gradient(135deg, #059669, #2563eb));
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.18);
}

.dn-primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.dn-message {
  margin-top: 1rem;
  font-size: 0.88rem;
  font-weight: 600;
  text-align: center;
}

.dn-message--success {
  color: #065f46;
}

.dn-message--error {
  color: #b91c1c;
}

@media (max-width: 620px) {
  .dn-flow-header {
    min-height: 42px;
  }

  .dn-brand {
    font-size: 1.35rem;
  }

  .dn-back-button {
    font-size: 0.95rem;
  }

  .dn-step-count {
    min-width: 34px;
    min-height: 28px;
    padding: 0 0.5rem;
    font-size: 0.78rem;
  }

  .dn-question-stage,
  .dn-review-panel,
  .dn-empty-state {
    margin-top: 1rem;
    padding: 20px;
  }

  h1 {
    font-size: 1.32rem;
  }

  .dn-subtitle {
    font-size: 0.88rem;
  }

  .dn-answer-list {
    margin-top: 1rem;
  }

  .dn-answer-card {
    min-height: 48px;
    padding: 0.7rem 0.8rem;
    font-size: 0.88rem;
  }

  .dn-primary-button {
    width: 100%;
    min-height: 42px;
    margin-top: 1rem;
  }
}
</style>
