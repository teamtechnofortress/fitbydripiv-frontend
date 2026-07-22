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

const emit = defineEmits(['refreshJourney', 'refreshWorkflow'])

const status = ref(null)
const loading = ref(false)
const error = ref('')
const timer = ref(null)

const currentStatus = computed(() => status.value || props.workflow || {})

const isPaused = computed(() => Boolean(currentStatus.value?.pause_reason) || currentStatus.value?.flow_status === 'paused')
const isFailed = computed(() => Boolean(currentStatus.value?.failure_reason) || currentStatus.value?.flow_status === 'failed')

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
      emit('refreshJourney')
      emit('refreshWorkflow')

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
    <section class="review-status-card">
      <div class="review-status-card__hero">
        <div
          class="review-orbit"
          aria-hidden="true"
        >
          <span />
        </div>
        <div class="review-status-card__copy">
          <p class="review-eyebrow">
            Clinical review
          </p>
          <h2>Under clinical review</h2>
          <p>Provider review can take some time. You can leave this page and return later.</p>
        </div>
      </div>

      <div class="review-status-grid">
        <div>
          <span>Flow status</span>
          <strong>{{ prettyLabel(currentStatus.flow_status || currentStatus.status) }}</strong>
        </div>
        <div>
          <span>Current step</span>
          <strong>{{ prettyLabel(currentStatus.current_step_key) }}</strong>
        </div>
        <div v-if="isPaused">
          <span>Pause reason</span>
          <strong>{{ prettyLabel(currentStatus.pause_reason) }}</strong>
        </div>
        <div v-if="isFailed">
          <span>Failure reason</span>
          <strong>{{ prettyLabel(currentStatus.failure_reason) }}</strong>
        </div>
      </div>

      <p
        v-if="error"
        class="review-message review-message--error"
      >
        {{ error }}
      </p>
      <p
        v-else
        class="review-message"
      >
        {{ loading ? 'Checking review status...' : 'Next check runs automatically in about 30 seconds.' }}
      </p>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.review-status-card {
  --accent: #0071e3;
  --accent-soft: rgba(0, 113, 227, 0.1);
  --accent-soft-2: rgba(0, 113, 227, 0.06);
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
  animation: review-status-card-in 0.34s cubic-bezier(0.28, 0.11, 0.32, 1) both;
}

@keyframes review-status-card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.review-status-card__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.95rem;
  align-items: center;
  padding: 1rem;
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 16px;
}

.review-orbit {
  position: relative;
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 16px;
}

.review-orbit::before {
  position: absolute;
  inset: 10px;
  content: "";
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 999px;
  animation: review-spin 1.1s linear infinite;
}

.review-orbit span {
  width: 7px;
  height: 7px;
  background: currentColor;
  border-radius: 999px;
}

.review-status-card__copy {
  min-width: 0;
}

h2,
p {
  margin: 0;
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

h2 {
  color: var(--ink);
  font-size: 1.12rem;
  font-weight: 670;
  line-height: 1.22;
}

.review-status-card__hero p:not(.review-eyebrow) {
  margin-top: 0.35rem;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.review-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.review-status-grid div {
  min-width: 0;
  padding: 0.85rem 0.9rem;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 14px;
}

.review-status-grid span {
  display: block;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.review-status-grid strong {
  display: block;
  margin-top: 0.25rem;
  overflow: hidden;
  color: var(--ink);
  font-size: 0.86rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-message {
  margin: 0;
  padding: 0.72rem 0.85rem;
  color: var(--accent);
  font-size: 0.84rem;
  font-weight: 620;
  line-height: 1.4;
  background: var(--accent-soft-2);
  border-radius: 12px;
}

.review-message--error {
  color: var(--danger);
  background: var(--danger-soft);
}

@keyframes review-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .review-status-card {
    padding: 1rem;
    border-radius: 18px;
  }

  .review-status-card__hero,
  .review-status-grid {
    grid-template-columns: 1fr;
  }

  .review-status-card__hero {
    align-items: flex-start;
  }

  .review-status-grid strong {
    white-space: normal;
  }
}

@media (prefers-reduced-motion: reduce) {
  .review-status-card,
  .review-orbit::before {
    animation: none;
  }
}
</style>
