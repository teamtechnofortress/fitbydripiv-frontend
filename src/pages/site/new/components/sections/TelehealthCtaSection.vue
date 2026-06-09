<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { normalizePublicSitePath } from '../../composables/normalizePublicSitePath'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const router = useRouter()
const button = computed(() => props.section.content?.button || {})
const headline = computed(() => props.section.content?.headline || props.section.title || 'Personalized Telehealth Consultations')

const description = computed(() => (
  props.section.content?.description
  || props.section.subtitle
  || 'Complete our Telehealth form about your health and goals. Our medical professionals review your eligibility and your customized prescription is delivered directly to you.'
))

const navigate = path => {
  const target = normalizePublicSitePath(path)
  if (!target) return
  router.push(target)
  window.scrollTo(0, 0)
}
</script>

<template>
  <section class="py-12 px-4 border-t border-gray-200">
    <div class="max-w-4xl mx-auto text-center">
      <p class="text-base text-gray-700 mb-6 max-w-2xl mx-auto">
        {{ description }}
      </p>
      <button
        class="btn-secondary"
        @click="navigate(button.link)"
      >
        {{ button.label || 'Learn More' }}
      </button>
    </div>
  </section>
</template>
