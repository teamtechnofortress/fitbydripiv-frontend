<script setup>
import { computed, ref } from 'vue'
import { submitDrNetworkWorkflow } from '@/api/drNetworkApi'
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

const submitting = ref(false)
const error = ref('')
const message = ref('')

const summaryRows = computed(() => [
  ['Order status', props.journey?.order_status || 'Processing'],
  ['Payment status', props.journey?.payment_status || 'Paid'],
  ['Workflow status', props.workflow?.status || 'Running'],
  ['Current step', props.workflow?.current_step_key || 'Review'],
])

const prettyLabel = value => String(value || '-')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase())

const submit = async () => {
  if (submitting.value) return

  submitting.value = true
  error.value = ''
  message.value = ''

  try {
    await submitDrNetworkWorkflow(props.orderUuid)
    message.value = 'Consultation submitted. Checking provider review status.'
    emit('refreshJourney')
    emit('refreshWorkflow')
  } catch (err) {
    error.value = err?.response?.data?.message || 'Unable to submit your consultation right now.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <DrNetworkStepShell
    title="Review and submit"
    subtitle="Confirm your consultation details and submit them for provider review."
    badge="Final review"
    :order-uuid="orderUuid"
  >
    <section class="review-card">
      <div class="review-summary">
        <div
          v-for="[label, value] in summaryRows"
          :key="label"
          class="review-summary__row"
        >
          <span>{{ label }}</span>
          <strong>{{ prettyLabel(value) }}</strong>
        </div>
      </div>

      <div class="review-note">
        <p class="review-eyebrow">
          Final check
        </p>
        <h2>Ready for provider review</h2>
        <p>Make sure your documents, questions, and provider selection are accurate before submitting.</p>
      </div>

      <p
        v-if="message"
        class="review-message review-message--success"
      >
        {{ message }}
      </p>
      <p
        v-if="error"
        class="review-message review-message--error"
      >
        {{ error }}
      </p>

      <button
        class="primary-btn"
        :disabled="submitting"
        @click="submit"
      >
        <span
          v-if="submitting"
          class="button-spinner"
          aria-hidden="true"
        />
        {{ submitting ? 'Submitting...' : 'Submit for provider review' }}
      </button>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.review-card {
  --accent: #0071e3;
  --accent-soft: rgba(0, 113, 227, 0.1);
  --success: #0a7f45;
  --success-soft: rgba(52, 199, 89, 0.12);
  --danger: #d92d20;
  --danger-soft: rgba(255, 59, 48, 0.08);
  --ink: #1d1d1f;
  --muted: #637098;
  --line: #e4e8f5;
  --surface-soft: #f7f7fb;
  display: grid;
  gap: 1rem;
  width: min(660px, 100%);
  padding: 1.2rem;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: 0 18px 48px rgba(26, 38, 74, 0.08), 0 2px 10px rgba(26, 38, 74, 0.04);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  animation: review-card-in 0.34s cubic-bezier(0.28, 0.11, 0.32, 1) both;
}

@keyframes review-card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.review-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.review-summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
  padding: 0.85rem 0.9rem;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 14px;
}

.review-summary__row span {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.review-summary__row strong {
  min-width: 0;
  overflow: hidden;
  color: var(--ink);
  font-size: 0.86rem;
  font-weight: 650;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-note {
  padding: 1rem;
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 14px;
}

.review-eyebrow {
  margin: 0 0 0.35rem;
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  line-height: 1.1;
  text-transform: uppercase;
}

.review-note h2 {
  margin: 0;
  color: var(--ink);
  font-size: 1.08rem;
  font-weight: 670;
  line-height: 1.25;
}

.review-note p:not(.review-eyebrow) {
  margin: 0.38rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-height: 46px;
  padding: 0 1.15rem;
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 680;
  line-height: 1;
  background: var(--accent);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(0, 113, 227, 0.18);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.primary-btn:hover:not(:disabled) {
  background: #0068d6;
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(0, 113, 227, 0.22);
}

.primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  transform: none;
  box-shadow: none;
}

.button-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.32);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}

.review-message {
  margin: 0;
  padding: 0.72rem 0.85rem;
  font-size: 0.84rem;
  font-weight: 620;
  line-height: 1.4;
  border-radius: 12px;
}

.review-message--success {
  color: var(--success);
  background: var(--success-soft);
}

.review-message--error {
  color: var(--danger);
  background: var(--danger-soft);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 560px) {
  .review-card {
    padding: 1rem;
    border-radius: 18px;
  }

  .review-summary {
    grid-template-columns: 1fr;
  }

  .review-summary__row {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.25rem;
  }

  .review-summary__row strong {
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .review-card,
  .button-spinner {
    animation: none;
  }
}
</style>
