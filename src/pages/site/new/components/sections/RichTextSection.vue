<script setup>
import { computed } from 'vue'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
  pageSlug: {
    type: String,
    default: '',
  },
})

const content = computed(() => props.section.content || {})
const html = computed(() => content.value.html || props.section.html || '')
const isDocumentPage = computed(() => ['terms', 'privacy', 'legal'].includes(String(props.pageSlug || '').toLowerCase()))

const alignment = computed(() => {
  if (isDocumentPage.value)
    return 'left'

  const value = content.value.alignment || props.section.alignment || 'left'

  return ['left', 'center', 'right'].includes(value) ? value : 'left'
})

const maxWidth = computed(() => {
  if (isDocumentPage.value)
    return 'normal'

  const value = content.value.max_width || props.section.max_width || 'content'

  if (value === 'narrow')
    return 'content'

  return ['content', 'normal', 'wide', 'full'].includes(value) ? value : 'wide'
})

const backgroundStyle = computed(() => {
  const value = content.value.background_style || props.section.background_style || 'light'

  if (value === 'default' || value === 'white')
    return 'light'
  if (value === 'soft_gradient')
    return 'soft-gradient'

  return ['light', 'muted', 'soft-gradient', 'dark'].includes(value) ? value : 'light'
})

const sectionClasses = computed(() => {
  if (isDocumentPage.value)
    return [
      'public-content-section',
      'public-content-section--compact',
      'public-content-section--bg-light',
      'public-content-section--align-left',
    ]

  return [
    'public-content-section',
    `public-content-section--align-${alignment.value}`,
    `public-content-section--bg-${backgroundStyle.value}`,
  ]
})

const contentClasses = computed(() => [
  'public-content-shell',
  `public-content-shell--${maxWidth.value}`,
  'public-prose',
  'public-prose--rich-text',
])
</script>

<template>
  <section :class="sectionClasses">
    <!-- eslint-disable vue/no-v-html -->
    <div
      :class="contentClasses"
      v-html="html"
    />
    <!-- eslint-enable vue/no-v-html -->
  </section>
</template>
