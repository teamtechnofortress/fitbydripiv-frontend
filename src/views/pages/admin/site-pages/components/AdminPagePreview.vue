<script setup>
import '@/styles/public-site.css'
import SectionRenderer from '@/pages/site/new/components/SectionRenderer.vue'

defineProps({
  page: {
    type: Object,
    required: true,
  },
  activeSectionId: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="admin-page-preview public-site">
    <div
      v-for="section in page.sections || []"
      :id="`preview-section-${section.id}`"
      :key="section.id || section.section_key"
      class="admin-page-preview__section"
      :class="{ 'admin-page-preview__section--active': activeSectionId === section.id }"
    >
      <SectionRenderer :section="section" />
    </div>
  </div>
</template>

<style scoped>
.admin-page-preview {
  min-height: 100%;
  background:
    radial-gradient(circle at top left, rgba(16, 185, 129, 0.08), transparent 24%),
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 20%),
    linear-gradient(180deg, #f7fafc 0%, #ffffff 28%, #f6fbff 100%);
  pointer-events: none;
  user-select: none;
  border-radius: 0 0 28px 28px;
}

.admin-page-preview__section {
  position: relative;
  transition: box-shadow 0.2s ease, outline-color 0.2s ease;
}

.admin-page-preview__section--active {
  outline: 2px solid rgba(79, 70, 229, 0.22);
  outline-offset: -2px;
}
</style>
