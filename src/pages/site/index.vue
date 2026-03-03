<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCmsDataStore } from '@/store/cmsData'

const store = useCmsDataStore()
const router = useRouter()
const scrollContainer = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(true)

const words = 'Prescription Weight Loss, Longevity, and Wellness Specific to Your Goals'.split(' ')
const heroVideoUrl = '/homepage.mp4'

onMounted(async () => {
  await Promise.all([
    store.getCategories(),
    store.getFeaturedProducts(),
    store.getSiteSettings(),
  ])
  await nextTick()
  checkScrollButtons()
})

const navigate = (path) => {
  router.push(path)
  window.scrollTo(0, 0)
}

const checkScrollButtons = () => {
  if (scrollContainer.value) {
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.value
    canScrollLeft.value = scrollLeft > 0
    canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 10
  }
}

const scroll = (direction) => {
  if (scrollContainer.value) {
    const scrollAmount = scrollContainer.value.clientWidth * 0.8
    const newScrollLeft = scrollContainer.value.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount)
    scrollContainer.value.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Hero Section with Video Background -->
    <div class="relative overflow-hidden pt-24 pb-12 px-4 min-h-[500px] flex items-center justify-center">
      <video
        v-if="heroVideoUrl"
        autoplay loop muted playsinline
        class="absolute inset-0 w-full h-full object-cover opacity-75"
      >
        <source :src="heroVideoUrl" type="video/mp4" />
      </video>
      <div v-if="!heroVideoUrl" class="absolute inset-0 bg-gray-800"></div>
      <div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(17,24,39,0.4), rgba(17,24,39,0.25), rgba(17,24,39,0.4));"></div>

      <div class="max-w-5xl mx-auto text-center relative z-10">
        <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 min-h-[120px] md:min-h-[100px] flex flex-wrap justify-center items-center gap-x-3 gap-y-2 text-stroke">
          <span
            v-for="(word, index) in words"
            :key="index"
            class="inline-block animate-fadeInUp"
            :style="{ animationDelay: `${index * 0.15}s`, opacity: 0, animationFillMode: 'forwards' }"
          >{{ word }}</span>
        </h1>
        <p class="text-lg text-white/95 mb-6 max-w-3xl mx-auto text-stroke-light">
          Support for Body, Mind &amp; Cellular Health. Health simplified and delivered reliably right to your door.
        </p>
        <button class="btn-primary" @click="navigate('/products/select')">
          Start my journey
        </button>
      </div>
    </div>

    <!-- Featured Products Carousel -->
    <section v-if="!store.loading && store.featuredProducts.length > 0" class="py-12 px-4 border-t border-gray-200 bg-gray-50">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-8">
          <h2 class="section-title">Featured Products</h2>
          <p class="text-sm text-gray-600 mt-2">Discover our most popular treatments</p>
        </div>

        <div class="relative group">
          <button
            v-if="canScrollLeft"
            class="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-100 transition-all"
            @click="scroll('left')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button
            v-if="canScrollRight"
            class="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-100 transition-all"
            @click="scroll('right')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <div
            ref="scrollContainer"
            class="flex gap-8 overflow-x-auto scrollbar-hide scroll-smooth px-8 py-2"
            @scroll="checkScrollButtons"
          >
            <div
              v-for="product in store.featuredProducts"
              :key="product.id"
              class="flex-shrink-0 w-[700px] cursor-pointer group/card"
              @click="navigate(`/product/${product.slug}`)"
            >
              <div class="relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-200">
                <div class="grid grid-cols-2 gap-0">
                  <div class="flex flex-col justify-center p-8">
                    <h3 class="text-2xl font-bold text-gray-900 mb-3 group-hover/card:text-blue-600 transition-colors">
                      {{ product.name }}
                    </h3>
                    <p class="text-sm text-gray-600 line-clamp-3 mb-4">
                      {{ product.short_description }}
                    </p>
                    <span class="text-blue-600 font-medium text-sm hover:text-blue-700 inline-flex items-center">
                      View Details →
                    </span>
                  </div>
                  <div class="h-[400px] bg-gray-50 relative overflow-hidden p-4">
                    <img
                      v-if="product.landscape_image || product.featured_image"
                      :src="product.landscape_image || product.featured_image"
                      :alt="product.name"
                      class="w-full h-full object-contain group-hover/card:scale-105 transition-transform duration-300"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center">
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
      </div>
    </section>

    <!-- Treatment Categories -->
    <section class="py-12 px-4 border-t border-gray-200">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-8">
          <h2 class="section-title">Our Treatment Categories</h2>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <div
            v-for="category in store.categories"
            :key="category.id"
            class="card overflow-hidden cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 relative"
            style="background: linear-gradient(to bottom right, rgba(219,234,254,0.4), rgba(207,250,254,0.3), rgba(219,234,254,0.4));"
            @click="navigate(`/${category.slug}`)"
          >
            <div class="relative z-10 p-6 text-center">
              <h3 class="text-xl font-bold text-gray-900 mb-2">{{ category.name }}</h3>
              <p class="text-sm text-gray-700 mb-4">{{ category.description }}</p>
              <button
                class="text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
                @click.stop="navigate(`/${category.slug}`)"
              >
                View Products →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Process Steps -->
    <div class="py-12 px-4 gradient-bg-light border-y border-gray-200">
      <div class="max-w-6xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">How It Works</h2>
        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
          <div v-for="(step, i) in [
            { title: 'Step 1: Intake evaluation', desc: 'Complete our secure online health questionnaire about your medical history and wellness goals', icon: '/images/Step-1 (only icon).png' },
            { title: 'Step 2: Prescription/Approval', desc: 'Our licensed medical providers review your information and determine eligibility', icon: '/images/Step-2 (only icon).png' },
            { title: 'Step 3: Fast Shipping', desc: 'Your prescription is compounded and shipped directly to your door with tracking', icon: '/images/Step-3 (only icon).png' },
          ]" :key="i" class="text-center group">
            <div class="w-32 h-32 mx-auto mb-4 bg-white rounded-full border-2 border-emerald-200 flex items-center justify-center p-8 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
              <img :src="step.icon" :alt="step.title" class="w-full h-full object-contain" />
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ step.title }}</h3>
            <p class="text-sm text-gray-700 leading-relaxed">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Telehealth CTA -->
    <section class="py-12 px-4 border-t border-gray-200">
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-2xl font-bold text-gray-900 mb-3">Personalized Telehealth Consultations</h2>
        <p class="text-base text-gray-700 mb-6 max-w-2xl mx-auto">
          Complete our Telehealth form about your health and goals. Our medical professionals review your eligibility and your customized prescription is delivered directly to you.
        </p>
        <button class="btn-secondary" @click="navigate('/telehealth-faq')">Learn More</button>
      </div>
    </section>
  </div>
</template>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
