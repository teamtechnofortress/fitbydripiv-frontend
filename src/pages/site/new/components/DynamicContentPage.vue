<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import PageRenderer from './PageRenderer.vue'
import { getContentPageUrl } from '@/network/const'
import { normalizePage } from '@/utils/sitePageContent'

const props = defineProps({
  slug: {
    type: String,
    required: true,
  },
})

const loading = ref(true)
const error = ref('')
const page = ref(null)
const resolvedSlug = ref('')
const route = useRoute()

const normalizedPage = computed(() => normalizePage(page.value))

const sendDevLog = (message, payload) => {
  if (!import.meta.env.DEV || !import.meta.hot)
    return

  import.meta.hot.send('custom:debug-log', {
    message,
    payload,
  })
}

const logResolvedPage = (requestedSlug, sourceLabel, payload) => {
  const sections = Array.isArray(payload?.sections) ? payload.sections : []

  sendDevLog('Content page resolved', {
    requested_slug: requestedSlug,
    resolved_slug: payload?.slug || requestedSlug,
    source: sourceLabel,
    page: {
      id: payload?.id || null,
      title: payload?.title || null,
      status: payload?.status || null,
      meta_title: payload?.meta_title || null,
      meta_description: payload?.meta_description || null,
    },
    section_count: sections.length,
  })

  sendDevLog('Content page sections', {
    requested_slug: requestedSlug,
    resolved_slug: payload?.slug || requestedSlug,
    sections: sections.map((section, index) => ({
      index: index + 1,
      id: section?.id || null,
      section_key: section?.section_key || null,
      type: section?.type || null,
      sort_order: section?.sort_order ?? null,
      item_count: Array.isArray(section?.items) ? section.items.length : 0,
      faq_count: Array.isArray(section?.faqs) ? section.faqs.length : 0,
      product_count: Array.isArray(section?.products) ? section.products.length : 0,
    })),
  })
}

const getSlugCandidates = (slug) => {
  const normalized = String(slug || '').trim().replace(/^\/+|\/+$/g, '')
  if (!normalized)
    return []

  const encoded = encodeURIComponent(normalized)
  return encoded === normalized ? [normalized] : [normalized, encoded]
}

const getRequestedSlug = (slug) => {
  const normalizedSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '')
  const pathSlug = String(route.path || '').trim().replace(/^\/+|\/+$/g, '')

  if (!pathSlug)
    return normalizedSlug

  // Keep `/new/:slug` semantics (content slug is just the last segment).
  if (pathSlug.startsWith('new/'))
    return normalizedSlug || pathSlug.replace(/^new\/+/, '')

  const pathSegments = pathSlug.split('/').filter(Boolean)
  const slugSegments = normalizedSlug.split('/').filter(Boolean)
  const lastPathSegment = pathSegments.at(-1) || ''

  if (slugSegments.length === 1 && pathSegments.length > 1 && normalizedSlug === lastPathSegment)
    return pathSlug

  return normalizedSlug || pathSlug
}

const loadPage = async slug => {
  if (!slug)
    return

  const requestedSlug = getRequestedSlug(slug)

  loading.value = true
  error.value = ''
  resolvedSlug.value = requestedSlug

  try {
    const candidates = getSlugCandidates(requestedSlug)
    let loaded = false
    let lastError = null

    for (const candidate of candidates) {
      try {
        const response = await axios.get(getContentPageUrl(candidate))
        page.value = response?.data?.data || null
        loaded = true
        logResolvedPage(requestedSlug, candidate === requestedSlug ? 'page' : 'page-encoded-slug', page.value)
        break
      } catch (candidateError) {
        lastError = candidateError
      }
    }

    if (!loaded)
      throw lastError || new Error('Unable to load content page.')
  } catch (err) {
    try {
      const fallbackResponse = await axios.get(getContentPageUrl('category-template'))
      page.value = fallbackResponse?.data?.data || null
      logResolvedPage(requestedSlug, 'category-template-fallback', page.value)
    } catch (fallbackError) {
      error.value = fallbackError?.response?.data?.message || fallbackError?.message || err?.response?.data?.message || err?.message || 'Unable to load landing page content.'
      page.value = null
      sendDevLog('Content page load failed', {
        requested_slug: requestedSlug,
        primary_error: err?.response?.data?.message || err?.message || null,
        fallback_error: fallbackError?.response?.data?.message || fallbackError?.message || null,
      })
    }
  } finally {
    loading.value = false
  }
}

watch(() => props.slug, slug => {
  loadPage(slug)
}, { immediate: true })
</script>

<template>
  <div v-if="loading" class="landing-status">
    <div class="landing-status__spinner" />
    <!-- <p>Loading page content...</p> -->
  </div>

  <div v-else-if="error" class="landing-status landing-status--error">
    <h2>Unable to load page</h2>
    <p>{{ error }}</p>
  </div>

  <PageRenderer
    v-else-if="normalizedPage"
    :page="normalizedPage"
    :page-slug="resolvedSlug"
    :loading="loading"
  />
</template>

<style scoped>
.landing-status {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
  background: linear-gradient(180deg, #f7fafc, #ffffff);
  color: #475569;
}

.landing-status--error h2 {
  color: #0f172a;
  margin: 0;
}

.landing-status__spinner {
  width: 38px;
  height: 38px;
  border: 3px solid rgba(37, 99, 235, 0.14);
  border-top-color: #2563eb;
  border-radius: 999px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
