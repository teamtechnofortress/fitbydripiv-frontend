<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { saveIntakeAnswer } from '@/api/drNetworkApi'
import DrNetworkStepShell from './DrNetworkStepShell.vue'

const props = defineProps({
  orderUuid: {
    type: String,
    required: true,
  },
  journey: {
    type: Object,
    default: null,
  },
  workflow: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['refreshJourney', 'refreshWorkflow'])

const answers = reactive({})
const saving = ref(false)
const message = ref('')
const error = ref('')
const currentIndex = ref(0)
const reviewMode = ref(false)
const direction = ref('forward')
const hasReachedReview = ref(false)
const pendingConditionalReviewCheck = ref(null)

const HEIGHT_FEET_KEY = 'glp1_height_feet'
const HEIGHT_INCHES_KEY = 'glp1_height_inches'
const BMI_KEY = 'glp1_bmi'

const CONDITIONAL_TRIGGER_KEYS = new Set([
  'wellness_requested_substances',
])

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
        const inputTypeValue = String(question.input_type || question.type || 'text').toLowerCase()
        const isMultiAnswer = ['checkbox', 'checkboxes', 'multiselect', 'multi-select', 'multi_select', 'multiple_select', 'multiple_choice', 'multi_choice'].includes(inputTypeValue)

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

const conditionSourceKey = condition => {
  const source = condition?.when || condition?.source || ''

  return String(source).replace(/^answers\./, '')
}

const conditionExpectedValues = condition => {
  if (Array.isArray(condition?.in)) return condition.in
  if (Array.isArray(condition?.value)) return condition.value
  if (Object.prototype.hasOwnProperty.call(condition || {}, 'equals')) return [condition.equals]
  if (Object.prototype.hasOwnProperty.call(condition || {}, 'not_equals')) return [condition.not_equals]
  if (Object.prototype.hasOwnProperty.call(condition || {}, 'value')) return [condition.value]

  return []
}

const conditionMatches = condition => {
  const sourceKey = conditionSourceKey(condition)
  if (!sourceKey) return true

  const answer = answerForQuestionKey(sourceKey)
  const normalizedAnswers = Array.isArray(answer) ? answer.map(String) : [String(answer ?? '')]
  const expectedValues = conditionExpectedValues(condition).map(String)
  const operator = String(condition?.operator || '').toLowerCase()

  if (operator === 'equals' || Object.prototype.hasOwnProperty.call(condition, 'equals')) {
    return expectedValues.some(value => normalizedAnswers.includes(value))
  }

  if (operator === 'in' || Array.isArray(condition.in)) {
    return expectedValues.some(value => normalizedAnswers.includes(value))
  }

  if (operator === 'not_equals' || operator === 'not_equals_any' || Object.prototype.hasOwnProperty.call(condition, 'not_equals')) {
    return expectedValues.every(value => !normalizedAnswers.includes(value))
  }

  if (operator === 'not_in') {
    return expectedValues.every(value => !normalizedAnswers.includes(value))
  }

  if (operator === 'contains') {
    return expectedValues.some(value => normalizedAnswers.includes(value))
  }

  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer)
}

const conditionalTriggerKeys = computed(() => {
  const keys = new Set(CONDITIONAL_TRIGGER_KEYS)

  questions.value.forEach(question => {
    const rules = Array.isArray(question.condition_rules) ? question.condition_rules : []

    rules.forEach(rule => {
      const key = conditionSourceKey(rule)
      if (key) keys.add(key)
    })
  })

  return keys
})

const isConditionalTriggerQuestion = question => Boolean(question?.question_key && conditionalTriggerKeys.value.has(question.question_key))

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
      pendingConditionalReviewCheck.value = null

      return
    }

    if (currentIndex.value > list.length - 1) currentIndex.value = list.length - 1

    const pendingCheck = pendingConditionalReviewCheck.value

    if (pendingCheck && reviewMode.value && list.length > pendingCheck.questionCount) {
      const triggerIndex = list.findIndex(question => question.id === pendingCheck.questionId)

      if (triggerIndex >= 0 && triggerIndex < list.length - 1) {
        currentIndex.value = triggerIndex + 1
        reviewMode.value = false
      }

      pendingConditionalReviewCheck.value = null
    }
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

const transitionName = computed(() => (direction.value === 'forward' ? 'slide-next' : 'slide-prev'))

const isReviewReturnMode = computed(() => hasReachedReview.value && !reviewMode.value && Boolean(currentQuestion.value))

const shellSubtitle = computed(() => (
  props.journey?.message
  || 'Answer the clinical questions required for your consultation.'
))

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

// eslint-disable-next-line sonarjs/cognitive-complexity
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

const saveAnswerForQuestion = async question => {
  if (isHeightFeetQuestion(question) && heightInchesQuestion.value) {
    await saveIntakeAnswer(props.orderUuid, question.id, answers[question.id])
    await saveIntakeAnswer(props.orderUuid, heightInchesQuestion.value.id, answers[heightInchesQuestion.value.id])

    return
  }

  await saveIntakeAnswer(props.orderUuid, question.id, answers[question.id])
}

const saveCurrentAnswerIfNeeded = async question => {
  if (!isConditionalTriggerQuestion(question)) return true

  saving.value = true
  error.value = ''

  try {
    await saveAnswerForQuestion(question)
    emit('refreshWorkflow')

    return true
  } catch (err) {
    error.value = err?.response?.data?.message || 'Unable to save this answer. Please try again.'

    return false
  } finally {
    saving.value = false
  }
}

const goPrevious = () => {
  message.value = ''
  error.value = ''
  direction.value = 'back'

  if (reviewMode.value) {
    reviewMode.value = false
    currentIndex.value = Math.max(visibleQuestions.value.length - 1, 0)

    return
  }

  currentIndex.value = Math.max(currentIndex.value - 1, 0)
}

const goNext = async () => {
  if (!validateCurrentQuestion()) return

  const question = currentQuestion.value
  const shouldCheckConditionalReview = isLastQuestion.value && isConditionalTriggerQuestion(question)
  const questionCount = visibleQuestions.value.length

  if (!await saveCurrentAnswerIfNeeded(question)) return

  if (shouldCheckConditionalReview) {
    pendingConditionalReviewCheck.value = {
      questionCount,
      questionId: question.id,
    }
  }

  message.value = ''
  error.value = ''
  direction.value = 'forward'

  if (isLastQuestion.value) {
    hasReachedReview.value = true
    reviewMode.value = true

    return
  }

  currentIndex.value += 1
}

const editQuestion = index => {
  direction.value = index > currentIndex.value ? 'forward' : 'back'
  currentIndex.value = index
  reviewMode.value = false
  message.value = ''
  error.value = ''
}

const goNextReviewQuestion = async () => {
  if (isLastQuestion.value || !validateCurrentQuestion()) return
  if (!await saveCurrentAnswerIfNeeded(currentQuestion.value)) return

  message.value = ''
  error.value = ''
  direction.value = 'forward'
  currentIndex.value += 1
}

const goToReview = async () => {
  if (!validateCurrentQuestion()) return
  if (!await saveCurrentAnswerIfNeeded(currentQuestion.value)) return

  message.value = ''
  error.value = ''
  direction.value = 'forward'
  hasReachedReview.value = true
  reviewMode.value = true
}

// eslint-disable-next-line sonarjs/cognitive-complexity
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

// eslint-disable-next-line sonarjs/cognitive-complexity
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

    emit('refreshWorkflow')
    emit('refreshJourney')
  } catch (err) {
    error.value = err?.response?.data?.message || 'Unable to save your answers. Please try again.'
  } finally {
    saving.value = false
  }
}

const panelKey = computed(() => {
  if (!visibleQuestions.value.length) return 'empty'
  if (reviewMode.value) return 'review'

  return `question-${currentQuestion.value?.id ?? currentIndex.value}`
})
</script>

<template>
  <DrNetworkStepShell
    title="Answer your intake questions"
    :subtitle="shellSubtitle"
    badge="Clinical Intake"
  >
    <section class="dn-intake-page">
      <div class="wizard-topbar">
        <div class="wizard-progress-track">
          <div
            class="wizard-progress-fill"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>

        <span class="wizard-step-count">
          {{ reviewMode ? 'Review' : `Step ${currentIndex + 1} of ${visibleQuestions.length || 1}` }}
        </span>
      </div>

      <div class="wizard-panel-frame">
        <Transition
          :name="transitionName"
          mode="out-in"
        >
          <div
            v-if="!visibleQuestions.length"
            key="empty"
            class="wizard-panel dn-empty-state"
          >
            <p class="wizard-eyebrow">
              Clinical intake
            </p>
            <h2 class="wizard-title">
              No questions were returned for this step.
            </h2>
            <p class="wizard-subtitle">
              Refresh the journey if this does not update automatically.
            </p>
          </div>

          <div
            v-else-if="reviewMode"
            key="review"
            class="wizard-panel"
          >
            <p class="wizard-eyebrow">
              Review
            </p>
            <h2 class="wizard-title">
              Review your answers
            </h2>
            <p class="wizard-subtitle">
              Your answers will be submitted and the workflow will update when you continue.
            </p>

            <div class="dn-review-list">
              <button
                v-for="(question, index) in visibleQuestions"
                :key="question.id"
                type="button"
                class="dn-review-item"
                @click="editQuestion(index)"
              >
                <div class="dn-review-item__text">
                  <span>Question {{ index + 1 }}</span>
                  <strong>{{ questionLabel(question) }}</strong>
                  <em>{{ displayAnswer(question) }}</em>
                </div>
                <svg
                  class="dn-review-item__chevron"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M9 6l6 6-6 6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div
              v-if="message || error"
              class="status-stack"
            >
              <p
                v-if="message"
                class="status-banner status-banner--success"
              >
                {{ message }}
              </p>
              <p
                v-if="error"
                class="status-banner"
              >
                {{ error }}
              </p>
            </div>

            <div class="wizard-actions">
              <button
                type="button"
                class="ghost-btn"
                @click="goPrevious"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                ><path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
                Back
              </button>
              <button
                type="button"
                class="primary-btn"
                :disabled="saving"
                @click="saveAnswers"
              >
                {{ saving ? 'Submitting\u2026' : 'Submit answers' }}
              </button>
            </div>
          </div>

          <div
            v-else-if="currentQuestion"
            :key="panelKey"
            class="wizard-panel"
          >
            <p class="wizard-eyebrow">
              {{ questionSet?.set_name || 'Clinical intake' }}
            </p>
            <h2 class="wizard-title">
              {{ questionLabel(currentQuestion) }}
              <span
                v-if="currentQuestion.is_required"
                class="dn-required-dot"
              >*</span>
            </h2>
            <p
              v-if="currentQuestion.help_text"
              class="wizard-subtitle"
            >
              {{ currentQuestion.help_text }}
            </p>
            <p
              v-else-if="isMultiChoice(currentQuestion)"
              class="wizard-subtitle"
            >
              Select all that apply.
            </p>

            <div class="step-fields">
              <div
                v-if="isHeightFeetQuestion(currentQuestion) && heightInchesQuestion"
                class="dn-height-group"
              >
                <label class="field-group">
                  <span>Feet</span>
                  <input
                    v-model="answers[currentQuestion.id]"
                    class="field-input"
                    type="number"
                    min="0"
                    inputmode="numeric"
                    placeholder="5"
                  >
                </label>
                <label class="field-group">
                  <span>Inches</span>
                  <input
                    v-model="answers[heightInchesQuestion.id]"
                    class="field-input"
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
                class="field-input field-textarea"
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
                  :class="{ 'is-selected': isOptionSelected(currentQuestion, option) }"
                  @click="setSingleOption(currentQuestion, optionValue(option))"
                >
                  <span class="dn-choice-mark">
                    <svg
                      v-if="isOptionSelected(currentQuestion, option)"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
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
                  :class="{ 'is-selected': isOptionSelected(currentQuestion, option) }"
                  @click="toggleMultiOption(currentQuestion, option)"
                >
                  <span class="dn-choice-mark dn-choice-mark--square">
                    <svg
                      v-if="isOptionSelected(currentQuestion, option)"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
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
                  :class="{ 'is-selected': answers[currentQuestion.id] === 'yes' }"
                  @click="setSingleOption(currentQuestion, 'yes')"
                >
                  <span class="dn-choice-mark">
                    <svg
                      v-if="answers[currentQuestion.id] === 'yes'"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  class="dn-answer-card"
                  :class="{ 'is-selected': answers[currentQuestion.id] === 'no' }"
                  @click="setSingleOption(currentQuestion, 'no')"
                >
                  <span class="dn-choice-mark">
                    <svg
                      v-if="answers[currentQuestion.id] === 'no'"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                  <span>No</span>
                </button>
              </div>

              <input
                v-else
                v-model="answers[currentQuestion.id]"
                class="field-input"
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
            </div>

            <div
              v-if="message || error"
              class="status-stack"
            >
              <p
                v-if="message"
                class="status-banner status-banner--success"
              >
                {{ message }}
              </p>
              <p
                v-if="error"
                class="status-banner"
              >
                {{ error }}
              </p>
            </div>

            <div
              v-if="isReviewReturnMode"
              class="wizard-actions"
            >
              <button
                type="button"
                class="ghost-btn"
                :disabled="isFirstQuestion"
                @click="goPrevious"
              >
                Previous question
              </button>

              <div class="wizard-action-group">
                <button
                  type="button"
                  class="ghost-btn"
                  :disabled="isLastQuestion"
                  @click="goNextReviewQuestion"
                >
                  Next question
                </button>
                <button
                  type="button"
                  class="primary-btn"
                  :disabled="saving || (currentQuestion.is_required && !isCurrentQuestionAnswered)"
                  @click="goToReview"
                >
                  Back to review
                </button>
              </div>
            </div>

            <div
              v-else
              class="wizard-actions"
            >
              <button
                type="button"
                class="ghost-btn"
                :disabled="isFirstQuestion"
                @click="goPrevious"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                ><path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
                Back
              </button>
              <button
                type="button"
                class="primary-btn"
                :disabled="saving || (currentQuestion.is_required && !isCurrentQuestionAnswered)"
                @click="goNext"
              >
                {{ isLastQuestion ? 'Review answers' : 'Continue' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.dn-intake-page {
  --ink: #1d1d1f;
  --ink-2: #6e6e73;
  --ink-3: #a1a1a6;
  --hairline: #e5e5ea;
  --surface: #ffffff;
  --surface-2: #fafafe;
  --accent: #0071e3;
  --accent-ink: #ffffff;
  --success: #1a936f;
  --danger: #d70015;
  --danger-bg: #fff1f0;
  --danger-border: #ffd6d3;
  --radius-lg: 22px;
  --radius-md: 14px;
  --radius-sm: 10px;
  --shadow: 0 18px 44px rgba(15, 23, 42, 0.055), 0 2px 7px rgba(15, 23, 42, 0.035);
  --ease: cubic-bezier(0.28, 0.11, 0.32, 1);
  width: min(620px, 100%);
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  color: var(--ink);
}

/* ---------- top bar ---------- */

.wizard-topbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.wizard-progress-track {
  position: relative;
  flex: 1;
  height: 4px;
  background: var(--hairline);
  border-radius: 999px;
  overflow: hidden;
}

.wizard-progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--accent);
  border-radius: 999px;
  transition: width 0.4s var(--ease);
}

.wizard-step-count {
  flex: 0 0 auto;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-2);
  white-space: nowrap;
}

/* ---------- panel ---------- */

.wizard-panel-frame {
  min-height: 360px;
}

.wizard-panel {
  background: var(--surface);
  border: 1px solid rgba(229, 229, 234, 0.8);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 1.35rem 1.45rem 1.25rem;
}

.dn-empty-state {
  text-align: center;
}

.wizard-eyebrow {
  margin: 0 0 0.25rem;
  font-size: 0.76rem;
  font-weight: 650;
  letter-spacing: 0.075em;
  text-transform: uppercase;
  color: var(--accent);
}

.wizard-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 640;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--ink);
}

.dn-required-dot {
  color: var(--danger);
}

.wizard-subtitle {
  margin: 0.3rem 0 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #66739a;
}

.step-fields {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1.05rem;
}

/* ---------- answer choices ---------- */

.dn-answer-list {
  display: grid;
  gap: 0.6rem;
}

.dn-answer-list--compact {
  grid-template-columns: repeat(2, 1fr);
}

.dn-answer-card {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  min-height: 48px;
  padding: 0.72rem 0.85rem;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 560;
  color: var(--ink);
  text-align: left;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.1s ease;
}

.dn-answer-card:hover {
  background: var(--surface);
  border-color: rgba(0, 113, 227, 0.28);
}

.dn-answer-card.is-selected {
  color: var(--accent);
  background: rgba(0, 113, 227, 0.08);
  border-color: var(--accent);
}

.dn-choice-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  color: #fff;
  background: transparent;
  border: 1.5px solid var(--ink-3);
  border-radius: 999px;
  transition: background 0.16s ease, border-color 0.16s ease;
}

.dn-choice-mark--square {
  border-radius: 6px;
}

.dn-answer-card.is-selected .dn-choice-mark {
  background: var(--accent);
  border-color: var(--accent);
}

/* ---------- inputs ---------- */

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-group span {
  font-size: 0.83rem;
  font-weight: 560;
  color: var(--ink-2);
}

.dn-height-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.field-input {
  appearance: none;
  width: 100%;
  min-height: 44px;
  padding: 0 0.9rem;
  font: inherit;
  font-size: 0.98rem;
  color: var(--ink);
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.field-textarea {
  min-height: 132px;
  padding: 0.75rem 0.9rem;
  resize: vertical;
  line-height: 1.5;
}

.field-input::placeholder {
  color: var(--ink-3);
}

.field-input:focus {
  background: var(--surface);
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.14);
}

.dn-character-count {
  margin-top: -0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-3);
  text-align: right;
}

/* ---------- review list ---------- */

.dn-review-list {
  display: grid;
  gap: 0.6rem;
  margin-top: 1.05rem;
}

.dn-review-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.82rem 0.9rem;
  text-align: left;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.dn-review-item:hover {
  background: var(--surface);
  border-color: rgba(0, 113, 227, 0.22);
}

.dn-review-item__text {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.dn-review-item__text span {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.dn-review-item__text strong {
  font-size: 0.92rem;
  font-weight: 650;
  color: var(--ink);
  line-height: 1.35;
}

.dn-review-item__text em {
  font-size: 0.85rem;
  font-style: normal;
  color: var(--ink-2);
  overflow-wrap: anywhere;
}

.dn-review-item__chevron {
  flex: 0 0 auto;
  color: var(--ink-3);
}

/* ---------- status + actions ---------- */

.status-stack {
  display: grid;
  gap: 0.6rem;
  margin-top: 0.9rem;
}

.status-banner {
  margin: 0;
  padding: 0.75rem 0.9rem;
  font-size: 0.87rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--danger);
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
}

.status-banner--success {
  color: var(--success);
  background: rgba(26, 147, 111, 0.1);
  border-color: rgba(26, 147, 111, 0.25);
}

.wizard-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1.1rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--hairline);
}

.wizard-action-group {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  min-width: 0;
}

.ghost-btn,
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 42px;
  padding: 0 1.2rem;
  font: inherit;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.ghost-btn {
  color: #2f3850;
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(229, 229, 234, 0.95);
}

.ghost-btn:hover:not(:disabled) {
  color: var(--accent);
  background: var(--surface);
  border-color: rgba(0, 113, 227, 0.28);
}

.ghost-btn:disabled {
  color: var(--ink-3);
  background: var(--surface-2);
  border-color: transparent;
  opacity: 0.7;
  cursor: not-allowed;
}

.primary-btn {
  min-width: 168px;
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent);
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #0077ed;
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- transitions ---------- */

.slide-next-enter-active,
.slide-prev-enter-active {
  transition: opacity 0.24s var(--ease), transform 0.24s var(--ease);
}

.slide-next-leave-active,
.slide-prev-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.slide-next-enter-from {
  opacity: 0;
  transform: translateX(14px);
}

.slide-next-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-14px);
}

.slide-prev-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

@media (prefers-reduced-motion: reduce) {
  .slide-next-enter-active,
  .slide-prev-enter-active,
  .slide-next-leave-active,
  .slide-prev-leave-active {
    transition: opacity 0.15s linear;
  }

  .slide-next-enter-from,
  .slide-next-leave-to,
  .slide-prev-enter-from,
  .slide-prev-leave-to {
    transform: none;
  }
}

@media (max-width: 640px) {
  .wizard-panel-frame {
    min-height: 0;
  }

  .wizard-panel {
    padding: 1.25rem 1.15rem;
    border-radius: var(--radius-md);
  }

  .wizard-title {
    font-size: 1.3rem;
  }

  .dn-answer-list--compact {
    grid-template-columns: 1fr;
  }

  .dn-height-group {
    grid-template-columns: 1fr;
  }

  .wizard-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .wizard-action-group {
    display: flex;
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .primary-btn,
  .ghost-btn {
    width: 100%;
  }
}
</style>
