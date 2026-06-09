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

const heading = computed(() => props.section.content?.headline || props.section.title || '')
const description = computed(() => props.section.content?.description || '')
const eyebrow = computed(() => props.section.subtitle || '')
const centered = computed(() => props.section.content?.alignment === 'center')
const isDocumentPage = computed(() => ['terms', 'privacy', 'legal'].includes(String(props.pageSlug || '').toLowerCase()))
</script>

<template>
  <section :class="isDocumentPage ? 'px-4 py-8 border-b border-gray-200 bg-white' : 'px-4 py-12 border-t border-gray-200'">
    <div
      class="max-w-4xl"
      :class="(centered || isDocumentPage) ? 'mx-auto text-center' : 'mx-auto'"
    >
      <!--
        <p
        v-if="eyebrow"
        class="mb-3"
        :class="isDocumentPage ? 'text-sm font-medium text-gray-700' : 'text-sm font-semibold uppercase tracking-[0.12em] text-emerald-600'"
        >
        {{ eyebrow }}
        </p> 
      -->
      <h2
        v-if="heading"
        :class="isDocumentPage ? 'text-3xl font-bold text-gray-900 mb-2' : 'section-title mb-0'"
      >
        {{ heading }}
      </h2>
      <p
        v-if="description"
        class="text-base text-gray-600 mt-3 max-w-2xl"
        :class="(centered || isDocumentPage) ? 'mx-auto' : ''"
      >
        {{ description }}
      </p>
    </div>
  </section>
</template>
