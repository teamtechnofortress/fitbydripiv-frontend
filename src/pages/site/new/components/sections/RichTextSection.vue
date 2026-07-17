<script setup>
import { computed } from 'vue'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const content = computed(() => props.section.content || {})
const html = computed(() => content.value.html || props.section.html || '')

const alignment = computed(() => {
  const value = content.value.alignment || props.section.alignment || 'left'

  return ['left', 'center', 'right'].includes(value) ? value : 'left'
})

const maxWidth = computed(() => {
  const value = content.value.max_width || props.section.max_width || 'wide'

  if (value === 'narrow')
    return 'content'

  return ['content', 'normal', 'wide', 'full'].includes(value) ? value : 'wide'
})

const backgroundStyle = computed(() => {
  const value = content.value.background_style || props.section.background_style || 'light'

  if (value === 'default' || value === 'white')
    return 'light'

  return ['light', 'muted', 'soft_gradient', 'dark'].includes(value) ? value : 'light'
})

const sectionClasses = computed(() => [
  'rich-text-section',
  `rich-text-section--${maxWidth.value}`,
  `rich-text-section--align-${alignment.value}`,
  `rich-text-section--bg-${backgroundStyle.value}`,
])

const contentClasses = computed(() => [
  'rich-text-content',
  { 'rich-text-content--centered': alignment.value === 'center' },
])
</script>

<template>
  <section :class="sectionClasses">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div
      :class="contentClasses"
      v-html="html"
    />
  </section>
</template>

<style scoped>
.rich-text-section {
  padding: 56px 20px;
}

.rich-text-section--bg-light {
  background: #fff;
  color: #374151;
}

.rich-text-section--bg-muted {
  background: #f6f7f9;
  color: #374151;
}

.rich-text-section--bg-soft_gradient {
  background:
    radial-gradient(circle at top left, rgba(16, 185, 129, 0.08), transparent 28%),
    linear-gradient(180deg, #f8fffb 0%, #fff 100%);
  color: #374151;
}

.rich-text-section--bg-dark {
  background: #1f2937;
  color: #f9fafb;
}

.rich-text-section--align-left {
  text-align: left;
}

.rich-text-section--align-center {
  text-align: center;
}

.rich-text-section--align-right {
  text-align: right;
}

.rich-text-content {
  width: 100%;
  margin-inline: auto;
  color: #374151;
  font-size: 1rem;
  line-height: 1.8;
}

.rich-text-section--content .rich-text-content {
  max-width: 720px;
}

.rich-text-section--normal .rich-text-content {
  max-width: 960px;
}

.rich-text-section--wide .rich-text-content {
  max-width: 1200px;
}

.rich-text-section--full .rich-text-content {
  max-width: none;
}

.rich-text-section--bg-dark .rich-text-content {
  color: #f9fafb;
}

.rich-text-content :deep(h1),
.rich-text-content :deep(h2),
.rich-text-content :deep(h3),
.rich-text-content :deep(h4) {
  color: #111827;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.25;
  margin-block: 1.3em 0.45em;
}

.rich-text-section--bg-dark .rich-text-content :deep(h1),
.rich-text-section--bg-dark .rich-text-content :deep(h2),
.rich-text-section--bg-dark .rich-text-content :deep(h3),
.rich-text-section--bg-dark .rich-text-content :deep(h4) {
  color: #fff;
}

.rich-text-content :deep(h1:first-child),
.rich-text-content :deep(h2:first-child),
.rich-text-content :deep(h3:first-child),
.rich-text-content :deep(h4:first-child),
.rich-text-content :deep(p:first-child) {
  margin-block-start: 0;
}

.rich-text-content :deep(h1) {
  font-size: clamp(2rem, 4vw, 3rem);
}

.rich-text-content :deep(h2) {
  font-size: clamp(1.6rem, 3vw, 2.35rem);
}

.rich-text-content :deep(h3) {
  font-size: clamp(1.3rem, 2vw, 1.7rem);
}

.rich-text-content :deep(h4) {
  font-size: 1.15rem;
}

.rich-text-content :deep(p) {
  margin-block: 0 1em;
}

.rich-text-content :deep(ul),
.rich-text-content :deep(ol) {
  display: inline-block;
  margin-block: 0.4em 1.2em;
  padding-inline-start: 1.4rem;
  text-align: left;
}

.rich-text-content :deep(li) {
  margin-block: 0.25em;
}

.rich-text-content :deep(a) {
  color: #047857;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.rich-text-section--bg-dark .rich-text-content :deep(a) {
  color: #6ee7b7;
}

.rich-text-content :deep(blockquote) {
  margin: 1.25rem 0;
  padding: 0.8rem 1rem;
  border-left: 4px solid #10b981;
  background: #f0fdf4;
  color: #1f2937;
}

.rich-text-section--bg-dark .rich-text-content :deep(blockquote) {
  background: rgba(255, 255, 255, 0.08);
  color: #f9fafb;
}

.rich-text-content :deep(code) {
  padding: 0.14rem 0.32rem;
  border-radius: 6px;
  background: #eef2f7;
  color: #111827;
  font-size: 0.92em;
}

.rich-text-content :deep(pre) {
  overflow-x: auto;
  margin: 1.25rem 0;
  padding: 1rem;
  border-radius: 10px;
  background: #111827;
  color: #f9fafb;
  line-height: 1.65;
  text-align: left;
}

.rich-text-content :deep(pre code) {
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-size: 0.9rem;
}

.rich-text-section--bg-dark .rich-text-content :deep(code) {
  background: rgba(255, 255, 255, 0.14);
  color: #f9fafb;
}

.rich-text-section--bg-dark .rich-text-content :deep(pre) {
  background: rgba(0, 0, 0, 0.34);
}

.rich-text-content :deep(hr) {
  margin: 1.5rem 0;
  border: 0;
  border-top: 1px solid #e5e7eb;
}

.rich-text-section--bg-dark .rich-text-content :deep(hr) {
  border-top-color: rgba(255, 255, 255, 0.2);
}

.rich-text-content :deep(table) {
  width: 100%;
  margin: 1.25rem 0;
  border-collapse: collapse;
  text-align: left;
}

.rich-text-content :deep(th),
.rich-text-content :deep(td) {
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  vertical-align: top;
}

.rich-text-content :deep(th) {
  background: #f9fafb;
  color: #111827;
  font-weight: 700;
}

.rich-text-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.rich-text-content--centered :deep(table) {
  text-align: left;
}
</style>
