<script setup>
import { computed } from 'vue'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const heading = computed(() => props.section.content?.headline || props.section.title || 'Frequently Asked Questions')
const description = computed(() => props.section.content?.description || '')
const isAccordion = computed(() => props.section.content?.layout !== 'list')
</script>

<template>
  <section class="py-12 px-4 border-t border-gray-200">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-8">
        <h2 class="section-title">
          {{ heading }}
        </h2>
        <p
          v-if="description"
          class="text-sm text-gray-600 mt-2"
        >
          {{ description }}
        </p>
      </div>

      <div class="grid gap-4">
        <article
          v-for="faq in section.faqs"
          :key="faq.id || faq.question"
          class="card p-5"
        >
          <template v-if="isAccordion">
            <details class="faq-details">
              <summary class="text-base font-semibold text-gray-900 cursor-pointer list-none">
                {{ faq.question }}
              </summary>
              <p class="text-sm text-gray-600 leading-7 mt-3">
                {{ faq.answer }}
              </p>
            </details>
          </template>

          <template v-else>
            <h3 class="text-base font-semibold text-gray-900">
              {{ faq.question }}
            </h3>
            <p class="text-sm text-gray-600 leading-7 mt-3">
              {{ faq.answer }}
            </p>
          </template>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.faq-details summary::-webkit-details-marker {
  display: none;
}
</style>
