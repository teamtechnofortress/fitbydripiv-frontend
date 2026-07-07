<script setup>
import { computed } from 'vue'
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

const pauseReason = computed(() => props.workflow?.step_data?.pause_reason || props.workflow?.pause_reason || 'pending_patient_info')
</script>

<template>
  <DrNetworkStepShell
    title="More information may be needed"
    subtitle="Your consultation is paused while the care team reviews what information is needed next."
    badge="Action pending"
    :order-uuid="orderUuid"
  >
    <section class="dn-card">
      <span class="dn-chip">{{ String(pauseReason).replace(/_/g, ' ') }}</span>
      <h2>Please stay available</h2>
      <p>We will update this journey when the backend returns a specific next step. If you need help now, contact support.</p>
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

.dn-chip {
  display: inline-flex;
  padding: 0.45rem 0.7rem;
  color: #92400e;
  font-weight: 850;
  text-transform: capitalize;
  background: #fffbeb;
  border: 1px solid #fde68a;
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
</style>
