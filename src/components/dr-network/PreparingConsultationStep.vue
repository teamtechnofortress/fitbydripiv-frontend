<script setup>
import { computed } from 'vue'
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
  retryInSeconds: {
    type: Number,
    default: null,
  },
})

const message = computed(() => props.journey?.message || 'We are preparing your consultation journey.')
</script>

<template>
  <DrNetworkStepShell
    title="Preparing your consultation"
    :subtitle="message"
    badge="Consultation"
    aside-title="System state"
    :aside-text="journey?.system_state || 'dr_network_initializing'"
    :order-uuid="orderUuid"
  >
    <section class="dn-card">
      <div class="dn-spinner" />
      <div>
        <span class="dn-chip">Preparing</span>
        <h2>Your consultation journey is being created</h2>
        <p>{{ message }}</p>
      </div>

      <p
        v-if="retryInSeconds"
        class="dn-retry"
      >
        Checking again in {{ retryInSeconds }}s
      </p>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.dn-card {
  display: grid;
  gap: 1rem;
  max-width: 620px;
  padding: 1.25rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04);
}

.dn-spinner {
  width: 4rem;
  height: 4rem;
  border: 4px solid #dbeafe;
  border-top-color: #059669;
  border-radius: 999px;
  animation: spin 0.85s linear infinite;
}

.dn-chip {
  display: inline-flex;
  padding: 0.45rem 0.7rem;
  color: #065f46;
  font-weight: 850;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
}

h2 {
  margin: 1rem 0 0.4rem;
  color: #0f172a;
  font-size: 1.25rem;
  font-weight: 850;
}

p {
  margin: 0;
  color: #475569;
  line-height: 1.65;
}

.dn-retry {
  color: #065f46;
  font-weight: 800;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
