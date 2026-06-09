<script setup>
import axios from 'axios'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  ADMIN_COUPONS_URL,
  ADMIN_PRODUCTS_SEARCH_SELECTION_URL,
  getAdminCouponDetailUrl,
} from '@/network/const'
import { getApiToken } from '@/store/authData'

const props = defineProps({
  couponId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['cancel', 'saved'])

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')

const productSearch = ref('')
const productSearchLoading = ref(false)
const productSearchResults = ref([])
const selectedProducts = ref([])
const pendingProductId = ref('')

let productSearchTimer = null

const couponTypeOptions = [
  { title: 'Percentage', value: 'percent' },
  { title: 'Fixed Amount', value: 'fixed' },
]

const couponScopeOptions = [
  { title: 'Global', value: 'global' },
  { title: 'Product Specific', value: 'product_specific' },
]

const couponAppliesToOptions = [
  { title: 'All Orders', value: 'all' },
  { title: 'One-Time Orders', value: 'one_time' },
  { title: 'Subscriptions', value: 'subscription' },
]

const createDraft = () => ({
  code: '',
  name: '',
  description: '',
  type: 'percent',
  value: '',
  scope: 'global',
  is_active: true,
  starts_at: '',
  expires_at: '',
  usage_limit_total: '',
  usage_limit_per_user: '',
  applies_to: 'all',
  first_order_only: false,
  min_order_amount: '',
  max_discount_amount: '',
})

const form = reactive(createDraft())

const isEditing = computed(() => Boolean(props.couponId))

const authHeaders = computed(() => ({
  Authorization: `Bearer ${getApiToken()}`,
  Accept: 'application/json',
}))

const couponValueAdornment = computed(() => ({
  prefix: form.type === 'fixed' ? '$' : undefined,
  suffix: form.type === 'percent' ? '%' : undefined,
}))

const selectedProductIds = computed(() => selectedProducts.value.map(product => product.id))

const productSearchResultOptions = computed(() => (
  productSearchResults.value.map(product => ({
    title: product.name,
    value: product.id,
    subtitle: product.slug,
  }))
))

const summaryItems = computed(() => [
  {
    label: 'Scope',
    value: form.scope === 'product_specific' ? 'Product-specific' : 'Global',
  },
  {
    label: 'Target',
    value: form.applies_to === 'subscription'
      ? 'Subscriptions'
      : form.applies_to === 'one_time'
        ? 'One-time orders'
        : 'All orders',
  },
  {
    label: 'Status',
    value: form.is_active ? 'Active' : 'Inactive',
  },
])

const normalizeRows = body => {
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body?.data?.data)) return body.data.data
  
  return []
}

const normalizeDateTimeForInput = value => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = number => String(number).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const normalizeDateTimeForApi = value => {
  if (!value) return undefined

  const raw = String(value).trim()
  if (!raw) return undefined

  return raw.includes('T') ? `${raw.replace('T', ' ')}:00` : raw
}

const normalizeProduct = item => ({
  id: item?.id,
  name: item?.name || item?.title || 'Unknown Product',
  slug: item?.slug || '',
})

const resetForm = () => {
  Object.assign(form, createDraft())
  productSearch.value = ''
  productSearchResults.value = []
  selectedProducts.value = []
  pendingProductId.value = ''
}

const applyCoupon = coupon => {
  resetForm()

  form.code = coupon?.code || ''
  form.name = coupon?.name || ''
  form.description = coupon?.description || ''
  form.type = coupon?.type || 'percent'
  form.value = coupon?.value ?? ''
  form.scope = coupon?.scope || 'global'
  form.is_active = coupon?.is_active !== false
  form.starts_at = normalizeDateTimeForInput(coupon?.starts_at)
  form.expires_at = normalizeDateTimeForInput(coupon?.expires_at)
  form.usage_limit_total = coupon?.usage_limit_total ?? ''
  form.usage_limit_per_user = coupon?.usage_limit_per_user ?? ''
  form.applies_to = coupon?.applies_to || 'all'
  form.first_order_only = !!coupon?.first_order_only
  form.min_order_amount = coupon?.min_order_amount ?? ''
  form.max_discount_amount = coupon?.max_discount_amount ?? ''
  selectedProducts.value = Array.isArray(coupon?.products)
    ? coupon.products.map(normalizeProduct).filter(product => product.id)
    : []
}

const fetchCoupon = async () => {
  if (!props.couponId) {
    resetForm()
    
    return
  }

  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const response = await axios.get(getAdminCouponDetailUrl(props.couponId), {
      headers: authHeaders.value,
    })

    applyCoupon(response?.data?.data || {})
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to load coupon.'
  } finally {
    loading.value = false
  }
}

const fetchProductSearchResults = async query => {
  const search = String(query || '').trim()

  if (search.length < 2) {
    productSearchResults.value = []
    productSearchLoading.value = false
    
    return
  }

  productSearchLoading.value = true
  try {
    const response = await axios.get(ADMIN_PRODUCTS_SEARCH_SELECTION_URL, {
      headers: authHeaders.value,
      params: {
        search,
        limit: 8,
      },
    })

    const selectedIds = new Set(selectedProductIds.value)

    productSearchResults.value = normalizeRows(response?.data)
      .map(normalizeProduct)
      .filter(product => product.id && !selectedIds.has(product.id))
  } catch {
    productSearchResults.value = []
  } finally {
    productSearchLoading.value = false
  }
}

const queueProductSearch = query => {
  clearTimeout(productSearchTimer)

  const search = String(query || '').trim()
  if (search.length < 2) {
    productSearchResults.value = []
    productSearchLoading.value = false
    
    return
  }

  productSearchLoading.value = true
  productSearchTimer = setTimeout(() => {
    fetchProductSearchResults(search)
  }, 320)
}

const addSelectedProduct = productId => {
  if (!productId) return

  const match = productSearchResults.value.find(product => product.id === productId)
  if (!match) return

  if (!selectedProducts.value.some(product => product.id === match.id))
    selectedProducts.value = [...selectedProducts.value, match]

  pendingProductId.value = ''
  productSearch.value = ''
  productSearchResults.value = []
}

const removeSelectedProduct = productId => {
  selectedProducts.value = selectedProducts.value.filter(product => product.id !== productId)
}

const buildPayload = () => ({
  code: String(form.code || '').trim().toUpperCase(),
  name: String(form.name || '').trim(),
  description: String(form.description || '').trim() || undefined,
  type: form.type,
  value: Number(form.value),
  scope: form.scope,
  is_active: !!form.is_active,
  starts_at: normalizeDateTimeForApi(form.starts_at),
  expires_at: normalizeDateTimeForApi(form.expires_at),
  usage_limit_total: form.usage_limit_total === '' ? undefined : Number(form.usage_limit_total),
  usage_limit_per_user: form.usage_limit_per_user === '' ? undefined : Number(form.usage_limit_per_user),
  applies_to: form.applies_to,
  first_order_only: !!form.first_order_only,
  min_order_amount: form.min_order_amount === '' ? undefined : Number(form.min_order_amount),
  max_discount_amount: form.max_discount_amount === '' ? undefined : Number(form.max_discount_amount),
  product_ids: form.scope === 'product_specific' ? selectedProductIds.value : [],
})

const validate = payload => {
  if (!payload.code || !payload.name)
    return 'Coupon code and name are required.'

  if (!Number.isFinite(payload.value) || payload.value <= 0)
    return 'Coupon value must be greater than 0.'

  if (payload.type === 'percent' && payload.value > 100)
    return 'Percent coupons cannot be greater than 100.'

  if (payload.scope === 'product_specific' && (!Array.isArray(payload.product_ids) || payload.product_ids.length === 0))
    return 'Select at least one product for a product-specific coupon.'

  if (payload.starts_at && payload.expires_at && payload.expires_at < payload.starts_at)
    return 'Expiry must be after the start date.'

  return ''
}

const saveCoupon = async () => {
  const payload = buildPayload()
  const validationError = validate(payload)

  if (validationError) {
    error.value = validationError
    message.value = ''
    
    return
  }

  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const response = isEditing.value
      ? await axios.put(getAdminCouponDetailUrl(props.couponId), payload, {
        headers: {
          ...authHeaders.value,
          'Content-Type': 'application/json',
        },
      })
      : await axios.post(ADMIN_COUPONS_URL, payload, {
        headers: {
          ...authHeaders.value,
          'Content-Type': 'application/json',
        },
      })

    message.value = response?.data?.message || `Coupon ${isEditing.value ? 'updated' : 'created'} successfully.`
    emit('saved')
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to save coupon.'
  } finally {
    saving.value = false
  }
}

watch(
  () => props.couponId,
  () => {
    fetchCoupon()
  },
  { immediate: true },
)

watch(productSearch, value => {
  queueProductSearch(value)
})

watch(
  () => form.scope,
  scope => {
    if (scope !== 'product_specific') {
      productSearch.value = ''
      productSearchResults.value = []
      pendingProductId.value = ''
    }
  },
)

onBeforeUnmount(() => {
  clearTimeout(productSearchTimer)
})
</script>

<template>
  <section class="coupon-editor">
    <div class="coupon-editor__header">
      <div>
        <h2 class="coupon-editor__title">
          {{ isEditing ? 'Edit Coupon' : 'Create Coupon' }}
        </h2>
        <p class="coupon-editor__subtitle">
          Configure the offer details, discount rules, scope, scheduling, and product targeting.
        </p>
      </div>

      <div class="coupon-editor__actions">
        <VBtn
          variant="text"
          prepend-icon="tabler-arrow-left"
          @click="$emit('cancel')"
        >
          Back to Coupons
        </VBtn>
        <VBtn
          color="primary"
          :loading="saving"
          prepend-icon="tabler-device-floppy"
          @click="saveCoupon"
        >
          {{ isEditing ? 'Update Coupon' : 'Create Coupon' }}
        </VBtn>
      </div>
    </div>

    <VAlert
      v-if="message"
      type="success"
      variant="tonal"
      class="mb-4"
      closable
    >
      {{ message }}
    </VAlert>
    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
    >
      {{ error }}
    </VAlert>

    <div
      v-if="loading"
      class="coupon-editor__loading"
    >
      <VProgressCircular
        indeterminate
        color="primary"
      />
    </div>

    <template v-else>
      <div class="coupon-editor__hero">
        <div class="coupon-editor__hero-copy">
          <div class="coupon-editor__eyebrow">
            Coupon Setup
          </div>
          <div class="coupon-editor__hero-title-row">
            <h3 class="coupon-editor__hero-title">
              {{ form.name || 'Untitled Coupon' }}
            </h3>
            <span class="coupon-editor__hero-code">{{ form.code || 'CODE' }}</span>
          </div>
          <p class="coupon-editor__hero-text">
            Use the grouped form below to define coupon identity, discount rules, scope, and product eligibility.
          </p>
        </div>

        <div class="coupon-editor__summary">
          <div
            v-for="item in summaryItems"
            :key="item.label"
            class="coupon-editor__summary-item"
          >
            <span class="coupon-editor__summary-label">{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>

      <div class="coupon-editor__grid">
        <section class="coupon-editor__card">
          <div class="coupon-editor__card-header">
            <div>
              <h4 class="coupon-editor__card-title">
                Coupon Details
              </h4>
              <p class="coupon-editor__card-subtitle">
                Core identity fields for the coupon record.
              </p>
            </div>
          </div>

          <VRow>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="form.code"
                label="Coupon Code"
                placeholder="SAVE15"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="8"
            >
              <VTextField
                v-model="form.name"
                label="Coupon Name"
                placeholder="Summer Save 15"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.description"
                label="Description"
                placeholder="Optional internal or customer-facing description"
                variant="outlined"
                rows="3"
              />
            </VCol>
          </VRow>
        </section>

        <section class="coupon-editor__card">
          <div class="coupon-editor__card-header">
            <div>
              <h4 class="coupon-editor__card-title">
                Discount Values
              </h4>
              <p class="coupon-editor__card-subtitle">
                Choose the discount model and order-level rules.
              </p>
            </div>
          </div>

          <VRow>
            <VCol
              cols="12"
              md="3"
            >
              <VSelect
                v-model="form.type"
                :items="couponTypeOptions"
                item-title="title"
                item-value="value"
                label="Discount Type"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                v-model="form.value"
                :prefix="couponValueAdornment.prefix"
                :suffix="couponValueAdornment.suffix"
                label="Discount Value"
                type="number"
                min="0"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                v-model="form.min_order_amount"
                label="Minimum Order Amount"
                prefix="$"
                type="number"
                min="0"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                v-model="form.max_discount_amount"
                label="Maximum Discount Amount"
                prefix="$"
                type="number"
                min="0"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VSelect
                v-model="form.applies_to"
                :items="couponAppliesToOptions"
                item-title="title"
                item-value="value"
                label="Applies To"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VSwitch
                v-model="form.first_order_only"
                label="First Order Only"
                color="primary"
                inset
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VSwitch
                v-model="form.is_active"
                label="Active"
                color="primary"
                inset
              />
            </VCol>
          </VRow>
        </section>

        <section class="coupon-editor__card">
          <div class="coupon-editor__card-header">
            <div>
              <h4 class="coupon-editor__card-title">
                Scope & Product Targeting
              </h4>
              <p class="coupon-editor__card-subtitle">
                Switch between global coverage and selected products.
              </p>
            </div>
          </div>

          <VRow>
            <VCol
              cols="12"
              md="4"
            >
              <VSelect
                v-model="form.scope"
                :items="couponScopeOptions"
                item-title="title"
                item-value="value"
                label="Coupon Scope"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="8"
            >
              <VAlert
                :color="form.scope === 'product_specific' ? 'warning' : 'info'"
                variant="tonal"
              >
                {{
                  form.scope === 'product_specific'
                    ? 'This coupon will only work for selected products. Search and add products below.'
                    : 'This coupon applies globally. Product assignments are ignored when the scope is global.'
                }}
              </VAlert>
            </VCol>
          </VRow>

          <div
            v-if="form.scope === 'product_specific'"
            class="coupon-editor__product-picker"
          >
            <div class="coupon-editor__product-picker-header">
              <div class="coupon-editor__picker-title">
                Product Selector
              </div>
              <div class="coupon-editor__picker-subtitle">
                Type at least 2 characters to search by name or slug.
              </div>
            </div>

            <VAutocomplete
              v-model="pendingProductId"
              v-model:search="productSearch"
              :items="productSearchResultOptions"
              item-title="title"
              item-value="value"
              label="Search Products"
              placeholder="Search semaglutide, tirzepatide, nad-plus..."
              variant="outlined"
              hide-no-data
              no-filter
              clearable
              :loading="productSearchLoading"
              :menu-props="{ maxHeight: 320 }"
              @update:model-value="addSelectedProduct"
            >
              <template #item="{ props: itemProps, item }">
                <VListItem
                  v-bind="itemProps"
                  :title="item.raw.title"
                  :subtitle="item.raw.subtitle"
                />
              </template>
            </VAutocomplete>

            <div
              v-if="selectedProducts.length"
              class="coupon-editor__selected-products"
            >
              <div class="coupon-editor__selected-title">
                Selected Products
              </div>
              <div class="coupon-editor__selected-list">
                <div
                  v-for="product in selectedProducts"
                  :key="product.id"
                  class="coupon-editor__selected-item"
                >
                  <div>
                    <div class="coupon-editor__selected-name">
                      {{ product.name }}
                    </div>
                    <div class="coupon-editor__selected-slug">
                      {{ product.slug || product.id }}
                    </div>
                  </div>
                  <VBtn
                    icon="tabler-x"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="removeSelectedProduct(product.id)"
                  />
                </div>
              </div>
            </div>

            <div
              v-else
              class="coupon-editor__selected-empty"
            >
              No products selected yet.
            </div>
          </div>
        </section>

        <section class="coupon-editor__card">
          <div class="coupon-editor__card-header">
            <div>
              <h4 class="coupon-editor__card-title">
                Scheduling & Usage Limits
              </h4>
              <p class="coupon-editor__card-subtitle">
                Set availability windows and redemption limits.
              </p>
            </div>
          </div>

          <VRow>
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                v-model="form.starts_at"
                label="Starts At"
                type="datetime-local"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                v-model="form.expires_at"
                label="Expires At"
                type="datetime-local"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                v-model="form.usage_limit_total"
                label="Total Usage Limit"
                type="number"
                min="1"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                v-model="form.usage_limit_per_user"
                label="Usage Limit Per User"
                type="number"
                min="1"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </section>
      </div>
    </template>
  </section>
</template>

<style scoped>
.coupon-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.coupon-editor__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.coupon-editor__title {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 700;
}

.coupon-editor__subtitle {
  margin: 0.35rem 0 0;
  max-width: 720px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.coupon-editor__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.coupon-editor__loading {
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.coupon-editor__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.9fr);
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 22px;
  background:
    radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.12), transparent 28%),
    linear-gradient(135deg, rgba(var(--v-theme-surface), 1), rgba(var(--v-theme-primary), 0.03));
  box-shadow: 0 1px 6px rgba(var(--v-shadow-key-umbra-color), 0.05);
}

.coupon-editor__hero-copy {
  min-width: 0;
}

.coupon-editor__eyebrow {
  margin-bottom: 0.65rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}

.coupon-editor__hero-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.coupon-editor__hero-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
}

.coupon-editor__hero-code {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-family: 'JetBrains Mono', 'Fira Mono', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.coupon-editor__hero-text {
  margin: 0.9rem 0 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  line-height: 1.7;
}

.coupon-editor__summary {
  display: grid;
  gap: 0.75rem;
}

.coupon-editor__summary-item {
  padding: 0.9rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 0.92);
}

.coupon-editor__summary-label {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
}

.coupon-editor__summary-item strong {
  font-size: 0.95rem;
}

.coupon-editor__grid {
  display: grid;
  gap: 1rem;
}

.coupon-editor__card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 20px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 1px 6px rgba(var(--v-shadow-key-umbra-color), 0.05);
  padding: 1.25rem;
}

.coupon-editor__card-header {
  margin-bottom: 1rem;
}

.coupon-editor__card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.coupon-editor__card-subtitle {
  margin: 0.3rem 0 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.86rem;
}

.coupon-editor__product-picker {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 18px;
  background: rgba(var(--v-theme-on-surface), 0.025);
  border: 1px dashed rgba(var(--v-border-color), calc(var(--v-border-opacity) * 1.2));
}

.coupon-editor__product-picker-header {
  margin-bottom: 0.9rem;
}

.coupon-editor__picker-title {
  font-weight: 700;
}

.coupon-editor__picker-subtitle {
  margin-top: 0.25rem;
  font-size: 0.82rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.coupon-editor__selected-products {
  margin-top: 1rem;
}

.coupon-editor__selected-title {
  margin-bottom: 0.7rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.coupon-editor__selected-list {
  display: grid;
  gap: 0.7rem;
}

.coupon-editor__selected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.coupon-editor__selected-name {
  font-weight: 600;
}

.coupon-editor__selected-slug {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity));
}

.coupon-editor__selected-empty {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.88rem;
}

@media (max-width: 960px) {
  .coupon-editor__hero {
    grid-template-columns: 1fr;
  }
}
</style>
