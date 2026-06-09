<script setup>
import axios from 'axios'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { v4 as uuidv4 } from 'uuid'
import { CHECKOUT_DRAFT_URL, getPublicProductPricingUrl } from '@/network/const'
import { useCmsDataStore } from '@/store/cmsData'

const store = useCmsDataStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const isPricingRoute = () => {
  const name = String(route.name || '')
  
  return route.path === '/pricing' || name.includes('site-pricing') || name.endsWith('pricing')
}

const getProductSlug = () => String(route.query.slug || '')

const loading = ref(true)
const pricingResponse = ref(null)
const selectedOptionId = ref(null)
const submitting = ref(false)
const showCancelModal = ref(false)
const addToCartError = ref('')

const pricingProduct = computed(() => pricingResponse.value?.product || null)
const subscriptionGroup = computed(() => pricingResponse.value?.pricing?.subscription || null)
const oneTimeGroup = computed(() => pricingResponse.value?.pricing?.one_time || null)
const productImage = computed(() => pricingProduct.value?.cover_image?.image_url || '')

const normalizePricingOptions = group => {
  if (!group?.is_active) return []

  const options = Array.isArray(group.options) ? group.options.filter(Boolean) : []
  if (options.length > 0) return options
  if (group.default_option?.id) return [group.default_option]

  return []
}

const emitPricingDebug = (slug, payload) => {
  if (!import.meta.env.DEV) return
  if (import.meta.hot?.send) {
    import.meta.hot.send('custom:debug-log', { message: `[pricing] ${slug}`, payload })
  }
  if (typeof console !== 'undefined') {
    console.groupCollapsed('[Pricing Debug]', slug)
    Object.entries(payload).forEach(([key, value]) => console.log(key, value))
    console.groupEnd()
  }
}

const logCheckoutDraftEvent = (status, payload = {}) => {
  const slug = getProductSlug() || 'unknown'

  emitPricingDebug(slug, { event: `checkout-draft:${status}`, ...payload })
}

const loadPricing = async () => {
  if (!isPricingRoute()) return
  const slug = route.query.slug
  if (!slug) { router.replace('/products/select') 

    return }
  window.scrollTo(0, 0)
  selectedOptionId.value = null
  loading.value = true

  try {
    const { data } = await axios.get(getPublicProductPricingUrl(slug), {
      headers: { Accept: 'application/json' },
    })

    pricingResponse.value = data?.data || null
  } catch (error) {
    pricingResponse.value = null

    const message = error?.response?.data?.message || 'Unable to load product pricing.'

    toast.error(message)
    loading.value = false
    
    return
  }

  emitPricingDebug(slug, {
    pricingResponse: pricingResponse.value,
  })

  const defaultOptionId = subscriptionGroup.value?.default_option?.id || oneTimeGroup.value?.default_option?.id || null
  if (defaultOptionId)
    selectedOptionId.value = `plan-${defaultOptionId}`

  loading.value = false
}

onMounted(loadPricing)
watch(() => route.query.slug, loadPricing)

const subscriptionOptions = computed(() => {
  const group = subscriptionGroup.value
  const options = normalizePricingOptions(group)
  if (options.length === 0) return []

  return options
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(option => ({
      id: `plan-${option.id}`,
      type: 'subscription',
      title: option.label || 'Plan',
      subtitle: option.metadata?.mg || '',
      description: option.metadata?.tagline || group.description || '',
      price: Number(option.final_price || option.price || 0),
      originalPrice: Number(option.discount_percent || 0) > 0 ? Number(option.price || 0) : null,
      discountPercentage: Number(option.discount_percent || 0) || null,
      frequencyMonths: Number(option.interval_count || 1),
      supportsFrequency: false,
      isBestValue: !!option.is_default || option.metadata?.badge === 'Most Popular',
      badge: option.metadata?.badge || '',
      pricingOptionId: option.id,
    }))
})

const oneTimeOptions = computed(() => {
  const group = oneTimeGroup.value
  const options = normalizePricingOptions(group)
  if (options.length === 0) return []

  return options
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(option => ({
      id: `plan-${option.id}`,
      type: 'one-time',
      title: option.label || 'Plan',
      description: option.metadata?.tagline || group.description || '',
      price: Number(option.final_price || option.price || 0),
      originalPrice: Number(option.discount_percent || 0) > 0 ? Number(option.price || 0) : null,
      discountPercentage: Number(option.discount_percent || 0) || null,
      badge: option.metadata?.badge || '',
      pricingOptionId: option.id,
    }))
})

const findSelectedOption = () => {
  return (
    subscriptionOptions.value.find(o => o.id === selectedOptionId.value) ||
    oneTimeOptions.value.find(o => o.id === selectedOptionId.value) ||
    null
  )
}

const buildCheckoutDraftPayload = () => {
  const option = findSelectedOption()
  const slug = getProductSlug()
  if (!option || !slug) return null

  const payload = {
    product_slug: slug,
    pricing_type: option.type === 'subscription' ? 'subscription' : 'one_time',
  }

  if (option.pricingOptionId)
    payload.pricing_option_id = option.pricingOptionId

  return { payload, option }
}

const handleStartJourney = async () => {
  if (!selectedOptionId.value || submitting.value) return
  addToCartError.value = ''

  const draft = buildCheckoutDraftPayload()
  if (!draft) {
    addToCartError.value = 'Unable to determine the selected pricing option. Please refresh and try again.'
    toast.error('Unable to continue. Please refresh and try again.')
    
    return
  }

  submitting.value = true

  const { payload } = draft
  const idempotencyKey = uuidv4()

  try {
    logCheckoutDraftEvent('pending', { payload, idempotencyKey })

    const { data } = await axios.post(CHECKOUT_DRAFT_URL, payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })

    const draftResponse = data?.data ?? data

    logCheckoutDraftEvent('success', { payload, response: draftResponse, idempotencyKey })

    const orderUuid = draftResponse?.order_uuid
    if (!orderUuid) {
      toast.error('We could not start your checkout session. Redirecting you home.')
      router.push('/')
      
      return
    }
    router.push({ path: '/telehealth-intake', query: { order_uuid: orderUuid } })
  } catch (error) {
    const message = error?.response?.data?.message
      || error?.response?.data?.err_msg
      || 'Unable to add this item to your cart right now.'

    addToCartError.value = message
    toast.error(message)
    logCheckoutDraftEvent('error', {
      payload, idempotencyKey,
      error: { status: error?.response?.status, data: error?.response?.data },
    })
  } finally {
    submitting.value = false
  }
}

const navigate = path => { router.push(path); window.scrollTo(0, 0) }
</script>

<template>
  <div class="pricing-page min-h-screen pt-20 bg-white">
    <!-- Loading -->
    <div
      v-if="loading"
      class="min-h-screen pt-20 flex items-center justify-center"
    >
      <div class="loader" />
    </div>

    <!-- Not Found -->
    <div
      v-else-if="!pricingProduct"
      class="max-w-3xl mx-auto px-4 py-12 text-center"
    >
      <h1 class="text-3xl font-bold text-gray-900 mb-4">
        Product Not Found
      </h1>
      <p class="text-gray-600 mb-8">
        We couldn't find the product you're looking for.
      </p>
      <button
        class="btn-primary"
        @click="navigate('/products/select')"
      >
        Select a Product
      </button>
    </div>

    <!-- Main -->
    <div
      v-else
      class="max-w-2xl mx-auto px-4 py-8"
    >
      <!-- Back -->
      <button
        class="back-btn flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm mb-8 transition-colors"
        @click="router.back()"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <!-- Header -->
      <div class="mb-10">
        <div
          v-if="productImage"
          class="mb-5 pricing-product-media"
        >
          <img
            :src="productImage"
            :alt="pricingProduct.name"
            class="pricing-product-media__img"
          >
        </div>
        <p class="text-xs font-semibold tracking-widest text-emerald-600 uppercase mb-2">
          Select Your Plan
        </p>
        <h1 class="text-3xl font-bold text-gray-900 mb-1 leading-tight">
          {{ pricingProduct.name }}
        </h1>
        <p class="text-sm text-gray-500 mt-3 leading-relaxed max-w-lg">
          {{ pricingProduct.description || 'Pricing is customized based on your individual health goals and treatment plan. Our medical team will discuss specific pricing during your telehealth consultation.' }}
        </p>
      </div>

      <!--
        ══════════════════════════════════════════
        SECTION 1 — SUBSCRIPTION PLANS
        ═══════════════════════════════════════════ 
      -->
      <div
        v-if="subscriptionOptions.length > 0"
        class="mb-8"
      >
        <!-- Section Header -->
        <div class="section-header">
          <div class="section-header__left">
            <div class="section-icon sub-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </div>
            <div>
              <h2 class="section-title">
                {{ subscriptionGroup?.title || 'Subscription Plans' }}
              </h2>
              <p class="section-subtitle">
                {{ subscriptionGroup?.description || 'Save more with longer commitments · Cancel anytime' }}
              </p>
            </div>
          </div>
          <div class="section-header__badge">
            Most Popular
          </div>
        </div>

        <!-- Subscription Cards Grid -->
        <div class="sub-grid">
          <button
            v-for="option in subscriptionOptions"
            :key="option.id"
            class="sub-card"
            :class="{
              'sub-card--selected': selectedOptionId === option.id,
              'sub-card--best': option.isBestValue,
              'sub-card--dimmed': selectedOptionId && selectedOptionId !== option.id,
            }"
            @click="selectedOptionId = option.id"
          >
            <!-- Best Value ribbon -->
            <div
              v-if="option.isBestValue"
              class="best-ribbon"
            >
              Best Value
            </div>

            <!-- Discount badge -->
            <div
              v-if="option.discountPercentage"
              class="sub-discount-pill"
              :class="selectedOptionId === option.id ? 'sub-discount-pill--active' : ''"
            >
              Save {{ option.discountPercentage }}%
            </div>

            <!-- Duration + dosage -->
            <div class="sub-card__head">
              <div class="sub-card__duration">
                {{ option.title }}
              </div>
              <div class="sub-card__dosage">
                {{ option.subtitle }}
              </div>
            </div>

            <!-- Price -->
            <div class="sub-card__price-block">
              <div
                v-if="option.originalPrice"
                class="sub-card__original"
              >
                ${{ option.originalPrice.toFixed(2) }}
              </div>
              <div
                class="sub-card__price"
                :class="selectedOptionId === option.id ? 'sub-card__price--active' : ''"
              >
                ${{ option.price.toFixed(2) }}
              </div>
            </div>

            <!-- Delivery cadence -->
            <div class="sub-card__desc">
              {{ option.description }}
            </div>

            <!-- Selected check -->
            <div
              class="sub-card__check"
              :class="selectedOptionId === option.id ? 'sub-card__check--visible' : ''"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      <!--
        ══════════════════════════════════════════
        SECTION 2 — ONE-TIME OPTIONS
        ═══════════════════════════════════════════ 
      -->
      <div
        v-if="oneTimeOptions.length > 0"
        class="mb-8"
      >
        <!-- Divider with label -->
        <div class="divider-label">
          <span class="divider-label__line" />
          <span class="divider-label__text">Or choose a one-time purchase</span>
          <span class="divider-label__line" />
        </div>

        <!-- Section Header -->
        <div class="section-header mt-4">
          <div class="section-header__left">
            <div class="section-icon onetime-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect
                  x="1"
                  y="3"
                  width="15"
                  height="13"
                /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle
                  cx="5.5"
                  cy="18.5"
                  r="2.5"
                /><circle
                  cx="18.5"
                  cy="18.5"
                  r="2.5"
                />
              </svg>
            </div>
            <div>
              <h2 class="section-title">
                {{ oneTimeGroup?.title || 'One-Time Purchase' }}
              </h2>
              <p class="section-subtitle">
                {{ oneTimeGroup?.description || 'No commitment · Order as needed' }}
              </p>
            </div>
          </div>
        </div>

        <!-- One-time rows -->
        <div class="space-y-3 mt-4">
          <button
            v-for="option in oneTimeOptions"
            :key="option.id"
            class="onetime-row"
            :class="{
              'onetime-row--selected': selectedOptionId === option.id,
              'onetime-row--dimmed': selectedOptionId && selectedOptionId !== option.id,
            }"
            @click="selectedOptionId = option.id"
          >
            <div class="onetime-row__radio">
              <div
                class="radio-ring"
                :class="selectedOptionId === option.id ? 'radio-ring--on' : ''"
              >
                <div
                  v-if="selectedOptionId === option.id"
                  class="radio-dot"
                />
              </div>
            </div>

            <div class="onetime-row__body">
              <div class="onetime-row__title">
                {{ option.title }}
              </div>
              <div class="onetime-row__desc">
                {{ option.description }}
              </div>
            </div>

            <div class="onetime-row__price">
              <span v-if="option.price > 0">${{ option.price.toFixed(2) }}</span>
              <span
                v-else
                class="contact-price"
              >Contact</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Recurring Notice -->
      <div class="notice-box mt-6">
        <p class="text-xs text-gray-500 leading-relaxed">
          *This item is a recurring or deferred purchase. By continuing, I agree to the
          <button
            class="text-emerald-600 hover:text-emerald-700 font-semibold underline"
            @click="showCancelModal = true"
          >
            Cancellation Policy
          </button>
          and authorize you to charge my payment method at the prices, frequency, and dates listed on this page until my order is fulfilled or I cancel.
        </p>
      </div>

      <!-- CTA -->
      <div class="mt-8 pt-6 border-t border-gray-100">
        <button
          :disabled="!selectedOptionId || submitting"
          class="cta-btn w-full"
          :class="selectedOptionId && !submitting ? 'cta-btn--active' : 'cta-btn--disabled'"
          @click="handleStartJourney"
        >
          <span
            v-if="!submitting"
            class="flex items-center justify-center gap-2"
          >
            {{ selectedOptionId ? 'Add to Cart' : 'Select a Plan to Continue' }}
            <svg
              v-if="selectedOptionId"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
              /><polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
          <span
            v-else
            class="flex items-center justify-center gap-2"
          >
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Adding to cart…
          </span>
        </button>
        <p
          v-if="addToCartError"
          class="text-sm text-red-600 text-center mt-3"
        >
          {{ addToCartError }}
        </p>
      </div>
    </div>

    <!-- Cancellation Modal -->
    <Transition name="modal-fade">
      <div
        v-if="showCancelModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click="showCancelModal = false"
      >
        <div
          class="modal-card bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          @click.stop
        >
          <div class="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900">
              Cancellation Policy
            </h2>
            <button
              class="p-2 hover:bg-gray-100 rounded-full transition-colors"
              @click="showCancelModal = false"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6b7280"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line
                  x1="18"
                  y1="6"
                  x2="6"
                  y2="18"
                /><line
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"
                />
              </svg>
            </button>
          </div>
          <div class="p-6 space-y-5 text-sm text-gray-600 leading-relaxed">
            <section
              v-for="(sec, i) in [
                { title: 'Subscription Terms', body: 'When you purchase a subscription plan, you authorize us to charge your payment method at the frequency you selected until you cancel your subscription.' },
                { title: 'How to Cancel', body: 'You may cancel your subscription at any time by contacting our customer support team, logging into your account portal, or calling our customer service line.' },
                { title: 'Cancellation Effective Date', body: 'Cancellations will take effect at the end of your current billing cycle. No refunds will be provided for partial billing periods.' },
                { title: 'One-Time Purchases', body: 'One-time purchases, micro-dose options, and sample orders are not recurring and do not require cancellation.' },
                { title: 'Medical Oversight', body: 'All treatments require ongoing medical oversight. Our healthcare providers reserve the right to discontinue treatment if they determine it is no longer appropriate for your health needs.' },
              ]"
              :key="i"
            >
              <h3 class="text-sm font-bold text-gray-900 mb-1">
                {{ sec.title }}
              </h3>
              <p>{{ sec.body }}</p>
            </section>
          </div>
          <div class="sticky bottom-0 bg-gray-50 border-t border-gray-100 p-6">
            <button
              class="w-full py-3 px-6 rounded-xl font-semibold text-sm text-white transition-all"
              style="background: linear-gradient(135deg, #059669, #0d9488);"
              @click="showCancelModal = false"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Loader ── */
.loader {
  width: 3rem; height: 3rem;
  border: 3px solid #d1fae5;
  border-top-color: #059669;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Section Header ── */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.875rem;
}
.section-header__left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.section-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sub-icon {
  background: #ecfdf5;
  color: #059669;
}
.onetime-icon {
  background: #f3f4f6;
  color: #6b7280;
}
.section-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}
.section-subtitle {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.0625rem;
}
.section-header__badge {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  background: #ecfdf5;
  color: #065f46;
  border: 1.5px solid #6ee7b7;
}

/* ── Subscription Grid ── */
.sub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
@media (max-width: 480px) {
  .sub-grid {
    grid-template-columns: 1fr;
  }
}

.sub-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 1.125rem 1rem 1rem;
  border-radius: 0.875rem;
  border: 2px solid #e5e7eb;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  overflow: hidden;
}
.sub-card:hover:not(.sub-card--selected):not(.sub-card--dimmed) {
  border-color: #9ca3af;
  box-shadow: 0 2px 10px rgba(0,0,0,0.07);
}
.sub-card--selected {
  border-color: #111827;
  background: #111827;
  box-shadow: 0 6px 20px rgba(0,0,0,0.2);
}
.sub-card--best:not(.sub-card--selected) {
  border-color: #059669;
  background: #f0fdf4;
}
.sub-card--dimmed {
  opacity: 0.45;
  background: #f9fafb;
}

/* Best Value ribbon */
.best-ribbon {
  position: absolute;
  top: 0;
  right: 0;
  background: #059669;
  color: #ffffff;
  font-size: 0.5625rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.1875rem 0.5rem;
  border-bottom-left-radius: 0.5rem;
}
.sub-card--selected .best-ribbon {
  background: #6ee7b7;
  color: #064e3b;
}

/* Discount pill */
.sub-discount-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.1875rem 0.5rem;
  border-radius: 999px;
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
  margin-bottom: 0.625rem;
  width: fit-content;
}
.sub-discount-pill--active {
  background: rgba(255,255,255,0.15);
  color: #ffffff;
  border-color: rgba(255,255,255,0.35);
}

.sub-card__head {
  margin-bottom: 0.625rem;
}
.sub-card__duration {
  font-size: 1.0625rem;
  font-weight: 800;
  color: #111827;
  line-height: 1.2;
  transition: color 0.2s;
}
.sub-card--selected .sub-card__duration { color: #ffffff; }

.sub-card__dosage {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  margin-top: 0.125rem;
  transition: color 0.2s;
}
.sub-card--selected .sub-card__dosage { color: #a7f3d0; }
.sub-card--best:not(.sub-card--selected) .sub-card__dosage { color: #059669; }

.sub-card__price-block {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.375rem;
}
.sub-card__original {
  font-size: 0.75rem;
  color: #9ca3af;
  text-decoration: line-through;
  line-height: 1;
  transition: color 0.2s;
}
.sub-card--selected .sub-card__original { color: rgba(255,255,255,0.4); }

.sub-card__price {
  font-size: 1.375rem;
  font-weight: 800;
  color: #111827;
  line-height: 1.1;
  transition: color 0.2s;
}
.sub-card__price--active { color: #ffffff; }

.sub-card__desc {
  font-size: 0.6875rem;
  color: #9ca3af;
  margin-top: auto;
  padding-top: 0.5rem;
  transition: color 0.2s;
}
.sub-card--selected .sub-card__desc { color: rgba(255,255,255,0.5); }

/* Check circle */
.sub-card__check {
  position: absolute;
  top: 0.625rem;
  left: 0.625rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: #111827;
  border: 2px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  opacity: 0;
  transform: scale(0.7);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sub-card--selected .sub-card__check--visible {
  opacity: 1;
  transform: scale(1);
  background: #ffffff;
  color: #111827;
}

/* ── Divider Label ── */
.divider-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.5rem 0;
}
.divider-label__line {
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}
.divider-label__text {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #9ca3af;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ── One-time Rows ── */
.onetime-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9375rem 1.125rem;
  border-radius: 0.875rem;
  border: 2px solid #e5e7eb;
  background: #ffffff;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.2s ease;
}
.onetime-row:hover:not(.onetime-row--selected):not(.onetime-row--dimmed) {
  border-color: #9ca3af;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.onetime-row--selected {
  border-color: #111827;
  background: #111827;
  box-shadow: 0 4px 14px rgba(0,0,0,0.18);
}
.onetime-row--dimmed {
  opacity: 0.45;
  background: #f9fafb;
}

.radio-ring {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  border: 2px solid #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.radio-ring--on {
  border-color: #ffffff;
  background: #ffffff;
}
.radio-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #111827;
}

.onetime-row__body {
  flex: 1;
  min-width: 0;
}
.onetime-row__title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  transition: color 0.2s;
}
.onetime-row--selected .onetime-row__title { color: #ffffff; }

.onetime-row__desc {
  font-size: 0.8125rem;
  color: #6b7280;
  margin-top: 0.125rem;
  transition: color 0.2s;
}
.onetime-row--selected .onetime-row__desc { color: #d1fae5; }

.onetime-row__price {
  font-size: 1.1875rem;
  font-weight: 800;
  color: #111827;
  flex-shrink: 0;
  transition: color 0.2s;
}
.onetime-row--selected .onetime-row__price { color: #ffffff; }

.contact-price {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

/* ── Notice ── */
.notice-box {
  padding: 1rem 1.25rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
}

/* ── CTA ── */
.cta-btn {
  padding: 1rem 1.5rem;
  border-radius: 0.875rem;
  font-weight: 700;
  font-size: 1rem;
  transition: all 0.2s;
  letter-spacing: 0.01em;
}
.cta-btn--active {
  background: #111827;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(0,0,0,0.2);
}
.cta-btn--active:hover {
  background: #1f2937;
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
  transform: translateY(-1px);
}
.cta-btn--active:active { transform: translateY(0); }
.cta-btn--disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

/* ── Modal ── */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-card { animation: modal-up 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes modal-up {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
</style>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
