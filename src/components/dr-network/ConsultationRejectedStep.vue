<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
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

const emit = defineEmits(['refreshJourney'])

const router = useRouter()
const refreshing = ref(false)
const refreshCooldown = ref(0)
let refreshTimer = null

const canRefresh = computed(() => !refreshing.value && refreshCooldown.value <= 0)

const refreshButtonText = computed(() => {
  if (refreshing.value) return 'Refreshing...'
  if (refreshCooldown.value > 0) return `Refresh in ${refreshCooldown.value}s`

  return 'Refresh status'
})

const prettyLabel = value => String(value || '-')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase())

const failureReason = computed(() => (
  props.journey?.failure_reason
  || props.workflow?.step_data?.failure_reason
  || props.workflow?.failure_reason
  || ''
))

const failedStepKey = computed(() => (
  props.journey?.failed_step_key
  || props.workflow?.failed_step_key
  || props.workflow?.current_step_key
  || ''
))

const failureTitle = computed(() => {
  if (failureReason.value === 'rejected_by_provider') return 'Your consultation could not be approved'
  if (failureReason.value === 'blocking_rule') return 'This order needs support review'
  if (failureReason.value) return 'Your consultation could not continue'

  return 'This order needs support'
})

const failureMessage = computed(() => {
  if (props.journey?.message) return props.journey.message
  if (failureReason.value === 'rejected_by_provider')
    return 'A provider reviewed your information and could not approve this consultation. Support can help with next steps.'
  if (failureReason.value === 'blocking_rule')
    return 'Based on the information provided, this consultation cannot continue automatically. Support can review the order with you.'
  if (failureReason.value)
    return 'We could not complete this consultation workflow. Support can review the order and help with the next step.'

  return 'We could not complete this consultation workflow. Please contact support for help with this order.'
})

const supportMeta = computed(() => [
  {
    label: 'Failure reason',
    value: prettyLabel(failureReason.value),
  },
  {
    label: 'Failed step',
    value: prettyLabel(failedStepKey.value),
  },
  {
    label: 'Journey status',
    value: prettyLabel(props.journey?.journey_status || props.workflow?.status),
  },
  {
    label: 'Next action',
    value: prettyLabel(props.journey?.next_action || props.workflow?.next_action),
  },
].filter(item => item.value && item.value !== '-'))

const contactSupport = () => {
  router.push('/contact')
  window.scrollTo(0, 0)
}

const clearRefreshTimer = () => {
  if (!refreshTimer) return
  clearInterval(refreshTimer)
  refreshTimer = null
}

const startRefreshCooldown = () => {
  clearRefreshTimer()
  refreshCooldown.value = 8

  refreshTimer = setInterval(() => {
    refreshCooldown.value = Math.max(refreshCooldown.value - 1, 0)

    if (refreshCooldown.value <= 0) clearRefreshTimer()
  }, 1000)
}

const refreshStatus = () => {
  if (!canRefresh.value) return

  refreshing.value = true
  emit('refreshJourney')
  startRefreshCooldown()

  setTimeout(() => {
    refreshing.value = false
  }, 700)
}

onBeforeUnmount(clearRefreshTimer)
</script>

<template>
  <DrNetworkStepShell
    :title="failureTitle"
    :subtitle="failureMessage"
    badge="Support Needed"
    :order-uuid="orderUuid"
  >
    <section class="failed-step">
      <div class="failed-card">
        <div class="failed-icon">
          !
        </div>

        <div
          v-if="supportMeta.length"
          class="failed-meta"
        >
          <div
            v-for="item in supportMeta"
            :key="item.label"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>

        <div class="failed-actions">
          <button
            type="button"
            class="secondary-btn"
            :disabled="!canRefresh"
            @click="refreshStatus"
          >
            {{ refreshButtonText }}
          </button>
          <button
            type="button"
            class="primary-btn"
            @click="contactSupport"
          >
            Contact support
          </button>
        </div>
      </div>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.failed-step {
  --ink: #1d1d1f;
  --ink-2: #6e6e73;
  --ink-3: #a1a1a6;
  --hairline: #e5e5ea;
  --surface: #ffffff;
  --surface-2: #fafafe;
  --accent: #0071e3;
  --danger: #d70015;
  --danger-soft: #fff1f0;
  --radius-lg: 22px;
  --radius-md: 14px;
  --radius-sm: 10px;
  --shadow: 0 18px 44px rgba(15, 23, 42, 0.055), 0 2px 7px rgba(15, 23, 42, 0.035);
  width: min(620px, 100%);
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  color: var(--ink);
}

.failed-card {
  padding: 1.45rem;
  text-align: center;
  background: var(--surface);
  border: 1px solid rgba(255, 214, 211, 0.95);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.failed-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.85rem;
  color: #ffffff;
  font-size: 1.35rem;
  font-weight: 700;
  background: var(--danger);
  border-radius: 999px;
}

.failed-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 1.15rem;
  text-align: left;
}

.failed-meta div {
  min-width: 0;
  padding: 0.8rem;
  background: var(--surface-2);
  border: 1px solid rgba(229, 229, 234, 0.75);
  border-radius: var(--radius-md);
}

.failed-meta span {
  display: block;
  color: var(--ink-3);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.failed-meta strong {
  display: block;
  margin-top: 0.25rem;
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 650;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.failed-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.15rem;
  padding-top: 0.95rem;
  border-top: 1px solid var(--hairline);
}

.secondary-btn,
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 1.2rem;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.secondary-btn {
  color: #2f3850;
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(229, 229, 234, 0.95);
}

.secondary-btn:hover {
  color: var(--accent);
  background: var(--surface);
  border-color: rgba(0, 113, 227, 0.28);
}

.secondary-btn:disabled {
  color: var(--ink-3);
  background: var(--surface-2);
  border-color: transparent;
  cursor: not-allowed;
  opacity: 0.8;
}

.primary-btn {
  min-width: 168px;
  color: #ffffff;
  background: var(--accent);
  border-color: var(--accent);
}

.primary-btn:hover {
  transform: translateY(-1px);
  background: #0077ed;
}

@media (max-width: 640px) {
  .failed-card {
    padding: 1.25rem 1.15rem;
    border-radius: var(--radius-md);
  }

  .failed-meta {
    grid-template-columns: 1fr;
  }

  .failed-actions {
    flex-direction: column-reverse;
  }

  .secondary-btn,
  .primary-btn {
    width: 100%;
  }
}
</style>
