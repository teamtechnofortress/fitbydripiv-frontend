<script setup>
import { computed } from 'vue'
import SectionRenderer from './SectionRenderer.vue'

const props = defineProps({
  page: {
    type: Object,
    required: true,
  },
  pageSlug: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const orderedSections = computed(() => props.page?.sections || [])
const needsHeaderOffset = computed(() => {
  const firstSectionType = orderedSections.value[0]?.type
  return firstSectionType !== 'hero'
})
</script>

<template>
  <div class="min-h-screen bg-white" :class="needsHeaderOffset ? 'pt-16' : ''">
    <SectionRenderer
      v-for="section in orderedSections"
      :key="section.section_key"
      :section="section"
      :page-slug="pageSlug"
      :loading="loading"
    />
  </div>
</template>
