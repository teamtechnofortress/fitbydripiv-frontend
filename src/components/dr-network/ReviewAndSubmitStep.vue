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

const emit = defineEmits(['refresh-journey', 'refresh-workflow'])

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
    emit('refresh-journey')
    emit('refresh-workflow')
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
    <section class="dn-card">
      <div class="dn-summary">
        <div
          v-for="[label, value] in summaryRows"
          :key="label"
          class="dn-summary-row"
        >
          <span>{{ label }}</span>
          <strong>{{ prettyLabel(value) }}</strong>
        </div>
      </div>

      <div class="dn-note">
        <strong>Before submitting</strong>
        <p>Make sure your documents, questions, and provider selection are accurate. The backend will move the workflow into provider review after submission.</p>
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
        class="dn-button"
        :disabled="submitting"
        @click="submit"
      >
        {{ submitting ? 'Submitting...' : 'Submit for provider review' }}
      </button>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.dn-card {
  padding: 1.25rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04);
}

.dn-summary {
  display: grid;
  gap: 0.65rem;
}

.dn-summary-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.dn-summary-row span {
  color: #64748b;
  font-weight: 800;
}

.dn-summary-row strong {
  color: #0f172a;
  font-weight: 850;
  text-align: right;
}

.dn-note {
  padding: 1rem;
  margin-top: 1rem;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 14px;
}

.dn-note strong {
  color: #065f46;
}

.dn-note p {
  margin: 0.3rem 0 0;
  color: #475569;
  line-height: 1.6;
}

.dn-button {
  width: 100%;
  min-height: 50px;
  margin-top: 1rem;
  color: #ffffff;
  font-weight: 850;
  background: linear-gradient(135deg, #059669, #0284c7);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.dn-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.dn-message {
  margin: 1rem 0 0;
  font-weight: 750;
}

.dn-message--success {
  color: #065f46;
}

.dn-message--error {
  color: #b91c1c;
}

@media (max-width: 560px) {
  .dn-summary-row {
    display: grid;
  }

  .dn-summary-row strong {
    text-align: left;
  }
}
</style>
