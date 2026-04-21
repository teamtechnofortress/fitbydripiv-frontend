<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  ADMIN_PRODUCTS_DRAFTS_URL,
  ADMIN_PRODUCTS_LIST_URL,
  getAdminProductDeleteUrl,
  getAdminProductPublishUrl,
  getAdminProductUnpublishUrl,
} from '@/network/const'
import { getApiToken } from '@/store/authData'

const props = defineProps({
  mode: {
    type: String,
    default: 'all',
  },
  hideNavigation: {
    type: Boolean,
    default: false,
  },
  completedOnly: {
    type: Boolean,
    default: false,
  },
})

const router = useRouter()
const toast = useToast()
const isDraftMode = computed(() => props.mode === 'drafts')
const endpoint = computed(() => (isDraftMode.value ? ADMIN_PRODUCTS_DRAFTS_URL : ADMIN_PRODUCTS_LIST_URL))

const categoryOptions = [
  { title: 'All Categories', value: '' },
  { title: 'Weight Loss', value: 'weight_loss' },
  { title: 'Wellness', value: 'wellness' },
  { title: 'Longevity', value: 'longevity' },
]

const statusOptions = [
  { title: 'All', value: '' },
  { title: 'Published', value: '1' },
  { title: 'Unpublished', value: '0' },
]

const featureOptions = [
  { title: 'All', value: '' },
  { title: 'Featured', value: '1' },
  { title: 'Not Featured', value: '0' },
]

const filters = reactive({
  search: '',
  category: '',
  per_page: 10,
  page: 1,
  is_published: '',
  is_featured: '',
})

const loading = ref(false)
const deleteDialog = ref(false)
const deleting = ref(false)
const pendingDeleteProduct = ref(null)
const publishActionId = ref('')
const products = ref([])
const meta = ref({
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
})
const filteredProducts = computed(() => {
  if (!props.completedOnly)
    return products.value

  return products.value.filter(item => item?.completion_status === 'complete')
})

const getAuthHeaders = () => {
  const token = getApiToken()
  if (!token) throw new Error('Authentication token missing. Please login again.')
  return { Authorization: `Bearer ${token}` }
}

const normalizeRows = body => {
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body?.data?.data)) return body.data.data
  return []
}

const normalizeMeta = body => (
  body?.meta
  || body?.data?.meta
  || {
    current_page: filters.page,
    last_page: 1,
    per_page: filters.per_page,
    total: normalizeRows(body).length,
    from: normalizeRows(body).length ? 1 : 0,
    to: normalizeRows(body).length,
  }
)

const fetchProducts = async () => {
  loading.value = true
  try {
    const params = {
      search: filters.search || undefined,
      category: filters.category || undefined,
      per_page: filters.per_page,
      page: filters.page,
    }

    if (!isDraftMode.value) {
      params.is_published = filters.is_published || undefined
      params.is_featured = filters.is_featured || undefined
    }

    const response = await axios.get(endpoint.value, {
      headers: getAuthHeaders(),
      params,
    })

    const body = response?.data || {}
    products.value = normalizeRows(body)
    meta.value = {
      ...meta.value,
      ...normalizeMeta(body),
    }
  } catch (error) {
    toast.error(error?.response?.data?.message || error?.message || 'Unable to load products.')
  } finally {
    loading.value = false
  }
}

const getCoverImage = item => (
  item?.cover_image?.image_url
  || item?.cover_image?.url
  || item?.cover_image_url
  || item?.cover_image?.path
  || ''
)

const getCategoryLabel = item => (
  item?.category?.name
  || item?.category_name
  || item?.category_label
  || item?.category
  || 'Uncategorized'
)

const goToDrafts = () => {
  router.push('/admin/products?section=drafts')
}

const goToProducts = () => {
  router.push('/admin/products')
}

const openProduct = item => {
  if (!item?.id) return
  router.push({
    path: `/admin/products/${item.id}`,
    query: { section: 'add' },
  })
}

const promptDeleteProduct = item => {
  if (!item?.id) return
  pendingDeleteProduct.value = item
  deleteDialog.value = true
}

const closeDeleteDialog = () => {
  deleteDialog.value = false
  pendingDeleteProduct.value = null
}

const deleteProduct = async () => {
  if (!pendingDeleteProduct.value?.id) return

  deleting.value = true
  try {
    const response = await axios.delete(getAdminProductDeleteUrl(pendingDeleteProduct.value.id), {
      headers: {
        ...getAuthHeaders(),
        Accept: 'application/json',
      },
    })

    toast.success(response?.data?.message || 'Product deleted successfully.')
    deleting.value = false
    closeDeleteDialog()

    if (filteredProducts.value.length === 1 && filters.page > 1)
      filters.page -= 1
    else
      fetchProducts()
  } catch (error) {
    toast.error(error?.response?.data?.message || error?.message || 'Unable to delete product.')
  } finally {
    deleting.value = false
  }
}

const togglePublish = async (item, shouldPublish) => {
  if (!item?.id) return

  publishActionId.value = item.id
  try {
    const response = await axios.post(
      shouldPublish ? getAdminProductPublishUrl(item.id) : getAdminProductUnpublishUrl(item.id),
      {},
      {
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
      },
    )

    const target = products.value.find(product => product?.id === item.id)
    if (target)
      target.is_published = shouldPublish

    toast.success(response?.data?.message || (shouldPublish ? 'Product published successfully.' : 'Product unpublished successfully.'))
  } catch (error) {
    toast.error(error?.response?.data?.message || error?.message || 'Unable to update publish status.')
  } finally {
    publishActionId.value = ''
  }
}

const currentPage = computed(() => Number(meta.value.current_page || 1))
const totalPages = computed(() => Number(meta.value.last_page || 1))
const getDraftStepLabel = item => {
  const step = Number(item?.completion_step || 1)
  return `Step ${Math.max(1, Math.min(5, step))} of 5`
}

watch(() => filters.per_page, () => {
  filters.page = 1
  fetchProducts()
})

watch(() => filters.page, () => {
  fetchProducts()
})

onMounted(() => {
  fetchProducts()
})
</script>

<template>
  <section>
    <VCard elevation="0" class="products-shell">
      <VCardText>
        <div class="d-flex flex-column flex-lg-row justify-space-between align-start align-lg-center gap-3 mb-4">
          <div>
            <div class="text-overline text-primary mb-1">Product Library</div>
            <h4 class="text-h4 mb-0">{{ isDraftMode ? 'Draft Products' : 'Products' }}</h4>
          </div>

          <div class="d-flex align-center gap-2 flex-wrap">
            <template v-if="!hideNavigation">
              <VBtn
                :variant="isDraftMode ? 'outlined' : 'flat'"
                color="primary"
                @click="goToProducts"
              >
                All Products
              </VBtn>
              <VBtn
                :variant="isDraftMode ? 'flat' : 'outlined'"
                color="warning"
                @click="goToDrafts"
              >
                Draft Products
              </VBtn>
              <VBtn
                color="primary"
                prepend-icon="tabler-plus"
                @click="router.push('/admin/products?section=add')"
              >
                Add Product
              </VBtn>
            </template>
          </div>
        </div>

        <div v-if="!isDraftMode" class="filters-grid mb-4">
          <VTextField
            v-model="filters.search"
            placeholder="Search products"
            variant="outlined"
            density="compact"
            hide-details="auto"
            @keyup.enter="filters.page = 1; fetchProducts()"
          />

          <VSelect
            v-model="filters.category"
            :items="categoryOptions"
            placeholder="Category"
            item-title="title"
            item-value="value"
            variant="outlined"
            density="compact"
            hide-details="auto"
          />

          <VSelect
            v-model="filters.per_page"
            :items="[10, 20, 50]"
            placeholder="Rows"
            variant="outlined"
            density="compact"
            hide-details="auto"
          />

          <VSelect
            v-model="filters.is_published"
            :items="statusOptions"
            placeholder="Status"
            item-title="title"
            item-value="value"
            variant="outlined"
            density="compact"
            hide-details="auto"
          />

          <VSelect
            v-model="filters.is_featured"
            :items="featureOptions"
            placeholder="Featured"
            item-title="title"
            item-value="value"
            variant="outlined"
            density="compact"
            hide-details="auto"
          />

          <VBtn color="primary" size="default" class="filters-grid__action" @click="filters.page = 1; fetchProducts()">
            Apply Filters
          </VBtn>
        </div>

        <div v-if="loading" class="products-loading">
          <VProgressCircular indeterminate color="primary" size="42" width="3" />
          <div class="text-body-2 text-medium-emphasis mt-3">Loading products...</div>
        </div>

        <div v-else-if="!filteredProducts.length" class="products-empty">
          <VIcon :icon="isDraftMode ? 'tabler-file-pencil' : 'tabler-package'" size="34" color="secondary" class="mb-3" />
          <h6 class="text-h6 mb-2">{{ isDraftMode ? 'No draft products found' : (completedOnly ? 'No completed products found' : 'No products found') }}</h6>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ isDraftMode ? 'Draft products will appear here once a product is started but not completed.' : (completedOnly ? 'Completed products will appear here once the full add-product flow is finished.' : 'Adjust your filters or create a new product.') }}
          </p>
        </div>

        <div v-else-if="!isDraftMode" class="products-table-wrap">
          <VTable class="products-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Visibility</th>
                <th class="text-end">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(item, index) in filteredProducts"
                :key="item.id || index"
              >
                <td class="font-weight-medium">
                  {{ ((currentPage - 1) * Number(meta.per_page || filters.per_page)) + index + 1 }}
                </td>

                <td>
                  <div class="product-main-cell">
                    <div class="product-main-cell__image">
                      <img v-if="getCoverImage(item)" :src="getCoverImage(item)" :alt="item.name || 'Product image'">
                      <div v-else class="product-main-cell__placeholder">
                        <VIcon icon="tabler-photo" size="18" />
                      </div>
                    </div>

                    <div class="product-main-cell__content">
                      <div class="text-body-1 font-weight-bold">{{ item.name || 'Untitled Product' }}</div>
                      <div class="text-body-2 text-medium-emphasis">{{ getCategoryLabel(item) }}</div>
                      <div class="text-caption text-medium-emphasis">{{ item.id }}</div>
                    </div>
                  </div>
                </td>

                <td>
                  <div class="d-flex align-center gap-2 flex-wrap">
                    <VChip size="small" :color="item.is_published ? 'success' : 'secondary'" variant="tonal">
                      {{ item.is_published ? 'Published' : 'Unpublished' }}
                    </VChip>
                    <VChip size="small" :color="item.is_featured ? 'warning' : 'secondary'" variant="outlined">
                      {{ item.is_featured ? 'Featured' : 'Standard' }}
                    </VChip>
                  </div>
                </td>

                <td class="text-end">
                  <div class="d-flex justify-end gap-2 flex-wrap">
                    <VBtn
                      :color="item.is_published ? 'warning' : 'success'"
                      variant="tonal"
                      size="small"
                      icon
                      :loading="publishActionId === item.id"
                      @click="togglePublish(item, !item.is_published)"
                    >
                      <VIcon :icon="item.is_published ? 'tabler-eye-off' : 'tabler-world-upload'" />
                    </VBtn>
                    <VBtn
                      color="primary"
                      variant="tonal"
                      size="small"
                      icon
                      @click="openProduct(item)"
                    >
                      <VIcon icon="tabler-external-link" />
                    </VBtn>
                    <VBtn
                      color="error"
                      variant="tonal"
                      size="small"
                      icon
                      @click="promptDeleteProduct(item)"
                    >
                      <VIcon icon="tabler-trash" />
                    </VBtn>
                  </div>
                </td>
              </tr>
            </tbody>
          </VTable>

          <div class="products-pagination mt-5">
            <div class="text-body-2 text-medium-emphasis">
              Showing {{ filteredProducts.length ? ((currentPage - 1) * Number(meta.per_page || filters.per_page)) + 1 : 0 }}
              to {{ ((currentPage - 1) * Number(meta.per_page || filters.per_page)) + filteredProducts.length }}
              of {{ completedOnly ? filteredProducts.length : (meta.total || products.length) }}
            </div>

            <div class="d-flex align-center gap-2">
              <VBtn
                variant="outlined"
                size="small"
                :disabled="currentPage <= 1"
                @click="filters.page = currentPage - 1"
              >
                Previous
              </VBtn>

              <VChip size="small" color="primary" variant="tonal">
                Page {{ currentPage }} / {{ totalPages }}
              </VChip>

              <VBtn
                variant="outlined"
                size="small"
                :disabled="currentPage >= totalPages"
                @click="filters.page = currentPage + 1"
              >
                Next
              </VBtn>
            </div>
          </div>
        </div>

        <div v-else class="drafts-grid">
          <VCard
            v-for="item in filteredProducts"
            :key="item.id"
            elevation="0"
            class="draft-card"
          >
            <VCardText>
              <div class="draft-card__header">
                <div class="product-main-cell">
                  <div class="product-main-cell__image">
                    <img v-if="getCoverImage(item)" :src="getCoverImage(item)" :alt="item.name || 'Product image'">
                    <div v-else class="product-main-cell__placeholder">
                      <VIcon icon="tabler-photo" size="18" />
                    </div>
                  </div>

                  <div class="product-main-cell__content">
                    <div class="text-body-1 font-weight-bold">{{ item.name || 'Untitled Draft' }}</div>
                    <div class="text-body-2 text-medium-emphasis">{{ getCategoryLabel(item) }}</div>
                    <div class="text-caption text-medium-emphasis">{{ item.id }}</div>
                  </div>
                </div>

                <VChip size="small" color="warning" variant="tonal">
                  Draft
                </VChip>
              </div>

              <div class="draft-card__status mt-5">
                <VChip size="small" color="primary" variant="outlined">
                  {{ getDraftStepLabel(item) }}
                </VChip>
                <VChip size="small" color="secondary" variant="outlined">
                  Incomplete
                </VChip>
              </div>

              <div class="text-body-2 text-medium-emphasis mt-4">
                This product is still unfinished. Open it to continue the setup flow from its latest saved step.
              </div>

              <div class="d-flex justify-space-between align-center mt-5 gap-3 flex-wrap">
                <div class="text-caption text-medium-emphasis">
                  Current status: {{ item.completion_status || 'draft' }}
                </div>

                <div class="d-flex gap-2 flex-wrap">
                  <VBtn
                    color="warning"
                    variant="tonal"
                    icon
                    @click="openProduct(item)"
                  >
                    <VIcon icon="tabler-external-link" />
                  </VBtn>
                  <VBtn
                    color="error"
                    variant="tonal"
                    icon
                    @click="promptDeleteProduct(item)"
                  >
                    <VIcon icon="tabler-trash" />
                  </VBtn>
                </div>
              </div>
            </VCardText>
          </VCard>
        </div>
      </VCardText>
    </VCard>

    <VDialog v-model="deleteDialog" max-width="460">
      <VCard>
        <VCardText class="pa-6">
          <div class="text-h6 mb-2">Delete Product?</div>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Do you really want to delete
            <span class="font-weight-bold">{{ pendingDeleteProduct?.name || 'this product' }}</span>?
            This action removes the product and its related draft data.
          </p>
        </VCardText>

        <VCardActions class="px-6 pb-6 pt-0 justify-end">
          <VBtn variant="text" :disabled="deleting" @click="closeDeleteDialog">
            Cancel
          </VBtn>
          <VBtn color="error" :loading="deleting" @click="deleteProduct">
            Delete Product
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>

<style scoped>
.products-shell {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 20px;
}

.filters-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1.35fr) repeat(4, minmax(130px, 1fr)) auto;
  gap: 0.75rem;
  align-items: center;
}

.filters-grid__action {
  min-width: 140px;
}

.products-loading,
.products-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  text-align: center;
}

.products-table-wrap {
  overflow: auto;
}

.products-table {
  min-width: 1050px;
}

.product-main-cell {
  display: flex;
  gap: 0.85rem;
  align-items: center;
}

.product-main-cell__image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  overflow: hidden;
  border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.product-main-cell__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-main-cell__placeholder {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.product-main-cell__content {
  min-width: 0;
}

.products-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.drafts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.draft-card {
  border: 1px dashed rgba(var(--v-theme-warning), 0.45);
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(var(--v-theme-warning), 0.06), rgba(var(--v-theme-surface), 1));
}

.draft-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.draft-card__status {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

@media (max-width: 1279px) {
  .filters-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }

  .products-pagination {
    flex-direction: column;
    align-items: flex-start;
  }

  .drafts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
