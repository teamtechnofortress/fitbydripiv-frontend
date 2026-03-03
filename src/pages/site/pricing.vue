<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCmsDataStore } from '@/store/cmsData'

const store = useCmsDataStore()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const pricingData = ref(null)
const selectedFrequency = ref(1)
const selectedOptionId = ref(null)
const submitting = ref(false)
const showCancelModal = ref(false)
const isTouchDevice = ref(false)
const spinnerVisibleFor = ref(null)

const detectTouchDevice = () => {
  isTouchDevice.value = (
    'ontouchstart' in window
    || navigator.maxTouchPoints > 0
    || window.matchMedia('(pointer: coarse)').matches
  )
}

const loadPricing = async () => {
  const slug = route.query.slug
  if (!slug) {
    router.push('/products/select')
    return
  }
  window.scrollTo(0, 0)
  selectedOptionId.value = null
  selectedFrequency.value = 1
  spinnerVisibleFor.value = null
  loading.value = true
  const [_, pricing] = await Promise.all([
    store.getProductBySlug(slug),
    store.getProductPricing(slug),
  ])
  pricingData.value = pricing
  loading.value = false
}

onMounted(loadPricing)
watch(() => route.query.slug, loadPricing)

onMounted(() => {
  detectTouchDevice()
  window.addEventListener('resize', detectTouchDevice)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', detectTouchDevice)
})

const getAvailableDiscounts = computed(() => {
  if (!store.currentProduct?.subscription_discounts)
    return []

  return store.currentProduct.subscription_discounts.map(d => ({
    months: Number(d.frequency_months),
    percentage: Number(d.discount_percentage),
  }))
})

const purchaseOptions = computed(() => {
  const product = pricingData.value || store.currentProduct
  if (!product) return []
  const options = []
  const pricingOptions = store.currentProduct?.pricing_options || []
  const discounts = store.currentProduct?.subscription_discounts || []
  const basePrice = parseFloat(product.base_price) || 0
  const microDosePrice = parseFloat(product.micro_dose_price) || 0
  const samplePrice = parseFloat(product.sample_price) || 0

  // If explicit pricing options exist (e.g., B12), use them directly.
  if (pricingOptions.length > 0) {
    const mapped = pricingOptions
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(p => ({
        id: `plan-${p.id}`,
        type: p.billing_cycle === 'monthly' ? 'subscription' : 'one-time',
        title: p.plan_name || 'Plan',
        description: p.description || '',
        price: parseFloat(p.price) || 0,
        originalPrice: null,
        discountPercentage: null,
        frequencyMonths: p.billing_cycle === 'monthly' ? 1 : null,
        supportsFrequency: false,
      }))
    return mapped
  }

  // Fallback pricing builder for products using base/micro/sample prices.
  if (basePrice > 0) {
    const discount = discounts.find(d => parseInt(d.frequency_months, 10) === selectedFrequency.value)
    const discountPct = discount ? parseFloat(discount.discount_percentage) : 0
    const finalPrice = discountPct > 0 ? basePrice * (1 - discountPct / 100) : basePrice
    const dosage = selectedFrequency.value * 1000

    options.push({
      id: `subscription-${selectedFrequency.value}`,
      type: 'subscription',
      title: `*Monthly Subscription — ${dosage} MG`,
      description: `Deliver every ${selectedFrequency.value} month${selectedFrequency.value > 1 ? 's' : ''}${discountPct > 0 ? ` - Save ${discountPct}%` : ''}`,
      price: Math.round(finalPrice * 100) / 100,
      originalPrice: discountPct > 0 ? basePrice : null,
      discountPercentage: discountPct > 0 ? discountPct : null,
      frequencyMonths: selectedFrequency.value,
      supportsFrequency: true,
    })

    options.push({
      id: 'one-time',
      type: 'one-time',
      title: '1 Month Supply',
      description: 'One Time Purchase (no discount)',
      price: basePrice,
      originalPrice: null,
      discountPercentage: null,
      frequencyMonths: null,
      supportsFrequency: false,
    })
  }

  if (microDosePrice > 0) {
    options.push({
      id: 'micro-dose',
      type: 'micro-dose',
      title: '1 Month Supply',
      description: 'Micro-Dose',
      price: microDosePrice,
      originalPrice: null,
      discountPercentage: null,
      frequencyMonths: null,
      supportsFrequency: false,
    })
  }

  if (samplePrice > 0) {
    options.push({
      id: 'sample',
      type: 'sample',
      title: 'Single 1 Week Supply',
      description: 'Sample (Trial Dose)',
      price: samplePrice,
      originalPrice: null,
      discountPercentage: null,
      frequencyMonths: null,
      supportsFrequency: false,
    })
  }

  return options
})

const handleFrequencyChange = (freq) => {
  selectedFrequency.value = freq
  selectedOptionId.value = `subscription-${freq}`
}

const handleOptionSelect = option => {
  selectedOptionId.value = option.id
  if (option.type !== 'subscription')
    spinnerVisibleFor.value = null
}

const handleRowMouseEnter = option => {
  if (option.type === 'subscription' && !isTouchDevice.value)
    spinnerVisibleFor.value = option.id
}

const handleRowMouseLeave = option => {
  if (option.type === 'subscription' && !isTouchDevice.value)
    spinnerVisibleFor.value = null
}

const optionRowStyle = option => {
  if (selectedOptionId.value === option.id) {
    return {
      border: '2px solid #10b981',
      background: '#ecfdf5',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    }
  }
  return {
    border: '2px solid #e5e7eb',
    background: '#ffffff',
    borderRadius: '0.5rem',
  }
}

const handleStartJourney = () => {
  if (!selectedOptionId.value) return
  router.push('/contact')
}

const navigate = (path) => {
  router.push(path)
  window.scrollTo(0, 0)
}
</script>

<template>
  <div class="min-h-screen pt-20 bg-white">
    <div v-if="loading" class="min-h-screen pt-20 flex items-center justify-center">
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600"></div>
    </div>

    <div v-else-if="!store.currentProduct" class="max-w-3xl mx-auto px-4 py-12 text-center">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h1>
      <p class="text-gray-600 mb-8">We couldn't find the product you're looking for.</p>
      <button class="btn-primary" @click="navigate('/products/select')">Select a Product</button>
    </div>

    <div v-else class="max-w-3xl mx-auto px-4 py-8">
      <!-- Back -->
      <button class="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm mb-6 transition-colors" @click="router.back()">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
        <p class="text-lg text-gray-600">{{ store.currentProduct.name }}</p>
        <p class="text-sm text-gray-600 mt-2">Pricing is customized based on your individual health goals and treatment plan. Our medical team will discuss specific pricing during your telehealth consultation.</p>
      </div>

      <!-- Purchase Options -->
      <div class="space-y-4 mb-8">
        <label
          v-for="option in purchaseOptions"
          :key="option.id"
          :for="`option-${option.id}`"
          class="relative flex items-center gap-4 p-5 cursor-pointer transition-all duration-200 w-full"
          :class="selectedOptionId === option.id ? 'shadow-md' : 'hover:shadow-sm'"
          :style="optionRowStyle(option)"
          @mouseenter="handleRowMouseEnter(option)"
          @mouseleave="handleRowMouseLeave(option)"
        >
          <div class="flex items-center gap-4 w-full">
            <input
              :id="`option-${option.id}`"
              type="radio"
              name="purchase-option"
              :value="option.id"
              :checked="selectedOptionId === option.id"
              class="w-5 h-5 text-emerald-600 cursor-pointer"
              style="accent-color: #059669;"
              @change="handleOptionSelect(option)"
            />

            <div class="flex-1 min-w-0" :class="option.type === 'subscription' && !isTouchDevice ? 'pr-28 md:pr-40' : ''">
              <h3 class="text-base font-bold text-gray-900 mb-0.5">{{ option.title }}</h3>
              <p class="text-sm text-gray-600">{{ option.description }}</p>
            </div>

            <div
              v-if="option.type === 'subscription' && option.supportsFrequency && (!isTouchDevice ? spinnerVisibleFor === option.id : true)"
              class="absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 ease-out z-10"
              :class="!isTouchDevice ? 'opacity-100 translate-x-0' : ''"
              @click.stop
            >
              <div class="bg-white border-2 border-emerald-300 rounded-lg shadow-lg overflow-hidden">
                <div class="px-1 py-1">
                  <button
                    v-for="freq in [1, 2, 3]"
                    :key="freq"
                    class="w-full px-3 py-2 text-sm font-semibold rounded transition-all duration-150 flex items-center justify-between gap-2 min-w-[160px] md:min-w-[200px]"
                    :class="selectedFrequency === freq
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-emerald-50 active:bg-emerald-100'"
                    @click.prevent.stop="handleFrequencyChange(freq)"
                  >
                    <span class="whitespace-nowrap">{{ freq }} Month{{ freq > 1 ? 's' : '' }} — {{ freq * 1000 }} MG</span>
                    <span
                      v-if="getAvailableDiscounts.find(d => d.months === freq)"
                      class="text-xs font-bold whitespace-nowrap"
                      :class="selectedFrequency === freq ? 'text-emerald-100' : 'text-emerald-600'"
                    >
                      {{ getAvailableDiscounts.find(d => d.months === freq)?.percentage }}% off
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div class="text-right flex-shrink-0">
              <div v-if="option.price > 0" class="flex flex-col items-end gap-1">
                <div class="flex items-center gap-2">
                  <span v-if="option.originalPrice && option.originalPrice > option.price" class="text-sm text-gray-400 line-through">${{ option.originalPrice.toFixed(2) }}</span>
                  <span class="text-xl font-bold text-gray-900">${{ option.price.toFixed(2) }}</span>
                </div>
                <div v-if="option.discountPercentage" class="px-2 py-0.5 bg-emerald-100 border border-emerald-300 rounded text-xs font-bold text-emerald-700">
                  Save {{ option.discountPercentage }}%
                </div>
              </div>
              <div v-else class="px-3 py-1 bg-emerald-100 border border-emerald-300 rounded text-xs font-semibold text-emerald-800">
                Contact for Pricing
              </div>
            </div>
          </div>

          <div
            v-if="option.type === 'subscription' && option.supportsFrequency && isTouchDevice"
            class="mt-4 w-full"
            @click.stop
          >
            <div class="bg-white border-2 border-emerald-300 rounded-lg shadow-lg overflow-hidden">
              <div class="px-1 py-1">
                <button
                  v-for="freq in [1, 2, 3]"
                  :key="freq"
                  class="w-full px-3 py-2 text-sm font-semibold rounded transition-all duration-150 flex items-center justify-between gap-2"
                  :class="selectedFrequency === freq
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-emerald-50 active:bg-emerald-100'"
                  @click.prevent.stop="handleFrequencyChange(freq)"
                >
                  <span class="whitespace-nowrap">{{ freq }} Month{{ freq > 1 ? 's' : '' }} — {{ freq * 1000 }} MG</span>
                  <span
                    v-if="getAvailableDiscounts.find(d => d.months === freq)"
                    class="text-xs font-bold whitespace-nowrap"
                    :class="selectedFrequency === freq ? 'text-emerald-100' : 'text-emerald-600'"
                  >
                    {{ getAvailableDiscounts.find(d => d.months === freq)?.percentage }}% off
                  </span>
                </button>
              </div>
            </div>
          </div>
        </label>
      </div>

      <!-- Recurring Notice -->
      <div class="mt-6 p-5 bg-gray-50 border border-gray-200 rounded-lg">
        <p class="text-xs text-gray-700 leading-relaxed">
          *This item is a recurring or deferred purchase. By continuing, I agree to the
          <button class="text-emerald-600 hover:text-emerald-700 font-semibold underline" @click="showCancelModal = true">Cancellation Policy</button>
          and authorize you to charge my payment method at the prices, frequency, and dates listed on this page until my order is fulfilled or I cancel. If applicable, I authorize you to charge my payment method at the then-current rate on the schedule agreed above until I cancel, which I can do at any time by contacting you.
        </p>
      </div>

      <!-- Add to Cart -->
      <div class="mt-8 pt-6 border-t border-gray-200">
        <button
          :disabled="!selectedOptionId || submitting"
          class="w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200"
          :class="selectedOptionId && !submitting
            ? 'text-white shadow-md hover:shadow-lg'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'"
          :style="selectedOptionId && !submitting ? 'background: linear-gradient(to right, #059669, #0d9488);' : ''"
          @click="handleStartJourney"
        >
          {{ submitting ? 'Adding to cart...' : 'Add to cart' }}
        </button>
        <p v-if="!selectedOptionId" class="text-sm text-gray-600 text-center mt-3">Please select a purchase option above to continue</p>
      </div>
    </div>

    <!-- Cancellation Modal -->
    <div v-if="showCancelModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click="showCancelModal = false">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl" @click.stop>
        <div class="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900">Cancellation Policy</h2>
          <button class="p-2 hover:bg-gray-100 rounded-full transition-colors" @click="showCancelModal = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
          <section><h3 class="text-lg font-bold text-gray-900 mb-2">Subscription Terms</h3><p>When you purchase a subscription plan, you authorize us to charge your payment method at the frequency you selected until you cancel your subscription.</p></section>
          <section><h3 class="text-lg font-bold text-gray-900 mb-2">How to Cancel</h3><p>You may cancel your subscription at any time by contacting our customer support team, logging into your account portal, or calling our customer service line.</p></section>
          <section><h3 class="text-lg font-bold text-gray-900 mb-2">Cancellation Effective Date</h3><p>Cancellations will take effect at the end of your current billing cycle. No refunds will be provided for partial billing periods.</p></section>
          <section><h3 class="text-lg font-bold text-gray-900 mb-2">One-Time Purchases</h3><p>One-time purchases, micro-dose options, and sample orders are not recurring and do not require cancellation.</p></section>
          <section><h3 class="text-lg font-bold text-gray-900 mb-2">Medical Oversight</h3><p>All treatments require ongoing medical oversight. Our healthcare providers reserve the right to discontinue treatment if they determine it is no longer appropriate for your health needs.</p></section>
        </div>
        <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
          <button class="w-full btn-primary" @click="showCancelModal = false">I Understand</button>
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
