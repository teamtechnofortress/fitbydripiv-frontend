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
      <div>
        <div class="dn-badge">
          <span class="dn-badge-dot" />
          {{ badge }}
        </div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle">
          {{ subtitle }}
        </p>
      </div>

      <aside class="dn-aside">
        <span>{{ asideTitle }}</span>
        <strong v-if="orderUuid">{{ orderUuid }}</strong>
        <p>{{ asideText }}</p>
      </aside>
    </section>

    <slot />
  </div>
</template>

<style scoped>
.dn-shell {
  --dn-green: #059669;
  --dn-green-dark: #065f46;
  --dn-green-light: #ecfdf5;
  --dn-blue: #0284c7;
  --dn-text: #0f172a;
  --dn-text-2: #475569;
  --dn-text-3: #94a3b8;
  --dn-border: #e2e8f0;
  --dn-surface: #ffffff;
  --dn-surface-2: #f8fafc;
  --dn-gradient: linear-gradient(135deg, #059669 0%, #0284c7 100%);
  width: 100%;
}

.dn-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.38fr);
  gap: 1.25rem;
  align-items: stretch;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(236, 253, 245, 0.96), rgba(240, 249, 255, 0.96));
  border: 1px solid rgba(167, 243, 208, 0.85);
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04);
}

.dn-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  margin-bottom: 0.8rem;
  color: var(--dn-green-dark);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(167, 243, 208, 0.85);
  border-radius: 999px;
}

.dn-badge-dot {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--dn-green);
  border-radius: 999px;
}

h1 {
  max-width: 760px;
  margin: 0;
  color: var(--dn-text);
  font-size: clamp(2rem, 5vw, 3.35rem);
  font-weight: 850;
  line-height: 1.02;
}

.dn-hero > div > p {
  max-width: 680px;
  margin: 0.8rem 0 0;
  color: var(--dn-text-2);
  font-size: 1.02rem;
  line-height: 1.7;
}

.dn-aside {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(226, 232, 240, 0.85);
  border-radius: 18px;
}

.dn-aside span {
  color: var(--dn-text-3);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.dn-aside strong {
  margin: 0.35rem 0 0.55rem;
  color: var(--dn-text);
  font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.82rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.dn-aside p {
  margin: 0;
  color: var(--dn-text-2);
  font-size: 0.92rem;
  line-height: 1.55;
}

@media (max-width: 860px) {
  .dn-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .dn-hero {
    padding: 1rem;
    border-radius: 18px;
  }

  h1 {
    font-size: 2rem;
  }
}
</style>
