<script setup>
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
import PendingPatientInfoStep from '@/components/dr-network/PendingPatientInfoStep.vue'
import PreparingConsultationStep from '@/components/dr-network/PreparingConsultationStep.vue'
import ProviderSlotSelectionStep from '@/components/dr-network/ProviderSlotSelectionStep.vue'
import ReviewAndSubmitStep from '@/components/dr-network/ReviewAndSubmitStep.vue'

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

const stepComponents = {
  checkout: CheckoutStep,
  awaiting_payment_confirmation: PaymentConfirmationStep,
  preparing_consultation: PreparingConsultationStep,
  document_upload: DocumentUploadStep,
  intake_questions: IntakeQuestionsStep,
  slot_selection: ProviderSlotSelectionStep,
  review_and_submit: ReviewAndSubmitStep,
  provider_review: AwaitingReviewStep,
  awaiting_review: AwaitingReviewStep,
  pending_patient_info: PendingPatientInfoStep,
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

const failureReason = computed(() => journey.value?.failure_reason || workflow.value?.step_data?.failure_reason || workflow.value?.failure_reason || '')

const failedStepKey = computed(() => journey.value?.failed_step_key || workflow.value?.failed_step_key || workflow.value?.current_step_key || '')

const failureTitle = computed(() => {
  if (failureReason.value === 'rejected_by_provider') return 'Your consultation could not be approved'
  if (failureReason.value === 'blocking_rule') return 'This order needs support review'
  if (failureReason.value) return 'Your consultation could not continue'

  return 'This order needs support'
})

const failureMessage = computed(() => {
  if (journey.value?.message) return journey.value.message
  if (failureReason.value === 'rejected_by_provider')
    return 'A provider reviewed your information and could not approve this consultation. Support can help with next steps.'
  if (failureReason.value === 'blocking_rule')
    return 'Based on the information provided, this consultation cannot continue automatically. Support can review the order with you.'
  if (failureReason.value)
    return 'We could not complete this consultation workflow. Support can review the order and help with the next step.'

  return 'We could not complete this consultation workflow. Please contact support for help with this order.'
})

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

const journeyMessage = computed(() => {
  if (error.value) return error.value
  if (journey.value?.message) return journey.value.message

  return 'We are checking your order journey.'
})

const goHome = () => {
  clearPollTimer()
  router.push('/')
  window.scrollTo(0, 0)
}

const goSupport = () => {
  clearPollTimer()
  router.push('/contact')
  window.scrollTo(0, 0)
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

onMounted(refreshJourney)
onBeforeUnmount(clearPollTimer)
</script>

<template>
  <main class="journey-page">
    <div class="journey-container">
      <section
        v-if="loading"
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

      <section
        v-else-if="isFailedJourney"
        class="journey-state-card journey-state-card--error"
      >
        <div class="journey-alert">
          !
        </div>
        <p class="journey-eyebrow">
          Support needed
        </p>
        <h1>{{ failureTitle }}</h1>
        <p>{{ failureMessage }}</p>
        <div class="journey-meta">
          <div>
            <span>Failure reason</span>
            <strong>{{ prettyLabel(failureReason) }}</strong>
          </div>
          <div>
            <span>Failed step</span>
            <strong>{{ prettyLabel(failedStepKey) }}</strong>
          </div>
          <div>
            <span>Journey status</span>
            <strong>{{ prettyLabel(journey?.journey_status) }}</strong>
          </div>
          <div>
            <span>Next action</span>
            <strong>{{ prettyLabel(journey?.next_action) }}</strong>
          </div>
        </div>
        <div class="journey-actions">
          <button
            class="journey-button journey-button--secondary"
            @click="refreshJourney"
          >
            Refresh status
          </button>
          <button
            class="journey-button"
            @click="goSupport"
          >
            Contact Support
          </button>
        </div>
      </section>

      <section
        v-else-if="journey?.next_action === 'wait' && !CurrentStepComponent"
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
        class="journey-state-card"
      >
        <div class="journey-spinner" />
        <p class="journey-eyebrow">
          Loading workflow
        </p>
        <h1>Opening your consultation</h1>
        <p>We are loading the current backend workflow step.</p>
      </section>

      <component
        :is="CurrentStepComponent"
        v-else-if="CurrentStepComponent"
        :order-uuid="orderUuid"
        :journey="journey"
        :workflow="workflow"
        :session-id="sessionId"
        :retry-in-seconds="retryInSeconds"
        @refresh-journey="refreshJourney"
        @refresh-workflow="refreshWorkflow"
      />

      <section
        v-else
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
    </div>
  </main>
</template>

<style scoped>
.journey-page {
  min-height: 100vh;
  padding: 5rem 1rem 3rem;
  background:
    radial-gradient(circle at top left, rgba(5, 150, 105, 0.12), transparent 34rem),
    linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
}

.journey-container {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.journey-state-card {
  width: min(620px, 100%);
  padding: 2rem 1.5rem;
  margin: 12vh auto 0;
  text-align: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.09);
}

.journey-state-card--error {
  border-color: #fee2e2;
}

.journey-spinner,
.journey-alert {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  border-radius: 999px;
}

.journey-spinner {
  border: 4px solid #dbeafe;
  border-top-color: #059669;
  animation: spin 0.85s linear infinite;
}

.journey-alert {
  color: #ffffff;
  font-size: 2rem;
  font-weight: 900;
  background: linear-gradient(135deg, #f97316, #dc2626);
}

.journey-eyebrow {
  margin: 0 0 0.45rem;
  color: #065f46;
  font-size: 0.78rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #0f172a;
  font-size: 1.85rem;
  font-weight: 850;
  line-height: 1.18;
}

.journey-state-card > p:not(.journey-eyebrow) {
  max-width: 480px;
  margin: 0.75rem auto 0;
  color: #475569;
  line-height: 1.65;
}

.journey-chip {
  display: inline-flex;
  padding: 0.45rem 0.75rem;
  margin-top: 1rem;
  color: #065f46;
  font-weight: 850;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
}

.journey-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.journey-button {
  min-height: 48px;
  padding: 0.8rem 1.15rem;
  color: #ffffff;
  font-weight: 850;
  background: linear-gradient(135deg, #059669, #0284c7);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.journey-button--secondary {
  color: #0f172a;
  background: #e2e8f0;
}

.journey-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1.25rem;
  text-align: left;
}

.journey-meta div {
  padding: 0.85rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.journey-meta span {
  display: block;
  color: #94a3b8;
  font-size: 0.76rem;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.journey-meta strong {
  display: block;
  margin-top: 0.25rem;
  color: #0f172a;
  font-weight: 850;
  overflow-wrap: anywhere;
}

@media (max-width: 620px) {
  .journey-page {
    padding: 4.5rem 1rem 2rem;
  }

  .journey-state-card {
    margin-top: 6vh;
    padding: 1.5rem 1rem;
    border-radius: 18px;
  }

  .journey-meta {
    grid-template-columns: 1fr;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
