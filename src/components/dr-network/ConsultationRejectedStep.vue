<script setup>
import { useRouter } from 'vue-router'
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
  workflow: {
    type: Object,
    default: null,
  },
})

const router = useRouter()

const contactSupport = () => {
  router.push('/contact')
  window.scrollTo(0, 0)
}
</script>

<template>
  <DrNetworkStepShell
    title="We need support to review this"
    :subtitle="journey?.message || workflow?.step_data?.failure_reason || workflow?.failure_reason || 'We could not complete your consultation workflow. Please contact support.'"
    badge="Support needed"
    :order-uuid="orderUuid"
  >
    <section class="dn-card">
      <div class="dn-icon">
        !
      </div>
      <h2>Consultation could not continue</h2>
      <p>Support can review the order and help with the next step.</p>
      <button
        class="dn-button"
        @click="contactSupport"
      >
        Contact support
      </button>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.dn-card {
  padding: 2rem 1.25rem;
  text-align: center;
  background: #ffffff;
  border: 1px solid #fee2e2;
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
  font-size: 2rem;
  font-weight: 900;
  background: linear-gradient(135deg, #f97316, #dc2626);
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

.dn-button {
  min-height: 48px;
  padding: 0.8rem 1.2rem;
  margin-top: 1.2rem;
  color: #ffffff;
  font-weight: 850;
  background: linear-gradient(135deg, #059669, #0284c7);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}
</style>
