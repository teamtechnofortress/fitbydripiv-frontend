import { computed, ref, watch } from 'vue'
import axios from 'axios'
import { getCmsCategoryProductsUrl, getCmsCategoryUrl } from '@/network/const'

const categoryCache = new Map()
const productsCache = new Map()

export const useCategoryPageContext = slugRef => {
  const loadingCategory = ref(false)
  const loadingProducts = ref(false)
  const category = ref(null)
  const products = ref([])
  const error = ref('')

  const loadCategory = async slug => {
    if (!slug)
      return

    if (categoryCache.has(slug)) {
      category.value = categoryCache.get(slug)
      return
    }

    loadingCategory.value = true
    try {
      const response = await axios.get(getCmsCategoryUrl(slug))
      const data = response?.data?.data || null
      categoryCache.set(slug, data)
      category.value = data
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || 'Unable to load category.'
      category.value = null
    } finally {
      loadingCategory.value = false
    }
  }

  const loadProducts = async slug => {
    if (!slug)
      return

    if (productsCache.has(slug)) {
      products.value = productsCache.get(slug)
      return
    }

    loadingProducts.value = true
    try {
      const response = await axios.get(getCmsCategoryProductsUrl(slug))
      const data = response?.data?.data || []
      productsCache.set(slug, data)
      products.value = data
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || 'Unable to load products.'
      products.value = []
    } finally {
      loadingProducts.value = false
    }
  }

  watch(slugRef, slug => {
    error.value = ''
    category.value = null
    products.value = []
    loadCategory(slug)
    loadProducts(slug)
  }, { immediate: true })

  return {
    category: computed(() => category.value),
    products: computed(() => products.value),
    loadingCategory: computed(() => loadingCategory.value),
    loadingProducts: computed(() => loadingProducts.value),
    error: computed(() => error.value),
  }
}
