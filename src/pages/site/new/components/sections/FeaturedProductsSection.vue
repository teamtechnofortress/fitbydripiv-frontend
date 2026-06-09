<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { normalizePublicSitePath } from '../../composables/normalizePublicSitePath'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const router = useRouter()
const scrollContainer = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(true)

const products = computed(() => (props.section.products || []).slice(0, props.section.content?.limit || 6))

const navigate = path => {
  const target = normalizePublicSitePath(path)
  if (!target) return
  router.push(target)
  window.scrollTo(0, 0)
}

const getProductPath = product => {
  if (product?.slug) return `/product/${product.slug}`
  
  return '/products/select'
}

const checkScrollButtons = () => {
  if (!scrollContainer.value) return

  const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.value

  canScrollLeft.value = scrollLeft > 0
  canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 10
}

const scroll = direction => {
  if (!scrollContainer.value) return

  const scrollAmount = scrollContainer.value.clientWidth * 0.8
  const nextLeft = scrollContainer.value.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount)

  scrollContainer.value.scrollTo({ left: nextLeft, behavior: 'smooth' })
}

watch(products, async () => {
  await nextTick()
  checkScrollButtons()
}, { immediate: true })

onMounted(async () => {
  await nextTick()
  checkScrollButtons()
})
</script>

<template>
  <section class="py-12 px-4 border-t border-gray-200 bg-gray-50">
    <div class="max-w-7xl mx-auto">
      <div
        v-if="loading && !products.length"
        class="min-h-[240px] flex items-center justify-center text-sm text-gray-500"
      >
        Loading featured products...
      </div>

      <div
        v-else-if="products.length > 0"
        class="relative group"
      >
        <button
          v-if="canScrollLeft"
          class="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-100 transition-all"
          @click="scroll('left')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1f2937"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button
          v-if="canScrollRight"
          class="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-100 transition-all"
          @click="scroll('right')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1f2937"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ><polyline points="9 18 15 12 9 6" /></svg>
        </button>

        <div
          ref="scrollContainer"
          class="flex gap-8 overflow-x-auto scrollbar-hide scroll-smooth px-8 py-2"
          @scroll="checkScrollButtons"
        >
          <div
            v-for="product in products"
            :key="product.id"
            class="flex-shrink-0 w-[700px] cursor-pointer group/card"
            @click="navigate(getProductPath(product))"
          >
            <div class="relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-200">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div class="flex flex-col justify-center p-8">
                  <h3 class="text-2xl font-bold text-gray-900 mb-3 group-hover/card:text-blue-600 transition-colors">
                    {{ product.name }}
                  </h3>
                  <p class="text-sm text-gray-600 line-clamp-3 mb-4">
                    {{ product.short_description || product.description }}
                  </p>
                  <span class="text-blue-600 font-medium text-sm hover:text-blue-700 inline-flex items-center">
                    {{ section.content?.cta_label || 'View Details' }} →
                  </span>
                </div>
                <div class="h-[280px] md:h-[400px] bg-gray-50 relative overflow-hidden p-4">
                  <img
                    v-if="product.landscape_image || product.featured_image || product.cover_image?.image_url"
                    :src="product.landscape_image || product.featured_image || product.cover_image?.image_url"
                    :alt="product.name"
                    class="w-full h-full object-contain group-hover/card:scale-105 transition-transform duration-300"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center"
                  >
                    <div class="w-24 h-24 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                      <span class="text-5xl font-bold text-blue-600">{{ product.name?.charAt(0) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="text-center text-sm text-gray-500"
      >
        No featured products available right now.
      </div>
    </div>
  </section>
</template>
