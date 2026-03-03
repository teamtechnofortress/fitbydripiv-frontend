<script setup>
import { onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCmsDataStore } from '@/store/cmsData'

const store = useCmsDataStore()
const router = useRouter()
const route = useRoute()

const loadCategory = async () => {
  const slug = route.params.category
  window.scrollTo(0, 0)
  await store.loadCategoryPage(slug)
}

onMounted(loadCategory)
watch(() => route.params.category, loadCategory)

const navigate = (path) => {
  router.push(path)
  window.scrollTo(0, 0)
}
</script>

<template>
  <div class="min-h-screen pt-20 bg-white">
    <!-- Loading -->
    <div v-if="store.loading && !store.currentCategory" class="min-h-screen flex items-center justify-center pt-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
    </div>

    <template v-else-if="store.currentCategory">
      <!-- Video/Banner Hero -->
      <div class="relative overflow-hidden py-16 px-4 min-h-[400px] flex items-center justify-center">
        <video
          v-if="store.currentCategory.background_video"
          autoplay loop muted playsinline
          class="absolute inset-0 w-full h-full object-cover opacity-75"
        >
          <source :src="store.currentCategory.background_video" type="video/mp4" />
        </video>
        <div
          v-if="store.currentCategory.banner_image && !store.currentCategory.background_video"
          class="absolute inset-0 bg-cover bg-center"
          :style="{ backgroundImage: `url(${store.currentCategory.banner_image})` }"
        ></div>
        <div v-if="!store.currentCategory.background_video && !store.currentCategory.banner_image" class="absolute inset-0 bg-gray-800"></div>
        <div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(17,24,39,0.4), rgba(17,24,39,0.25), rgba(17,24,39,0.4));"></div>

        <div class="max-w-5xl mx-auto text-center relative z-10">
          <h1 class="text-4xl md:text-5xl font-bold text-white mb-4 text-stroke">
            {{ store.currentCategory.name }}
          </h1>
          <p class="text-lg md:text-xl text-white/95 max-w-3xl mx-auto text-stroke-light">
            {{ store.currentCategory.description }}
          </p>
        </div>
      </div>

      <!-- Products Grid -->
      <section class="py-12 px-4">
        <div class="max-w-6xl mx-auto">
          <div v-if="store.productsLoading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
          <div v-else-if="store.currentCategoryProducts.length > 0" class="grid md:grid-cols-3 gap-6">
            <div
              v-for="product in store.currentCategoryProducts"
              :key="product.id"
              class="card overflow-hidden hover:shadow-lg cursor-pointer transition-all duration-200 hover:-translate-y-1"
              @click="navigate(`/product/${product.slug}`)"
            >
              <div class="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden p-4">
                <img
                  v-if="product.landscape_image || product.featured_image"
                  :src="product.landscape_image || product.featured_image"
                  :alt="product.name"
                  class="w-full h-full object-contain"
                  loading="lazy"
                />
                <div v-else class="w-20 h-20 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                  <span class="text-3xl font-bold text-blue-600">{{ product.name?.charAt(0) }}</span>
                </div>
              </div>
              <div class="p-5">
                <h3 class="text-lg font-bold text-gray-900 mb-2">{{ product.name }}</h3>
                <p class="text-sm text-gray-600 mb-4">{{ product.short_description }}</p>
                <button
                  class="w-full py-2 rounded font-medium transition-all text-sm border cursor-pointer"
                  style="background: linear-gradient(to right, rgba(96,165,250,0.2), rgba(34,211,238,0.15), rgba(96,165,250,0.2)); color: #374151; border-color: rgba(191,219,254,0.5);"
                  @click.stop="navigate(`/product/${product.slug}`)"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12">
            <p class="text-gray-600">Products coming soon. Check back later!</p>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="py-10 px-4 border-t border-gray-200">
        <div class="max-w-4xl mx-auto text-center">
          <p class="text-base text-gray-700 mb-4">Have questions? Our medical team is here to help you find the right solution</p>
          <button class="btn-primary" @click="navigate('/products/select')">Start my journey</button>
        </div>
      </section>
    </template>

    <div v-else class="min-h-screen flex items-center justify-center pt-20">
      <p class="text-gray-600">Category not found</p>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
