import { defineStore } from 'pinia'
import axios from 'axios'

const isLocalDevHost = ["localhost", "127.0.0.1"].includes(window.location.hostname)

const API_BASE = isLocalDevHost
  ? "http://localhost:8001/api/v1/cms"
  : "/api/v1/cms"

const normalizeCmsProduct = product => {
  if (!product || typeof product !== 'object')
    return product

  return {
    ...product,
    images: Array.isArray(product.images) ? product.images : [],
    benefits: Array.isArray(product.benefits) ? product.benefits : [],
    faqs: Array.isArray(product.faqs) ? product.faqs : [],
    research_links: Array.isArray(product.research_links) ? product.research_links : [],
    ingredients: Array.isArray(product.ingredients) ? product.ingredients : [],
    pricing: Array.isArray(product.pricing) ? product.pricing : [],
  }
}

export const useCmsDataStore = defineStore('cmsData', {
  state: () => ({
    categories: [],
    featuredProducts: [],
    currentCategory: null,
    currentCategoryProducts: [],
    currentProduct: null,
    faqs: [],
    siteSettings: null,
    allProducts: [],
    loading: false,
    productsLoading: false,
    error: null,
  }),

  actions: {
    async getCategories() {
      if (this.categories.length > 0) return
      this.loading = true
      try {
        const { data } = await axios.get(`${API_BASE}/categories`)
        if (data?.success) this.categories = data.data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async getCategoryBySlug(slug) {
      this.currentCategory = null
      this.loading = true
      try {
        const { data } = await axios.get(`${API_BASE}/categories/${slug}`)
        if (data?.success) this.currentCategory = data.data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async getProductsByCategory(slug) {
      this.currentCategoryProducts = []
      this.productsLoading = true
      try {
        const { data } = await axios.get(`${API_BASE}/categories/${slug}/products`)
        if (data?.success) this.currentCategoryProducts = data.data
      } catch (e) {
        this.error = e.message
      } finally {
        this.productsLoading = false
      }
    },

    async loadCategoryPage(slug) {
      this.currentCategory = null
      this.currentCategoryProducts = []
      this.loading = true
      this.productsLoading = true
      try {
        const [catRes, prodRes] = await Promise.all([
          axios.get(`${API_BASE}/categories/${slug}`),
          axios.get(`${API_BASE}/categories/${slug}/products`),
        ])

        if (catRes.data?.success) this.currentCategory = catRes.data.data
        if (prodRes.data?.success) this.currentCategoryProducts = prodRes.data.data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
        this.productsLoading = false
      }
    },

    async getFeaturedProducts() {
      if (this.featuredProducts.length > 0) return
      try {
        const { data } = await axios.get(`${API_BASE}/products/featured`)
        if (data?.success) this.featuredProducts = data.data
      } catch (e) {
        this.error = e.message
      }
    },

    async getProductBySlug(slug) {
      this.currentProduct = null
      this.loading = true
      try {
        const { data } = await axios.get(`${API_BASE}/products/${slug}`)
        if (data?.success) this.currentProduct = normalizeCmsProduct(data.data)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async getProductPricing(slug) {
      try {
        const { data } = await axios.get(`${API_BASE}/products/${slug}/pricing`)
        if (data?.success) return data.data
        
        return null
      } catch (e) {
        this.error = e.message
        
        return null
      }
    },

    async getAllProductsForSelector() {
      if (this.allProducts.length > 0) return
      this.loading = true
      try {
        const { data } = await axios.get(`${API_BASE}/products/selector`)
        if (data?.success) this.allProducts = data.data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async getFaqs() {
      if (this.faqs.length > 0) return
      this.loading = true
      try {
        const { data } = await axios.get(`${API_BASE}/faqs`)
        if (data?.success) this.faqs = data.data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async getFaqsByCategory(category) {
      try {
        const { data } = await axios.get(`${API_BASE}/faqs/category/${category}`)
        if (data?.success) return data.data
        
        return []
      } catch (e) {
        this.error = e.message
        
        return []
      }
    },

    async getSiteSettings() {
      if (this.siteSettings) return
      try {
        const { data } = await axios.get(`${API_BASE}/site-settings`)
        if (data?.success) this.siteSettings = data.data
      } catch (e) {
        this.error = e.message
      }
    },

    async submitContact(formData) {
      try {
        const { data } = await axios.post(`${API_BASE}/contact`, formData)
        
        return data?.success || false
      } catch (e) {
        this.error = e.message
        
        return false
      }
    },
  },
})
