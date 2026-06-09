<script setup>
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { VForm } from 'vuetify/components'
import { storeToRefs } from 'pinia'
import { useToast } from 'vue-toastification'
import { requiredValidator } from '@validators'
import { useProfileProgressStore } from '@/store/profileProgress'

const router = useRouter()
const toast = useToast()
const profileProgressStore = useProfileProgressStore()
const { progress, loading, error } = storeToRefs(profileProgressStore)

const STEP_DEFINITIONS = Object.freeze([
  {
    id: 2,
    title: 'Identity & Contact',
    description: 'Edit your email, phone number, and more.',
    icon: 'tabler-id',
    color: 'primary',
    lightColor: '#7367F0',
  },
  {
    id: 3,
    title: 'Address Details',
    description: 'Enter your address details.',
    icon: 'tabler-map-pin',
    color: 'success',
    lightColor: '#28C76F',
  },
  {
    id: 4,
    title: 'Emergency Contact',
    description: 'Add someone to reach in case of emergency.',
    icon: 'tabler-phone-call',
    color: 'warning',
    lightColor: '#FF9F43',
  },
  {
    id: 5,
    title: 'Employment & Payroll',
    description: 'Set up your payment and job details.',
    icon: 'tabler-briefcase',
    color: 'info',
    lightColor: '#00CFE8',
  },
])

const firstStepId = STEP_DEFINITIONS[0].id
const lastStepId = STEP_DEFINITIONS[STEP_DEFINITIONS.length - 1].id

const defaultStepValues = {
  2: () => ({ birthday: '', ssn: '', gender: '', phone: '' }),
  3: () => ({ address: '', city: '', state: '', zip: '' }),
  4: () => ({ emergency: '', contact: '' }),
  5: () => ({
    title: '',
    hiring_date: '',
    hourly_rate: '',
    payment_method: 'direct_deposit',
    bank: '',
    routing: '',
  }),
}

const stepForms = reactive({
  2: defaultStepValues[2](),
  3: defaultStepValues[3](),
  4: defaultStepValues[4](),
  5: defaultStepValues[5](),
})

const step2FormRef = ref()
const step3FormRef = ref()
const step4FormRef = ref()
const step5FormRef = ref()

const formRefs = {
  2: step2FormRef,
  3: step3FormRef,
  4: step4FormRef,
  5: step5FormRef,
}

const genderOptions = [
  { title: 'Female', value: 'female', icon: 'tabler-female' },
  { title: 'Male', value: 'male', icon: 'tabler-male' },
  { title: 'Non-binary', value: 'non-binary', icon: 'tabler-gender-third' },
  { title: 'Prefer not to say', value: 'prefer_not_to_say', icon: 'tabler-help-circle' },
]

const paymentMethodOptions = [
  { title: 'Direct Deposit', value: 'direct_deposit', icon: 'tabler-building-bank' },
  { title: 'Check', value: 'check', icon: 'tabler-file-text' },
  { title: 'Cash', value: 'cash', icon: 'tabler-cash' },
]

// Computed properties with safe data access
const activeStep = computed(() => progress.value?.current_step ?? firstStepId)
const isCompleted = computed(() => !!progress.value?.is_completed)

// Safe completed steps handling
const completedSteps = computed(() => {
  const steps = progress.value?.completed_steps
  
  return Array.isArray(steps) ? steps : []
})

const completionPercentage = computed(() => {
  const apiPercentage = progress.value?.completion_percentage
  if (typeof apiPercentage === 'number' && Number.isFinite(apiPercentage)) {
    return Math.min(100, Math.max(0, Math.round(apiPercentage)))
  }

  if (isCompleted.value) return 100

  const totalSteps = STEP_DEFINITIONS.length
  if (!totalSteps) return 0

  const completedCount = completedSteps.value.length
  const percent = (completedCount / totalSteps) * 100
  
  return Math.round(percent)
})

const unlockedMaxStep = computed(() => {
  if (isCompleted.value) return lastStepId
  const current = activeStep.value || firstStepId
  
  return Math.min(Math.max(current, firstStepId), lastStepId)
})

const selectedStep = ref(firstStepId)
const selectedStepDefinition = computed(() => STEP_DEFINITIONS.find(def => def.id === selectedStep.value))
const selectedStepTitle = computed(() => selectedStepDefinition.value?.title || 'Profile section')
const selectedStepDescription = computed(() => selectedStepDefinition.value?.description || '')
const selectedStepIcon = computed(() => selectedStepDefinition.value?.icon || 'tabler-user')
const selectedStepColor = computed(() => selectedStepDefinition.value?.color || 'primary')

const headerSubtitle = computed(() => (
  isCompleted.value
    ? 'Your profile is complete! You can update any information anytime.'
    : 'Complete the following sections to unlock all features.'
))

const stepDataLoading = ref(false)
const initialLoading = ref(true)

// Safe step locking check
const isStepLocked = stepId => {
  if (isCompleted.value) return false
  
  return stepId > unlockedMaxStep.value
}

// Safe step completion check
const isStepCompleted = stepId => {
  return completedSteps.value.includes(stepId)
}

const buildStepPayload = step => {
  const formData = stepForms[step]
  if (!formData) return {}
  switch (step) {
  case 4:
    return {
      emergency: formData.emergency,
      contact: formData.contact,
    }
  case 5:
    return {
      title: formData.title,
      hiring_date: formData.hiring_date,
      hourly_rate: formData.hourly_rate,
      payment_method: formData.payment_method,
      bank: formData.bank,
      routing: formData.routing,
    }
  default:
    return { ...formData }
  }
}

const applyStepFields = (step, fields = {}) => {
  if (!defaultStepValues[step]) return
  Object.assign(stepForms[step], defaultStepValues[step](), fields)
}

const loadStepData = async (step, { silent = false } = {}) => {
  if (!step) return
  stepDataLoading.value = true
  try {
    const response = await profileProgressStore.fetchStepData(step)
    const responseData = response?.data ?? response?.data?.data ?? response
    const fields = responseData?.fields ?? responseData?.data?.fields ?? {}

    applyStepFields(step, fields || {})
  } catch (err) {
    if (!silent) toast.error(err?.message || `Unable to load step ${step} data`)
  } finally {
    stepDataLoading.value = false
  }
}

const ensureSelectedStep = () => {
  const fallback = unlockedMaxStep.value || firstStepId
  const previous = selectedStep.value
  
  if (!previous || isStepLocked(previous)) {
    selectedStep.value = fallback
    
    return { changed: previous !== selectedStep.value, value: selectedStep.value }
  }
  
  return { changed: false, value: previous }
}

const markInitialLoaded = () => {
  if (initialLoading.value) initialLoading.value = false
}

const loadProgress = async ({ reset = false } = {}) => {
  try {
    if (reset && typeof profileProgressStore.$reset === 'function') {
      profileProgressStore.$reset()
    }
    await profileProgressStore.fetchProgress()

    const { changed, value } = ensureSelectedStep()
    if (!changed && value) {
      await loadStepData(value, { silent: true })
    }
  } catch (err) {
    toast.error(err?.message || 'Unable to load profile data')
  } finally {
    markInitialLoaded()
  }
}

const handleStepSubmission = () => {
  const step = selectedStep.value
  const formRef = formRefs[step]
  if (!formRef?.value) return
  
  formRef.value.validate().then(async ({ valid }) => {
    if (!valid) return
    try {
      const payload = buildStepPayload(step)
      const response = await profileProgressStore.completeStep(step, payload)
      const message = response?.message || `${selectedStepTitle.value} saved successfully.`

      toast.success(message)
      await loadStepData(step, { silent: true })

      const nextStepId = progress.value?.current_step ?? step
      if (!isCompleted.value && nextStepId !== step) {
        selectedStep.value = nextStepId
      }
    } catch (err) {
      toast.error(err?.message || 'Unable to save this section')
    }
  })
}

const goBack = () => {
  router.back()
}

// Lifecycle hooks
onMounted(() => {
  loadProgress({ reset: true })
})

onActivated(() => {
  loadProgress({ reset: true })
})

// Watchers
watch(selectedStep, (step, previous) => {
  if (!step || step === previous) return
  loadStepData(step, { silent: true })
})

watch(unlockedMaxStep, () => {
  ensureSelectedStep()
})

watch(error, value => {
  if (value) toast.error(value)
})
</script>

<template>
  <div class="profile-page">
    <VContainer class="py-8">
      <!-- Loading State -->
      <div
        v-if="initialLoading"
        class="profile-page__loader"
      >
        <VProgressCircular
          color="primary"
          indeterminate
          size="56"
          width="4"
        />
        <p class="text-body-1 text-medium-emphasis mt-4">
          Loading your profile...
        </p>
      </div>

      <template v-else>
        <!-- Navigation Header -->
        <div class="d-flex align-center justify-space-between mb-6">
          <div class="d-flex align-center gap-3">
            <VBtn
              variant="text"
              color="secondary"
              icon="tabler-arrow-left"
              size="small"
              class="back-btn"
              @click="goBack"
            />
            <h5 class="text-h5 font-weight-bold mb-0">
              Profile Setup
            </h5>
          </div>
          <VChip
            :color="isCompleted ? 'success' : 'primary'"
            variant="flat"
            size="small"
            class="font-weight-medium"
          >
            {{ completionPercentage }}% Complete
          </VChip>
        </div>

        <!-- Main Content Grid -->
        <VRow>
          <!-- Left Column - Steps Navigation -->
          <VCol
            cols="12"
            md="4"
          >
            <VCard
              class="steps-card"
              elevation="0"
            >
              <VCardText>
                <div class="steps-header mb-4">
                  <h6 class="text-subtitle-1 font-weight-bold mb-1">
                    Setup Progress
                  </h6>
                  <p class="text-body-2 text-medium-emphasis mb-0">
                    {{ headerSubtitle }}
                  </p>
                </div>

                <!-- Progress Bar -->
                <div class="mb-6">
                  <div class="d-flex align-center justify-space-between mb-1">
                    <span class="text-caption text-medium-emphasis">Overall completion</span>
                    <span class="text-caption font-weight-bold">{{ completionPercentage }}%</span>
                  </div>
                  <VProgressLinear
                    :model-value="completionPercentage"
                    height="6"
                    color="primary"
                    bg-color="grey-lighten-3"
                    rounded
                  />
                </div>

                <!-- Step Navigation -->
                <div class="steps-list">
                  <div
                    v-for="(stepDef, index) in STEP_DEFINITIONS"
                    :key="stepDef.id"
                    class="step-item"
                    :class="{
                      'step-item--active': selectedStep === stepDef.id,
                      'step-item--completed': isStepCompleted(stepDef.id),
                      'step-item--locked': isStepLocked(stepDef.id),
                      'step-item--clickable': !isStepLocked(stepDef.id)
                    }"
                    @click="!isStepLocked(stepDef.id) && (selectedStep = stepDef.id)"
                  >
                    <div class="step-item__indicator">
                      <div 
                        class="step-item__icon"
                        :style="{ 
                          backgroundColor: selectedStep === stepDef.id 
                            ? `rgb(var(--v-theme-${stepDef.color}))` 
                            : isStepCompleted(stepDef.id)
                              ? `rgb(var(--v-theme-success))`
                              : 'rgba(var(--v-theme-on-surface), 0.08)'
                        }"
                      >
                        <VIcon 
                          :icon="stepDef.icon" 
                          :color="selectedStep === stepDef.id || isStepCompleted(stepDef.id) ? 'white' : undefined"
                          size="18"
                        />
                      </div>
                      <div 
                        v-if="index < STEP_DEFINITIONS.length - 1" 
                        class="step-item__line"
                        :style="{ 
                          backgroundColor: index < completedSteps.length 
                            ? `rgb(var(--v-theme-success))` 
                            : 'rgba(var(--v-theme-on-surface), 0.15)'
                        }"
                      />
                    </div>
                    
                    <div class="step-item__content">
                      <div class="d-flex align-center gap-2">
                        <span class="step-item__title">{{ stepDef.title }}</span>
                        <VIcon
                          v-if="isStepCompleted(stepDef.id)"
                          icon="tabler-check"
                          size="14"
                          color="success"
                        />
                      </div>
                      <p class="step-item__description">
                        {{ stepDef.description }}
                      </p>
                    </div>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Right Column - Form Section -->
          <VCol
            cols="12"
            md="8"
          >
            <VCard
              class="form-card"
              elevation="0"
            >
              <VCardText>
                <!-- Section Header -->
                <div class="form-header mb-6">
                  <div class="d-flex align-center gap-3">
                    <div 
                      class="form-header__icon"
                      :style="{ backgroundColor: `rgba(var(--v-theme-${selectedStepColor}), 0.1)` }"
                    >
                      <VIcon 
                        :icon="selectedStepIcon" 
                        :color="selectedStepColor"
                        size="24"
                      />
                    </div>
                    <div>
                      <h5 class="text-h6 font-weight-bold mb-1">
                        {{ selectedStepTitle }}
                      </h5>
                      <p class="text-body-2 text-medium-emphasis mb-0">
                        {{ selectedStepDescription }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Loading State -->
                <VFadeTransition mode="out-in">
                  <div
                    v-if="stepDataLoading"
                    class="text-center py-8"
                  >
                    <VProgressCircular
                      :color="selectedStepColor"
                      indeterminate
                      size="40"
                      width="3"
                    />
                    <p class="text-body-2 text-medium-emphasis mt-3">
                      Loading section...
                    </p>
                  </div>

                  <!-- Forms -->
                  <div v-else>
                    <!-- Step 2 Form -->
                    <VForm
                      v-if="selectedStep === 2"
                      ref="step2FormRef"
                      @submit.prevent="handleStepSubmission"
                    >
                      <VRow>
                        <VCol
                          cols="12"
                          md="6"
                        >
                          <VTextField
                            v-model="stepForms[2].birthday"
                            label="Birthday"
                            type="date"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="6"
                        >
                          <VTextField
                            v-model="stepForms[2].ssn"
                            label="Social Security Number"
                            :rules="[requiredValidator]"
                            placeholder="XXX-XX-XXXX"
                            variant="outlined"
                            density="comfortable"
                            type="password"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="6"
                        >
                          <VSelect
                            v-model="stepForms[2].gender"
                            :items="genderOptions"
                            label="Gender"
                            item-title="title"
                            item-value="value"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="6"
                        >
                          <VTextField
                            v-model="stepForms[2].phone"
                            label="Phone Number"
                            :rules="[requiredValidator]"
                            placeholder="+1 (555) 123-4567"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                      </VRow>
                    </VForm>

                    <!-- Step 3 Form -->
                    <VForm
                      v-else-if="selectedStep === 3"
                      ref="step3FormRef"
                      @submit.prevent="handleStepSubmission"
                    >
                      <VRow>
                        <VCol cols="12">
                          <VTextField
                            v-model="stepForms[3].address"
                            label="Street Address"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="6"
                        >
                          <VTextField
                            v-model="stepForms[3].city"
                            label="City"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="3"
                        >
                          <VTextField
                            v-model="stepForms[3].state"
                            label="State"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="3"
                        >
                          <VTextField
                            v-model="stepForms[3].zip"
                            label="ZIP Code"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                      </VRow>
                    </VForm>

                    <!-- Step 4 Form -->
                    <VForm
                      v-else-if="selectedStep === 4"
                      ref="step4FormRef"
                      @submit.prevent="handleStepSubmission"
                    >
                      <VRow>
                        <VCol
                          cols="12"
                          md="6"
                        >
                          <VTextField
                            v-model="stepForms[4].emergency"
                            label="Emergency Contact Name"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="6"
                        >
                          <VTextField
                            v-model="stepForms[4].contact"
                            label="Emergency Contact Phone"
                            :rules="[requiredValidator]"
                            placeholder="+1 (555) 123-4567"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                      </VRow>
                    </VForm>

                    <!-- Step 5 Form -->
                    <VForm
                      v-else-if="selectedStep === 5"
                      ref="step5FormRef"
                      @submit.prevent="handleStepSubmission"
                    >
                      <VRow>
                        <VCol
                          cols="12"
                          md="6"
                        >
                          <VTextField
                            v-model="stepForms[5].title"
                            label="Job Title"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="6"
                        >
                          <VTextField
                            v-model="stepForms[5].hiring_date"
                            label="Hiring Date"
                            type="date"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="4"
                        >
                          <VTextField
                            v-model="stepForms[5].hourly_rate"
                            label="Hourly Rate"
                            type="number"
                            prefix="$"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="4"
                        >
                          <VSelect
                            v-model="stepForms[5].payment_method"
                            :items="paymentMethodOptions"
                            label="Payment Method"
                            item-title="title"
                            item-value="value"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="6"
                        >
                          <VTextField
                            v-model="stepForms[5].bank"
                            label="Bank"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                        <VCol
                          cols="12"
                          md="6"
                        >
                          <VTextField
                            v-model="stepForms[5].routing"
                            label="Routing Number"
                            :rules="[requiredValidator]"
                            variant="outlined"
                            density="comfortable"
                            hide-details="auto"
                            class="mb-4"
                          />
                        </VCol>
                      </VRow>
                    </VForm>

                    <!-- Form Actions -->
                    <div class="d-flex justify-end mt-6">
                      <VBtn
                        color="primary"
                        :loading="loading"
                        class="save-btn"
                        @click="handleStepSubmission"
                      >
                        {{ isStepCompleted(selectedStep) ? 'Update Section' : 'Save & Continue' }}
                      </VBtn>
                    </div>
                  </div>
                </VFadeTransition>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </template>
    </VContainer>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: rgb(var(--v-theme-background));
  transition: background-color 0.3s ease;
}

.profile-page__loader {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.back-btn {
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 2px 6px rgba(var(--v-theme-on-surface), 0.08);
}

.back-btn:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}

.steps-card,
.form-card {
  border-radius: 16px !important;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08) !important;
  background: rgb(var(--v-theme-surface)) !important;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.steps-header,
.form-header {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-bottom: 16px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 16px;
}

.step-item {
  display: flex;
  gap: 16px;
  cursor: default;
  transition: all 0.2s ease;
  padding: 4px 0;
}

.step-item--clickable {
  cursor: pointer;
}

.step-item--clickable:hover {
  transform: translateX(4px);
}

.step-item__indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.step-item__icon {
  width: 32px;
  height: 32px;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: rgba(var(--v-theme-on-surface), 0.7);
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  z-index: 1;
}

.step-item:hover:not(.step-item--locked) .step-item__icon {
  transform: scale(1.05);
}

.step-item__line {
  width: 2px;
  height: 32px;
  margin: 4px 0;
  background-color: rgba(var(--v-theme-on-surface), 0.12);
  transition: background-color 0.2s ease;
}

.step-item__content {
  flex: 1;
  padding-bottom: 8px;
}

.step-item__title {
  font-weight: 500;
  font-size: 0.95rem;
  color: rgb(var(--v-theme-on-surface));
}

.step-item__description {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 4px 0 0;
  line-height: 1.4;
}

.step-item--active .step-item__title {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.step-item--completed .step-item__title {
  color: rgb(var(--v-theme-success));
}

.step-item--locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-header__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.v-field) {
  border-radius: 10px !important;
  background-color: rgba(var(--v-theme-on-surface), 0.02) !important;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

:deep(.v-field--focused) {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
}

:deep(.v-label) {
  color: rgba(var(--v-theme-on-surface), 0.7) !important;
  font-size: 0.9rem !important;
}

:deep(.v-field__input) {
  color: rgb(var(--v-theme-on-surface)) !important;
}

.save-btn {
  min-width: 160px;
  border-radius: 8px !important;
  text-transform: none !important;
  font-weight: 500 !important;
  background: linear-gradient(135deg, #7367F0 0%, #9B8DFF 100%) !important;
  box-shadow: 0 4px 12px rgba(115, 103, 240, 0.2) !important;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(115, 103, 240, 0.3) !important;
}

/* Responsive */
@media (max-width: 960px) {
  .steps-card {
    margin-bottom: 20px;
  }
}

@media (max-width: 600px) {
  .step-item {
    padding: 8px 0;
  }
  
  .step-item__title {
    font-size: 0.9rem;
  }
  
  .step-item__description {
    font-size: 0.75rem;
  }
}
</style>

<route lang="yaml">
name: profile
path: /profile
meta:
  action: read
  subject: Auth
</route>
