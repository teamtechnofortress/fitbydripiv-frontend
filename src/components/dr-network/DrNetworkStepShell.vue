<script setup>
defineProps({
  badge: {
    type: String,
    default: 'Consultation',
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  asideTitle: {
    type: String,
    default: 'Order journey',
  },
  asideText: {
    type: String,
    default: 'Your workflow updates automatically as each backend step is completed.',
  },
  orderUuid: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="dn-shell">
    <section class="dn-hero">
      <div class="dn-stage-strip">
        <span class="dn-stage-pill">{{ badge }}</span>
      </div>
      <h1>{{ title }}</h1>
      <p v-if="subtitle">
        {{ subtitle }}
      </p>
    </section>

    <div class="dn-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.dn-shell {
  --dn-accent: #0071e3;
  --dn-accent-soft: rgba(0, 113, 227, 0.1);
  --dn-text: #1d1d1f;
  --dn-text-2: #6e6e73;
  --dn-text-3: #a1a1a6;
  --dn-hairline: #e5e5ea;
  --dn-surface: #ffffff;
  --dn-surface-2: #f5f5f7;
  --dn-radius-lg: 22px;
  --dn-radius-md: 14px;
  --dn-shadow: 0 12px 40px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04);
  --dn-ease: cubic-bezier(0.28, 0.11, 0.32, 1);
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  animation: shell-in 0.4s var(--dn-ease) both;
}

@keyframes shell-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dn-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0 auto 1rem;
  text-align: center;
}

.dn-stage-strip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.dn-stage-pill {
  display: inline-flex;
  align-items: center;
  min-height: auto;
  padding: 0;
  color: #0066cc;
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.075em;
  line-height: 1;
  text-transform: uppercase;
  background: transparent;
  border: 0;
}

h1 {
  max-width: 560px;
  margin: 0;
  color: #20232a;
  font-size: 1.36rem;
  font-weight: 640;
  line-height: 1.16;
  letter-spacing: -0.02em;
}

.dn-hero > p {
  max-width: 520px;
  margin: 0.38rem 0 0;
  color: #637098;
  font-size: 0.88rem;
  line-height: 1.45;
}

.dn-body {
  min-width: 0;
}

@media (max-width: 560px) {
  .dn-hero {
    margin-bottom: 0.85rem;
  }

  h1 {
    font-size: 1.22rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dn-shell {
    animation: none;
  }
}
</style>
