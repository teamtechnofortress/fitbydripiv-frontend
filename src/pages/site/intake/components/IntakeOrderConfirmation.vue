<script setup>
import axios from 'axios'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CHECKOUT_APPLY_COUPON_URL, CHECKOUT_CREATE_URL } from '@/network/const'

const props = defineProps({
  confirmationData: {
    type: Object,
    default: null,
  },
  confirmationMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['updated'])

const router = useRouter()

const orderState = ref(props.confirmationData || null)
const couponCode = ref('')
const couponFieldVisible = ref(false)
const couponLoading = ref(false)
const couponSuccess = ref('')
const couponError = ref('')
const checkoutLoading = ref(false)
const checkoutError = ref('')

watch(
  () => props.confirmationData,
  value => {
    orderState.value = value || null
    couponCode.value = ''
    couponFieldVisible.value = false
    couponSuccess.value = ''
    couponError.value = ''
    checkoutError.value = ''
  },
  { immediate: true },
)

const patient = computed(() => orderState.value?.patient || {})
const product = computed(() => orderState.value?.product || {})
const order = computed(() => orderState.value?.order || {})
const pricingOption = computed(() => order.value?.pricing_option || {})
const coupon = computed(() => order.value?.coupon || null)

const formatMoney = (amount, currency = 'USD') => {
  if (amount == null || amount === '') return '$0.00'
  const value = Number(amount)
  if (Number.isNaN(value)) return amount
  
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
}

const prettyLabel = value => String(value || '—')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase())

const baseAmount = computed(() => Number(order.value?.base_amount || 0))
const couponDiscountAmount = computed(() => Number(order.value?.coupon_discount_amount || 0))
const finalAmount = computed(() => Number(order.value?.final_amount || order.value?.price || 0))
const currency = computed(() => order.value?.currency || 'USD')

const pricingDiscountAmount = computed(() => {
  const discount = baseAmount.value - couponDiscountAmount.value - finalAmount.value
  
  return discount > 0 ? discount : 0
})

const cadenceLabel = computed(() => {
  if (order.value?.purchase_type !== 'subscription')
    return 'One-time purchase'
  const months = Number(order.value?.frequency_months || pricingOption.value?.interval_count || 1)
  
  return months === 1 ? 'Every month' : `Every ${months} months`
})

const patientName = computed(() => patient.value?.full_name || [patient.value?.first_name, patient.value?.last_name].filter(Boolean).join(' ') || '—')
const productImages = computed(() => Array.isArray(product.value?.images) ? product.value.images : [])

const productImage = computed(() => {
  const directImage = product.value?.landscape_image || product.value?.featured_image
  if (directImage) return directImage

  const coverImage = product.value?.cover_image?.image_url || product.value?.cover_image?.url
  if (coverImage) return coverImage

  const coverGalleryImage = productImages.value.find(image => image?.image_type === 'cover' && (image?.image_url || image?.url))
  if (coverGalleryImage) return coverGalleryImage.image_url || coverGalleryImage.url || ''

  const fallbackGalleryImage = productImages.value.find(image => image?.image_url || image?.url)
  
  return fallbackGalleryImage?.image_url || fallbackGalleryImage?.url || ''
})

const applyCoupon = async () => {
  if (couponLoading.value) return
  const code = String(couponCode.value || '').trim().toUpperCase()
  if (!code) {
    couponError.value = 'Please enter a coupon code.'
    couponSuccess.value = ''
    
    return
  }
  couponLoading.value = true
  couponError.value = ''
  couponSuccess.value = ''
  try {
    const { data } = await axios.post(
      CHECKOUT_APPLY_COUPON_URL,
      { order_uuid: order.value?.order_uuid, coupon_code: code },
      { headers: { Accept: 'application/json' } },
    )

    const payload = data?.data || null
    if (payload) {
      orderState.value = payload
      emit('updated', payload)
    }
    couponSuccess.value = data?.message || 'Coupon applied successfully.'
    couponError.value = ''
    couponCode.value = ''
  } catch (error) {
    const responseData = error?.response?.data
    const couponErrors = responseData?.errors?.coupon_code

    couponError.value = Array.isArray(couponErrors) && couponErrors[0]
      ? couponErrors[0]
      : responseData?.message || 'Unable to apply coupon right now.'
    couponSuccess.value = ''
  } finally {
    couponLoading.value = false
  }
}

const proceedToCheckout = async () => {
  if (checkoutLoading.value) return
  const currentOrderUuid = String(order.value?.order_uuid || '').trim()
  if (!currentOrderUuid) {
    checkoutError.value = 'Order reference is missing. Please restart from pricing.'
    
    return
  }
  checkoutLoading.value = true
  checkoutError.value = ''
  try {
    const { data } = await axios.post(
      CHECKOUT_CREATE_URL,
      { order_uuid: currentOrderUuid },
      { headers: { Accept: 'application/json' } },
    )

    const checkoutUrl = data?.checkout_url
    if (!checkoutUrl) {
      checkoutError.value = 'Checkout URL was not returned. Please try again.'
      
      return
    }
    window.location.href = checkoutUrl
  } catch (error) {
    const responseData = error?.response?.data
    const orderErrors = responseData?.errors?.order_uuid

    checkoutError.value = Array.isArray(orderErrors) && orderErrors[0]
      ? orderErrors[0]
      : responseData?.message || 'Unable to proceed to checkout right now.'
  } finally {
    checkoutLoading.value = false
  }
}

const goHome = () => {
  router.push('/')
  window.scrollTo(0, 0)
}
</script>

<template>
  <div class="oc-wrapper">
    <!--
      ══════════════════════════════════════
      HERO BANNER
      ══════════════════════════════════════ 
    -->
    <section class="oc-hero">
      <div class="oc-hero__left">
        <div class="oc-hero__badge">
          <span class="oc-badge-dot" />
          Order Confirmation
        </div>
        <h1 class="oc-hero__title">
          Intake submitted &amp; order saved
        </h1>
        <p class="oc-hero__sub">
          {{ confirmationMessage || 'Your intake has been received. Review your treatment selection and order totals below before proceeding to checkout.' }}
        </p>
        <div class="oc-hero__chips">
          <span class="oc-chip">{{ prettyLabel(order.purchase_type) }}</span>
          <span class="oc-chip">{{ prettyLabel(order.status) }}</span>
          <span class="oc-chip oc-chip--muted">{{ prettyLabel(order.payment_status) }}</span>
        </div>
      </div>

      <div class="oc-hero__patient-card">
        <div class="oc-patient-avatar">
          {{ patientName.charAt(0) || 'P' }}
        </div>
        <div class="oc-patient-info">
          <div class="oc-patient-label">
            Patient
          </div>
          <div class="oc-patient-name">
            {{ patientName }}
          </div>
          <div class="oc-patient-meta">
            <span v-if="patient.email">{{ patient.email }}</span>
            <span v-if="patient.phone">{{ patient.phone }}</span>
          </div>
        </div>
      </div>
    </section>

    <!--
      ══════════════════════════════════════
      MAIN GRID
      ══════════════════════════════════════ 
    -->
    <div class="oc-grid">
      <!-- ── LEFT: Product Card ── -->
      <section class="oc-card oc-card--product">
        <div class="oc-card__header">
          <div class="oc-card__header-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
          </div>
          <div>
            <h2 class="oc-card__title">
              Selected Treatment
            </h2>
            <p class="oc-card__subtitle">
              Product and plan summary from your intake submission.
            </p>
          </div>
        </div>

        <div class="oc-product">
          <div class="oc-product__media">
            <img
              v-if="productImage"
              :src="productImage"
              :alt="product.name"
              class="oc-product__img"
            >
            <div
              v-else
              class="oc-product__fallback"
            >
              {{ product.name?.charAt(0) || 'P' }}
            </div>
            <div class="oc-product__media-badge">
              {{ prettyLabel(product.category) }}
            </div>
          </div>

          <div class="oc-product__body">
            <div class="oc-product__headline">
              <h3 class="oc-product__name">
                {{ product.name || '—' }}
              </h3>
              <p class="oc-product__desc">
                {{ product.description || 'Treatment details will be reviewed by our clinical team.' }}
              </p>
            </div>

            <div class="oc-product__meta-grid">
              <div class="oc-meta-item">
                <div class="oc-meta-item__label">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  ><rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                  /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  Plan
                </div>
                <div class="oc-meta-item__value">
                  {{ pricingOption.label || prettyLabel(order.pricing_type) }}
                </div>
              </div>
              <div class="oc-meta-item">
                <div class="oc-meta-item__label">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  ><circle
                    cx="12"
                    cy="12"
                    r="10"
                  /><path d="M12 6v6l4 2" /></svg>
                  Cadence
                </div>
                <div class="oc-meta-item__value">
                  {{ cadenceLabel }}
                </div>
              </div>
              <!--
                <div class="oc-meta-item oc-meta-item--full">
                <div class="oc-meta-item__label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/></svg>
                Order Reference
                </div>
                <div class="oc-meta-item__value oc-meta-item__value--mono">{{ order.order_uuid || '—' }}</div>
                </div> 
              -->
            </div>
          </div>
        </div>
      </section>

      <!-- ── RIGHT: Totals + Coupon + Checkout ── -->
      <div class="oc-sidebar">
        <!-- Order Total Card -->
        <section class="oc-card oc-card--totals">
          <div class="oc-card__header">
            <div class="oc-card__header-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><line
                x1="12"
                y1="1"
                x2="12"
                y2="23"
              /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </div>
            <div>
              <h2 class="oc-card__title">
                Order Total
              </h2>
              <p class="oc-card__subtitle">
                Pricing snapshot attached to this draft order.
              </p>
            </div>
          </div>

          <div class="oc-totals">
            <div class="oc-totals__row">
              <span>Base amount</span>
              <strong>{{ formatMoney(baseAmount, currency) }}</strong>
            </div>
            <div
              v-if="pricingDiscountAmount > 0"
              class="oc-totals__row oc-totals__row--discount"
            >
              <span>Plan discount</span>
              <strong>−{{ formatMoney(pricingDiscountAmount, currency) }}</strong>
            </div>
            <div
              v-if="couponDiscountAmount > 0"
              class="oc-totals__row oc-totals__row--discount"
            >
              <span>Coupon discount</span>
              <strong>−{{ formatMoney(couponDiscountAmount, currency) }}</strong>
            </div>
            <div class="oc-totals__divider" />
            <div class="oc-totals__row oc-totals__row--final">
              <span>Order total</span>
              <strong class="oc-totals__final-amount">{{ formatMoney(finalAmount, currency) }}</strong>
            </div>
          </div>

          <!-- Applied Coupon Badge -->
          <div
            v-if="coupon"
            class="oc-applied-coupon"
          >
            <div class="oc-applied-coupon__left">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line
                x1="7"
                y1="7"
                x2="7.01"
                y2="7"
              /></svg>
              <div>
                <div class="oc-applied-coupon__code">
                  {{ coupon.code }}
                </div>
                <div class="oc-applied-coupon__meta">
                  {{ coupon.name }} · {{ prettyLabel(coupon.type) }} · {{ prettyLabel(coupon.scope) }}
                </div>
              </div>
            </div>
            <span class="oc-applied-coupon__badge">Active</span>
          </div>
        </section>

        <!-- Coupon Panel Card -->
        <section class="oc-card oc-card--coupon">
          <div class="oc-coupon-header">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line
              x1="7"
              y1="7"
              x2="7.01"
              y2="7"
            /></svg>
            <div>
              <h3 class="oc-coupon-header__title">
                Apply Discount Coupon
              </h3>
              <p class="oc-coupon-header__sub">
                Have a valid coupon code? Apply it below.
              </p>
            </div>
          </div>

          <div
            v-if="!couponFieldVisible"
            class="oc-coupon-reveal"
          >
            <button
              type="button"
              class="oc-btn oc-btn--ghost"
              @click="couponFieldVisible = true"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line
                x1="7"
                y1="7"
                x2="7.01"
                y2="7"
              /></svg>
              Add Coupon Code
            </button>
          </div>

          <div
            v-else
            class="oc-coupon-form"
          >
            <label class="oc-label">Coupon Code</label>
            <div class="oc-coupon-input-row">
              <input
                v-model="couponCode"
                type="text"
                class="oc-input"
                placeholder="e.g. WELCOME20"
                @keyup.enter="applyCoupon"
              >
              <button
                type="button"
                class="oc-btn oc-btn--apply"
                :disabled="couponLoading"
                @click="applyCoupon"
              >
                <span
                  v-if="couponLoading"
                  class="oc-spinner"
                />
                <span>{{ couponLoading ? 'Applying…' : 'Apply' }}</span>
              </button>
            </div>
            <p
              v-if="couponSuccess"
              class="oc-msg oc-msg--success"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              ><polyline points="20 6 9 17 4 12" /></svg>
              {{ couponSuccess }}
            </p>
            <p
              v-if="couponError"
              class="oc-msg oc-msg--error"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              ><circle
                cx="12"
                cy="12"
                r="10"
              /><line
                x1="12"
                y1="8"
                x2="12"
                y2="12"
              /><line
                x1="12"
                y1="16"
                x2="12.01"
                y2="16"
              /></svg>
              {{ couponError }}
            </p>
          </div>
        </section>

        <!-- Checkout CTA Card -->
        <section class="oc-card oc-card--cta">
          <div class="oc-cta-summary">
            <div class="oc-cta-summary__label">
              Total due today
            </div>
            <div class="oc-cta-summary__amount">
              {{ formatMoney(finalAmount, currency) }}
            </div>
            <div class="oc-cta-summary__cadence">
              {{ cadenceLabel }}
            </div>
          </div>

          <p
            v-if="checkoutError"
            class="oc-msg oc-msg--error oc-msg--block"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            ><circle
              cx="12"
              cy="12"
              r="10"
            /><line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            /><line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            /></svg>
            {{ checkoutError }}
          </p>

          <button
            type="button"
            class="oc-btn oc-btn--checkout"
            :disabled="checkoutLoading"
            @click="proceedToCheckout"
          >
            <span
              v-if="checkoutLoading"
              class="oc-spinner oc-spinner--light"
            />
            <span>{{ checkoutLoading ? 'Preparing Checkout…' : 'Proceed to Checkout' }}</span>
            <svg
              v-if="!checkoutLoading"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            ><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>

          <div class="oc-cta-trust">
            <span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
                ry="2"
              /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              Secure checkout
            </span>
            <span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              ><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              HIPAA compliant
            </span>
          </div>

          <button
            type="button"
            class="oc-btn oc-btn--home"
            @click="goHome"
          >
            Return to Home
          </button>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ════════════════════════════════════════
   CSS VARIABLES (extend from global theme)
════════════════════════════════════════ */
.oc-wrapper {
  --oc-green: #059669;
  --oc-green-dark: #065f46;
  --oc-green-mid: #10b981;
  --oc-green-light: #d1fae5;
  --oc-green-xlight: #ecfdf5;
  --oc-green-border: rgba(167, 243, 208, 0.85);
  --oc-text: var(--text, #0f172a);
  --oc-text-2: var(--text-2, #475569);
  --oc-text-3: var(--text-3, #94a3b8);
  --oc-surface: var(--surface, #ffffff);
  --oc-surface-2: var(--surface-2, #f8fafc);
  --oc-border: var(--border, #e2e8f0);
  --oc-radius-sm: 12px;
  --oc-radius-md: 18px;
  --oc-radius-lg: 24px;
  --oc-shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04);
  --oc-shadow-md: 0 4px 20px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04);
  --oc-gradient: linear-gradient(135deg, #059669 0%, #0284c7 100%);

  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 24px;
  padding-bottom: 48px;
}

/* ════════════════════════════════════════
   HERO
════════════════════════════════════════ */
.oc-hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: center;
  padding: 36px 40px;
  border-radius: var(--oc-radius-lg);
  background:
    radial-gradient(ellipse at 0% 0%, rgba(16, 185, 129, 0.14) 0%, transparent 55%),
    radial-gradient(ellipse at 100% 100%, rgba(2, 132, 199, 0.08) 0%, transparent 50%),
    var(--oc-green-xlight);
  border: 1px solid var(--oc-green-border);
  box-shadow: var(--oc-shadow-md);
  position: relative;
  overflow: hidden;
}

.oc-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
}

.oc-hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(5, 150, 105, 0.1);
  border: 1px solid var(--oc-green-border);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--oc-green-dark);
  margin-bottom: 16px;
}

.oc-badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--oc-green);
  animation: pulse 2s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.oc-hero__title {
  margin: 0;
  font-family: var(--font-display, inherit);
  font-size: clamp(26px, 3.5vw, 40px);
  font-weight: 800;
  line-height: 1.06;
  color: var(--oc-text);
  letter-spacing: -0.02em;
}

.oc-hero__sub {
  margin: 14px 0 0;
  max-width: 560px;
  font-size: 15px;
  line-height: 1.75;
  color: var(--oc-text-2);
}

.oc-hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}

.oc-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  border-radius: 999px;
  background: rgba(5, 150, 105, 0.08);
  border: 1px solid var(--oc-green-border);
  font-size: 12px;
  font-weight: 700;
  color: var(--oc-green-dark);
  letter-spacing: 0.02em;
}

.oc-chip--muted {
  background: rgba(15, 23, 42, 0.04);
  color: var(--oc-text-3);
  border-color: var(--oc-border);
}

/* Patient Card in Hero */
.oc-hero__patient-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 28px;
  border-radius: var(--oc-radius-md);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(12px);
  min-width: 260px;
  z-index: 1;
}

.oc-patient-avatar {
  flex-shrink: 0;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--oc-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  box-shadow: 0 6px 18px rgba(5, 150, 105, 0.28);
}

.oc-patient-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--oc-text-3);
  margin-bottom: 6px;
}

.oc-patient-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--oc-text);
  line-height: 1.2;
}

.oc-patient-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--oc-text-2);
}

/* ════════════════════════════════════════
   MAIN GRID
════════════════════════════════════════ */
.oc-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) 380px;
  gap: 24px;
  align-items: start;
}

.oc-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ════════════════════════════════════════
   CARDS (shared base)
════════════════════════════════════════ */
.oc-card {
  background: var(--oc-surface);
  border: 1px solid var(--oc-border);
  border-radius: var(--oc-radius-lg);
  padding: 28px;
  box-shadow: var(--oc-shadow-sm);
  transition: box-shadow 0.2s ease;
}

.oc-card:hover {
  box-shadow: var(--oc-shadow-md);
}

.oc-card__header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--oc-border);
}

.oc-card__header-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--oc-green-xlight);
  border: 1px solid var(--oc-green-border);
  color: var(--oc-green);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.oc-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--oc-text);
  letter-spacing: -0.01em;
}

.oc-card__subtitle {
  margin: 5px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--oc-text-3);
}

/* ════════════════════════════════════════
   PRODUCT CARD
════════════════════════════════════════ */
.oc-product {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.oc-product__media {
  position: relative;
  min-height: 260px;
  width: 100%;
  border-radius: var(--oc-radius-md);
  background: linear-gradient(150deg, #ecfdf5 0%, #eff6ff 100%);
  border: 1px solid var(--oc-green-border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.oc-product__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 28px;
}

.oc-product__fallback {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--oc-green-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 800;
  color: var(--oc-green);
}

.oc-product__media-badge {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 5px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--oc-green-border);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--oc-green-dark);
  backdrop-filter: blur(6px);
}

.oc-product__name {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: var(--oc-text);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.oc-product__body {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.oc-product__headline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oc-product__desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--oc-text-2);
}

.oc-product__meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.oc-meta-item {
  padding: 16px 18px;
  border-radius: var(--oc-radius-sm);
  background: var(--oc-surface-2);
  border: 1px solid var(--oc-border);
}

.oc-meta-item--full {
  grid-column: 1 / -1;
}

.oc-meta-item__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--oc-text-3);
  margin-bottom: 8px;
}

.oc-meta-item__value {
  font-size: 20px;
  font-weight: 700;
  color: var(--oc-text);
  line-height: 1.35;
  letter-spacing: -0.02em;
}

.oc-meta-item__value--mono {
  font-family: 'JetBrains Mono', 'Fira Mono', 'Menlo', monospace;
  font-size: 12px;
  word-break: break-all;
  color: var(--oc-text-2);
}

/* ════════════════════════════════════════
   TOTALS CARD
════════════════════════════════════════ */
.oc-totals {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oc-totals__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: var(--oc-text-2);
}

.oc-totals__row strong {
  font-weight: 600;
  color: var(--oc-text);
}

.oc-totals__row--discount strong {
  color: var(--oc-green-dark) !important;
}

.oc-totals__divider {
  height: 1px;
  background: linear-gradient(to right, transparent, var(--oc-border), transparent);
  margin: 6px 0;
}

.oc-totals__row--final {
  font-size: 16px;
  font-weight: 700;
  color: var(--oc-text);
}

.oc-totals__final-amount {
  font-size: 26px !important;
  font-weight: 800 !important;
  color: var(--oc-text) !important;
  letter-spacing: -0.02em;
}

/* Applied Coupon Badge */
.oc-applied-coupon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: var(--oc-radius-sm);
  background: var(--oc-green-xlight);
  border: 1px solid var(--oc-green-border);
}

.oc-applied-coupon__left {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--oc-green);
}

.oc-applied-coupon__code {
  font-family: 'JetBrains Mono', 'Fira Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  color: var(--oc-text);
}

.oc-applied-coupon__meta {
  margin-top: 3px;
  font-size: 12px;
  color: var(--oc-text-2);
}

.oc-applied-coupon__badge {
  flex-shrink: 0;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--oc-green);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

/* ════════════════════════════════════════
   COUPON PANEL CARD
════════════════════════════════════════ */
.oc-card--coupon {
  border-style: dashed;
  background: var(--oc-surface-2);
}

.oc-coupon-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  color: var(--oc-text-3);
}

.oc-coupon-header__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--oc-text);
}

.oc-coupon-header__sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--oc-text-3);
  line-height: 1.5;
}

.oc-coupon-reveal {
  display: flex;
}

.oc-coupon-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oc-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--oc-text-2);
  letter-spacing: 0.04em;
}

.oc-coupon-input-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.oc-input {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--oc-border);
  background: #fff;
  color: var(--oc-text);
  font-size: 14px;
  font-weight: 500;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  letter-spacing: 0.04em;
}

.oc-input::placeholder { color: var(--oc-text-3); font-weight: 400; }

.oc-input:focus {
  border-color: var(--oc-green);
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12);
}

/* ════════════════════════════════════════
   CTA CARD
════════════════════════════════════════ */
.oc-card--cta {
  background: var(--oc-green-xlight);
  border: 1px solid var(--oc-green-border);
}

.oc-cta-summary {
  text-align: center;
  padding: 20px 0;
  margin-bottom: 20px;
  border-bottom: 1px dashed var(--oc-green-border);
}

.oc-cta-summary__label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--oc-green-dark);
  margin-bottom: 8px;
}

.oc-cta-summary__amount {
  font-size: 42px;
  font-weight: 800;
  color: var(--oc-text);
  letter-spacing: -0.03em;
  line-height: 1;
}

.oc-cta-summary__cadence {
  margin-top: 8px;
  font-size: 13px;
  color: var(--oc-text-2);
}

.oc-cta-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 14px;
  font-size: 12px;
  color: var(--oc-text-3);
}

.oc-cta-trust span {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* ════════════════════════════════════════
   BUTTONS
════════════════════════════════════════ */
.oc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease, opacity 0.15s;
}

.oc-btn--ghost {
  padding: 10px 20px;
  background: var(--oc-green-light);
  color: var(--oc-green-dark);
  border: 1px solid var(--oc-green-border);
  font-size: 13px;
}

.oc-btn--ghost:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
}

.oc-btn--apply {
  padding: 11px 20px;
  background: var(--oc-gradient);
  color: #fff;
  box-shadow: 0 6px 18px rgba(5, 150, 105, 0.25);
  white-space: nowrap;
  min-width: 90px;
}

.oc-btn--apply:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(5, 150, 105, 0.3);
  filter: brightness(1.04);
}

.oc-btn--apply:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.oc-btn--checkout {
  width: 100%;
  padding: 16px 24px;
  font-size: 16px;
  background: var(--oc-gradient);
  color: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(5, 150, 105, 0.28);
}

.oc-btn--checkout:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 18px 36px rgba(5, 150, 105, 0.35);
  filter: brightness(1.04);
}

.oc-btn--checkout:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.oc-btn--home {
  width: 100%;
  padding: 13px 24px;
  margin-top: 10px;
  background: rgba(15, 23, 42, 0.05);
  color: var(--oc-text-2);
  border: 1px solid var(--oc-border);
  border-radius: 14px;
  font-size: 14px;
}

.oc-btn--home:hover {
  background: rgba(15, 23, 42, 0.09);
  color: var(--oc-text);
}

/* ════════════════════════════════════════
   MESSAGES
════════════════════════════════════════ */
.oc-msg {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  line-height: 1.5;
  margin: 2px 0 0;
}

.oc-msg--success { color: var(--oc-green-dark); }
.oc-msg--error { color: #b91c1c; }

.oc-msg--block {
  padding: 12px 14px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  margin-bottom: 6px;
}

/* ════════════════════════════════════════
   SPINNER
════════════════════════════════════════ */
.oc-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(5, 150, 105, 0.25);
  border-top-color: var(--oc-green);
  border-radius: 50%;
  animation: oc-spin 0.6s linear infinite;
  flex-shrink: 0;
}

.oc-spinner--light {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
}

@keyframes oc-spin { to { transform: rotate(360deg); } }

/* ════════════════════════════════════════
   RESPONSIVE
════════════════════════════════════════ */
@media (max-width: 1100px) {
  .oc-grid {
    grid-template-columns: 1fr;
  }

  .oc-sidebar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .oc-card--cta {
    grid-column: 1 / -1;
  }
}

@media (max-width: 860px) {
  .oc-hero {
    grid-template-columns: 1fr;
    padding: 28px;
  }

  .oc-hero__patient-card {
    min-width: unset;
  }

  .oc-product__media {
    min-height: 200px;
  }
}

@media (max-width: 640px) {
  .oc-hero {
    padding: 22px;
  }

  .oc-card {
    padding: 20px;
  }

  .oc-sidebar {
    grid-template-columns: 1fr;
  }

  .oc-coupon-input-row {
    grid-template-columns: 1fr;
  }

  .oc-btn--apply {
    width: 100%;
  }

  .oc-cta-summary__amount {
    font-size: 34px;
  }

  .oc-product__meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
