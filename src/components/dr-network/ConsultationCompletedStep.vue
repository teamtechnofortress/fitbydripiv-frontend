<script setup>
import DrNetworkStepShell from './DrNetworkStepShell.vue'

defineProps({
  orderUuid: {
    type: String,
    required: true,
  },
  journey: {
    type: Object,
    default: null,
  },
})
</script>

<template>
  <DrNetworkStepShell
    title="Consultation complete"
    :subtitle="journey?.message || 'Your consultation workflow is complete.'"
    badge="Complete"
    :order-uuid="orderUuid"
  >
    <section class="dn-card">
      <div class="dn-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2>Your care workflow is finished</h2>
      <p>No further action is required on this page.</p>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.dn-card {
  padding: 2rem 1.25rem;
  text-align: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04);
}

.dn-icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  color: #ffffff;
  background: linear-gradient(135deg, #059669, #0284c7);
  border-radius: 999px;
}

h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.35rem;
  font-weight: 850;
}

p {
  margin: 0.45rem 0 0;
  color: #475569;
}
</style>
