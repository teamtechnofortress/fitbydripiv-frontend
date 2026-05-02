<script setup>
const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['move-up', 'move-down', 'edit', 'delete', 'preview'])

const getSectionSummary = section => {
  if (section.type === 'hero')
    return section.content?.headline || 'Hero content'

  if (section.type === 'section_header')
    return section.content?.headline || 'Section heading'

  if (section.type === 'featured_products')
    return `${section.products?.length || 0} featured products in preview`

  if (section.type === 'category_cards')
    return 'Categories auto-load from CMS categories'

  if (section.type === 'process')
    return `${section.items?.length || 0} items configured`

  if (section.type === 'content_block')
    return section.headline || section.content?.headline || `${section.content?.paragraphs?.length || 0} paragraphs configured`

  if (section.type === 'spacer')
    return `${section.height || section.content?.height || 0}px vertical spacing`

  if (section.type === 'faq')
    return `${section.faqs?.length || 0} FAQs configured`

  if (section.type === 'telehealth_cta')
    return section.content?.button?.label || 'CTA block'

  return section.subtitle || 'Content section'
}
</script>

<template>
  <VCard
    class="section-card"
    :class="{ 'section-card--active': active }"
    elevation="0"
  >
    <VCardText class="pa-4">
      <div class="d-flex align-start justify-space-between gap-3 mb-4">
        <div>
          <div class="section-card__eyebrow">
            {{ index + 1 }}. {{ section.type.replaceAll('_', ' ') }}
          </div>
          <div class="text-subtitle-1 font-weight-bold">
            {{ section.title || section.section_key }}
          </div>
        </div>

        <VChip
          size="small"
          color="primary"
          variant="tonal"
        >
          {{ section.sort_order }}
        </VChip>
      </div>

      <p class="section-card__summary mb-4">
        {{ getSectionSummary(section) }}
      </p>

      <div class="d-flex flex-wrap align-center gap-2">
        <VBtn
          size="small"
          variant="tonal"
          prepend-icon="tabler-eye"
          @click="$emit('preview')"
        >
          Preview
        </VBtn>
        <VBtn
          size="small"
          variant="tonal"
          prepend-icon="tabler-settings"
          @click="$emit('edit')"
        >
          Edit
        </VBtn>
        <VBtn
          size="small"
          variant="text"
          icon="tabler-arrow-up"
          :disabled="index === 0"
          @click="$emit('move-up')"
        />
        <VBtn
          size="small"
          variant="text"
          icon="tabler-arrow-down"
          :disabled="index === total - 1"
          @click="$emit('move-down')"
        />
        <VSpacer />
        <VBtn
          size="small"
          color="error"
          variant="text"
          icon="tabler-trash"
          @click="$emit('delete')"
        />
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
.section-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 248, 255, 0.98));
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.05);
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.section-card--active {
  border-color: rgba(79, 70, 229, 0.28);
  box-shadow: 0 20px 38px rgba(79, 70, 229, 0.14);
  transform: translateY(-1px);
}

.section-card__eyebrow {
  color: #4f46e5;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
}

.section-card__summary {
  color: #475569;
  line-height: 1.6;
}

:deep(.section-card .text-subtitle-1) {
  color: #0f172a;
}
</style>
