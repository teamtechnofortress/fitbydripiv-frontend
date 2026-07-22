<script setup>
import axios from 'axios'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentStep } from '@/api/drNetworkApi'
import { getOrderJourney } from '@/api/orderJourneyApi'
import AwaitingReviewStep from '@/components/dr-network/AwaitingReviewStep.vue'
import CheckoutStep from '@/components/dr-network/CheckoutStep.vue'
import ConsultationCompletedStep from '@/components/dr-network/ConsultationCompletedStep.vue'
import ConsultationRejectedStep from '@/components/dr-network/ConsultationRejectedStep.vue'
import DocumentUploadStep from '@/components/dr-network/DocumentUploadStep.vue'
import IntakeQuestionsStep from '@/components/dr-network/IntakeQuestionsStep.vue'
import PaymentConfirmationStep from '@/components/dr-network/PaymentConfirmationStep.vue'
import PatientInfoStep from '@/components/dr-network/PatientInfoStep.vue'
import PreparingConsultationStep from '@/components/dr-network/PreparingConsultationStep.vue'
import ProviderSlotSelectionStep from '@/components/dr-network/ProviderSlotSelectionStep.vue'
import ReviewAndSubmitStep from '@/components/dr-network/ReviewAndSubmitStep.vue'
import { PUBLIC_GENERAL_SETTINGS_URL, SERVER_DOMAIN } from '@/network/const'

const route = useRoute()
const router = useRouter()

const orderUuid = computed(() => String(route.params.orderUuid || ''))
const sessionId = computed(() => route.query.session_id ? String(route.query.session_id) : '')

const journey = ref(null)
const workflow = ref(null)
const loading = ref(true)
const workflowLoading = ref(false)
const error = ref('')
const retryInSeconds = ref(null)
const pollTimer = ref(null)
const settingsRows = ref([])

const settingsByKey = computed(() => Object.fromEntries(
  settingsRows.value
    .filter(item => item?.key)
    .map(item => [item.key, item]),
))

const appName = computed(() => {
  const value = settingsByKey.value.app_name?.value

  return typeof value === 'string' && value.trim() ? value.trim() : 'FitByShot'
})

const resolveAssetUrl = value => {
  if (!value || typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return `${SERVER_DOMAIN}${trimmed}`

  return `${SERVER_DOMAIN}/storage/${trimmed.replace(/^\/+/, '')}`
}

const logoUrl = computed(() => resolveAssetUrl(settingsByKey.value.logo?.value))

const stepComponents = {
  checkout: CheckoutStep,
  awaiting_payment_confirmation: PaymentConfirmationStep,
  preparing_consultation: PreparingConsultationStep,
  intake: PatientInfoStep,
  patient_info: PatientInfoStep,
  patient_information: PatientInfoStep,
  taking_patient_info: PatientInfoStep,
  document_upload: DocumentUploadStep,
  intake_questions: IntakeQuestionsStep,
  slot_selection: ProviderSlotSelectionStep,
  review_and_submit: ReviewAndSubmitStep,
  provider_review: AwaitingReviewStep,
  awaiting_review: AwaitingReviewStep,
  pending_patient_info: PatientInfoStep,
  completed: ConsultationCompletedStep,
  payment_failed: ConsultationRejectedStep,
  failed: ConsultationRejectedStep,
}

const clearPollTimer = () => {
  if (pollTimer.value) {
    clearTimeout(pollTimer.value)
    pollTimer.value = null
  }
}

const scheduleJourneyPoll = seconds => {
  clearPollTimer()
  retryInSeconds.value = Math.max(Number(seconds) || 3, 1)

  pollTimer.value = setTimeout(() => {
    refreshJourney()
  }, retryInSeconds.value * 1000)
}

const prettyLabel = value => String(value || '-')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase())

const canOpenWorkflow = computed(() => journey.value?.is_ready === true && journey.value?.next_action === 'open_workflow')

const isFailedJourney = computed(() => (
  journey.value?.journey_status === 'failed'
  || journey.value?.current_step_key === 'failed'
  || journey.value?.next_action === 'contact_support'
))

const currentStepKey = computed(() => {
  if (journey.value?.next_action === 'complete' || journey.value?.current_step_key === 'completed') return 'completed'
  if (
    journey.value?.current_step_key === 'payment_failed'
    || journey.value?.current_step_key === 'failed'
    || journey.value?.next_action === 'contact_support'
    || journey.value?.journey_status === 'failed'
  ) return journey.value?.current_step_key || 'failed'

  if (journey.value?.current_step_key === null && journey.value?.system_state === 'dr_network_initializing')
    return 'preparing_consultation'

  if (journey.value?.current_step_key)
    return journey.value.current_step_key

  if (!canOpenWorkflow.value)
    return null

  if (workflow.value?.step_data?.pause_reason === 'pending_patient_info') return 'pending_patient_info'
  if (workflow.value?.status === 'failed' || workflow.value?.step_data?.failure_reason) return 'failed'
  if (workflow.value?.status === 'completed') return 'completed'

  return workflow.value?.current_step_key || null
})

const CurrentStepComponent = computed(() => stepComponents[currentStepKey.value] || null)

const journeyLayoutMode = computed(() => (
  ['checkout', 'slot_selection'].includes(currentStepKey.value) ? 'wide' : 'focused'
))

const journeyMessage = computed(() => {
  if (error.value) return error.value
  if (journey.value?.message) return journey.value.message

  return 'We are checking your order journey.'
})

/* A single key that identifies "what's on screen right now" so the
   Transition below can tell every distinct screen apart and animate
   between them, including two renders of the same step component. */
const viewKey = computed(() => {
  if (loading.value) return 'state-loading'
  if (error.value && !journey.value) return 'state-error'
  if (isFailedJourney.value) return 'state-failed'
  if (journey.value?.next_action === 'wait' && !CurrentStepComponent.value) return 'state-wait'
  if (workflowLoading.value && !workflow.value) return 'state-workflow-loading'
  if (CurrentStepComponent.value) return `step-${currentStepKey.value}`

  return 'state-unknown'
})

/* Slim top activity indicator: on during any fetch or backend poll wait. */
const isBusy = computed(() => loading.value || workflowLoading.value || Boolean(retryInSeconds.value))

const goHome = () => {
  clearPollTimer()
  router.push('/')
  window.scrollTo(0, 0)
}

const goBack = () => {
  clearPollTimer()
  if (window.history.length > 1) {
    router.back()

    return
  }

  router.push('/')
}

const goSupport = () => {
  clearPollTimer()
  router.push('/contact')
  window.scrollTo(0, 0)
}

const loadGeneralSettings = async () => {
  try {
    const { data } = await axios.get(PUBLIC_GENERAL_SETTINGS_URL, {
      headers: { Accept: 'application/json' },
    })

    settingsRows.value = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
  } catch {
    settingsRows.value = []
  }
}

const refreshWorkflow = async () => {
  if (!orderUuid.value) return

  workflowLoading.value = true
  error.value = ''

  try {
    workflow.value = await getCurrentStep(orderUuid.value)
  } catch (err) {
    error.value = err?.response?.data?.message || 'Unable to load the current consultation step.'
  } finally {
    workflowLoading.value = false
  }
}

const applyJourneyUpdate = data => {
  if (!data || typeof data !== 'object') return
  journey.value = {
    ...(journey.value || {}),
    ...data,
  }
  error.value = ''
  retryInSeconds.value = null
  if (data.current_step_key && data.current_step_key !== workflow.value?.current_step_key)
    workflow.value = null
}

async function refreshJourney() {
  if (!orderUuid.value) {
    error.value = 'Order reference is missing.'
    loading.value = false

    return
  }

  clearPollTimer()
  error.value = ''

  try {
    const data = await getOrderJourney(orderUuid.value)

    journey.value = data

    if (
      data?.journey_status === 'failed'
      || data?.current_step_key === 'failed'
      || data?.next_action === 'contact_support'
    ) {
      workflow.value = null
      retryInSeconds.value = null

      return
    }

    const isPaymentConfirmationStep = data?.current_step_key === 'awaiting_payment_confirmation'

    if (data?.next_action === 'wait' && (!isPaymentConfirmationStep || !sessionId.value)) {
      workflow.value = null
      scheduleJourneyPoll(data.retry_after_seconds || 3)

      return
    }

    retryInSeconds.value = null

    if (data?.is_ready === true && data?.next_action === 'open_workflow') {
      await refreshWorkflow()
    } else {
      workflow.value = null
    }
  } catch (err) {
    retryInSeconds.value = null
    error.value = err?.response?.data?.message || 'Unable to load this order journey.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadGeneralSettings()
  refreshJourney()
})
onBeforeUnmount(clearPollTimer)
</script>

<template>
  <main class="journey-page">
    <div
      class="activity-bar"
      :class="{ 'is-active': isBusy }"
      aria-hidden="true"
    >
      <span />
    </div>

    <div
      class="journey-container"
      :class="`journey-container--${journeyLayoutMode}`"
    >
      <header class="journey-topbar">
        <button
          type="button"
          class="journey-back-button"
          aria-label="Go back"
          @click="goBack"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              stroke-width="2.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Back
        </button>

        <div class="journey-brand">
          <span class="journey-brand__mark">
            <img
              v-if="logoUrl"
              :src="logoUrl"
              :alt="appName"
            >
            <span v-else>{{ appName.charAt(0) }}</span>
          </span>
          <span class="journey-brand__copy">
            <strong>{{ appName }}</strong>
          </span>
        </div>

        <div
          class="journey-topbar__spacer"
          aria-hidden="true"
        />
      </header>

      <div
        class="journey-stage"
        :class="`journey-stage--${journeyLayoutMode}`"
      >
        <Transition
          name="step-swap"
          mode="out-in"
        >
          <section
            v-if="loading"
            key="state-loading"
            class="journey-state-card"
          >
            <div class="journey-spinner" />
            <p class="journey-eyebrow">
              Loading journey
            </p>
            <h1>Checking your next step</h1>
            <p>We are asking the backend what should happen next for this order.</p>
          </section>

          <section
            v-else-if="error && !journey"
            key="state-error"
            class="journey-state-card journey-state-card--error"
          >
            <div class="journey-alert">
              !
            </div>
            <p class="journey-eyebrow">
              Journey unavailable
            </p>
            <h1>We could not load this order</h1>
            <p>{{ error }}</p>
            <div class="journey-actions">
              <button
                class="journey-button journey-button--secondary"
                @click="goHome"
              >
                Go to Home
              </button>
              <button
                class="journey-button"
                @click="goSupport"
              >
                Contact Support
              </button>
            </div>
          </section>

          <ConsultationRejectedStep
            v-else-if="isFailedJourney"
            key="state-failed"
            :order-uuid="orderUuid"
            :journey="journey"
            :workflow="workflow"
            @refresh-journey="refreshJourney"
          />

          <section
            v-else-if="journey?.next_action === 'wait' && !CurrentStepComponent"
            key="state-wait"
            class="journey-state-card"
          >
            <div class="journey-spinner" />
            <p class="journey-eyebrow">
              Preparing workflow
            </p>
            <h1>Your next steps are being prepared</h1>
            <p>{{ journeyMessage }}</p>
            <span
              v-if="retryInSeconds"
              class="journey-chip"
            >
              Checking again in {{ retryInSeconds }}s
            </span>
          </section>

          <section
            v-else-if="workflowLoading && !workflow"
            key="state-workflow-loading"
            class="journey-state-card"
          >
            <div class="journey-spinner" />
            <p class="journey-eyebrow">
              Loading workflow
            </p>
            <h1>Opening your consultation</h1>
            <p>We are loading the current backend workflow step.</p>
          </section>

          <Component
            :is="CurrentStepComponent"
            v-else-if="CurrentStepComponent"
            :key="`step-${currentStepKey}`"
            :order-uuid="orderUuid"
            :journey="journey"
            :workflow="workflow"
            :session-id="sessionId"
            :retry-in-seconds="retryInSeconds"
            @journey-updated="applyJourneyUpdate"
            @refresh-journey="refreshJourney"
            @refresh-workflow="refreshWorkflow"
          />

          <section
            v-else
            key="state-unknown"
            class="journey-state-card journey-state-card--unknown"
          >
            <div class="journey-alert">
              ?
            </div>
            <p class="journey-eyebrow">
              Unknown step
            </p>
            <h1>We do not recognize this workflow step</h1>
            <p>
              Backend returned
              <strong>{{ prettyLabel(currentStepKey || journey?.next_action || 'unknown') }}</strong>.
              Please contact support if this does not update.
            </p>
            <div class="journey-meta">
              <div>
                <span>Journey status</span>
                <strong>{{ prettyLabel(journey?.journey_status) }}</strong>
              </div>
              <div>
                <span>Next action</span>
                <strong>{{ prettyLabel(journey?.next_action) }}</strong>
              </div>
              <div>
                <span>Workflow status</span>
                <strong>{{ prettyLabel(workflow?.status) }}</strong>
              </div>
              <div>
                <span>Step key</span>
                <strong>{{ prettyLabel(workflow?.current_step_key) }}</strong>
              </div>
            </div>
            <div class="journey-actions">
              <button
                class="journey-button journey-button--secondary"
                @click="refreshJourney"
              >
                Refresh journey
              </button>
              <button
                class="journey-button"
                @click="goSupport"
              >
                Contact Support
              </button>
            </div>
          </section>
        </Transition>
      </div>
    </div>
  </main>
</template>

<style scoped>
.journey-page {
  --jp-accent: #0071e3;
  --jp-text: #1d1d1f;
  --jp-text-2: #6e6e73;
  --jp-text-3: #a1a1a6;
  --jp-hairline: #e5e5ea;
  --jp-surface: #ffffff;
  --jp-surface-2: #f5f5f7;
  --jp-danger: #d70015;
  --jp-radius-lg: 24px;
  --jp-radius-md: 14px;
  --jp-ease: cubic-bezier(0.28, 0.11, 0.32, 1);
  position: relative;
  min-height: 100dvh;
  padding: 1.45rem 1rem 1.8rem;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 50% 38%, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0) 24rem),
    #f7f7f8;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  scroll-behavior: smooth;
}

/* ---------- slim top activity indicator ---------- */

.activity-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2.5px;
  z-index: 60;
  overflow: hidden;
  background: transparent;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.activity-bar.is-active {
  opacity: 1;
}

.activity-bar span {
  display: block;
  width: 34%;
  height: 100%;
  background: linear-gradient(90deg, transparent, var(--jp-accent), transparent);
  animation: activity-slide 1.15s ease-in-out infinite;
}

@keyframes activity-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(340%); }
}

/* ---------- container ---------- */

.journey-container {
  position: relative;
  width: min(920px, 100%);
  min-height: calc(100dvh - 3.4rem);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  transition: width 0.28s var(--jp-ease);
}

.journey-container--wide {
  width: min(1180px, 100%);
}

.journey-topbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
  min-height: 44px;
  margin-bottom: 0.35rem;
}

.journey-back-button {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 36px;
  padding: 0;
  color: #3f4652;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 560;
  line-height: 1;
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  transition: color 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
}

.journey-back-button:hover {
  color: var(--jp-accent);
  transform: translateX(-2px);
}

.journey-back-button svg {
  flex: 0 0 auto;
  margin-left: -0.2rem;
}

.journey-brand {
  justify-self: center;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0;
  color: var(--jp-text);
  background: transparent;
  border: 0;
}

.journey-brand__mark {
  width: 29px;
  height: 29px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 750;
  background: #ffffff;
  border: 1px solid rgba(229, 229, 234, 0.9);
  border-radius: 10px;
  box-shadow: 0 5px 14px rgba(17, 24, 39, 0.045);
}

.journey-brand__mark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #ffffff;
}

.journey-brand__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.journey-brand__copy strong {
  color: #20232a;
  font-size: 0.96rem;
  font-weight: 620;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.journey-topbar__spacer {
  justify-self: end;
}

.journey-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(0.75rem, 2vh, 1.5rem) 0 1.4rem;
  transform: translateY(-0.45rem);
}

.journey-stage--wide {
  justify-content: flex-start;
  padding-top: clamp(0.65rem, 1.7vh, 1.15rem);
  transform: none;
}

.journey-stage > * {
  width: 100%;
}

/* ---------- transition between screens/steps ---------- */

.step-swap-enter-active,
.step-swap-leave-active {
  transition: opacity 0.32s var(--jp-ease), transform 0.32s var(--jp-ease);
}

.step-swap-enter-from {
  opacity: 0;
  transform: translateY(-18px);
}

.step-swap-leave-to {
  opacity: 0;
  transform: translateY(-18px);
}

@media (prefers-reduced-motion: reduce) {
  .step-swap-enter-active,
  .step-swap-leave-active {
    transition: opacity 0.15s linear;
  }
  .step-swap-enter-from,
  .step-swap-leave-to {
    transform: none;
  }
  .activity-bar span {
    animation: none;
  }
}

/* ---------- state cards ---------- */

.journey-state-card {
  width: min(620px, 100%);
  padding: 2rem 1.5rem;
  margin: 0 auto;
  text-align: center;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--jp-hairline);
  border-radius: var(--jp-radius-lg);
  box-shadow: 0 18px 45px rgba(17, 24, 39, 0.08);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.journey-state-card--error {
  border-color: #ffd6d3;
}

.journey-spinner,
.journey-alert {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  border-radius: 999px;
}

.journey-spinner {
  border: 3px solid var(--jp-hairline);
  border-top-color: var(--jp-accent);
  animation: spin 0.85s linear infinite;
}

.journey-alert {
  color: #ffffff;
  font-size: 1.6rem;
  font-weight: 700;
  background: var(--jp-danger);
}

.journey-eyebrow {
  margin: 0 0 0.4rem;
  color: var(--jp-accent);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--jp-text);
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1.22;
  letter-spacing: -0.02em;
}

.journey-state-card > p:not(.journey-eyebrow) {
  max-width: 460px;
  margin: 0.7rem auto 0;
  color: var(--jp-text-2);
  line-height: 1.6;
}

.journey-chip {
  display: inline-flex;
  padding: 0.4rem 0.75rem;
  margin-top: 1rem;
  color: var(--jp-accent);
  font-size: 0.84rem;
  font-weight: 650;
  background: rgba(0, 113, 227, 0.1);
  border-radius: 999px;
}

.journey-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.65rem;
  margin-top: 1.4rem;
}

.journey-button {
  min-height: 46px;
  padding: 0.75rem 1.1rem;
  color: #ffffff;
  font: inherit;
  font-weight: 650;
  font-size: 0.92rem;
  background: var(--jp-text);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.journey-button:hover {
  transform: translateY(-1px);
  opacity: 0.92;
}

.journey-button--secondary {
  color: var(--jp-text);
  background: var(--jp-surface-2);
}

.journey-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 1.4rem;
  text-align: left;
}

.journey-meta div {
  padding: 0.8rem;
  background: var(--jp-surface-2);
  border-radius: var(--jp-radius-md);
}

.journey-meta span {
  display: block;
  color: var(--jp-text-3);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.journey-meta strong {
  display: block;
  margin-top: 0.25rem;
  color: var(--jp-text);
  font-weight: 650;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

@media (max-width: 620px) {
  .journey-page {
    padding: 0.85rem 0.85rem 1.35rem;
  }

  .journey-container {
    min-height: calc(100dvh - 2.2rem);
  }

  .journey-topbar {
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .journey-brand {
    justify-self: end;
    max-width: min(260px, 100%);
  }

  .journey-topbar__spacer {
    display: none;
  }

  .journey-stage {
    justify-content: flex-start;
    padding-top: 0.25rem;
    transform: none;
  }

  .journey-state-card {
    margin-top: 6vh;
    padding: 1.5rem 1.1rem;
    border-radius: 18px;
  }

  .journey-meta {
    grid-template-columns: 1fr;
  }
}

@media (max-height: 760px) and (min-width: 621px) {
  .journey-stage {
    justify-content: flex-start;
    padding-top: clamp(1.25rem, 4vh, 2.1rem);
    transform: none;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

<route lang="yaml">
meta:
  layout: blank
  public: true
</route>
