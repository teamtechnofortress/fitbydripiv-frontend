<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import axios from 'axios'
import { getAdminProductPreviewUrl } from '@/network/const'
import { getApiToken } from '@/store/authData'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  productId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const loading = ref(false)
const error = ref('')
const previewProductPayload = ref(null)

const categoryTitleMap = {
  weight_loss: 'Weight Loss',
  wellness: 'Wellness',
  longevity: 'Longevity',
}

const processSteps = [
  { number: 1, title: 'Complete Our Telehealth Intake', description: 'Answer all our questions about your health and goals through our secure online form.' },
  { number: 2, title: 'Telehealth Review (0-48 Hours)', description: 'Our medical provider will review your intake information and medical history.' },
  { number: 3, title: 'Determining If Eligible to Receive Therapy', description: 'A medical professional will evaluate your eligibility based on your health profile and treatment goals.' },
  { number: 4, title: 'Customized Rx Delivered Right to You', description: 'If approved, your personalized prescription will be compounded and shipped directly to your door.' },
  { number: 5, title: 'Any Subsequent Orders Reviewed in Context', description: 'All future orders will be reviewed in the context of your ongoing telehealth journey and health goals.' },
]

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const getAuthHeaders = () => {
  const token = getApiToken()
  if (!token) throw new Error('Authentication token missing. Please login again.')
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
}

const buildErrorMessage = errorObject => {
  const responseData = errorObject?.response?.data
  if (typeof responseData === 'string') return responseData
  if (responseData?.message) return responseData.message
  return errorObject?.message || 'Unable to load product preview.'
}

const previewProduct = computed(() => previewProductPayload.value || {})
const pageTitle = computed(() => 'Product Preview')
const previewMode = computed(() => true)

const apiImages = computed(() => Array.isArray(previewProduct.value?.images) ? previewProduct.value.images : [])
const coverImageUrl = computed(() => {
  const apiCover = previewProduct.value?.cover_image?.image_url || previewProduct.value?.cover_image?.url
  if (apiCover) return apiCover
  const apiFallback = apiImages.value.find(image => image.image_type === 'cover' && (image.image_url || image.url))
  if (apiFallback) return apiFallback.image_url || apiFallback.url || ''
  return apiImages.value.find(image => image.image_url || image.url)?.image_url || apiImages.value.find(image => image.image_url || image.url)?.url || ''
})

const productName = computed(() => previewProduct.value?.name || 'Untitled Product')
const productDescription = computed(() => previewProduct.value?.description || '')
const aboutTreatment = computed(() => previewProduct.value?.about_treatment || '')
const howItWorks = computed(() => previewProduct.value?.how_it_works || '')
const treatmentDuration = computed(() => previewProduct.value?.treatment_duration || '')
const usageInstructions = computed(() => previewProduct.value?.usage_instructions || '')
const clinicalResearchDescription = computed(() => previewProduct.value?.clinical_research_description || '')
const productCategory = computed(() => {
  const raw = previewProduct.value?.category || ''
  return categoryTitleMap[raw] || raw || 'Category pending'
})
const publishLabel = computed(() => (previewProduct.value?.is_published ? 'Published' : 'Draft Preview'))
const effectiveCompletionStatus = computed(() => previewProduct.value?.completion_status || 'not_started')
const effectiveCompletionPercentage = computed(() => {
  const value = Number(previewProduct.value?.completion_percentage ?? 0)
  return Number.isFinite(value) ? value : 0
})
const effectiveCompletionStep = computed(() => Number(previewProduct.value?.completion_step ?? 1))

const benefitItems = computed(() => {
  const apiBenefits = Array.isArray(previewProduct.value?.benefits) ? previewProduct.value.benefits : []
  return apiBenefits.map(item => item?.benefit_text || item?.text || '').filter(Boolean)
})

const faqItems = computed(() => {
  const apiFaqs = Array.isArray(previewProduct.value?.faqs) ? previewProduct.value.faqs : []
  return apiFaqs.filter(item => item?.question || item?.answer)
})

const ingredientItems = computed(() => {
  const apiIngredients = Array.isArray(previewProduct.value?.ingredients) ? previewProduct.value.ingredients : []
  return apiIngredients.filter(item => item?.name)
})

const researchItems = computed(() => {
  const apiResearch = Array.isArray(previewProduct.value?.research_links) ? previewProduct.value.research_links : []
  return apiResearch.filter(item => item?.title || item?.article_url)
})

const pricingGroups = computed(() => {
  const apiPricing = Array.isArray(previewProduct.value?.pricing) ? previewProduct.value.pricing : []
  const subscription = apiPricing.find(item => item?.pricing_type === 'subscription')
  const oneTime = apiPricing.find(item => item?.pricing_type === 'one_time')

  return [
    {
      key: 'subscription',
      title: subscription?.title || 'Subscription Pricing',
      data: {
        title: subscription?.title || '',
        description: subscription?.description || '',
        is_active: !!subscription?.is_active,
        options: Array.isArray(subscription?.options) ? subscription.options : [],
      },
    },
    {
      key: 'one_time',
      title: oneTime?.title || 'One-Time Pricing',
      data: {
        title: oneTime?.title || '',
        description: oneTime?.description || '',
        is_active: !!oneTime?.is_active,
        options: Array.isArray(oneTime?.options) ? oneTime.options : [],
      },
    },
  ]
})

const previewSections = computed(() => ([
  { id: 'overview',  title: 'Overview',              complete: !!productName.value && !!productDescription.value },
  { id: 'benefits',  title: 'Key Benefits',           complete: benefitItems.value.length > 0 },
  { id: 'details',   title: 'Treatment Details',      complete: !!aboutTreatment.value && ingredientItems.value.length > 0 },
  { id: 'research',  title: 'Research & Evidence',    complete: !!clinicalResearchDescription.value && researchItems.value.length > 0 },
  { id: 'pricing',   title: 'Pricing',                complete: pricingGroups.value.some(g => g.data?.is_active && (g.data?.options || []).length > 0) },
  { id: 'faqs',      title: 'FAQs',                   complete: faqItems.value.length > 0 },
  { id: 'process',   title: 'The Process',            complete: true },
]))

const scrollToSection = async sectionId => {
  await nextTick()
  document.getElementById(`admin-product-preview-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const loadPreview = async () => {
  if (!props.productId) {
    previewProductPayload.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    const response = await axios.get(getAdminProductPreviewUrl(props.productId), {
      headers: getAuthHeaders(),
    })
    previewProductPayload.value = response?.data?.data || null
  } catch (loadError) {
    previewProductPayload.value = null
    error.value = buildErrorMessage(loadError)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.productId],
  ([open, productId]) => {
    if (open && productId) loadPreview()
  },
  { immediate: true },
)
</script>

<template>
  <VNavigationDrawer
    v-model="isOpen"
    location="right"
    temporary
    scrim
    class="preview-drawer"
    width="1400"
  >
    <div class="preview-shell">

      <!-- ─── Sidebar ─────────────────────────────── -->
      <aside class="preview-sidebar">
        <div class="preview-sidebar__top">
          <div>
            <p class="preview-sidebar__overline">Preview Product</p>
            <h5 class="preview-sidebar__name">{{ productName }}</h5>
            <p class="preview-sidebar__hint">
              Preview the saved draft in a release-style product view. Incomplete sections show placeholders.
            </p>
          </div>
          <VBtn icon variant="text" color="default" size="small" @click="isOpen = false">
            <VIcon icon="tabler-x" size="20" />
          </VBtn>
        </div>

        <!-- Meta chips -->
        <div class="preview-sidebar__meta">
          <div class="preview-meta-card">
            <span class="preview-meta-card__label">Status</span>
            <strong class="preview-meta-card__value">{{ effectiveCompletionStatus }}</strong>
          </div>
          <div class="preview-meta-card">
            <span class="preview-meta-card__label">Complete</span>
            <strong class="preview-meta-card__value">{{ effectiveCompletionPercentage }}%</strong>
          </div>
          <div class="preview-meta-card">
            <span class="preview-meta-card__label">Step</span>
            <strong class="preview-meta-card__value">{{ effectiveCompletionStep }}</strong>
          </div>
        </div>

        <!-- Section nav -->
        <nav class="preview-sidebar__nav">
          <button
            v-for="section in previewSections"
            :key="section.id"
            type="button"
            class="preview-nav-btn"
            @click="scrollToSection(section.id)"
          >
            <span class="preview-nav-btn__title">{{ section.title }}</span>
            <span class="preview-nav-btn__chip" :class="section.complete ? 'preview-nav-btn__chip--ready' : 'preview-nav-btn__chip--pending'">
              {{ section.complete ? 'Ready' : 'Pending' }}
            </span>
          </button>
        </nav>
      </aside>

      <!-- ─── Preview Body ──────────────────────────── -->
      <div class="preview-body">

        <!-- Loading -->
        <div v-if="loading" class="preview-body__loading">
          <VProgressCircular indeterminate color="primary" size="40" width="3" />
          <p class="preview-body__loading-text">Loading saved product preview…</p>
        </div>

        <div v-else class="preview-content">

          <!-- Topbar banner -->
          <div class="preview-topbar">
            <div>
              <p class="preview-topbar__overline">{{ pageTitle }}</p>
              <h6 class="preview-topbar__title">Admin Preview Mode</h6>
              <p class="preview-topbar__hint">
                {{ error || 'Generated from the admin preview endpoint — safe for unpublished drafts.' }}
              </p>
            </div>
              <div class="preview-topbar__chips">
              <span v-if="previewMode" class="preview-chip preview-chip--success">Preview Mode</span>
              <span class="preview-chip preview-chip--secondary">{{ publishLabel }}</span>
              <span class="preview-chip preview-chip--primary">{{ effectiveCompletionPercentage }}% Complete</span>
            </div>
          </div>

          <!-- ── Overview / Hero ──────────────────── -->
          <section id="admin-product-preview-overview" class="preview-section preview-section--hero">
            <div class="preview-hero">
              <!-- Image -->
              <div class="preview-hero__media">
                <img v-if="coverImageUrl" :src="coverImageUrl" :alt="productName" class="preview-hero__img" />
                <div v-else class="preview-empty-media">
                  <VIcon icon="tabler-photo" size="32" color="secondary" />
                  <span>Cover image not completed yet.</span>
                </div>
              </div>

              <!-- Info -->
              <div class="preview-hero__content">
                <span class="preview-badge">{{ productCategory }}</span>
                <h1 class="preview-hero__title">{{ productName }}</h1>
                <p v-if="productDescription" class="preview-hero__desc">{{ productDescription }}</p>
                <div v-else class="preview-empty-note preview-empty-note--sm">Product description not completed yet.</div>

                <div class="preview-hero__actions">
                  <button class="preview-btn-primary" disabled>Start my journey</button>
                  <button class="preview-btn-ghost" disabled>FAQs</button>
                </div>

                <!-- Benefits inline (mirrors public page) -->
                <div class="preview-benefits">
                  <h2 class="preview-benefits__title">Key Benefits</h2>
                  <ul v-if="benefitItems.length" class="preview-benefits__list">
                    <li v-for="benefit in benefitItems" :key="benefit" class="preview-benefits__item">
                      <span class="preview-benefits__check">✓</span>
                      <span>{{ benefit }}</span>
                    </li>
                  </ul>
                  <div v-else class="preview-empty-note">Benefits not completed yet.</div>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Treatment Details ─────────────────── -->
          <section id="admin-product-preview-details" class="preview-section">
            <div class="preview-block">
              <div class="preview-block__header">
                <div class="preview-block__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
                </div>
                <h2 class="preview-block__title">Treatment Details</h2>
              </div>

              <div class="preview-detail-grid">
                <div class="preview-detail-card">
                  <h3 class="preview-detail-card__heading">About This Treatment</h3>
                  <p v-if="aboutTreatment" class="preview-detail-card__body">{{ aboutTreatment }}</p>
                  <div v-else class="preview-empty-note">Not completed yet.</div>
                </div>
                <div class="preview-detail-card">
                  <h3 class="preview-detail-card__heading">How It Works</h3>
                  <p v-if="howItWorks" class="preview-detail-card__body">{{ howItWorks }}</p>
                  <div v-else class="preview-empty-note">Not completed yet.</div>
                </div>
                <div class="preview-detail-card">
                  <h3 class="preview-detail-card__heading">Treatment Duration</h3>
                  <p v-if="treatmentDuration" class="preview-detail-card__body">{{ treatmentDuration }}</p>
                  <div v-else class="preview-empty-note">Not completed yet.</div>
                </div>
                <div class="preview-detail-card">
                  <h3 class="preview-detail-card__heading">Usage Instructions</h3>
                  <p v-if="usageInstructions" class="preview-detail-card__body">{{ usageInstructions }}</p>
                  <div v-else class="preview-empty-note">Not completed yet.</div>
                </div>
              </div>

              <div class="preview-ingredients">
                <h3 class="preview-ingredients__title">Key Ingredients</h3>
                <div v-if="ingredientItems.length" class="preview-ingredients__list">
                  <div v-for="ingredient in ingredientItems" :key="ingredient.local_id || ingredient.name" class="preview-ingredient-item">
                    <strong>{{ ingredient.name }}</strong>
                    <span>{{ ingredient.description || 'No description provided.' }}</span>
                  </div>
                </div>
                <div v-else class="preview-empty-note">Ingredients not completed yet.</div>
              </div>
            </div>
          </section>

          <!-- ── Research ──────────────────────────── -->
          <section id="admin-product-preview-research" class="preview-section">
            <div class="preview-block">
              <div class="preview-block__header">
                <div class="preview-block__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16.5h10"/></svg>
                </div>
                <h2 class="preview-block__title">Clinical Research &amp; Scientific Evidence</h2>
              </div>

              <p v-if="clinicalResearchDescription" class="preview-block__body">
                {{ clinicalResearchDescription }}
              </p>
              <div v-else class="preview-empty-note preview-empty-note--mb">Main research description not completed yet.</div>

              <div v-if="researchItems.length" class="preview-research-list">
                <article v-for="research in researchItems" :key="research.local_id || research.title" class="preview-research-card">
                  <div class="preview-research-card__icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  </div>
                  <div class="preview-research-card__body">
                    <h4 class="preview-research-card__title">{{ research.title }}</h4>
                    <a v-if="research.article_url" :href="research.article_url" target="_blank" rel="noopener noreferrer" class="preview-research-card__link">
                      {{ research.article_url }}
                    </a>
                    <p v-if="research.description" class="preview-research-card__desc">{{ research.description }}</p>
                  </div>
                </article>
              </div>
              <div v-else class="preview-empty-note">Research links not completed yet.</div>

              <div v-if="researchItems.length" class="preview-disclaimer">
                <strong>Important:</strong> Research citations are provided for informational purposes. Always consult a qualified healthcare provider before starting any new treatment.
              </div>
            </div>
          </section>

          <!-- ── Pricing ───────────────────────────── -->
          <section id="admin-product-preview-pricing" class="preview-section">
            <div class="preview-block">
              <div class="preview-block__header">
                <div class="preview-block__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <h2 class="preview-block__title">Personalized Pricing</h2>
              </div>

              <div class="preview-pricing-grid">
                <div v-for="group in pricingGroups" :key="group.key" class="preview-pricing-card">
                  <div class="preview-pricing-card__header">
                    <h3 class="preview-pricing-card__title">{{ group.title }}</h3>
                    <span class="preview-chip" :class="group.data?.is_active ? 'preview-chip--success' : 'preview-chip--muted'">
                      {{ group.data?.is_active ? 'Enabled' : 'Disabled' }}
                    </span>
                  </div>
                  <p v-if="group.data?.description" class="preview-pricing-card__desc">{{ group.data.description }}</p>
                  <div v-else class="preview-empty-note preview-empty-note--mb">Section description not completed yet.</div>
                  <div v-if="group.data?.is_active && (group.data?.options || []).length" class="preview-pricing-options">
                    <div v-for="option in group.data.options" :key="option.local_id || option.label" class="preview-pricing-option">
                      <div class="preview-pricing-option__row">
                        <strong>{{ option.label }}</strong>
                        <span v-if="option.is_default" class="preview-chip preview-chip--success preview-chip--xs">Default</span>
                      </div>
                      <span class="preview-pricing-option__price">${{ option.final_price || option.price }}{{ option.billing_interval ? ` · ${option.billing_interval}` : '' }}</span>
                    </div>
                  </div>
                  <div v-else-if="group.data?.is_active" class="preview-empty-note">Pricing options not completed yet.</div>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Process ───────────────────────────── -->
          <section id="admin-product-preview-process" class="preview-section">
            <div class="preview-block">
              <div class="preview-block__header">
                <div class="preview-block__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <h2 class="preview-block__title">The Process</h2>
              </div>
              <ol class="preview-process">
                <li v-for="step in processSteps" :key="step.number" class="preview-process__step">
                  <div class="preview-process__num">{{ step.number }}</div>
                  <div class="preview-process__content">
                    <h3 class="preview-process__title">{{ step.title }}</h3>
                    <p class="preview-process__desc">{{ step.description }}</p>
                  </div>
                </li>
              </ol>
            </div>
          </section>

          <!-- ── FAQs ──────────────────────────────── -->
          <section id="admin-product-preview-faqs" class="preview-section">
            <div class="preview-block">
              <div class="preview-block__header">
                <div class="preview-block__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <h2 class="preview-block__title">FAQs</h2>
              </div>
              <div v-if="faqItems.length" class="preview-faq-list">
                <article v-for="faq in faqItems" :key="faq.local_id || faq.question" class="preview-faq-item">
                  <h3 class="preview-faq-item__q">{{ faq.question }}</h3>
                  <p class="preview-faq-item__a">{{ faq.answer }}</p>
                </article>
              </div>
              <div v-else class="preview-empty-note">FAQs not completed yet.</div>
            </div>
          </section>

        </div>
      </div>
    </div>
  </VNavigationDrawer>
</template>

<style scoped>
/* ─── Drawer ──────────────────────────────────────── */
.preview-drawer {
  width: min(90vw, 1400px) !important;
  max-width: min(90vw, 1400px) !important;
}

.preview-shell {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  min-height: 100%;
  background: #f8fafc;
}

/* ─── Sidebar ─────────────────────────────────────── */
.preview-sidebar {
  background: #fff;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  padding: 1.25rem;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.preview-sidebar__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.preview-sidebar__overline {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #059669;
  margin: 0 0 0.25rem;
}

.preview-sidebar__name {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.375rem;
  line-height: 1.3;
}

.preview-sidebar__hint {
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

/* Meta cards */
.preview-sidebar__meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.625rem;
}

.preview-meta-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 0.625rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.preview-meta-card__label {
  font-size: 0.7rem;
  color: #9ca3af;
  font-weight: 500;
}

.preview-meta-card__value {
  font-size: 0.875rem;
  font-weight: 700;
  color: #111827;
}

/* Section nav */
.preview-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-nav-btn {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.875rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  text-align: left;
  transition: border-color 0.15s, transform 0.15s, background 0.15s;
}

.preview-nav-btn:hover {
  border-color: #6ee7b7;
  background: #f9fafb;
  transform: translateX(2px);
}

.preview-nav-btn__title { flex: 1; }

.preview-nav-btn__chip {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 99px;
  white-space: nowrap;
  flex-shrink: 0;
}

.preview-nav-btn__chip--ready   { background: #d1fae5; color: #065f46; }
.preview-nav-btn__chip--pending { background: #fef3c7; color: #92400e; }

/* ─── Body ────────────────────────────────────────── */
.preview-body {
  min-width: 0;
  padding: 1.25rem;
  overflow-y: auto;
}

.preview-body__loading {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.875rem;
}

.preview-body__loading-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.preview-content {
  max-width: 940px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── Topbar ──────────────────────────────────────── */
.preview-topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.07), rgba(16, 185, 129, 0.07));
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 1rem;
}

.preview-topbar__overline {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #059669;
  margin: 0 0 0.2rem;
}

.preview-topbar__title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem;
}

.preview-topbar__hint {
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0;
}

.preview-topbar__chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* ─── Chips ───────────────────────────────────────── */
.preview-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.275rem 0.625rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.preview-chip--primary   { background: rgba(99, 102, 241, 0.1);  color: #4338ca; }
.preview-chip--secondary { background: #f3f4f6; color: #374151; }
.preview-chip--success   { background: #d1fae5; color: #065f46; }
.preview-chip--muted     { background: #f3f4f6; color: #6b7280; }
.preview-chip--xs        { padding: 0.15rem 0.45rem; font-size: 0.68rem; }

/* ─── Sections / Blocks ───────────────────────────── */
.preview-section { }

.preview-block {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 1.25rem;
  padding: 1.375rem 1.5rem;
}

.preview-block__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.125rem;
}

.preview-block__icon {
  width: 2.125rem;
  height: 2.125rem;
  background: #ecfdf5;
  border: 1.5px solid #a7f3d0;
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #059669;
  flex-shrink: 0;
}

.preview-block__title {
  font-size: 1.0625rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.preview-block__body {
  font-size: 0.9375rem;
  color: #4b5563;
  line-height: 1.7;
  margin: 0 0 1rem;
}

/* ─── Empty notes ─────────────────────────────────── */
.preview-empty-note {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px dashed #d1d5db;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  color: #9ca3af;
}

.preview-empty-note--sm  { font-size: 0.8125rem; }
.preview-empty-note--mb  { margin-bottom: 1rem; }

.preview-empty-media {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #9ca3af;
  font-size: 0.8125rem;
  height: 100%;
}

/* ─── Hero ────────────────────────────────────────── */
.preview-hero {
  display: grid;
  grid-template-columns: minmax(240px, 300px) 1fr;
  gap: 1.75rem;
  background: linear-gradient(160deg, #ecfdf5, #eff6ff);
  border: 1px solid #d1fae5;
  border-radius: 1.25rem;
  padding: 1.5rem;
}

.preview-hero__media {
  border-radius: 1rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  min-height: 320px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-hero__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 1.5rem;
}

.preview-hero__content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.preview-badge {
  display: inline-block;
  background: #ecfdf5;
  color: #065f46;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.3rem 0.7rem;
  border-radius: 0.5rem;
  border: 1px solid #a7f3d0;
  margin-bottom: 0.75rem;
  width: fit-content;
}

.preview-hero__title {
  font-size: clamp(1.375rem, 2.5vw, 1.75rem);
  font-weight: 800;
  color: #111827;
  line-height: 1.2;
  margin: 0 0 0.625rem;
}

.preview-hero__desc {
  font-size: 0.9rem;
  color: #4b5563;
  line-height: 1.65;
  margin: 0 0 1.25rem;
}

.preview-hero__actions {
  display: flex;
  gap: 0.625rem;
  margin-bottom: 1.375rem;
}

.preview-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: 0.7rem;
  opacity: 0.7;
  cursor: not-allowed;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
}

.preview-btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: #ecfdf5;
  color: #059669;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.6rem 1rem;
  border: 2px solid #a7f3d0;
  border-radius: 0.7rem;
  opacity: 0.7;
  cursor: not-allowed;
}

/* ─── Benefits ────────────────────────────────────── */
.preview-benefits {
  background: linear-gradient(160deg, #ecfdf5, #f0fdf4);
  border: 2px solid #a7f3d0;
  border-radius: 1rem;
  padding: 1.125rem 1.25rem;
}

.preview-benefits__title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.75rem;
}

.preview-benefits__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.preview-benefits__item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.8375rem;
  color: #374151;
}

.preview-benefits__check {
  font-size: 0.7rem;
  font-weight: 800;
  color: #059669;
  flex-shrink: 0;
  margin-top: 0.1em;
}

/* ─── Detail Grid ─────────────────────────────────── */
.preview-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.875rem;
  margin-bottom: 1.25rem;
}

.preview-detail-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.875rem;
  padding: 1rem 1.125rem;
}

.preview-detail-card__heading {
  font-size: 0.875rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem;
}

.preview-detail-card__body {
  font-size: 0.85rem;
  color: #4b5563;
  line-height: 1.65;
  margin: 0;
  white-space: pre-line;
}

.preview-ingredients { margin-top: 0.25rem; }

.preview-ingredients__title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.75rem;
}

.preview-ingredients__list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.preview-ingredient-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.preview-ingredient-item strong { color: #111827; }

/* ─── Research ────────────────────────────────────── */
.preview-research-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.preview-research-card {
  display: flex;
  gap: 0.875rem;
  align-items: flex-start;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.875rem;
  padding: 1rem 1.125rem;
  transition: border-color 0.15s;
}

.preview-research-card:hover { border-color: #93c5fd; }

.preview-research-card__icon {
  color: #2563eb;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.preview-research-card__body { flex: 1; min-width: 0; }

.preview-research-card__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.3rem;
}

.preview-research-card__link {
  display: block;
  font-size: 0.8125rem;
  color: #2563eb;
  word-break: break-all;
  text-decoration: none;
  margin-bottom: 0.375rem;
}

.preview-research-card__desc {
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.preview-disclaimer {
  margin-top: 0.75rem;
  padding: 0.875rem 1rem;
  background: #ecfdf5;
  border: 1.5px solid #a7f3d0;
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  color: #374151;
  line-height: 1.6;
}

/* ─── Pricing ─────────────────────────────────────── */
.preview-pricing-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.875rem;
}

.preview-pricing-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.875rem;
  padding: 1.125rem;
}

.preview-pricing-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.preview-pricing-card__title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.preview-pricing-card__desc {
  font-size: 0.8375rem;
  color: #6b7280;
  margin: 0 0 0.875rem;
  line-height: 1.5;
}

.preview-pricing-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-pricing-option {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.75rem 0.875rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
}

.preview-pricing-option__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #111827;
}

.preview-pricing-option__price {
  font-size: 0.8375rem;
  color: #6b7280;
}

/* ─── Process ─────────────────────────────────────── */
.preview-process {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-process__step {
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.875rem;
  transition: border-color 0.15s;
}

.preview-process__step:hover { border-color: #6ee7b7; }

.preview-process__num {
  width: 2.5rem;
  height: 2.5rem;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  font-weight: 800;
  font-size: 0.9rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2);
}

.preview-process__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.25rem;
}

.preview-process__desc {
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.55;
  margin: 0;
}

/* ─── FAQs ────────────────────────────────────────── */
.preview-faq-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.preview-faq-item {
  padding: 1rem 1.125rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.875rem;
  transition: border-color 0.15s;
}

.preview-faq-item:hover { border-color: #6ee7b7; }

.preview-faq-item__q {
  font-size: 0.9rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem;
}

.preview-faq-item__a {
  font-size: 0.875rem;
  color: #4b5563;
  line-height: 1.65;
  margin: 0;
}

/* ─── Responsive ──────────────────────────────────── */
@media (max-width: 1200px) {
  .preview-shell { grid-template-columns: 260px minmax(0, 1fr); }
}

@media (max-width: 960px) {
  .preview-drawer {
    width: 100vw !important;
    max-width: 100vw !important;
  }

  .preview-shell { grid-template-columns: 1fr; }

  .preview-sidebar {
    position: static;
    height: auto;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .preview-hero,
  .preview-detail-grid,
  .preview-pricing-grid,
  .preview-sidebar__meta {
    grid-template-columns: 1fr;
  }
}
</style>
