<script setup>
import { computed } from 'vue'
import CategoryCardsSection from './sections/CategoryCardsSection.vue'
import CategoryHeroSection from './sections/CategoryHeroSection.vue'
import ContentBlockSection from './sections/ContentBlockSection.vue'
import FaqSection from './sections/FaqSection.vue'
import FeaturedProductsSection from './sections/FeaturedProductsSection.vue'
import HeroSection from './sections/HeroSection.vue'
import PdfLibrarySection from './sections/PdfLibrarySection.vue'
import ProcessSection from './sections/ProcessSection.vue'
import ProductGridSection from './sections/ProductGridSection.vue'
import SpacerSection from './sections/SpacerSection.vue'
import SectionHeaderSection from './sections/SectionHeaderSection.vue'
import TelehealthCtaSection from './sections/TelehealthCtaSection.vue'

const props = defineProps({
  section: {
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

const sectionMap = {
  hero: props.section.content?.source === 'category' ? CategoryHeroSection : HeroSection,
  section_header: SectionHeaderSection,
  featured_products: FeaturedProductsSection,
  category_cards: CategoryCardsSection,
  process: ProcessSection,
  content_block: ContentBlockSection,
  product_grid: ProductGridSection,
  pdf_library: PdfLibrarySection,
  pen_instruction_library: PdfLibrarySection,
  spacer: SpacerSection,
  faq: FaqSection,
  telehealth_cta: TelehealthCtaSection,
}

const component = computed(() => sectionMap[props.section.type] || SectionHeaderSection)
</script>

<template>
  <component
    :is="component"
    :section="section"
    :page-slug="pageSlug"
    :loading="loading"
  />
</template>
