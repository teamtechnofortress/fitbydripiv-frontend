<template>
  <div class="intake-form-stage">
    <div v-if="confirmedPatient" class="patient-info-card">
      <div class="patient-card-header">
        <div class="patient-badge">Existing Patient</div>
        <button class="edit-patient-btn" @click="$emit('resetPatient')" title="Edit patient selection">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="patient-card-body">
        <div class="patient-detail">
          <span class="detail-label">Name</span>
          <span class="detail-value">{{ confirmedPatient.firstName }} {{ confirmedPatient.lastName }}</span>
        </div>
        <div class="patient-detail">
          <span class="detail-label">Email</span>
          <span class="detail-value">{{ confirmedPatient.email }}</span>
        </div>
        <div v-if="confirmedPatient.dateOfBirth" class="patient-detail">
          <span class="detail-label">DOB</span>
          <span class="detail-value">{{ confirmedPatient.dateOfBirth }}</span>
        </div>
      </div>
    </div>

    <nav class="step-nav">
      <div class="step-nav-inner">
        <div
          v-for="step in steps"
          :key="step.id"
          class="step-pill"
          :class="{
            active: step.id === currentStep,
            completed: step.id < currentStep,
            locked: !isStepUnlocked(step.id) && step.id !== currentStep
          }"
        >
          <span class="step-num">
            <svg v-if="step.id < currentStep" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="!isStepUnlocked(step.id)" width="11" height="11" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span v-else>{{ step.id }}</span>
          </span>
          {{ step.title }}
          <span v-if="!isStepUnlocked(step.id) && step.id !== currentStep" class="lock-label">Complete previous step first</span>
        </div>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
      </div>
    </nav>

    <div v-if="submissionComplete" class="success-banner">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/>
        <path d="M6 10l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>{{ submissionMessage }}</span>
    </div>

    <div v-if="validationError" class="error-banner">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span>{{ validationError }}</span>
    </div>

    <div v-if="submitError" class="error-banner">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
        <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>{{ submitError }}</span>
    </div>

    <div v-if="currentStep === 1" class="form-section">
      <div class="section-header">
        <h2 class="section-title">Telehealth Remote Intake</h2>
        <p class="section-desc">Medical screening · Current medications · Conditions &amp; risk history</p>
      </div>

      <div class="block-group">
        <h3 class="block-label">Medical Screening</h3>
        <div class="yn-grid">
          <div v-for="question in screeningQuestions" :key="question.key" class="yn-card">
            <div class="yn-card-body">
              <span class="yn-tag">{{ question.title }}</span>
              <p class="yn-question">{{ question.prompt }}</p>
            </div>
            <div class="yn-buttons">
              <label
                v-for="option in yesNoOptions"
                :key="question.key + option.value"
                class="yn-btn"
                :class="{ selected: form.page1.medicalScreening[question.key] === option.value }"
              >
                <input class="sr-only" type="radio" :name="`screening-${question.key}`" :value="option.value" v-model="form.page1.medicalScreening[question.key]">
                {{ option.label }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="block-group">
        <h3 class="block-label">Current Medications <span class="required-star">*</span></h3>
        <p class="block-hint">Please list all medications (prescription or non-prescription) you are currently taking. Type "None" if you are not taking any.</p>
        <textarea
          v-model="form.page1.medications"
          rows="4"
          class="form-textarea"
          placeholder='List medications here… or type "None"'
        ></textarea>
      </div>

      <div class="two-col-grid">
        <div class="block-group">
          <h3 class="block-label">Current Conditions <span class="required-star">*</span></h3>
          <p class="block-hint">Select all that apply — choose <strong>None</strong> if none apply.</p>
          <div class="check-list">
            <label
              v-for="option in currentConditionsOptions"
              :key="option.value"
              class="check-item"
              :class="{ selected: form.page1.currentConditions.includes(option.value), 'none-option': option.value === 'none' }"
            >
              <input class="sr-only" type="checkbox" :value="option.value" :checked="form.page1.currentConditions.includes(option.value)" @change="toggleCurrentCondition(option.value)">
              <span class="check-box">
                <svg v-if="form.page1.currentConditions.includes(option.value)" width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              {{ option.label }}
            </label>
          </div>
        </div>
        <div class="block-group">
          <h3 class="block-label">Additional Conditions <span class="required-star">*</span></h3>
          <p class="block-hint">Select all that apply — choose <strong>None</strong> if none apply.</p>
          <div class="check-list">
            <label
              v-for="option in additionalConditionsOptions"
              :key="option.value"
              class="check-item"
              :class="{ selected: form.page1.additionalConditions.includes(option.value), 'none-option': option.value === 'none' }"
            >
              <input class="sr-only" type="checkbox" :value="option.value" :checked="form.page1.additionalConditions.includes(option.value)" @change="toggleAdditionalCondition(option.value)">
              <span class="check-box">
                <svg v-if="form.page1.additionalConditions.includes(option.value)" width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              {{ option.label }}
            </label>
          </div>
        </div>
      </div>

      <div class="block-group">
        <h3 class="block-label">Risk &amp; History</h3>
        <div class="yn-grid">
          <div v-for="question in riskQuestions" :key="question.key" class="yn-card">
            <div class="yn-card-body">
              <span class="yn-tag">{{ question.title }}</span>
              <p class="yn-question">{{ question.prompt }}</p>
              <div v-if="question.helperList" class="yn-helpers">
                <span v-for="example in question.helperList" :key="example" class="yn-helper-tag">{{ example }}</span>
              </div>
            </div>
            <div class="yn-buttons">
              <label
                v-for="option in yesNoOptions"
                :key="question.key + option.value"
                class="yn-btn"
                :class="{ selected: form.page1.medicalScreening[question.key] === option.value }"
              >
                <input class="sr-only" type="radio" :name="`risk-${question.key}`" :value="option.value" v-model="form.page1.medicalScreening[question.key]">
                {{ option.label }}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="currentStep === 2" class="form-section">
      <div class="section-header">
        <h2 class="section-title">Virtual Telehealth Remote Intake</h2>
        <p class="section-desc">Please check all the goals that apply to you.</p>
      </div>

      <div class="block-group">
        <h3 class="block-label">Treatment Goals <span class="required-star">*</span></h3>
        <p class="block-hint">Select all that apply — choose <strong>None</strong> if none apply.</p>
        <div class="goals-grid">
          <label
            v-for="item in goalsItems"
            :key="item.value"
            class="goal-item"
            :class="{ selected: form.page2.goals.includes(item.value), 'none-option': item.value === 'none' }"
          >
            <input class="sr-only" type="checkbox" :value="item.value" :checked="form.page2.goals.includes(item.value)" @change="toggleGoal(item.value)">
            <span class="goal-check">
              <svg v-if="form.page2.goals.includes(item.value)" width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            {{ item.label }}
          </label>
        </div>
        <p class="goals-note">Note: Some goals appear more than once — select each instance that applies.</p>
      </div>
    </div>

    <div v-else class="form-section">
      <div class="section-header">
        <h2 class="section-title">Telehealth Patient Info</h2>
        <p class="section-desc">Medical history and personal details</p>
      </div>

      <div class="block-group">
        <h3 class="block-label">Medical History <span class="required-star">*</span></h3>
        <p class="block-hint">Do you currently have or have you ever had any of the following? Choose <strong>None</strong> if none apply.</p>
        <div class="history-grid">
          <label
            v-for="item in medicalHistoryItems"
            :key="item.value"
            class="check-item"
            :class="{ selected: form.page3.medicalHistory.includes(item.value), 'none-option': item.value === 'none' }"
          >
            <input class="sr-only" type="checkbox" :value="item.value" :checked="form.page3.medicalHistory.includes(item.value)" @change="toggleMedicalHistory(item.value)">
            <span class="check-box">
              <svg v-if="form.page3.medicalHistory.includes(item.value)" width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            {{ item.label }}
          </label>
        </div>
      </div>

      <div class="divider"></div>

      <div class="block-group">
        <h3 class="block-label">Personal Information</h3>
        <div class="field-row three-col">
          <div class="field-group">
            <label class="field-label">First Name <span class="required-star">*</span></label>
            <input v-model="form.page3.person.firstName" type="text" class="form-input" placeholder="Jane">
          </div>
          <div class="field-group">
            <label class="field-label">Middle Name</label>
            <input v-model="form.page3.person.middleName" type="text" class="form-input" placeholder="A.">
          </div>
          <div class="field-group">
            <label class="field-label">Last Name <span class="required-star">*</span></label>
            <input v-model="form.page3.person.lastName" type="text" class="form-input" placeholder="Doe">
          </div>
        </div>
        <div class="field-row two-col">
          <div class="field-group">
            <label class="field-label">Address <span class="required-star">*</span></label>
            <input v-model="form.page3.person.address" type="text" class="form-input" placeholder="123 Wellness Ave">
          </div>
          <div class="field-group">
            <label class="field-label">City <span class="required-star">*</span></label>
            <input v-model="form.page3.person.city" type="text" class="form-input" placeholder="Austin">
          </div>
        </div>
        <div class="field-row three-col">
          <div class="field-group">
            <label class="field-label">State <span class="required-star">*</span></label>
            <input v-model="form.page3.person.state" type="text" class="form-input" placeholder="TX">
          </div>
          <div class="field-group">
            <label class="field-label">Zip Code <span class="required-star">*</span></label>
            <input v-model="form.page3.person.zip" type="text" class="form-input" placeholder="73301">
          </div>
          <div class="field-group">
            <label class="field-label">Email <span class="required-star">*</span></label>
            <input v-model="form.page3.person.email" type="email" class="form-input" placeholder="you@example.com">
          </div>
        </div>
        <div class="field-row four-col">
          <div class="field-group">
            <label class="field-label">Date of Birth <span class="required-star">*</span></label>
            <input v-model="form.page3.person.dateOfBirth" type="date" class="form-input">
          </div>
          <div class="field-group">
            <label class="field-label">Age</label>
            <input v-model="form.page3.person.age" type="text" readonly class="form-input readonly-input" placeholder="Auto">
          </div>
          <div class="field-group">
            <label class="field-label">Gender <span class="required-star">*</span></label>
            <select v-model="form.page3.person.gender" class="form-select">
              <option value="" disabled>Select</option>
              <option v-for="option in genders" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Ethnicity <span class="required-star">*</span></label>
            <select v-model="form.page3.person.ethnicity" class="form-select">
              <option value="" disabled>Select</option>
              <option v-for="option in ethnicityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="block-group">
        <h3 class="block-label">Health Information</h3>
        <div class="field-row two-col">
          <div class="field-group">
            <label class="field-label">Current Conditions</label>
            <textarea v-model="form.page3.health.currentConditions" rows="3" class="form-textarea" placeholder="Include diagnoses or symptoms…"></textarea>
          </div>
          <div class="field-group">
            <label class="field-label">Allergies</label>
            <textarea v-model="form.page3.health.allergies" rows="3" class="form-textarea" placeholder="Medication, food, or environmental…"></textarea>
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Allergy Reactions</label>
          <textarea v-model="form.page3.health.allergyReactions" rows="3" class="form-textarea" placeholder="Describe severity or symptoms…"></textarea>
        </div>
      </div>
    </div>

    <div class="nav-bar">
      <button v-if="!isFirstStep" type="button" class="nav-btn secondary" @click="$emit('prev')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/>
        </svg>
        Previous Step
      </button>
      <span v-else></span>

      <span class="step-counter">Step {{ currentStep }} of {{ steps.length }}</span>

      <button
        v-if="!isLastStep"
        type="button"
        class="nav-btn primary"
        @click="$emit('next')"
      >
        Continue to {{ nextStepTitle }}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      <button
        v-else
        type="button"
        class="nav-btn primary"
        :disabled="isSubmitting"
        @click="$emit('submit')"
      >
        <span v-if="isSubmitting" class="spinner"></span>
        {{ isSubmitting ? 'Submitting…' : 'Submit Intake' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  additionalConditionsOptions,
  currentConditionsOptions,
  ethnicityOptions,
  genders,
  goalsItems,
  medicalHistoryItems,
  riskQuestions,
  screeningQuestions,
  yesNoOptions,
} from '../formOptions'

const props = defineProps({
  form: { type: Object, required: true },
  steps: { type: Array, required: true },
  currentStep: { type: Number, required: true },
  isFirstStep: { type: Boolean, required: true },
  isLastStep: { type: Boolean, required: true },
  nextStepTitle: { type: String, default: '' },
  progressPercentage: { type: Number, required: true },
  validationError: { type: String, default: null },
  submitError: { type: String, default: null },
  submissionComplete: { type: Boolean, default: false },
  submissionMessage: { type: String, default: '' },
  isSubmitting: { type: Boolean, default: false },
  confirmedPatient: { type: Object, default: null },
  isStepUnlocked: {
    type: Function,
    default: () => true,
  },
})

defineEmits(['next', 'prev', 'submit', 'resetPatient'])

const toggleSelection = (list, value, exclusiveValue = null) => {
  const existingIndex = list.indexOf(value)
  if (existingIndex !== -1) {
    list.splice(existingIndex, 1)
    return
  }
  if (exclusiveValue && value === exclusiveValue) {
    list.splice(0, list.length)
    list.push(value)
    return
  }
  if (exclusiveValue) {
    const idx = list.indexOf(exclusiveValue)
    if (idx !== -1) list.splice(idx, 1)
  }
  list.push(value)
}

const toggleCurrentCondition = (value) => {
  toggleSelection(props.form.page1.currentConditions, value, 'none')
}

const toggleAdditionalCondition = (value) => {
  toggleSelection(props.form.page1.additionalConditions, value, 'none')
}

const toggleGoal = (value) => {
  toggleSelection(props.form.page2.goals, value, 'none')
}

const toggleMedicalHistory = (value) => {
  toggleSelection(props.form.page3.medicalHistory, value, 'none')
}
</script>

<style scoped>
.intake-form-stage { margin-top: 20px; display: flex; flex-direction: column; gap: 24px; }
.patient-info-card {
  background: linear-gradient(135deg, var(--green-light), rgba(167,243,208,.3));
  border: 1.5px solid var(--green-mid);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  box-shadow: 0 4px 12px rgba(5,150,105,.08);
}
.patient-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.patient-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--green-dark);
  background: rgba(5,150,105,.1);
  border: 1px solid var(--green-mid);
  border-radius: 999px;
  padding: 4px 10px;
}
.edit-patient-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--green-mid);
  background: rgba(255,255,255,.6);
  border-radius: 6px;
  color: var(--green-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
}
.edit-patient-btn:hover {
  background: #fff;
  border-color: var(--green-dark);
}
.patient-card-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.patient-detail { display: flex; flex-direction: column; gap: 2px; }
.detail-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--green-dark);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}
.step-nav {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px 20px 16px;
  box-shadow: var(--shadow-sm);
}
.step-nav-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.step-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px 7px 10px;
  background: transparent;
  border: 1.5px solid var(--border);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
  user-select: none;
}
.step-pill.active {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}
.step-pill.completed {
  background: var(--green-light);
  border-color: var(--green-mid);
  color: var(--green-dark);
}
.step-pill.locked { opacity: .55; }
.step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}
.step-pill.active .step-num { background: rgba(255,255,255,.25); color: #fff; }
.step-pill.completed .step-num { background: var(--green); color: #fff; }
.step-pill:not(.active):not(.completed) .step-num { background: var(--border); color: var(--text-2); }
.lock-label {
  font-size: 10px;
  color: var(--text-3);
  opacity: .8;
  font-style: italic;
}
.progress-track {
  margin-top: 14px;
  height: 3px;
  background: var(--border);
  border-radius: 99px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--gradient);
  border-radius: 99px;
  transition: width .4s cubic-bezier(.4,0,.2,1);
}
.success-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--green-light);
  border: 1px solid var(--green-mid);
  border-radius: var(--radius);
  padding: 16px 18px;
  color: var(--green-dark);
  font-size: 14px;
  font-weight: 500;
}
.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius);
  padding: 16px 18px;
  color: #b91c1c;
  font-size: 14px;
  font-weight: 500;
}
.form-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.section-header {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px 28px 24px;
  box-shadow: var(--shadow-sm);
}
.section-title {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}
.section-desc {
  font-size: 14px;
  color: var(--text-3);
  margin: 6px 0 0;
}
.block-group {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px 24px 20px;
  box-shadow: var(--shadow-sm);
}
.block-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--green);
  margin: 0 0 6px;
}
.block-hint {
  font-size: 14px;
  color: var(--text-3);
  margin: 0 0 16px;
  line-height: 1.5;
}
.required-star { color: #ef4444; margin-left: 2px; }
.yn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.yn-card {
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  background: var(--surface-2);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.yn-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  color: var(--green);
  background: var(--green-light);
  border-radius: 999px;
  padding: 2px 8px;
}
.yn-question {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin: 0;
}
.yn-helpers {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
}
.yn-helper-tag {
  font-size: 11px;
  background: #f1f5f0;
  color: var(--text-2);
  border-radius: 4px;
  padding: 2px 7px;
}
.yn-buttons { display: flex; gap: 8px; }
.yn-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  background: var(--surface);
  cursor: pointer;
  transition: all .15s;
}
.yn-btn.selected {
  border-color: var(--green);
  background: var(--green);
  color: #fff;
}
.two-col-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 640px) { .two-col-grid { grid-template-columns: 1fr; } }
.check-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
}
.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-2);
  cursor: pointer;
  transition: all .15s;
}
.check-item.selected {
  border-color: var(--green);
  background: var(--green-light);
  color: var(--green-dark);
}
.check-item.none-option { border-style: dashed; font-style: italic; }
.check-item.none-option.selected {
  border-style: solid;
  font-style: normal;
}
.check-box {
  width: 18px;
  height: 18px;
  border: 1.5px solid currentColor;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.check-item.selected .check-box {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}
.goals-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
}
@media (max-width: 600px) { .goals-grid { grid-template-columns: repeat(2, 1fr); } }
.goal-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-2);
  cursor: pointer;
  transition: all .15s;
}
.goal-item.selected {
  border-color: transparent;
  background: var(--gradient);
  color: #fff;
  box-shadow: 0 10px 20px rgba(37,99,235,.18);
}
.goal-item.none-option {
  border-style: dashed;
  font-style: italic;
}
.goal-item.none-option.selected {
  border-style: solid;
  font-style: normal;
}
.goal-check {
  width: 18px;
  height: 18px;
  border: 1.5px solid currentColor;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.goals-note {
  margin-top: 14px;
  font-size: 12px;
  color: var(--text-3);
  font-style: italic;
}
.history-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
}
@media (max-width: 640px) { .history-grid { grid-template-columns: repeat(2, 1fr); } }
.divider {
  height: 1px;
  background: var(--border);
  margin: 0;
}
.field-row {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}
.two-col { grid-template-columns: 1fr 1fr; }
.three-col { grid-template-columns: 1fr 1fr 1fr; }
.four-col { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 700px) {
  .two-col, .three-col, .four-col { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 440px) {
  .two-col, .three-col, .four-col { grid-template-columns: 1fr; }
}
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  letter-spacing: .03em;
}
.form-input, .form-select, .form-textarea {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text);
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 9px 13px;
  width: 100%;
  box-sizing: border-box;
  transition: border-color .15s, box-shadow .15s;
  outline: none;
}
.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(5,150,105,.12);
}
.form-textarea { resize: vertical; line-height: 1.55; }
.readonly-input { background: var(--surface-2); color: var(--text-3); cursor: default; }
.form-select { cursor: pointer; }
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 12px;
}
.step-counter {
  font-size: 13px;
  color: var(--text-3);
  font-weight: 500;
}
.nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all .2s;
}
.nav-btn.secondary {
  background: var(--surface);
  border: 1.5px solid var(--border);
  color: var(--green);
}
.nav-btn.secondary:hover {
  border-color: var(--green);
  background: var(--green-light);
  color: var(--green-dark);
}
.nav-btn.primary {
  background: var(--gradient);
  color: #fff;
  box-shadow: 0 8px 20px rgba(37,99,235,.18);
}
.nav-btn.primary:hover {
  filter: brightness(.98);
  box-shadow: 0 12px 26px rgba(37,99,235,.26);
}
.nav-btn.primary:disabled { opacity: .55; cursor: not-allowed; }
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
</style>
