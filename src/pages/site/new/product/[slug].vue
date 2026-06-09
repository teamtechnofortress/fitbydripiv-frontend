<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCmsDataStore } from '@/store/cmsData'
import { normalizePublicSitePath } from '../composables/normalizePublicSitePath'

const store = useCmsDataStore()
const router = useRouter()
const route = useRoute()
const openFaqIndex = ref(null)
const productFaqs = ref([])
const faqSection = ref(null)

const processSteps = [
  { number: 1, title: 'Complete Our Telehealth Intake', description: 'Answer all our questions about your health and goals through our secure online form.' },
  { number: 2, title: 'Telehealth Review (0-48 Hours)', description: 'Our medical provider will review your intake information and medical history.' },
  { number: 3, title: 'Determining If Eligible to Receive Therapy', description: 'A medical professional will evaluate your eligibility based on your health profile and treatment goals.' },
  { number: 4, title: 'Customized Rx Delivered Right to You', description: 'If approved, your personalized prescription will be compounded and shipped directly to your door.' },
  { number: 5, title: 'Any Subsequent Orders Reviewed in Context', description: 'All future orders will be reviewed in the context of your ongoing telehealth journey and health goals.' },
]

const categoryTitleMap = {
  weight_loss: 'Weight Loss',
  wellness: 'Wellness',
  longevity: 'Longevity',
}

const loadProduct = async () => {
  const slug = route.params.slug

  window.scrollTo(0, 0)
  openFaqIndex.value = null
  productFaqs.value = []
  await store.getProductBySlug(slug)
  productFaqs.value = store.currentProduct?.faqs || []
}

onMounted(loadProduct)
watch(() => route.params.slug, loadProduct)

const navigate = path => {
  const target = normalizePublicSitePath(path)
  if (!target) return
  router.push(target)
  window.scrollTo(0, 0)
}

const scrollToFAQs = () => {
  faqSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const product = computed(() => store.currentProduct || null)

const categoryRaw = computed(() => product.value?.category_name || product.value?.category || product.value?.category_data?.name || '')

const categorySlug = computed(() => (
  product.value?.category_slug
  || product.value?.category_data?.slug
  || (typeof product.value?.category === 'object' ? product.value?.category?.slug : '')
  || ''
))

const categoryLabel = computed(() => {
  const raw = typeof categoryRaw.value === 'object' ? categoryRaw.value?.name : categoryRaw.value
  
  return categoryTitleMap[raw] || raw || 'Home'
})

const backPath = computed(() => (
  categorySlug.value ? `/new/${categorySlug.value}` : '/new'
))

const productImage = computed(() => (
  product.value?.portrait_image
  || product.value?.featured_image
  || product.value?.cover_image?.image_url
  || product.value?.images?.[0]?.image_url
  || ''
))

const shortDescription = computed(() => (
  product.value?.short_description
  || product.value?.description
  || ''
))

const aboutTreatment = computed(() => (
  product.value?.full_description
  || product.value?.about_treatment
  || product.value?.description
  || ''
))

const benefits = () => {
  const raw = product.value?.benefits

  if (Array.isArray(raw))
    return raw.map(item => item?.benefit_text || item?.text || item).filter(Boolean)

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      
      return Array.isArray(parsed) ? parsed.map(item => item?.benefit_text || item?.text || item).filter(Boolean) : []
    } catch {
      return []
    }
  }

  return []
}

const treatmentDetails = () => {
  const raw = product.value?.treatment_details

  if (raw && typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }

  return {
    how_it_works: product.value?.how_it_works || '',
    ingredients: Array.isArray(product.value?.ingredients) && product.value.ingredients.length
      ? product.value.ingredients.map(item => item?.name || item).filter(Boolean)
      : (product.value?.key_ingredients ? [product.value.key_ingredients] : []),
    duration: product.value?.treatment_duration || '',
    usage: product.value?.usage_instructions || '',
  }
}

const researchLinks = () => (
  Array.isArray(product.value?.research_links) ? product.value.research_links : []
)
</script>

<template>
  <div class="min-h-screen pt-20 bg-white">
    <div
      v-if="store.loading && !store.currentProduct"
      class="min-h-screen flex items-center justify-center pt-20"
    >
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
    </div>

    <template v-else-if="store.currentProduct">
      <div class="max-w-5xl mx-auto px-4 py-6">
        <div class="mb-6">
          <button
            class="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
            @click="navigate(backPath)"
          >
            ← Back to {{ categoryLabel }}
          </button>
        </div>

        <div class="grid lg:grid-cols-2 gap-8 mb-10 pb-10 border-b border-gray-200">
          <div>
            <div class="aspect-[3/4] gradient-bg-light rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
              <img
                v-if="productImage"
                :src="productImage"
                :alt="store.currentProduct.name"
                class="w-full h-full object-contain p-8"
              >
              <div
                v-else
                class="w-32 h-32 bg-white rounded-full border-2 border-emerald-200 flex items-center justify-center shadow-md"
              >
                <span class="text-6xl font-bold text-emerald-600">{{ store.currentProduct.name?.charAt(0) }}</span>
              </div>
            </div>
          </div>

          <div>
            <span class="inline-block gradient-bg-light text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-lg mb-3">
              {{ categoryLabel }}
            </span>
            <h1 class="text-3xl font-bold text-gray-900 mb-3">
              {{ store.currentProduct.name }}
            </h1>
            <p class="text-base text-gray-700 mb-6">
              {{ shortDescription }}
            </p>

            <div class="flex gap-3 mb-6">
              <button
                class="btn-primary flex-1"
                @click="navigate(`/pricing?slug=${store.currentProduct.slug}`)"
              >
                Start my journey
              </button>
              <button
                v-if="productFaqs.length > 0"
                class="px-4 py-2 gradient-bg-light text-emerald-700 rounded-lg hover:shadow-md transition-all duration-200 flex items-center gap-2 font-semibold text-sm border-2 border-emerald-200"
                @click="scrollToFAQs"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ><circle
                  cx="12"
                  cy="12"
                  r="10"
                /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line
                  x1="12"
                  y1="17"
                  x2="12.01"
                  y2="17"
                /></svg>
                <span class="hidden sm:inline">FAQs</span>
              </button>
            </div>

            <div class="gradient-bg-light rounded-lg p-6 border-2 border-emerald-200 shadow-sm">
              <h2 class="text-lg font-bold text-gray-900 mb-4">
                Key Benefits
              </h2>
              <ul class="space-y-2">
                <li
                  v-for="(benefit, i) in benefits()"
                  :key="i"
                  class="flex items-start"
                >
                  <span class="text-emerald-600 mr-2 text-sm font-bold">✓</span>
                  <span class="text-sm text-gray-800">{{ benefit }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="mb-10 pb-10 border-b border-gray-200">
          <h2 class="text-xl font-bold text-gray-900 mb-3">
            About This Treatment
          </h2>
          <p class="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {{ aboutTreatment }}
          </p>
        </div>

        <div class="mb-10 pb-10 border-b border-gray-200">
          <div
            v-if="treatmentDetails().how_it_works"
            class="mb-6"
          >
            <h3 class="text-lg font-bold text-gray-900 mb-2">
              How It Works
            </h3>
            <p class="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {{ treatmentDetails().how_it_works }}
            </p>
          </div>
          <div
            v-if="treatmentDetails().ingredients?.length"
            class="mb-6"
          >
            <h3 class="text-lg font-bold text-gray-900 mb-2">
              Key Ingredients
            </h3>
            <ul class="space-y-1">
              <li
                v-for="(ingredient, i) in treatmentDetails().ingredients"
                :key="i"
                class="flex items-start"
              >
                <span class="text-emerald-600 mr-2 text-sm font-bold">•</span>
                <span class="text-sm text-gray-700">{{ ingredient }}</span>
              </li>
            </ul>
          </div>
          <div
            v-if="treatmentDetails().duration"
            class="mb-6"
          >
            <h3 class="text-lg font-bold text-gray-900 mb-2">
              Treatment Duration
            </h3>
            <p class="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {{ treatmentDetails().duration }}
            </p>
          </div>
          <div v-if="treatmentDetails().usage">
            <h3 class="text-lg font-bold text-gray-900 mb-2">
              Usage Instructions
            </h3>
            <p class="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {{ treatmentDetails().usage }}
            </p>
          </div>
        </div>

        <div class="mb-10 pb-10 border-b border-gray-200">
          <div class="flex items-center gap-2 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ><line
              x1="12"
              y1="1"
              x2="12"
              y2="23"
            /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            <h2 class="text-xl font-bold text-gray-900">
              Personalized Pricing
            </h2>
          </div>
          <p class="text-sm text-gray-700 mb-6 leading-relaxed">
            Pricing for {{ store.currentProduct.name }} is customized based on your individual health goals, medical history, and treatment plan. Our medical team will provide the best option for you based on your provided telehealth information.
          </p>
          <div class="p-6 gradient-bg-light border-2 border-emerald-200 rounded-lg text-center shadow-sm">
            <p class="text-base text-gray-900 font-semibold mb-4">
              Contact us to discuss pricing and treatment options
            </p>
            <button
              class="btn-primary"
              @click="navigate(`/pricing?slug=${store.currentProduct.slug}`)"
            >
              Start my journey
            </button>
          </div>
        </div>

        <div class="mb-10">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            The Process
          </h2>
          <div class="space-y-4">
            <div
              v-for="step in processSteps"
              :key="step.number"
              class="flex gap-3 p-5 bg-white rounded-lg border-2 border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all duration-200"
            >
              <div class="flex-shrink-0">
                <div class="w-10 h-10 gradient-bg text-white rounded-full flex items-center justify-center font-bold text-base shadow-md">
                  {{ step.number }}
                </div>
              </div>
              <div>
                <h3 class="font-bold text-gray-900 mb-1 text-sm">
                  {{ step.title }}
                </h3>
                <p class="text-sm text-gray-600">
                  {{ step.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="researchLinks().length > 0"
          class="mb-10 pb-10 border-b border-gray-200"
        >
          <div class="flex items-center gap-2 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" /><path d="M8.5 2h7" /><path d="M7 16.5h10" /></svg>
            <h2 class="text-xl font-bold text-gray-900">
              Clinical Research &amp; Scientific Evidence
            </h2>
          </div>
          <p class="text-sm text-gray-600 mb-6 leading-relaxed">
            Our treatments are backed by peer-reviewed clinical research from leading medical journals and institutions. Below are scientific studies supporting the safety and efficacy of {{ store.currentProduct.name }}.
          </p>
          <div class="space-y-4">
            <div
              v-for="research in researchLinks()"
              :key="research.id"
              class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white"
            >
              <div class="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="flex-shrink-0 mt-1"
                ><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-semibold text-gray-900 mb-2">
                    {{ research.title }}
                  </h4>
                  <p class="text-xs text-gray-600 mb-3 leading-relaxed">
                    {{ [research.authors, research.publication_year ? `(${research.publication_year})` : '', research.title, research.journal].filter(Boolean).join('. ') }}
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-if="research.pubmed_id"
                      class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >{{ research.pubmed_id }}</span>
                    <span
                      v-if="research.doi"
                      class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200"
                    >{{ research.doi }}</span>
                    <a
                      v-if="research.article_url"
                      :href="research.article_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line
                        x1="10"
                        y1="14"
                        x2="21"
                        y2="3"
                      /></svg>
                      View Article
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-6 p-4 gradient-bg-light border-2 border-emerald-200 rounded-lg">
            <p class="text-xs text-gray-700 leading-relaxed">
              <strong>Important:</strong> The research citations above are provided for informational purposes. Always consult with a qualified healthcare provider before starting any new treatment. Individual results may vary based on health status, goals, and adherence to prescribed protocols.
            </p>
          </div>
        </div>

        <div
          v-if="productFaqs.length > 0"
          ref="faqSection"
          class="mb-10 pb-10 border-b border-gray-200 scroll-mt-24"
        >
          <div class="flex items-center gap-3 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ><circle
              cx="12"
              cy="12"
              r="10"
            /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line
              x1="12"
              y1="17"
              x2="12.01"
              y2="17"
            /></svg>
            <h2 class="text-xl font-bold text-gray-900">
              Product-Specific Questions About {{ store.currentProduct.name }}
            </h2>
          </div>
          <div class="space-y-3">
            <div
              v-for="(faq, index) in productFaqs"
              :key="faq.id"
              class="border border-gray-200 rounded overflow-hidden"
            >
              <button
                class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                @click="openFaqIndex = openFaqIndex === index ? null : index"
              >
                <span class="text-sm font-semibold text-gray-900 pr-4">{{ faq.question }}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4b5563"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="flex-shrink-0 transition-transform"
:class="openFaqIndex === index ? 'rotate-180' : ''"
                ><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              <div
                v-if="openFaqIndex === index"
                class="px-4 pb-4 pt-0"
              >
                <p class="text-sm text-gray-700 leading-relaxed">
                  {{ faq.answer }}
                </p>
              </div>
            </div>
          </div>
          <div class="mt-6 text-center p-4 gradient-bg-light border border-emerald-200 rounded-lg">
            <p class="text-sm text-gray-700 mb-3">
              Have more questions? View our general FAQ page or contact our support team.
            </p>
            <button
              class="text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
              @click="navigate('/faq')"
            >
              View General FAQs →
            </button>
          </div>
        </div>

        <div class="py-8 text-center border-t border-gray-200">
          <h2 class="text-xl font-bold text-gray-900 mb-2">
            I want to proceed
          </h2>
          <p class="text-sm text-gray-700 mb-4">
            View pricing options and select your plan to continue with {{ store.currentProduct.name }}
          </p>
          <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              class="btn-primary w-full sm:w-auto"
              @click="navigate(`/pricing?slug=${store.currentProduct.slug}`)"
            >
              Start my journey
            </button>
            <button
              v-if="productFaqs.length > 0"
              class="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center gap-2 justify-center font-medium"
              @click="scrollToFAQs"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><circle
                cx="12"
                cy="12"
                r="10"
              /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line
                x1="12"
                y1="17"
                x2="12.01"
                y2="17"
              /></svg>
              View Product FAQs
            </button>
            <button
              v-else
              class="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center gap-2 justify-center font-medium"
              @click="navigate('/faq')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><circle
                cx="12"
                cy="12"
                r="10"
              /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line
                x1="12"
                y1="17"
                x2="12.01"
                y2="17"
              /></svg>
              View General FAQs
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
