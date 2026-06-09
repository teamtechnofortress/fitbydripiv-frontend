<script setup>
import axios from 'axios'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { v4 as uuidv4 } from 'uuid'
import { PATIENT_INTAKE_FORM_URL, getIntakeSubmissionUrl } from '@/network/const'
import ConfirmPatientModal from './intake/components/ConfirmPatientModal.vue'
import IntakeFormStage from './intake/components/IntakeFormStage.vue'
import IntakeOrderConfirmation from './intake/components/IntakeOrderConfirmation.vue'
import PatientSearchStage from './intake/components/PatientSearchStage.vue'
import PatientTypeStage from './intake/components/PatientTypeStage.vue'
import { riskQuestions, screeningQuestions } from './intake/formOptions'

const router = useRouter()
const route = useRoute()

// ─── STATES ──────────────────────────────────────────

const FORM_STAGE = {
  PATIENT_TYPE: 'patient-type',        // Step 1: Select new or existing
  PATIENT_SEARCH: 'patient-search',    // Step 2: Search for existing patient
  FORM_INTAKE: 'form-intake',          // Step 3: Fill out form (steps 1-3)
}

const formStage = ref(FORM_STAGE.PATIENT_TYPE)
const confirmedPatient = ref(null)     // Confirmed existing patient data
const isSubmitting = ref(false)
const submissionComplete = ref(false)
const submissionMessage = ref('Your responses have been captured. Our clinical team will review your intake and follow up with next steps.')
const submissionResult = ref(null)
const submitError = ref(null)
const validationError = ref(null)

const steps = [
  { id: 1, title: 'Medical Screening' },
  { id: 2, title: 'Goals' },
  { id: 3, title: 'Patient Info' },
]

const currentStep = ref(1)
const completedSteps = ref([1])

const orderUuid = computed(() => {
  const fromQuery = route.query?.order_uuid
  const fromParams = route.params?.order_uuid
  
  return String(fromQuery || fromParams || '')
})

// ─── EXISTING PATIENT LOOKUP ──────────────────────────

const existingLookup = reactive({
  status: 'idle',           // idle | loading | success | error | not-found
  message: '',
  foundPatient: null,       // Patient data if found
  showConfirmModal: false,  // Show confirmation modal
})

const searchEmail = ref('')

const resetExistingLookupFeedback = () => {
  existingLookup.status = 'idle'
  existingLookup.message = ''
}

const isValidEmail = value => /\S+@\S+\.\S+/.test(value)

// ─── FORM REACTIVE STATE ──────────────────────────────

const form = reactive({
  page1: {
    medicalScreening: {
      diabetes: '',
      bloodThinners: '',
      alcohol: '',
      glpHistory: '',
      pancreatitis: '',
      thyroidCancer: '',
      renalImpairment: '',
    },
    medications: '',
    currentConditions: [],
    additionalConditions: [],
  },
  page2: {
    goals: [],
  },
  page3: {
    medicalHistory: [],
    person: {
      firstName: '',
      middleName: '',
      lastName: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      email: '',
      dateOfBirth: '',
      age: '',
      gender: '',
      ethnicity: '',
    },
    health: {
      currentConditions: '',
      allergies: '',
      allergyReactions: '',
    },
  },
})

// ─── UTILITY FUNCTIONS ────────────────────────────────

const normalizeArrayValues = values => {
  if (!Array.isArray(values)) return []
  
  return values
    .map(item => {
      if (typeof item === 'string') return item.replace(/_/g, '-').trim()
      
      return item
    })
    .filter(item => item !== null && item !== undefined && item !== '')
}

const calculateAge = dateString => {
  if (!dateString) return ''
  const birthDate = new Date(dateString)
  if (Number.isNaN(birthDate.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1
  
  return age >= 0 ? String(age) : ''
}

const applyIntakePrefill = data => {
  if (!data) return
  const screening = data.medicalScreening || {}

  Object.assign(form.page1.medicalScreening, {
    diabetes: screening.diabetes ?? '',
    bloodThinners: screening.bloodThinners ?? '',
    alcohol: screening.alcohol ?? '',
    glpHistory: screening.glpHistory ?? '',
    pancreatitis: screening.pancreatitis ?? '',
    thyroidCancer: screening.thyroidCancer ?? '',
    renalImpairment: screening.renalImpairment ?? '',
  })
  form.page1.medications = data.medications ?? ''
  form.page1.currentConditions = normalizeArrayValues(data.currentConditions)
  form.page1.additionalConditions = normalizeArrayValues(data.additionalConditions)
  form.page2.goals = normalizeArrayValues(data.goals)
  form.page3.medicalHistory = normalizeArrayValues(data.medicalHistory)

  const derivedAge = data.age != null ? String(data.age) : (data.dateOfBirth ? calculateAge(data.dateOfBirth) : '')

  Object.assign(form.page3.person, {
    firstName: data.firstName ?? '',
    middleName: data.middleName ?? '',
    lastName: data.lastName ?? '',
    phone: data.phone ?? '',
    address: data.address ?? '',
    city: data.city ?? '',
    state: data.state ?? '',
    zip: data.zip ?? '',
    email: data.email ?? '',
    dateOfBirth: data.dateOfBirth ?? '',
    age: derivedAge,
    gender: data.gender ?? '',
    ethnicity: data.ethnicity ?? '',
  })
  form.page3.health.currentConditions = data.currentConditionsNotes ?? ''
  form.page3.health.allergies = data.allergies ?? ''
  form.page3.health.allergyReactions = data.allergyReactions ?? ''
}

// ─── AGE WATCHER ──────────────────────────────────────

watch(() => form.page3.person.dateOfBirth, value => {
  form.page3.person.age = calculateAge(value)
})

// ─── EXISTING PATIENT LOOKUP ──────────────────────────

const lookupExistingPatient = async email => {
  existingLookup.status = 'loading'
  existingLookup.message = 'Searching for your record...'
  try {
    const { data } = await axios.get(PATIENT_INTAKE_FORM_URL, { params: { email } })
    if (data?.data) {
      existingLookup.foundPatient = data.data
      existingLookup.status = 'success'
      existingLookup.message = ''
      existingLookup.showConfirmModal = true
    }
  } catch (error) {
    if (error?.response?.status === 404) {
      existingLookup.status = 'not-found'
      existingLookup.message = error?.response?.data?.message || 'Patient not found. Please register as a new patient.'
      
      return
    }
    existingLookup.status = 'error'
    existingLookup.message = extractErrorMessage(error)
  }
}

const handleExistingEmailSearch = () => {
  const trimmed = searchEmail.value?.trim() || ''
  if (!trimmed) {
    resetExistingLookupFeedback()
    
    return
  }
  if (!isValidEmail(trimmed)) {
    validationError.value = 'Please enter a valid email address.'
    
    return
  }
  validationError.value = null
  lookupExistingPatient(trimmed)
}

const confirmExistingPatient = () => {
  if (!existingLookup.foundPatient) return
  confirmedPatient.value = existingLookup.foundPatient
  applyIntakePrefill(existingLookup.foundPatient)
  existingLookup.showConfirmModal = false
  formStage.value = FORM_STAGE.FORM_INTAKE
  scrollToTop()
}

const rejectExistingPatient = () => {
  existingLookup.showConfirmModal = false
  searchEmail.value = ''
  resetExistingLookupFeedback()
  existingLookup.foundPatient = null
}

const goToPatientSearch = () => {
  validationError.value = null
  formStage.value = FORM_STAGE.PATIENT_SEARCH
  scrollToTop()
}

const goToPatientTypeStage = () => {
  validationError.value = null
  formStage.value = FORM_STAGE.PATIENT_TYPE
  scrollToTop()
}

const startNewPatient = () => {
  validationError.value = null
  formStage.value = FORM_STAGE.FORM_INTAKE
  confirmedPatient.value = null
  searchEmail.value = ''
  existingLookup.foundPatient = null
  resetExistingLookupFeedback()
  resetForm()
  scrollToTop()
}

const goBackFromForm = () => {
  confirmedPatient.value = null
  formStage.value = FORM_STAGE.PATIENT_TYPE
  resetForm()
  searchEmail.value = ''
  resetExistingLookupFeedback()
  currentStep.value = 1
  completedSteps.value = [1]
  validationError.value = null
  scrollToTop()
}

// ─── VALIDATION ────────────────────────────────────────

const validateStep1 = () => {
  const s = form.page1.medicalScreening
  const allScreening = [...screeningQuestions, ...riskQuestions]
  for (const q of allScreening) {
    if (!s[q.key]) return `Please answer: "${q.prompt}"`
  }
  if (!form.page1.medications.trim()) return 'Please list your current medications (or type "None").'
  if (form.page1.currentConditions.length === 0) return 'Please select at least one option under Current Conditions (choose "None" if none apply).'
  if (form.page1.additionalConditions.length === 0) return 'Please select at least one option under Additional Conditions (choose "None" if none apply).'
  
  return null
}

const validateStep2 = () => {
  if (form.page2.goals.length === 0) return 'Please select at least one treatment goal (choose "None" if none apply).'
  
  return null
}

const validateStep3 = () => {
  const p = form.page3.person
  if (!p.firstName.trim()) return 'First Name is required.'
  if (!p.lastName.trim()) return 'Last Name is required.'
  if (!p.address.trim()) return 'Address is required.'
  if (!p.city.trim()) return 'City is required.'
  if (!p.state.trim()) return 'State is required.'
  if (!p.zip.trim()) return 'Zip Code is required.'
  if (!p.email.trim()) return 'Email is required.'
  if (!p.dateOfBirth) return 'Date of Birth is required.'
  if (!p.gender) return 'Gender is required.'
  if (!p.ethnicity) return 'Ethnicity is required.'
  if (form.page3.medicalHistory.length === 0) return 'Please select at least one Medical History option (choose "None" if none apply).'
  
  return null
}

// ─── FORM NAVIGATION ──────────────────────────────────

const isStepUnlocked = stepId => completedSteps.value.includes(stepId)

const progressPercentage = computed(() => {
  if (steps.length <= 1) return 100
  
  return ((currentStep.value - 1) / (steps.length - 1)) * 100
})

const isFirstStep = computed(() => currentStep.value === 1)
const isLastStep = computed(() => currentStep.value === steps.length)

const nextStepTitle = computed(() => {
  const index = steps.findIndex(step => step.id === currentStep.value)
  
  return steps[index + 1]?.title ?? ''
})

const goToNext = () => {
  if (isLastStep.value) return
  validationError.value = null

  let error = null
  if (currentStep.value === 1) error = validateStep1()
  else if (currentStep.value === 2) error = validateStep2()

  if (error) {
    validationError.value = error
    scrollToTop()
    
    return
  }

  const nextId = currentStep.value + 1
  if (!completedSteps.value.includes(nextId)) completedSteps.value.push(nextId)

  currentStep.value = nextId
  scrollToTop()
}

const goToPrevious = () => {
  if (isFirstStep.value) return
  validationError.value = null
  currentStep.value -= 1
  scrollToTop()
}

// ─── PAYLOAD & SUBMISSION ───────────────────────────

const normalizeYesNo = value => (value === 'yes' || value === 'no' ? value : null)
const formatText = value => value?.trim() ?? ''

const buildPayload = () => {
  const person = form.page3.person
  const screening = form.page1.medicalScreening
  
  return {
    firstName: formatText(person.firstName),
    middleName: formatText(person.middleName),
    lastName: formatText(person.lastName),
    phone: formatText(person.phone),
    address: formatText(person.address),
    city: formatText(person.city),
    state: formatText(person.state),
    zip: formatText(person.zip),
    email: formatText(person.email),
    dateOfBirth: person.dateOfBirth || null,
    age: person.age ? Number(person.age) : null,
    gender: person.gender || null,
    ethnicity: person.ethnicity || null,
    medicalScreening: {
      diabetes: normalizeYesNo(screening.diabetes),
      bloodThinners: normalizeYesNo(screening.bloodThinners),
      alcohol: normalizeYesNo(screening.alcohol),
      glpHistory: normalizeYesNo(screening.glpHistory),
      pancreatitis: normalizeYesNo(screening.pancreatitis),
      thyroidCancer: normalizeYesNo(screening.thyroidCancer),
      renalImpairment: normalizeYesNo(screening.renalImpairment),
    },
    currentConditions: [...form.page1.currentConditions],
    additionalConditions: [...form.page1.additionalConditions],
    goals: [...form.page2.goals],
    medicalHistory: [...form.page3.medicalHistory],
    medications: formatText(form.page1.medications),
    currentConditionsNotes: formatText(form.page3.health.currentConditions),
    allergies: formatText(form.page3.health.allergies),
    allergyReactions: formatText(form.page3.health.allergyReactions),
  }
}

const extractErrorMessage = error => {
  const responseData = error?.response?.data
  if (typeof responseData === 'string' && responseData.trim()) return responseData
  if (responseData?.errors) {
    const errors = responseData.errors
    if (Array.isArray(errors) && errors.length > 0) return errors[0]
    const firstKey = Object.keys(errors)[0]
    const firstVal = errors[firstKey]
    if (Array.isArray(firstVal)) return firstVal[0]
    if (typeof firstVal === 'string') return firstVal
  }
  if (typeof responseData?.err_msg === 'string' && responseData.err_msg.trim()) return responseData.err_msg
  if (typeof responseData?.error === 'string' && responseData.error.trim()) return responseData.error
  if (typeof responseData?.message === 'string') return responseData.message
  if (typeof error?.message === 'string' && error.message.trim()) return error.message
  
  return 'Unable to submit intake. Please review your answers and try again.'
}

const handleSubmit = async () => {
  if (isSubmitting.value) return
  validationError.value = null

  const error = validateStep3()
  if (error) { validationError.value = error; scrollToTop() 

    return }

  isSubmitting.value = true
  submissionComplete.value = false
  submitError.value = null
  try {
    const payload = buildPayload()
    const idempotencyKey = uuidv4()
    const intakeUrl = orderUuid.value ? getIntakeSubmissionUrl(orderUuid.value) : null
    if (!intakeUrl) {
      submitError.value = 'Your checkout session has expired. Please start again from the pricing page.'
      scrollToTop()
      
      return
    }

    const { data } = await axios.post(intakeUrl, payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
        Accept: 'application/json',
      },
    })

    submissionResult.value = data?.data || null
    submissionMessage.value = data?.message || 'Patient intake submitted successfully.'
    submissionComplete.value = true
    scrollToTop()
  } catch (error) {
    submitError.value = extractErrorMessage(error)
    scrollToTop()
  } finally {
    isSubmitting.value = false
  }
}

// ─── UTILITIES ──────────────────────────────────────

const scrollToTop = (smooth = true) => {
  if (typeof window !== 'undefined')
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
}

const resetForm = () => {
  form.page1.medicalScreening = {
    diabetes: '',
    bloodThinners: '',
    alcohol: '',
    glpHistory: '',
    pancreatitis: '',
    thyroidCancer: '',
    renalImpairment: '',
  }
  form.page1.medications = ''
  form.page1.currentConditions = []
  form.page1.additionalConditions = []
  form.page2.goals = []
  form.page3.medicalHistory = []
  form.page3.person = {
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    email: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    ethnicity: '',
  }
  form.page3.health = {
    currentConditions: '',
    allergies: '',
    allergyReactions: '',
  }
}

const goBack = () => router.back()

const redirectToHome = () => {
  submitError.value = null
  router.push('/')
}

const updateSubmissionResult = value => {
  submissionResult.value = value
}

onMounted(() => scrollToTop(false))
</script>

<template>
  <div class="intake-root">
    <div class="bg-orb bg-orb-1" />
    <div class="bg-orb bg-orb-2" />

    <div class="intake-container">
      <button
        class="back-btn"
        @click="goBack"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 18l-6-6 6-6"
          />
        </svg>
        Back
      </button>

      <header class="intake-header">
        <div class="brand-badge">
          <span class="brand-dot" />
          FitByShot · Telehealth Intake
        </div>
        <h1 class="intake-title">
          Complete Your Remote Intake
        </h1>
        <p class="intake-subtitle">
          Answer a few medical and lifestyle questions so our clinical team can personalize your treatment plan.
        </p>
      </header>

      <PatientTypeStage
        v-if="formStage === FORM_STAGE.PATIENT_TYPE"
        @select-existing="goToPatientSearch"
        @select-new="startNewPatient"
      />

      <PatientSearchStage
        v-else-if="formStage === FORM_STAGE.PATIENT_SEARCH"
        :search-email="searchEmail"
        :lookup-status="existingLookup"
        :validation-error="validationError"
        @back="goToPatientTypeStage"
        @search="handleExistingEmailSearch"
        @start-new="startNewPatient"
        @update:search-email="value => (searchEmail = value)"
      />

      <IntakeOrderConfirmation
        v-else-if="submissionComplete"
        :confirmation-data="submissionResult"
        :confirmation-message="submissionMessage"
        @updated="updateSubmissionResult"
      />

      <IntakeFormStage
        v-else
        :form="form"
        :steps="steps"
        :current-step="currentStep"
        :is-first-step="isFirstStep"
        :is-last-step="isLastStep"
        :next-step-title="nextStepTitle"
        :progress-percentage="progressPercentage"
        :validation-error="validationError"
        :submit-error="null"
        :is-submitting="isSubmitting"
        :confirmed-patient="confirmedPatient"
        :is-step-unlocked="isStepUnlocked"
        @prev="goToPrevious"
        @next="goToNext"
        @submit="handleSubmit"
        @reset-patient="goBackFromForm"
      />
    </div>

    <div
      v-if="submitError"
      class="error-dialog-backdrop"
      role="presentation"
    >
      <div
        class="error-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-submit-error-title"
      >
        <div class="error-dialog-badge">
          Submission Error
        </div>
        <h2
          id="intake-submit-error-title"
          class="error-dialog-title"
        >
          We couldn't submit your intake form
        </h2>
        <p class="error-dialog-text">
          {{ submitError }}
        </p>
        <button
          class="error-dialog-btn"
          type="button"
          @click="redirectToHome"
        >
          Go to Home
        </button>
      </div>
    </div>
  </div>

  <ConfirmPatientModal
    :patient="existingLookup.foundPatient"
    :open="existingLookup.showConfirmModal"
    @confirm="confirmExistingPatient"
    @reject="rejectExistingPatient"
  />
</template>


<style scoped>
.intake-root {
  --green: #059669;
  --green-light: #ecfdf5;
  --green-mid: #a7f3d0;
  --green-dark: #047857;
  --blue: #2563eb;
  --gradient: linear-gradient(90deg, var(--green), var(--blue));
  --surface: #ffffff;
  --surface-2: #f9fafb;
  --border: #e5e7eb;
  --text: #111827;
  --text-2: #374151;
  --text-3: #6b7280;
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 18px;
  --shadow-sm: 0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.04);
  --shadow: 0 4px 16px rgba(15,23,42,.08), 0 1px 4px rgba(15,23,42,.04);
  --shadow-lg: 0 20px 40px rgba(15,23,42,.12), 0 4px 8px rgba(15,23,42,.08);
  --font-display: 'Open Sans', 'Segoe UI', 'Helvetica Neue', sans-serif;
  --font-body: 'Open Sans', 'Segoe UI', 'Helvetica Neue', sans-serif;

  position: relative;
  min-height: 100vh;
  background: var(--surface-2);
  font-family: var(--font-body);
  color: var(--text);
  padding-top: 80px;
  overflow-x: hidden;
}

.bg-orb {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  filter: blur(80px);
  opacity: .35;
}
.bg-orb-1 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, #bbf7d0, transparent 70%);
  top: -100px; right: -150px;
}
.bg-orb-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, #d1fae5, transparent 70%);
  bottom: 100px; left: -100px;
}

.intake-container {
  position: relative;
  z-index: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px 80px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 10px;
  background: rgba(255,255,255,.9);
  border: 1px solid var(--green-light);
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  color: var(--green);
  cursor: pointer;
  transition: all .15s;
  box-shadow: var(--shadow-sm);
}
.back-btn:hover { border-color: var(--green); color: var(--green-dark); background: var(--green-light); }

.intake-header { margin: 28px 0 0; }
.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--green);
  background: var(--green-light);
  border: 1px solid var(--green-mid);
  border-radius: 999px;
  padding: 4px 12px;
}
.brand-dot {
  width: 6px; height: 6px;
  background: var(--green);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .5; transform: scale(.8); }
}
.intake-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 700;
  color: var(--text);
  line-height: 1.15;
  margin: 14px 0 0;
  letter-spacing: -.02em;
}
.intake-subtitle {
  font-size: 15px;
  color: var(--text-3);
  margin: 10px 0 0;
  max-width: 560px;
  line-height: 1.6;
}
.error-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.52);
  backdrop-filter: blur(10px);
}
.error-dialog {
  width: min(100%, 520px);
  background: linear-gradient(180deg, rgba(255,255,255,.98) 0%, rgba(249,250,251,.98) 100%);
  border: 1px solid var(--green-mid);
  border-radius: 24px;
  padding: 28px;
  box-shadow: var(--shadow-lg);
}
.error-dialog-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--green-light);
  color: var(--green-dark);
  border: 1px solid var(--green-mid);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.error-dialog-title {
  margin: 16px 0 10px;
  font-family: var(--font-display);
  font-size: clamp(24px, 3vw, 30px);
  line-height: 1.15;
  color: var(--text);
}
.error-dialog-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-2);
}
.error-dialog-btn {
  margin-top: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 170px;
  padding: 12px 18px;
  border: none;
  border-radius: 999px;
  background: var(--gradient);
  color: #fff;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 32px rgba(37,99,235,.18);
  transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
}
.error-dialog-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.02);
  box-shadow: 0 18px 36px rgba(37,99,235,.26);
}
@media (max-width: 640px) {
  .error-dialog-backdrop {
    padding: 16px;
  }
  .error-dialog {
    padding: 22px 18px;
    border-radius: 20px;
  }
  .error-dialog-btn {
    width: 100%;
  }
}
</style>


<route lang="yaml">
path: /telehealth-intake
name: site-telehealth-intake
meta:
  layout: public
  public: true
</route>
