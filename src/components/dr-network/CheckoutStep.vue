<script setup>
import { computed, ref, watch } from 'vue'
import CheckoutOrderConfirmation from '@/components/dr-network/CheckoutOrderConfirmation.vue'
import { devLog } from '@/utils/devLogger'

const props = defineProps({
  orderUuid: {
    type: String,
    required: true,
  },
  journey: {
    type: Object,
    default: null,
  },
})

const appliedOrderState = ref(null)

const pickFirst = (...values) => values.find(value => value !== null && value !== undefined && value !== '')

const debugCheckoutStep = (event, payload = {}) => {
  if (!import.meta.env.DEV) return

  devLog(`Journey checkout step ${event}`, payload)

  if (typeof console !== 'undefined') {
    console.groupCollapsed(`[Journey Checkout Step] ${event}`)
    console.log(payload)
    console.groupEnd()
  }
}

const normalizeConfirmationData = journey => {
  const source = journey || {}

  const summary = source.checkout
    || source.checkout_summary
    || source.order_summary
    || source.confirmation
    || source.data
    || source

  const sourceOrder = summary.order || source.order || {}

  const order = {
    ...sourceOrder,
    order_uuid: pickFirst(sourceOrder.order_uuid, source.order_uuid, props.orderUuid),
    status: pickFirst(sourceOrder.status, source.order_status),
    payment_status: pickFirst(sourceOrder.payment_status, source.payment_status),
    purchase_type: pickFirst(sourceOrder.purchase_type, source.purchase_type),
    pricing_type: pickFirst(sourceOrder.pricing_type, source.pricing_type),
    base_amount: pickFirst(sourceOrder.base_amount, source.base_amount),
    coupon_discount_amount: pickFirst(sourceOrder.coupon_discount_amount, source.coupon_discount_amount),
    final_amount: pickFirst(sourceOrder.final_amount, source.final_amount, source.total_due),
    price: pickFirst(sourceOrder.price, source.price, source.total_due),
    currency: pickFirst(sourceOrder.currency, source.currency, 'USD'),
    frequency_months: pickFirst(sourceOrder.frequency_months, source.frequency_months),
    pricing_option: sourceOrder.pricing_option || source.pricing_option || summary.pricing_option || {},
    coupon: sourceOrder.coupon || source.coupon || summary.coupon || null,
  }

  return {
    patient: summary.patient || source.patient || sourceOrder.patient || {},
    product: summary.product || source.product || sourceOrder.product || {},
    order,
  }
}

const confirmationData = computed(() => appliedOrderState.value || normalizeConfirmationData(props.journey))

const confirmationMessage = computed(() => (
  props.journey?.message
  || 'Your patient information has been saved. Review your treatment selection and order totals below before proceeding to checkout.'
))

const updateOrderState = value => {
  appliedOrderState.value = value || null
  debugCheckoutStep('coupon-updated-confirmation-data', {
    orderUuid: props.orderUuid,
    updatedConfirmationData: value,
  })
}

watch(
  () => props.journey,
  value => {
    appliedOrderState.value = null
    debugCheckoutStep('journey-payload-received', {
      orderUuid: props.orderUuid,
      journey: value,
      normalizedConfirmationData: normalizeConfirmationData(value),
    })
  },
  { immediate: true },
)
</script>

<template>
  <CheckoutOrderConfirmation
    :confirmation-data="confirmationData"
    :confirmation-message="confirmationMessage"
    :order-uuid="orderUuid"
    @updated="updateOrderState"
  />
</template>
