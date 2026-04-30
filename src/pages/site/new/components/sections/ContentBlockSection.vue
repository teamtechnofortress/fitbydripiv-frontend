<script setup>
import { computed } from 'vue'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const content = computed(() => props.section.content || {})
const headline = computed(() => props.section.headline || content.value.headline)
const intro = computed(() => props.section.intro || content.value.intro)
const paragraphs = computed(() => props.section.paragraphs || content.value.paragraphs || [])
const bullets = computed(() => props.section.bullets || content.value.bullets || [])
const rows = computed(() => props.section.rows || content.value.rows || [])
const isCentered = computed(() => (props.section.alignment || content.value.alignment) === 'center')
const maxWidthClass = computed(() => {
  const maxWidth = props.section.max_width || content.value.max_width || 'content'

  if (maxWidth === 'wide')
    return 'content-block-shell__inner--wide'
  if (maxWidth === 'full')
    return 'content-block-shell__inner--full'
  return 'content-block-shell__inner--content'
})
const backgroundClass = computed(() => {
  const backgroundStyle = props.section.background_style || content.value.background_style
  if (backgroundStyle === 'soft_gradient')
    return 'content-block-shell--soft-gradient'
  if (backgroundStyle === 'muted')
    return 'content-block-shell--muted'
  return ''
})
</script>

<template>
  <section class="content-block-shell" :class="[backgroundClass, { 'content-block-shell--center': isCentered }]">
    <div class="content-block-shell__inner" :class="maxWidthClass">
      <div v-if="section.subtitle" class="content-block-shell__eyebrow">
        {{ section.subtitle }}
      </div>
      <h2 v-if="headline" class="content-block-shell__headline">
        {{ headline }}
      </h2>
      <p v-if="intro" class="content-block-shell__intro">
        {{ intro }}
      </p>

      <div v-if="paragraphs.length" class="content-block-shell__paragraphs">
        <p
          v-for="(paragraph, index) in paragraphs"
          :key="`paragraph-${index}`"
          class="content-block-shell__paragraph"
        >
          {{ paragraph }}
        </p>
      </div>

      <ul v-if="bullets.length" class="content-block-shell__bullets">
        <li
          v-for="(bullet, index) in bullets"
          :key="`bullet-${index}`"
        >
          {{ bullet }}
        </li>
      </ul>

      <div v-if="rows.length" class="content-block-shell__rows">
        <div
          v-for="(row, index) in rows"
          :key="`row-${index}`"
          class="content-block-shell__row"
        >
          <span class="content-block-shell__row-label">{{ row.label }}</span>
          <span class="content-block-shell__row-value">{{ row.value }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.content-block-shell {
  padding: 3.5rem 1.5rem;
  background: #fff;
}

.content-block-shell--soft-gradient {
  background:
    radial-gradient(circle at top left, rgba(16, 185, 129, 0.08), transparent 22%),
    linear-gradient(180deg, #f8fcff, #ffffff);
}

.content-block-shell--muted {
  background: #f8fafc;
}

.content-block-shell__inner {
  margin: 0 auto;
}

.content-block-shell__inner--content {
  max-width: 760px;
}

.content-block-shell__inner--wide {
  max-width: 1040px;
}

.content-block-shell__inner--full {
  max-width: 1280px;
}

.content-block-shell--center .content-block-shell__inner {
  text-align: center;
}

.content-block-shell__eyebrow {
  color: #0f766e;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.7rem;
}

.content-block-shell__headline {
  margin: 0;
  color: #0f172a;
  font-size: clamp(1.8rem, 3vw, 2.8rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.content-block-shell__intro {
  margin: 1rem 0 0;
  color: #475569;
  font-size: 1.02rem;
  line-height: 1.8;
}

.content-block-shell__paragraphs {
  margin-top: 1.25rem;
}

.content-block-shell__paragraph {
  margin: 0;
  color: #334155;
  line-height: 1.9;
}

.content-block-shell__paragraph + .content-block-shell__paragraph {
  margin-top: 1rem;
}

.content-block-shell__bullets {
  margin: 1.5rem 0 0;
  padding-left: 1.25rem;
  color: #334155;
  line-height: 1.8;
}

.content-block-shell--center .content-block-shell__bullets {
  display: inline-block;
  text-align: left;
}

.content-block-shell__bullets li + li {
  margin-top: 0.6rem;
}

.content-block-shell__rows {
  margin-top: 1.75rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.88);
}

.content-block-shell__row {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 1rem;
  padding: 0.95rem 1.1rem;
}

.content-block-shell__row + .content-block-shell__row {
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.content-block-shell__row-label {
  color: #0f172a;
  font-weight: 700;
}

.content-block-shell__row-value {
  color: #475569;
}

@media (max-width: 767px) {
  .content-block-shell__row {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }
}
</style>
