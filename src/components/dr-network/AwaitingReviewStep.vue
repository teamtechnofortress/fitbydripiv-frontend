<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getDrNetworkStatus } from '@/api/drNetworkApi'
import DrNetworkStepShell from './DrNetworkStepShell.vue'

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

const status = ref(null)
const loading = ref(false)
const error = ref('')
const timer = ref(null)

const currentStatus = computed(() => status.value || props.workflow || {})

const prettyLabel = value => String(value || '-')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase())

const clearTimer = () => {
  if (timer.value) {
    clearTimeout(timer.value)
    timer.value = null
  }
}

const scheduleStatusPoll = () => {
  clearTimer()
  timer.value = setTimeout(loadStatus, 30000)
}

async function loadStatus() {
  loading.value = true
  error.value = ''

  try {
    const data = await getDrNetworkStatus(props.orderUuid)
    status.value = data

    if (['completed', 'failed', 'paused'].includes(data?.flow_status) || data?.pause_reason || data?.failure_reason) {
      emit('refresh-journey')
      emit('refresh-workflow')

      return
    }

    scheduleStatusPoll()
  } catch (err) {
    error.value = err?.response?.data?.message || 'Unable to check provider review status.'
    scheduleStatusPoll()
  } finally {
    loading.value = false
  }
}

onMounted(loadStatus)
onBeforeUnmount(clearTimer)
</script>

<template>
  <DrNetworkStepShell
    title="Provider review is underway"
    subtitle="Your consultation has been submitted. This page checks for backend updates automatically."
    badge="Awaiting review"
    :order-uuid="orderUuid"
  >
    <section class="dn-card">
      <div class="dn-review-visual">
        <div class="dn-pulse" />
        <div>
          <h2>Under clinical review</h2>
          <p>Provider review can take some time. You can leave this page and return later.</p>
        </div>
      </div>

      <div class="dn-status-grid">
        <div>
          <span>Flow status</span>
          <strong>{{ prettyLabel(currentStatus.flow_status || currentStatus.status) }}</strong>
        </div>
        <div>
          <span>Current step</span>
          <strong>{{ prettyLabel(currentStatus.current_step_key) }}</strong>
        </div>
        <div>
          <span>Pause reason</span>
          <strong>{{ prettyLabel(currentStatus.pause_reason) }}</strong>
        </div>
        <div>
          <span>Failure reason</span>
          <strong>{{ prettyLabel(currentStatus.failure_reason) }}</strong>
        </div>
      </div>

      <p
        v-if="error"
        class="dn-message dn-message--error"
      >
        {{ error }}
      </p>
      <p
        v-else
        class="dn-message"
      >
        {{ loading ? 'Checking review status...' : 'Next check runs automatically in about 30 seconds.' }}
      </p>
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

.dn-review-visual {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 16px;
}

.dn-pulse {
  width: 54px;
  height: 54px;
  flex: 0 0 auto;
  background: linear-gradient(135deg, #059669, #0284c7);
  border-radius: 999px;
  animation: pulse 1.4s ease-in-out infinite;
}

h2,
p {
  margin: 0;
}

h2 {
  color: #0f172a;
  font-size: 1.2rem;
  font-weight: 850;
}

.dn-review-visual p {
  margin-top: 0.3rem;
  color: #475569;
  line-height: 1.6;
}

.dn-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.dn-status-grid div {
  padding: 0.85rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.dn-status-grid span {
  display: block;
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dn-status-grid strong {
  display: block;
  margin-top: 0.25rem;
  color: #0f172a;
  font-weight: 850;
}

.dn-message {
  margin: 1rem 0 0;
  color: #64748b;
  font-weight: 750;
}

.dn-message--error {
  color: #b91c1c;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 6px rgba(5, 150, 105, 0.14); }
  50% { box-shadow: 0 0 0 14px rgba(2, 132, 199, 0.08); }
}

@media (max-width: 640px) {
  .dn-review-visual,
  .dn-status-grid {
    grid-template-columns: 1fr;
  }

  .dn-review-visual {
    align-items: flex-start;
  }
}
</style>
