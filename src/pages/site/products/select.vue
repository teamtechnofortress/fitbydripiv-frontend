<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCmsDataStore } from '@/store/cmsData'

const store = useCmsDataStore()
const router = useRouter()

onMounted(async () => {
  await store.getAllProductsForSelector()
})

const handleProductSelect = (product) => {
  router.push(`/pricing?slug=${product.slug}`)
}

const navigate = (path) => {
  router.push(path)
  window.scrollTo(0, 0)
}
</script>

<template>
  <div class="min-h-screen pt-20 bg-white">
    <div v-if="store.loading" class="min-h-screen pt-20 flex items-center justify-center">
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600"></div>
    </div>

    <div v-else class="max-w-5xl mx-auto px-4 py-12">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Select a Product</h1>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">Choose the treatment you'd like to learn more about and view pricing options.</p>
      </div>

      <div v-if="store.allProducts.length === 0" class="text-center py-12">
        <p class="text-gray-600 mb-6">No products available at this time.</p>
        <button class="btn-primary" @click="navigate('/')">Return to Home</button>
      </div>

      <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          v-for="product in store.allProducts"
          :key="product.id"
          class="group bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-emerald-400 hover:shadow-lg transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          @click="handleProductSelect(product)"
        >
          <div class="aspect-square rounded-lg mb-4 flex items-center justify-center overflow-hidden" style="background: linear-gradient(to bottom right, #ecfdf5, #f0fdfa);">
            <img
              v-if="product.featured_image && product.featured_image.trim() !== ''"
              :src="product.featured_image"
              :alt="product.name"
              class="w-full h-full object-contain p-4"
            />
            <div v-else class="w-20 h-20 bg-white rounded-full border-2 border-emerald-200 flex items-center justify-center">
              <span class="text-3xl font-bold text-emerald-600">{{ product.name?.charAt(0) }}</span>
            </div>
          </div>

          <h3 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">{{ product.name }}</h3>
          <p class="text-sm text-gray-600 mb-4 line-clamp-2">{{ product.short_description }}</p>

          <div class="flex items-center justify-between text-emerald-600 font-semibold text-sm">
            <span>View Pricing</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-1 transition-transform"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
