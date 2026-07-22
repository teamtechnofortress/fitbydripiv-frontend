<script setup>
import axios from 'axios'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CHECKOUT_APPLY_COUPON_URL, CHECKOUT_CREATE_URL, SERVER_DOMAIN } from '@/network/const'
import { devLog } from '@/utils/devLogger'
import DrNetworkStepShell from './DrNetworkStepShell.vue'

const props = defineProps({
  confirmationData: {
    type: Object,
    default: null,
  },
  confirmationMessage: {
    type: String,
    default: '',
  },
  orderUuid: {
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
const imageLoadFailed = ref(false)

const debugCheckoutConfirmation = (event, payload = {}) => {
  if (!import.meta.env.DEV) return

  devLog(`Checkout confirmation ${event}`, payload)

  if (typeof console !== 'undefined') {
    console.groupCollapsed(`[Checkout Confirmation] ${event}`)
    console.log(payload)
    console.groupEnd()
  }
}

watch(
  () => props.confirmationData,
  value => {
    orderState.value = value || null
    couponCode.value = ''
    couponFieldVisible.value = false
    couponSuccess.value = ''
    couponError.value = ''
    checkoutError.value = ''
    debugCheckoutConfirmation('props-confirmation-data', {
      confirmationData: value,
    })
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

const resolveImageUrl = value => {
  if (!value || typeof value !== 'string') return ''

  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^(https?:)?\/\//i.test(trimmed) || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return `${SERVER_DOMAIN}${trimmed}`
  if (trimmed.startsWith('storage/')) return `${SERVER_DOMAIN}/${trimmed}`

  return `${SERVER_DOMAIN}/storage/${trimmed.replace(/^public\//, '').replace(/^\/+/, '')}`
}

const productImage = computed(() => {
  const directImage = product.value?.landscape_image || product.value?.featured_image || product.value?.cover_image_url
  if (directImage) return resolveImageUrl(directImage)

  const coverImage = product.value?.cover_image?.image_url || product.value?.cover_image?.url || product.value?.cover_image?.path
  if (coverImage) return resolveImageUrl(coverImage)

  const coverGalleryImage = productImages.value.find(image => image?.image_type === 'cover' && (image?.image_url || image?.url || image?.path || image?.upload_path))
  if (coverGalleryImage)
    return resolveImageUrl(coverGalleryImage.image_url || coverGalleryImage.url || coverGalleryImage.path || coverGalleryImage.upload_path)

  const fallbackGalleryImage = productImages.value.find(image => image?.image_url || image?.url || image?.path || image?.upload_path)

  return resolveImageUrl(fallbackGalleryImage?.image_url || fallbackGalleryImage?.url || fallbackGalleryImage?.path || fallbackGalleryImage?.upload_path)
})

const shellOrderUuid = computed(() => props.orderUuid || order.value?.order_uuid || '')

watch(productImage, () => {
  imageLoadFailed.value = false
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

  const requestPayload = { order_uuid: order.value?.order_uuid, coupon_code: code }

  debugCheckoutConfirmation('apply-coupon-request', {
    url: CHECKOUT_APPLY_COUPON_URL,
    payload: requestPayload,
  })

  try {
    const { data } = await axios.post(
      CHECKOUT_APPLY_COUPON_URL,
      requestPayload,
      { headers: { Accept: 'application/json' } },
    )

    const payload = data?.data || null

    debugCheckoutConfirmation('apply-coupon-response', {
      url: CHECKOUT_APPLY_COUPON_URL,
      response: data,
      resolvedPayload: payload,
    })

    if (payload) {
      orderState.value = payload
      emit('updated', payload)
    }
    couponSuccess.value = data?.message || 'Coupon applied successfully.'
    couponError.value = ''
    couponCode.value = ''
    couponFieldVisible.value = false
  } catch (error) {
    const responseData = error?.response?.data
    const couponErrors = responseData?.errors?.coupon_code

    debugCheckoutConfirmation('apply-coupon-error', {
      url: CHECKOUT_APPLY_COUPON_URL,
      payload: requestPayload,
      status: error?.response?.status,
      response: responseData,
      message: error?.message,
    })

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

  const requestPayload = { order_uuid: currentOrderUuid }

  debugCheckoutConfirmation('create-checkout-request', {
    url: CHECKOUT_CREATE_URL,
    payload: requestPayload,
  })

  try {
    const { data } = await axios.post(
      CHECKOUT_CREATE_URL,
      requestPayload,
      { headers: { Accept: 'application/json' } },
    )

    const checkoutUrl = data?.checkout_url

    debugCheckoutConfirmation('create-checkout-response', {
      url: CHECKOUT_CREATE_URL,
      response: data,
      checkoutUrl,
    })

    if (!checkoutUrl) {
      checkoutError.value = 'Checkout URL was not returned. Please try again.'

      return
    }
    window.location.href = checkoutUrl
  } catch (error) {
    const responseData = error?.response?.data
    const orderErrors = responseData?.errors?.order_uuid

    debugCheckoutConfirmation('create-checkout-error', {
      url: CHECKOUT_CREATE_URL,
      payload: requestPayload,
      status: error?.response?.status,
      response: responseData,
      message: error?.message,
    })

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
  <DrNetworkStepShell
    badge="Checkout"
    title="Review your order"
    :subtitle="confirmationMessage || 'Confirm your treatment selection and payment details before continuing.'"
    :order-uuid="shellOrderUuid"
  >
    <section class="checkout-review">
      <article class="checkout-card">
        <header class="checkout-card__header">
          <div>
            <p class="checkout-eyebrow">
              Payment summary
            </p>
            <h2>Order details</h2>
          </div>

          <div class="total-pill">
            <span>Payment status</span>
            <strong>{{ prettyLabel(order.payment_status) }}</strong>
          </div>
        </header>

        <div class="checkout-layout">
          <div class="checkout-main">
            <section class="checkout-product">
              <div class="product-media">
                <img
                  v-if="productImage && !imageLoadFailed"
                  :src="productImage"
                  :alt="product.name || 'Selected product'"
                  @error="imageLoadFailed = true"
                >
                <div
                  v-else
                  class="product-media__fallback"
                >
                  Rx
                </div>
              </div>

              <div class="product-copy">
                <span
                  v-if="product.category"
                  class="micro-pill"
                >
                  {{ prettyLabel(product.category) }}
                </span>
                <h3>{{ product.name || 'Selected treatment' }}</h3>
                <p>{{ product.description || 'Your prescription treatment is ready for secure checkout.' }}</p>
              </div>
            </section>

            <div class="compact-grid">
              <section class="info-panel">
                <div class="panel-title">
                  <span>Patient</span>
                  <strong>{{ patientName }}</strong>
                </div>
                <div class="detail-row">
                  <span>Email</span>
                  <strong>{{ patient.email || '—' }}</strong>
                </div>
                <div class="detail-row">
                  <span>Phone</span>
                  <strong>{{ patient.phone || '—' }}</strong>
                </div>
              </section>

              <section class="info-panel">
                <div class="panel-title">
                  <span>Plan</span>
                  <strong>{{ prettyLabel(order.purchase_type || order.pricing_type) }}</strong>
                </div>
                <div class="detail-row">
                  <span>Cadence</span>
                  <strong>{{ cadenceLabel }}</strong>
                </div>
                <div class="detail-row">
                  <span>Status</span>
                  <strong>{{ prettyLabel(order.payment_status) }}</strong>
                </div>
              </section>
            </div>
          </div>

          <aside class="payment-panel">
            <section class="totals-panel">
              <div class="payment-panel__headline">
                <span>Amount due</span>
                <strong>{{ formatMoney(finalAmount, currency) }}</strong>
              </div>

              <div class="total-row">
                <span>Subtotal</span>
                <strong>{{ formatMoney(baseAmount || finalAmount, currency) }}</strong>
              </div>
              <div
                v-if="pricingDiscountAmount > 0"
                class="total-row total-row--discount"
              >
                <span>Plan discount</span>
                <strong>-{{ formatMoney(pricingDiscountAmount, currency) }}</strong>
              </div>
              <div
                v-if="couponDiscountAmount > 0"
                class="total-row total-row--discount"
              >
                <span>Coupon discount</span>
                <strong>-{{ formatMoney(couponDiscountAmount, currency) }}</strong>
              </div>
              <div class="total-row total-row--final">
                <span>Total due today</span>
                <strong>{{ formatMoney(finalAmount, currency) }}</strong>
              </div>
            </section>

            <section class="coupon-panel">
              <div class="coupon-panel__header">
                <div>
                  <p class="checkout-eyebrow">
                    Coupon
                  </p>
                  <h3>{{ coupon ? 'Coupon applied' : 'Have a code?' }}</h3>
                </div>

                <button
                  v-if="!coupon && !couponFieldVisible"
                  type="button"
                  class="text-action"
                  @click="couponFieldVisible = true"
                >
                  Add
                </button>
              </div>

              <div
                v-if="coupon"
                class="applied-coupon"
              >
                <span>{{ coupon.code || coupon.coupon_code }}</span>
                <strong>-{{ formatMoney(couponDiscountAmount, currency) }}</strong>
              </div>

              <form
                v-else-if="couponFieldVisible"
                class="coupon-form"
                @submit.prevent="applyCoupon"
              >
                <label for="checkout-coupon-code">Coupon code</label>
                <div class="coupon-form__row">
                  <input
                    id="checkout-coupon-code"
                    v-model="couponCode"
                    type="text"
                    placeholder="Enter code"
                    autocomplete="off"
                    :disabled="couponLoading"
                  >
                  <button
                    type="submit"
                    class="apply-btn"
                    :disabled="couponLoading || !couponCode.trim()"
                  >
                    <span
                      v-if="couponLoading"
                      class="spinner"
                      aria-hidden="true"
                    />
                    {{ couponLoading ? 'Applying...' : 'Apply' }}
                  </button>
                </div>
              </form>

              <p
                v-if="couponSuccess"
                class="inline-message inline-message--success"
              >
                {{ couponSuccess }}
              </p>
              <p
                v-if="couponError"
                class="inline-message inline-message--error"
              >
                {{ couponError }}
              </p>
            </section>

            <p
              v-if="checkoutError"
              class="inline-message inline-message--error inline-message--block"
            >
              {{ checkoutError }}
            </p>

            <footer class="checkout-actions">
              <button
                type="button"
                class="primary-btn"
                :disabled="checkoutLoading"
                @click="proceedToCheckout"
              >
                <span
                  v-if="checkoutLoading"
                  class="spinner spinner--light"
                  aria-hidden="true"
                />
                {{ checkoutLoading ? 'Preparing checkout...' : 'Proceed to checkout' }}
              </button>
              <button
                type="button"
                class="secondary-btn"
                @click="goHome"
              >
                Return home
              </button>
            </footer>
          </aside>
        </div>
      </article>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.checkout-review {
  --accent: #0071e3;
  --accent-soft: rgba(0, 113, 227, 0.1);
  --accent-soft-2: rgba(0, 113, 227, 0.06);
  --success: #0a7f45;
  --success-soft: rgba(52, 199, 89, 0.12);
  --danger: #d92d20;
  --danger-soft: rgba(255, 59, 48, 0.08);
  --ink: #1d1d1f;
  --muted: #637098;
  --line: #e4e8f5;
  --surface: #ffffff;
  --surface-soft: #f7f7fb;
  --radius-lg: 22px;
  --radius-md: 14px;
  --radius-sm: 10px;
  --shadow: 0 18px 48px rgba(26, 38, 74, 0.08), 0 2px 10px rgba(26, 38, 74, 0.04);
  width: min(1100px, 100%);
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
}

.checkout-card {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  animation: checkout-card-in 0.34s cubic-bezier(0.28, 0.11, 0.32, 1) both;
}

@keyframes checkout-card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.checkout-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.3rem 1.4rem 1.1rem;
  border-bottom: 1px solid var(--line);
}

.checkout-eyebrow {
  margin: 0 0 0.35rem;
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  line-height: 1.1;
  text-transform: uppercase;
}

h2,
h3,
p {
  margin: 0;
}

.checkout-card__header h2 {
  color: var(--ink);
  font-size: 1.18rem;
  font-weight: 650;
  line-height: 1.2;
}

.total-pill {
  display: inline-flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  min-width: 156px;
  padding: 0.65rem 0.85rem;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.total-pill span {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 560;
}

.total-pill strong {
  color: var(--ink);
  font-size: 1.15rem;
  font-weight: 720;
  line-height: 1.1;
}

.checkout-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(330px, 360px);
  gap: 1.05rem;
  padding: 1.15rem;
  align-items: start;
}

.checkout-main,
.payment-panel {
  display: grid;
  gap: 0.9rem;
  min-width: 0;
}

.payment-panel {
  position: sticky;
  top: 1rem;
}

.checkout-product {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  gap: 1rem;
  min-height: 166px;
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.product-media {
  position: relative;
  display: grid;
  overflow: hidden;
  width: 148px;
  aspect-ratio: 1;
  place-items: center;
  background: #f8f9fc;
  border: 1px solid var(--line);
  border-radius: 18px;
}

.product-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-media__fallback {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 720;
  background: var(--accent-soft);
  border-radius: 12px;
}

.product-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
}

.micro-pill {
  align-self: flex-start;
  margin-bottom: 0.55rem;
  padding: 0.32rem 0.58rem;
  color: var(--accent);
  font-size: 0.7rem;
  font-weight: 650;
  line-height: 1;
  background: var(--accent-soft);
  border-radius: 999px;
}

.product-copy h3 {
  color: var(--ink);
  font-size: 1.16rem;
  font-weight: 650;
  line-height: 1.22;
}

.product-copy p {
  max-width: 560px;
  margin-top: 0.36rem;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.45;
}

.compact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.info-panel,
.totals-panel,
.coupon-panel {
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.info-panel,
.totals-panel {
  overflow: hidden;
}

.panel-title,
.detail-row,
.total-row,
.applied-coupon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.panel-title {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--line);
}

.detail-row {
  padding: 0.76rem 1rem;
}

.detail-row + .detail-row {
  border-top: 1px solid var(--line);
}

.panel-title span,
.detail-row span,
.total-row span,
.applied-coupon span,
.payment-panel__headline span {
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 560;
}

.panel-title strong,
.detail-row strong,
.total-row strong,
.applied-coupon strong {
  min-width: 0;
  overflow: hidden;
  color: var(--ink);
  font-size: 0.84rem;
  font-weight: 650;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-panel__headline {
  display: grid;
  gap: 0.1rem;
  padding: 1rem;
  background: #ffffff;
  border-bottom: 1px solid var(--line);
}

.payment-panel__headline strong {
  color: var(--ink);
  font-size: 1.72rem;
  font-weight: 740;
  line-height: 1.05;
  letter-spacing: 0;
}

.totals-panel {
  background: #ffffff;
}

.total-row {
  padding: 0.72rem 1rem;
}

.total-row + .total-row {
  border-top: 1px solid var(--line);
}

.total-row--discount strong {
  color: var(--success);
}

.total-row--final {
  background: var(--surface-soft);
}

.total-row--final span,
.total-row--final strong {
  color: var(--ink);
  font-size: 0.98rem;
  font-weight: 720;
}

.coupon-panel {
  padding: 0.95rem;
}

.coupon-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.coupon-panel__header h3 {
  color: var(--ink);
  font-size: 0.98rem;
  font-weight: 650;
}

.text-action {
  flex: 0 0 auto;
  padding: 0.5rem 0.75rem;
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 650;
  line-height: 1;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.text-action:hover {
  background: var(--accent-soft-2);
  border-color: rgba(0, 113, 227, 0.24);
  transform: translateY(-1px);
}

.applied-coupon {
  margin-top: 0.75rem;
  padding: 0.78rem 0.85rem;
  color: var(--success);
  background: var(--success-soft);
  border-radius: var(--radius-sm);
}

.coupon-form {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.coupon-form label {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 650;
}

.coupon-form__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.55rem;
}

.coupon-form input {
  width: 100%;
  min-width: 0;
  height: 44px;
  padding: 0 0.9rem;
  color: var(--ink);
  font-size: 0.92rem;
  font-weight: 520;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 13px;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.coupon-form input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.12);
}

.apply-btn,
.primary-btn,
.secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.92rem;
  font-weight: 680;
  line-height: 1;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.apply-btn,
.primary-btn {
  color: #fff;
  background: var(--accent);
  box-shadow: 0 10px 22px rgba(0, 113, 227, 0.18);
}

.apply-btn {
  min-width: 92px;
  padding: 0 0.9rem;
}

.primary-btn,
.secondary-btn {
  width: 100%;
}

.secondary-btn {
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--line);
}

.apply-btn:hover:not(:disabled),
.primary-btn:hover:not(:disabled) {
  background: #0068d6;
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(0, 113, 227, 0.22);
}

.secondary-btn:hover {
  background: var(--surface-soft);
  border-color: rgba(0, 113, 227, 0.2);
  transform: translateY(-1px);
}

.apply-btn:disabled,
.primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  transform: none;
  box-shadow: none;
}

.inline-message {
  margin-top: 0.65rem;
  padding: 0.7rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 620;
  line-height: 1.35;
  border-radius: var(--radius-sm);
}

.inline-message--success {
  color: var(--success);
  background: var(--success-soft);
}

.inline-message--error {
  color: var(--danger);
  background: var(--danger-soft);
}

.inline-message--block {
  margin: 0;
}

.checkout-actions {
  display: grid;
  gap: 0.62rem;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 113, 227, 0.2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: checkout-spin 0.65s linear infinite;
}

.spinner--light {
  border-color: rgba(255, 255, 255, 0.32);
  border-top-color: #fff;
}

@keyframes checkout-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .checkout-layout {
    grid-template-columns: 1fr;
  }

  .payment-panel {
    position: static;
  }
}

@media (max-width: 720px) {
  .checkout-card__header {
    flex-direction: column;
    align-items: stretch;
    padding: 1.1rem 1rem;
  }

  .checkout-layout {
    padding: 1rem;
  }

  .total-pill {
    width: 100%;
    min-width: 0;
    align-items: flex-start;
  }

  .checkout-product,
  .compact-grid {
    grid-template-columns: 1fr;
  }

  .product-media {
    width: 100%;
    max-height: 180px;
    aspect-ratio: 16 / 9;
  }

  .coupon-form__row {
    grid-template-columns: 1fr;
  }

  .apply-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .checkout-card {
    border-radius: 18px;
  }

  .checkout-layout {
    padding: 0.85rem;
  }

  .checkout-product {
    padding: 0.85rem;
  }

  .panel-title,
  .detail-row,
  .total-row,
  .applied-coupon {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.28rem;
  }

  .panel-title strong,
  .detail-row strong,
  .total-row strong,
  .applied-coupon strong {
    max-width: 100%;
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .checkout-card,
  .spinner {
    animation: none;
  }
}
</style>
