<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const router = useRouter()
const button = props.section.content?.button || {}
const headline = props.section.content?.headline || props.section.title
const description = props.section.content?.description || props.section.subtitle

const navigate = path => {
  if (!path) return
  router.push(path)
  window.scrollTo(0, 0)
}
</script>

<template>
  <section class="telehealth-shell">
    <div class="telehealth-shell__inner">
      <div class="telehealth-panel">
        <div v-if="section.subtitle" class="telehealth-panel__eyebrow">{{ section.subtitle }}</div>
        <h3 v-if="headline">{{ headline }}</h3>
        <p v-if="description" class="telehealth-panel__description">
          {{ description }}
        </p>
        <button class="telehealth-panel__button" @click="navigate(button.link)">
          {{ button.label || 'Learn More' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.telehealth-shell {
  padding: 0 1.5rem 5rem;
}

.telehealth-shell__inner {
  max-width: 1040px;
  margin: 0 auto;
}

.telehealth-panel {
  padding: 2rem;
  border-radius: 32px;
  text-align: center;
  background:
    radial-gradient(circle at top, rgba(16, 185, 129, 0.12), transparent 35%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 249, 255, 0.98));
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.06);
}

.telehealth-panel__eyebrow {
  color: #0f766e;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
  margin-bottom: 0.85rem;
}

.telehealth-panel h3 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  line-height: 1.08;
  color: #0f172a;
}

.telehealth-panel__button {
  margin-top: 1rem;
  border: 2px solid #059669;
  background: transparent;
  color: #047857;
  border-radius: 999px;
  padding: 0.9rem 1.5rem;
  font-weight: 700;
}

.telehealth-panel__description {
  max-width: 42rem;
  margin: 0.9rem auto 0;
  color: #475569;
  line-height: 1.75;
}
</style>
