<script setup>
const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <section class="section-header-shell" :class="section.content?.alignment === 'center' ? 'section-header-shell--center' : ''">
    <div class="section-header-shell__inner">
      <div class="section-header-shell__eyebrow">{{ section.title }}</div>
      <h2 class="section-header-shell__title">{{ section.content?.headline }}</h2>
      <p v-if="section.content?.description" class="section-header-shell__description">
        {{ section.content.description }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.section-header-shell {
  padding: 4.25rem 1.5rem 1.35rem;
}

.section-header-shell--center .section-header-shell__inner {
  text-align: center;
  margin: 0 auto;
}

.section-header-shell__inner {
  max-width: 760px;
}

.section-header-shell__eyebrow {
  color: #0f766e;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.7rem;
}

.section-header-shell__title {
  margin: 0;
  color: #0f172a;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.section-header-shell__description {
  margin: 1rem auto 0;
  color: #475569;
  line-height: 1.75;
  max-width: 640px;
}
</style>
