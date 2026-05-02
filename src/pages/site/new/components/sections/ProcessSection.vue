<script setup>
import { computed } from 'vue'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const heading = computed(() => props.section.content?.headline || props.section.title || 'How It Works')
const items = computed(() => props.section.items || [])

const iconMap = {
  'clipboard-list': 'tabler-clipboard-list',
  stethoscope: 'tabler-stethoscope',
  truck: 'tabler-truck-delivery',
}

const getStepImage = item => item?.image || item?.icon_image || item?.icon_url || ''
</script>

<template>
  <section class="py-12 px-4 gradient-bg-light border-y border-gray-200">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">{{ heading }}</h2>
      <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
        <div
          v-for="(item, index) in items"
          :key="item.id || item.title || index"
          class="text-center group"
        >
          <div class="w-32 h-32 mx-auto mb-4 bg-white rounded-full border-2 border-emerald-200 flex items-center justify-center p-8 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
            <img
              v-if="getStepImage(item)"
              :src="getStepImage(item)"
              :alt="item.title"
              class="w-full h-full object-contain"
            >
            <VIcon v-else :icon="iconMap[item.icon] || 'tabler-circle'" size="54" color="primary" />
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">{{ item.title }}</h3>
          <p class="text-sm text-gray-700 leading-relaxed">{{ item.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
