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

const limitedProducts = computed(() => {
  const limit = Number(props.section.content?.limit || 12)
  return (props.section.products || []).slice(0, limit)
})

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
</script>

<template>
  <section class="py-12 px-4 border-t border-gray-200 bg-gray-50">
    <div class="max-w-6xl mx-auto">
      <div v-if="limitedProducts.length > 0" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <article
          v-for="product in limitedProducts"
          :key="product.id"
          class="card overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
          @click="navigate(getProductPath(product))"
        >
          <div class="aspect-[4/3] bg-gray-50 relative overflow-hidden p-4">
            <img
              v-if="product.landscape_image || product.featured_image || product.cover_image?.image_url"
              :src="product.landscape_image || product.featured_image || product.cover_image?.image_url"
              :alt="product.name"
              class="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
              loading="lazy"
            >
            <div v-else class="w-full h-full flex items-center justify-center">
              <div class="w-20 h-20 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                <span class="text-3xl font-bold text-blue-600">{{ product.name?.charAt(0) }}</span>
              </div>
            </div>
          </div>

          <div class="p-5">
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ product.name }}</h3>
            <p class="text-sm text-gray-600 line-clamp-3 mb-4">
              {{ product.short_description || product.description }}
            </p>
            <span class="text-blue-600 font-medium text-sm hover:text-blue-700 inline-flex items-center">
              {{ section.content?.cta_label || 'View Details' }} →
            </span>
          </div>
        </article>
      </div>

      <div v-else class="text-center text-sm text-gray-500 py-10">
        Products coming soon. Check back later!
      </div>
    </div>
  </section>
</template>
