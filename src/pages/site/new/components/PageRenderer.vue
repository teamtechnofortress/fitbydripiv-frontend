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
</script>

<template>
  <div class="landing-page">
    <SectionRenderer
      v-for="section in orderedSections"
      :key="section.section_key"
      :section="section"
      :page-slug="pageSlug"
      :loading="loading"
    />
  </div>
</template>

<style scoped>
.landing-page {
  background:
    radial-gradient(circle at top left, rgba(16, 185, 129, 0.08), transparent 24%),
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 20%),
    linear-gradient(180deg, #f7fafc 0%, #ffffff 28%, #f6fbff 100%);
}
</style>
