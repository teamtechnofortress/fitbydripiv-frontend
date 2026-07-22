<script setup>
import axios from 'axios'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { INTAKE_STATES_URL, getOrderPatientInfoUrl } from '@/network/const'
import ConfirmPatientModal from '@/components/patient-info/ConfirmPatientModal.vue'
import PatientSearchStage from '@/components/patient-info/PatientSearchStage.vue'
import PatientTypeStage from '@/components/patient-info/PatientTypeStage.vue'
import { ethnicityOptions, genders } from '@/components/patient-info/formOptions'
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

const emit = defineEmits(['journey-updated', 'refresh-journey'])

/* ----------------------------------------------------------------------- */
/* Top-level stage machine (type -> search -> info wizard)                 */
/* ----------------------------------------------------------------------- */

const FORM_STAGE = {
  PATIENT_TYPE: 'patient-type',
  PATIENT_SEARCH: 'patient-search',
  PATIENT_INFO: 'patient-info',
}

const formStage = ref(FORM_STAGE.PATIENT_TYPE)
const confirmedPatient = ref(null)
const isSubmitting = ref(false)
const submitError = ref('')
const searchEmail = ref('')
const intakeStates = ref([])
const statesLoading = ref(false)
const statesError = ref('')

const existingLookup = reactive({
  status: 'idle',
  message: '',
  foundPatient: null,
  showConfirmModal: false,
})

const form = reactive({
  firstName: '',
  middleName: '',
  lastName: '',
  phone: '',
  address: '',
  addressLine2: '',
  city: '',
  state: '',
  zip: '',
  email: '',
  dateOfBirth: '',
  age: '',
  gender: '',
  ethnicity: '',
})

const statusText = computed(() => props.journey?.journey_status || props.workflow?.status || 'patient_info')
const nextActionText = computed(() => props.journey?.next_action || props.workflow?.current_step_key || 'collect_patient_info')

const shellAsideText = computed(() => [
  `Journey status: ${prettyLabel(statusText.value)}`,
  `Next action: ${prettyLabel(nextActionText.value)}`,
].join(' · '))

const stateOptions = computed(() => {
  const options = intakeStates.value.slice()
  if (form.state && !options.includes(form.state))
    options.unshift(form.state)

  return options
})

const prettyLabel = value => String(value || '-')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase())

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

watch(() => form.dateOfBirth, value => {
  form.age = calculateAge(value)
})

const resetExistingLookupFeedback = () => {
  existingLookup.status = 'idle'
  existingLookup.message = ''
}

const resetForm = () => {
  Object.assign(form, {
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    address: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    email: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    ethnicity: '',
  })
}

const applyPatientPrefill = data => {
  if (!data) return
  const dateOfBirth = data.dateOfBirth ?? data.birthday ?? ''
  const derivedAge = data.age != null ? String(data.age) : calculateAge(dateOfBirth)

  Object.assign(form, {
    firstName: data.firstName ?? data.first_name ?? '',
    middleName: data.middleName ?? data.middle_name ?? '',
    lastName: data.lastName ?? data.last_name ?? '',
    phone: data.phone ?? '',
    address: data.address ?? '',
    addressLine2: data.addressLine2 ?? data.address_line_2 ?? '',
    city: data.city ?? '',
    state: data.state ?? '',
    zip: data.zip ?? '',
    email: data.email ?? '',
    dateOfBirth,
    age: derivedAge,
    gender: data.gender ?? '',
    ethnicity: data.ethnicity ?? '',
  })
}

const normalizeFetchedPatient = data => {
  if (!data) return null

  return {
    firstName: data.firstName ?? data.first_name ?? '',
    middleName: data.middleName ?? data.middle_name ?? '',
    lastName: data.lastName ?? data.last_name ?? '',
    phone: data.phone ?? '',
    address: data.address ?? '',
    addressLine2: data.addressLine2 ?? data.address_line_2 ?? '',
    city: data.city ?? '',
    state: data.state ?? '',
    zip: data.zip ?? '',
    email: data.email ?? '',
    dateOfBirth: data.dateOfBirth ?? data.birthday ?? '',
    age: data.age ?? '',
    gender: data.gender ?? '',
    ethnicity: data.ethnicity ?? '',
  }
}

const scrollToTop = (smooth = true) => {
  if (typeof window !== 'undefined')
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
}

const isValidEmail = value => /\S+@\S+\.\S+/.test(value)

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

  return 'Unable to submit patient information. Please check the form and try again.'
}

const loadIntakeStates = async () => {
  statesLoading.value = true
  statesError.value = ''

  try {
    const { data } = await axios.get(INTAKE_STATES_URL, {
      headers: { Accept: 'application/json' },
    })

    intakeStates.value = (Array.isArray(data?.data) ? data.data : [])
      .map(state => String(state || '').trim())
      .filter(Boolean)
  } catch {
    statesError.value = 'Unable to load state list. Please refresh and try again.'
  } finally {
    statesLoading.value = false
  }
}

const lookupExistingPatient = async email => {
  existingLookup.status = 'loading'
  existingLookup.message = 'Searching for your record...'
  existingLookup.foundPatient = null
  existingLookup.showConfirmModal = false

  try {
    const { data } = await axios.get(getOrderPatientInfoUrl(props.orderUuid), {
      headers: { Accept: 'application/json' },
      params: { email },
    })

    const patientInfo = normalizeFetchedPatient(data?.data || data?.patient)
    if (patientInfo) {
      existingLookup.foundPatient = patientInfo
      existingLookup.status = 'success'
      existingLookup.message = ''
      existingLookup.showConfirmModal = true

      return
    }

    existingLookup.status = 'not-found'
    existingLookup.message = 'Patient not found. Please register as a new patient.'
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
    stepError.value = 'Please enter a valid email address.'

    return
  }
  stepError.value = ''
  lookupExistingPatient(trimmed)
}

const goToPatientSearch = () => {
  stepError.value = ''
  submitError.value = ''
  formStage.value = FORM_STAGE.PATIENT_SEARCH
  scrollToTop()
}

const goToPatientTypeStage = () => {
  stepError.value = ''
  submitError.value = ''
  formStage.value = FORM_STAGE.PATIENT_TYPE
  scrollToTop()
}

const startNewPatient = () => {
  stepError.value = ''
  submitError.value = ''
  confirmedPatient.value = null
  searchEmail.value = ''
  existingLookup.foundPatient = null
  resetExistingLookupFeedback()
  resetForm()
  currentStepIndex.value = 0
  direction.value = 'forward'
  formStage.value = FORM_STAGE.PATIENT_INFO
  scrollToTop()
}

const confirmExistingPatient = () => {
  if (!existingLookup.foundPatient) return
  confirmedPatient.value = existingLookup.foundPatient
  applyPatientPrefill(existingLookup.foundPatient)
  existingLookup.showConfirmModal = false
  currentStepIndex.value = 0
  direction.value = 'forward'
  formStage.value = FORM_STAGE.PATIENT_INFO
  scrollToTop()
}

const rejectExistingPatient = () => {
  existingLookup.showConfirmModal = false
  searchEmail.value = ''
  resetExistingLookupFeedback()
  existingLookup.foundPatient = null
}

const resetPatientSelection = () => {
  confirmedPatient.value = null
  searchEmail.value = ''
  resetForm()
  resetExistingLookupFeedback()
  stepError.value = ''
  submitError.value = ''
  currentStepIndex.value = 0
  formStage.value = FORM_STAGE.PATIENT_TYPE
  scrollToTop()
}

/* ----------------------------------------------------------------------- */
/* Patient-info wizard                                                     */
/* ----------------------------------------------------------------------- */

const STEPS = [
  {
    key: 'name',
    eyebrow: 'Personal details',
    title: 'Let\u2019s get to know you',
    subtitle: 'Enter your full name exactly as it appears on official documents.',
  },
  {
    key: 'dob',
    eyebrow: 'Personal details',
    title: 'Date of birth',
    subtitle: 'This helps your care team personalize your treatment.',
  },
  {
    key: 'contact',
    eyebrow: 'Contact',
    title: 'How can we reach you',
    subtitle: 'We\u2019ll use this to keep you posted on your treatment.',
  },
  {
    key: 'address',
    eyebrow: 'Shipping',
    title: 'Where should we ship to',
    subtitle: 'Your medication will be delivered to this address.',
  },
  {
    key: 'demographics',
    eyebrow: 'Optional',
    title: 'A little more about you',
    subtitle: 'Optional details that help your care team personalize treatment.',
  },
]

const currentStepIndex = ref(0)
const direction = ref('forward')
const stepError = ref('')

const currentStep = computed(() => STEPS[currentStepIndex.value])
const isFirstStep = computed(() => currentStepIndex.value === 0)
const isLastStep = computed(() => currentStepIndex.value === STEPS.length - 1)
const progressPercent = computed(() => ((currentStepIndex.value + 1) / STEPS.length) * 100)
const transitionName = computed(() => (direction.value === 'forward' ? 'slide-next' : 'slide-prev'))

const validateStep = key => {
  if (key === 'name') {
    if (!form.firstName.trim()) return 'First name is required.'
    if (!form.lastName.trim()) return 'Last name is required.'
  }
  if (key === 'dob') {
    if (!form.dateOfBirth) return 'Date of birth is required.'
  }
  if (key === 'contact') {
    if (!form.email.trim()) return 'Email is required.'
    if (!isValidEmail(form.email)) return 'Please enter a valid email address.'
  }
  if (key === 'address') {
    if (!form.address.trim()) return 'Address is required.'
    if (!form.city.trim()) return 'City is required.'
    if (!form.state.trim()) return 'State is required.'
    if (!form.zip.trim()) return 'Zip code is required.'
  }

  return null
}

const goNext = () => {
  const error = validateStep(currentStep.value.key)
  if (error) {
    stepError.value = error

    return
  }
  stepError.value = ''

  if (isLastStep.value) {
    handleSubmit()

    return
  }

  direction.value = 'forward'
  currentStepIndex.value += 1
}

const goBack = () => {
  stepError.value = ''
  submitError.value = ''

  if (isFirstStep.value) {
    resetPatientSelection()

    return
  }

  direction.value = 'backward'
  currentStepIndex.value -= 1
}

const validatePatientInfo = () => {
  for (const step of STEPS) {
    const error = validateStep(step.key)
    if (error) return error
  }

  return null
}

const formatText = value => value?.trim() ?? ''
const optionalText = value => {
  const text = formatText(value)

  return text || null
}

const buildPayload = () => ({
  firstName: formatText(form.firstName),
  middleName: optionalText(form.middleName),
  lastName: formatText(form.lastName),
  phone: optionalText(form.phone),
  address: formatText(form.address),
  addressLine2: optionalText(form.addressLine2),
  city: formatText(form.city),
  state: formatText(form.state),
  zip: formatText(form.zip),
  email: formatText(form.email),
  dateOfBirth: form.dateOfBirth || null,
  age: form.age ? Number(form.age) : null,
  gender: optionalText(form.gender),
  ethnicity: optionalText(form.ethnicity),
})

const handleSubmit = async () => {
  if (isSubmitting.value) return
  stepError.value = ''
  submitError.value = ''

  const validationMessage = validatePatientInfo()
  if (validationMessage) {
    stepError.value = validationMessage
    scrollToTop()

    return
  }

  isSubmitting.value = true

  try {
    const idempotencyKey = uuidv4()

    const { data } = await axios.post(getOrderPatientInfoUrl(props.orderUuid), buildPayload(), {
      headers: {
        'Idempotency-Key': idempotencyKey,
        Accept: 'application/json',
      },
    })

    const nextJourney = data?.data?.journey || data?.journey || null
    if (nextJourney)
      emit('journey-updated', nextJourney)

    emit('refresh-journey')
  } catch (error) {
    submitError.value = extractErrorMessage(error)
    scrollToTop()
  } finally {
    isSubmitting.value = false
  }
}

/* ----------------------------------------------------------------------- */
/* Date-of-birth wheel picker                                              */
/* ----------------------------------------------------------------------- */

const ITEM_HEIGHT = 44
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const currentYear = new Date().getFullYear()

const months = MONTH_NAMES.map((label, i) => ({ value: String(i + 1).padStart(2, '0'), label }))
const years = Array.from({ length: currentYear - 1919 }, (_, i) => String(1920 + i))

const daysInMonth = (month, year) => {
  const m = Number(month) || 1
  const y = Number(year) || currentYear
  return new Date(y, m, 0).getDate()
}

const dobMonth = ref('07')
const dobDay = ref('01')
const dobYear = ref(String(currentYear - 18))

const days = computed(() => {
  const total = daysInMonth(dobMonth.value, dobYear.value)
  return Array.from({ length: total }, (_, i) => String(i + 1).padStart(2, '0'))
})

const monthListRef = ref(null)
const dayListRef = ref(null)
const yearListRef = ref(null)
const scrollTimers = {}

const syncDateOfBirth = () => {
  const maxDay = daysInMonth(dobMonth.value, dobYear.value)
  if (Number(dobDay.value) > maxDay) dobDay.value = String(maxDay).padStart(2, '0')
  form.dateOfBirth = `${dobYear.value}-${dobMonth.value}-${dobDay.value}`
}

const scrollListTo = (listRef, index, smooth = true) => {
  const el = listRef?.value
  if (!el) return
  el.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' })
}

const selectWheelValue = (type, value) => {
  if (type === 'month') dobMonth.value = value
  if (type === 'day') dobDay.value = value
  if (type === 'year') dobYear.value = value
  syncDateOfBirth()

  nextTick(() => syncWheelsToModel(true))
}

const listConfig = {
  month: { items: months, model: dobMonth, ref: monthListRef },
  day: { items: days, model: dobDay, ref: dayListRef },
  year: { items: years, model: dobYear, ref: yearListRef },
}

const onWheelScroll = type => {
  clearTimeout(scrollTimers[type])
  scrollTimers[type] = setTimeout(() => {
    const { items, ref: listRef } = listConfig[type]
    const el = listRef.value
    if (!el) return
    const list = type === 'day' ? days.value : items
    const index = Math.min(list.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_HEIGHT)))
    const value = typeof list[index] === 'string' ? list[index] : list[index]?.value
    if (value && value !== listConfig[type].model.value) {
      selectWheelValue(type, value)

      return
    }
    scrollListTo(listRef, index)
  }, 110)
}

const syncWheelsToModel = (smooth = false) => {
  const monthIndex = months.findIndex(m => m.value === dobMonth.value)
  const dayIndex = days.value.findIndex(d => d === dobDay.value)
  const yearIndex = years.findIndex(y => y === dobYear.value)
  scrollListTo(monthListRef, Math.max(monthIndex, 0), smooth)
  scrollListTo(dayListRef, Math.max(dayIndex, 0), smooth)
  scrollListTo(yearListRef, Math.max(yearIndex, 0), smooth)
}

watch(() => form.dateOfBirth, value => {
  if (!value) return
  const [y, m, d] = value.split('-')
  if (y && y !== dobYear.value) dobYear.value = y
  if (m && m !== dobMonth.value) dobMonth.value = m
  if (d && d !== dobDay.value) dobDay.value = d
})

watch(currentStepIndex, async index => {
  if (STEPS[index]?.key !== 'dob') return
  await nextTick()
  syncWheelsToModel(false)
})

onMounted(() => {
  if (!form.dateOfBirth) syncDateOfBirth()
  loadIntakeStates()
})

</script>

<template>
  <DrNetworkStepShell
    title="Complete Your Patient Info"
    :subtitle="journey?.message || 'Provide the patient details required to continue this order journey.'"
    badge="Patient Info"
    aside-title="Journey status"
    :aside-text="shellAsideText"
    :order-uuid="orderUuid"
  >
    <section class="patient-info-step">
      <PatientTypeStage
        v-if="formStage === FORM_STAGE.PATIENT_TYPE"
        @select-existing="goToPatientSearch"
        @select-new="startNewPatient"
      />

      <PatientSearchStage
        v-else-if="formStage === FORM_STAGE.PATIENT_SEARCH"
        :search-email="searchEmail"
        :lookup-status="existingLookup"
        :validation-error="stepError"
        @back="goToPatientTypeStage"
        @search="handleExistingEmailSearch"
        @start-new="startNewPatient"
        @update:search-email="value => (searchEmail = value)"
      />

      <div v-else class="wizard">
        <div class="wizard-topbar">
          <div class="wizard-progress-track">
            <div class="wizard-progress-fill" :style="{ width: `${progressPercent}%` }" />
          </div>
          <span class="wizard-step-count">Step {{ currentStepIndex + 1 }} of {{ STEPS.length }}</span>
        </div>

        <div v-if="confirmedPatient" class="existing-chip">
          <span class="existing-chip__dot" />
          <span class="existing-chip__text">
            Continuing as <strong>{{ confirmedPatient.firstName }} {{ confirmedPatient.lastName }}</strong>
          </span>
          <button type="button" class="existing-chip__change" @click="resetPatientSelection">
            Change
          </button>
        </div>

        <div class="wizard-panel-frame">
          <Transition :name="transitionName" mode="out-in">
            <div :key="currentStep.key" class="wizard-panel">
              <p class="wizard-eyebrow">{{ currentStep.eyebrow }}</p>
              <h2 class="wizard-title">{{ currentStep.title }}</h2>
              <p class="wizard-subtitle">{{ currentStep.subtitle }}</p>

            <div v-if="stepError || submitError" class="status-stack">
              <div v-if="stepError" class="status-banner">{{ stepError }}</div>
              <div v-if="submitError" class="status-banner">{{ submitError }}</div>
            </div>

            <!-- STEP: name -->
            <div v-if="currentStep.key === 'name'" class="step-fields">
              <div class="field-grid two-col">
                <label class="field-group">
                  <span>First name <b>*</b></span>
                  <input v-model="form.firstName" type="text" autocomplete="given-name" placeholder="Jane" autofocus>
                </label>
                <label class="field-group">
                  <span>Last name <b>*</b></span>
                  <input v-model="form.lastName" type="text" autocomplete="family-name" placeholder="Doe">
                </label>
              </div>
              <label class="field-group">
                <span>Middle name</span>
                <input v-model="form.middleName" type="text" autocomplete="additional-name" placeholder="Optional">
              </label>
              <p class="field-hint">Make sure your name matches your ID to avoid any issues later.</p>
            </div>

            <!-- STEP: dob -->
            <div v-else-if="currentStep.key === 'dob'" class="step-fields">
              <div class="wheel-picker">
                <div class="wheel-highlight" />
                <div ref="monthListRef" class="wheel-col" @scroll.passive="onWheelScroll('month')">
                  <div class="wheel-pad" />
                  <button
                    v-for="m in months"
                    :key="m.value"
                    type="button"
                    class="wheel-item"
                    :class="{ 'is-active': m.value === dobMonth }"
                    @click="selectWheelValue('month', m.value)"
                  >
                    {{ m.label }}
                  </button>
                  <div class="wheel-pad" />
                </div>
                <div ref="dayListRef" class="wheel-col wheel-col--narrow" @scroll.passive="onWheelScroll('day')">
                  <div class="wheel-pad" />
                  <button
                    v-for="d in days"
                    :key="d"
                    type="button"
                    class="wheel-item"
                    :class="{ 'is-active': d === dobDay }"
                    @click="selectWheelValue('day', d)"
                  >
                    {{ Number(d) }}
                  </button>
                  <div class="wheel-pad" />
                </div>
                <div ref="yearListRef" class="wheel-col" @scroll.passive="onWheelScroll('year')">
                  <div class="wheel-pad" />
                  <button
                    v-for="y in years"
                    :key="y"
                    type="button"
                    class="wheel-item"
                    :class="{ 'is-active': y === dobYear }"
                    @click="selectWheelValue('year', y)"
                  >
                    {{ y }}
                  </button>
                  <div class="wheel-pad" />
                </div>
              </div>
              <p class="field-hint field-hint--center">
                {{ form.age ? `You are ${form.age} years old` : 'Scroll or tap to set your date of birth' }}
              </p>
            </div>

            <!-- STEP: contact -->
            <div v-else-if="currentStep.key === 'contact'" class="step-fields">
              <label class="field-group">
                <span>Email <b>*</b></span>
                <input v-model="form.email" type="email" autocomplete="email" placeholder="you@example.com" autofocus>
              </label>
              <label class="field-group">
                <span>Phone number</span>
                <input v-model="form.phone" type="tel" autocomplete="tel" placeholder="(555) 123-4567">
              </label>
              <p class="field-hint">We'll only use this to keep you updated on your treatment.</p>
            </div>

            <!-- STEP: address -->
            <div v-else-if="currentStep.key === 'address'" class="step-fields">
              <label class="field-group">
                <span>Address line 1 <b>*</b></span>
                <input v-model="form.address" type="text" autocomplete="street-address" placeholder="123 Wellness Ave" autofocus>
              </label>
              <label class="field-group">
                <span>Address line 2</span>
                <input v-model="form.addressLine2" type="text" autocomplete="address-line2" placeholder="Apt, suite, unit (optional)">
              </label>
              <div class="field-grid three-col">
                <label class="field-group">
                  <span>City <b>*</b></span>
                  <input v-model="form.city" type="text" autocomplete="address-level2" placeholder="Austin">
                </label>
                <label class="field-group">
                  <span>State <b>*</b></span>
                  <select v-model="form.state" autocomplete="address-level1" :disabled="statesLoading">
                    <option value="" disabled>{{ statesLoading ? 'Loading...' : 'Select' }}</option>
                    <option v-for="state in stateOptions" :key="state" :value="state">{{ state }}</option>
                  </select>
                  <small v-if="statesError">{{ statesError }}</small>
                </label>
                <label class="field-group">
                  <span>Zip code <b>*</b></span>
                  <input v-model="form.zip" type="text" autocomplete="postal-code" placeholder="73301">
                </label>
              </div>
              <p class="field-hint">Your address ensures we can ship your medication to the correct location.</p>
            </div>

            <!-- STEP: demographics -->
            <div v-else-if="currentStep.key === 'demographics'" class="step-fields">
              <div class="field-grid two-col">
                <label class="field-group">
                  <span>Gender</span>
                  <select v-model="form.gender">
                    <option value="" disabled>Select</option>
                    <option v-for="option in genders" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label class="field-group">
                  <span>Ethnicity</span>
                  <select v-model="form.ethnicity">
                    <option value="" disabled>Select</option>
                    <option v-for="option in ethnicityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
              </div>
              <p class="field-hint">This information is optional and helps your care team personalize treatment.</p>
            </div>

            <div class="wizard-actions">
              <button type="button" class="ghost-btn" @click="goBack">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Back
              </button>
              <button
                type="button"
                class="primary-btn"
                :disabled="isSubmitting"
                @click="goNext"
              >
                {{ isLastStep ? (isSubmitting ? 'Submitting...' : 'Continue and submit') : 'Continue' }}
              </button>
            </div>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <ConfirmPatientModal
      :patient="existingLookup.foundPatient"
      :open="existingLookup.showConfirmModal"
      @confirm="confirmExistingPatient"
      @reject="rejectExistingPatient"
    />
  </DrNetworkStepShell>
</template>

<style scoped>
.patient-info-step {
  --ink: #1d1d1f;
  --ink-2: #6e6e73;
  --ink-3: #a1a1a6;
  --hairline: #e5e5ea;
  --surface: #ffffff;
  --surface-2: #fafafe;
  --bg: #fbfbfd;
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

/* ---------- top progress ---------- */

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

/* ---------- existing patient chip ---------- */

.existing-chip {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.8rem;
  background: var(--surface-2);
  border-radius: 999px;
  font-size: 0.86rem;
}

.existing-chip__dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  background: var(--success);
  border-radius: 50%;
}

.existing-chip__text {
  flex: 1;
  min-width: 0;
  color: var(--ink-2);
  overflow-wrap: anywhere;
}

.existing-chip__text strong {
  color: var(--ink);
}

.existing-chip__change {
  flex: 0 0 auto;
  padding: 0.3rem 0.7rem;
  font: inherit;
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--accent);
  background: transparent;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.existing-chip__change:hover {
  background: rgba(0, 113, 227, 0.08);
}

/* ---------- panel ---------- */

.wizard-panel-frame {
  min-height: 318px;
}

.wizard-panel {
  background: var(--surface);
  border: 1px solid rgba(229, 229, 234, 0.8);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 1.35rem 1.45rem 1.25rem;
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

.wizard-subtitle {
  margin: 0.3rem 0 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #66739a;
}

.status-stack {
  display: grid;
  gap: 0.6rem;
  margin-top: 0.9rem;
}

.status-banner {
  padding: 0.75rem 0.9rem;
  font-size: 0.87rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--danger);
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
}

.step-fields {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1.05rem;
}

.field-grid {
  display: grid;
  gap: 0.8rem;
}

.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.three-col {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.field-group span {
  font-size: 0.83rem;
  font-weight: 560;
  color: var(--ink-2);
}

.field-group b {
  color: var(--danger);
  font-weight: 600;
}

.field-group input,
.field-group select {
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

.field-group select {
  padding-right: 2.2rem;
  background-image:
    linear-gradient(45deg, transparent 50%, #86868b 50%),
    linear-gradient(135deg, #86868b 50%, transparent 50%);
  background-position: calc(100% - 18px) 19px, calc(100% - 13px) 19px;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}

.field-group input::placeholder {
  color: var(--ink-3);
}

.field-group input:focus,
.field-group select:focus {
  background: var(--surface);
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.14);
}

.field-group small {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--danger);
}

.field-hint {
  margin: 0;
  font-size: 0.83rem;
  line-height: 1.5;
  color: var(--ink-3);
}

.field-hint--center {
  text-align: center;
  font-weight: 600;
  color: var(--ink-2);
}

/* ---------- date of birth wheel picker ---------- */

.wheel-picker {
  position: relative;
  display: grid;
  grid-template-columns: 1.5fr 0.8fr 1fr;
  gap: 0.4rem;
  height: 132px;
  padding: 0 0.25rem;
}

.wheel-highlight {
  position: absolute;
  top: 44px;
  left: 0;
  right: 0;
  height: 44px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  pointer-events: none;
}

.wheel-col {
  position: relative;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.wheel-col::-webkit-scrollbar {
  display: none;
}

.wheel-pad {
  height: 44px;
  flex: none;
}

.wheel-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  scroll-snap-align: center;
  font: inherit;
  font-size: 0.98rem;
  font-weight: 500;
  color: var(--ink-3);
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: color 0.15s ease, font-weight 0.15s ease;
}

.wheel-item.is-active {
  color: var(--ink);
  font-weight: 700;
}

/* ---------- actions ---------- */

.wizard-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1.1rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--hairline);
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

.ghost-btn:hover {
  color: var(--accent);
  background: var(--surface);
  border-color: rgba(0, 113, 227, 0.28);
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
  opacity: 0.55;
  cursor: not-allowed;
}

/* ---------- step transitions ---------- */

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

.wizard {
  position: relative;
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
  .two-col,
  .three-col {
    grid-template-columns: 1fr;
  }

  .wizard-panel-frame {
    min-height: 0;
  }

  .wizard-panel {
    padding: 1.5rem 1.25rem 1.4rem;
    border-radius: var(--radius-md);
  }

  .wizard-title {
    font-size: 1.4rem;
  }

  .wizard-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .primary-btn,
  .ghost-btn {
    width: 100%;
  }
}
</style>
