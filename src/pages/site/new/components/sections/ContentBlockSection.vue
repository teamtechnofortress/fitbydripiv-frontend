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
const headline = computed(() => props.section.headline || content.value.headline || props.section.title)
const intro = computed(() => props.section.intro || content.value.intro || content.value.description)
const paragraphs = computed(() => props.section.paragraphs || content.value.paragraphs || [])
const bullets = computed(() => props.section.bullets || content.value.bullets || [])
const rows = computed(() => props.section.rows || content.value.rows || [])
const isCentered = computed(() => (props.section.alignment || content.value.alignment) === 'center')
const isDocumentPage = computed(() => ['terms', 'privacy', 'legal'].includes(String(props.pageSlug || '').toLowerCase()))
const contentWrapClass = computed(() => (
  (isCentered.value || isDocumentPage.value)
    ? 'max-w-4xl mx-auto text-left'
    : ''
))
const sectionClasses = computed(() => {
  if (isDocumentPage.value)
    return 'px-4 py-5 bg-white'

  const backgroundStyle = props.section.background_style || content.value.background_style

  if (backgroundStyle === 'soft_gradient')
    return 'py-12 px-4 gradient-bg-light border-y border-gray-200'
  if (backgroundStyle === 'muted')
    return 'py-12 px-4 bg-gray-50 border-y border-gray-200'

  return 'py-12 px-4 border-t border-gray-200 bg-white'
})
const maxWidthClass = computed(() => {
  if (isDocumentPage.value)
    return 'max-w-4xl'

  const maxWidth = props.section.max_width || content.value.max_width || 'content'

  if (maxWidth === 'wide')
    return 'max-w-5xl'
  if (maxWidth === 'full')
    return 'max-w-7xl'
  return 'max-w-3xl'
})
</script>


<template>
  <section :class="sectionClasses">
    <div class="mx-auto" :class="[maxWidthClass, (isCentered && !isDocumentPage) ? 'text-center' : '']">
      <div :class="contentWrapClass">
        <p
          v-if="section.subtitle"
          class="mb-4 text-sm text-gray-700"
          :class="isDocumentPage ? 'font-semibold' : (isCentered ? 'font-semibold' : 'font-semibold uppercase tracking-[0.12em] text-emerald-600')"
        >
          {{ section.subtitle }}
        </p>
        <h2
          v-if="headline"
          class="mb-4 text-gray-900"
          :class="isDocumentPage ? 'text-xl md:text-2xl font-bold' : (isCentered ? 'text-2xl md:text-3xl font-bold' : 'section-title mb-0')"
        >
          {{ headline }}
        </h2>
        <p
          v-if="intro"
          class="text-gray-700"
          :class="isDocumentPage ? 'leading-relaxed mt-0' : (isCentered ? 'text-base leading-8 max-w-none mt-0' : 'text-base leading-8 mt-3')"
          :style="isDocumentPage ? { fontSize: '0.975rem' } : undefined"
        >
          {{ intro }}
        </p>

        <div v-if="paragraphs.length" :class="isDocumentPage ? 'mt-4 space-y-4' : 'mt-6 space-y-4'">
          <p
            v-for="(paragraph, index) in paragraphs"
            :key="`paragraph-${index}`"
            class="text-gray-700"
            :class="isDocumentPage ? 'leading-relaxed' : 'text-base leading-8'"
            :style="isDocumentPage ? { fontSize: '0.975rem' } : undefined"
          >
            {{ paragraph }}
          </p>
        </div>

        <ul
          v-if="bullets.length"
          class="text-gray-700 list-disc"
          :class="isDocumentPage ? 'mt-4 space-y-2 pl-6 text-sm leading-relaxed' : (isCentered ? 'mt-6 space-y-3 max-w-none pl-6' : 'mt-6 space-y-3 pl-5')"
        >
          <li v-for="(bullet, index) in bullets" :key="`bullet-${index}`">
            {{ bullet }}
          </li>
        </ul>

        <div v-if="rows.length" class="card overflow-hidden text-left" :class="isDocumentPage ? 'mt-5' : 'mt-8'">
          <div
            v-for="(row, index) in rows"
            :key="`row-${index}`"
            class="grid gap-2 px-5 py-4 text-sm md:grid-cols-[220px_minmax(0,1fr)]"
            :class="index > 0 ? 'border-t border-gray-200' : ''"
          >
            <span class="font-semibold text-gray-900">{{ row.label }}</span>
            <span class="text-gray-600">{{ row.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
