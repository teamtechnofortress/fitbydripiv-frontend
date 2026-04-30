<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCmsDataStore } from '@/store/cmsData'

const store = useCmsDataStore()
const router = useRouter()
const route = useRoute()
const openFaqIndex = ref(null)
const productFaqs = ref([])
const faqSection = ref(null)

const processSteps = [
  { number: 1, title: 'Complete Our Telehealth Intake', description: 'Answer all our questions about your health and goals through our secure online form.' },
  { number: 2, title: 'Telehealth Review (0-48 Hours)', description: 'Our medical provider will review your intake information and medical history.' },
  { number: 3, title: 'Determining If Eligible to Receive Therapy', description: 'A medical professional will evaluate your eligibility based on your health profile and treatment goals.' },
  { number: 4, title: 'Customized Rx Delivered Right to You', description: 'If approved, your personalized prescription will be compounded and shipped directly to your door.' },
  { number: 5, title: 'Any Subsequent Orders Reviewed in Context', description: 'All future orders will be reviewed in the context of your ongoing telehealth journey and health goals.' },
]

const loadProduct = async () => {
  const slug = route.params.slug
  window.scrollTo(0, 0)
  openFaqIndex.value = null
  productFaqs.value = []
  await store.getProductBySlug(slug)
  productFaqs.value = store.currentProduct?.faqs || []
}

onMounted(loadProduct)
watch(() => route.params.slug, loadProduct)

const navigate = (path) => {
  router.push(path)
  window.scrollTo(0, 0)
}

const scrollToFAQs = () => {
  faqSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const categoryTitleMap = {
  weight_loss: 'Weight Loss',
  wellness: 'Wellness',
  longevity: 'Longevity',
}

const product = computed(() => store.currentProduct || null)
const categoryLabel = computed(() => {
  const raw = product.value?.category
  return categoryTitleMap[raw] || raw || 'Home'
})
const productImage = computed(() => (
  product.value?.cover_image?.image_url
  || product.value?.images?.[0]?.image_url
  || ''
))
const heroDescription = computed(() => (
  product.value?.description
  || ''
))

const benefits = () => {
  const b = product.value?.benefits
  if (Array.isArray(b)) return b.map(item => item?.benefit_text || item).filter(Boolean)
  if (typeof b === 'string') { try { return JSON.parse(b) } catch { return [] } }
  return []
}
const treatmentDetails = computed(() => ({
  how_it_works: product.value?.how_it_works || '',
  ingredients: Array.isArray(product.value?.ingredients) && product.value.ingredients.length
    ? product.value.ingredients.map(item => item?.name).filter(Boolean)
    : (product.value?.key_ingredients ? [product.value.key_ingredients] : []),
  duration: product.value?.treatment_duration || '',
  usage: product.value?.usage_instructions || '',
}))
const researchDescription = computed(() => (
  product.value?.clinical_research_description
  || ''
))
const researchLinks = computed(() => (
  Array.isArray(product.value?.research_links) ? product.value.research_links : []
))
</script>

<template>
  <div class="product-page">
    <!-- Loading State -->
    <div v-if="store.loading && !product" class="product-page__loading">
      <div class="product-page__spinner" />
    </div>

    <template v-else-if="product">
      <div class="product-page__container">

        <!-- Back Nav -->
        <nav class="product-page__breadcrumb">
          <button class="product-page__back-btn" @click="navigate('/')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to {{ categoryLabel }}
          </button>
        </nav>

        <!-- ── Hero Section ── -->
        <section class="product-hero">
          <div class="product-hero__media">
            <div class="product-hero__image-wrap">
              <img
                v-if="productImage"
                :src="productImage"
                :alt="product.name"
                class="product-hero__img"
              />
              <div v-else class="product-hero__initial">
                <span>{{ product.name?.charAt(0) }}</span>
              </div>
            </div>
          </div>

          <div class="product-hero__content">
            <span class="product-hero__badge">{{ categoryLabel }}</span>
            <h1 class="product-hero__title">{{ product.name }}</h1>
            <p class="product-hero__subtitle">{{ heroDescription }}</p>

            <div class="product-hero__actions">
              <button class="btn-primary" @click="navigate(`/pricing?slug=${product.slug}`)">
                Start my journey
              </button>
              <button
                v-if="productFaqs.length > 0"
                class="btn-ghost"
                @click="scrollToFAQs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span class="btn-ghost__label">FAQs</span>
              </button>
            </div>

            <!-- Key Benefits -->
            <div class="benefits-card">
              <h2 class="benefits-card__title">Key Benefits</h2>
              <ul class="benefits-card__list">
                <li v-for="(benefit, i) in benefits()" :key="i" class="benefits-card__item">
                  <span class="benefits-card__check">✓</span>
                  <span>{{ benefit }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ── About This Treatment ── -->
        <section class="content-section">
          <div class="content-section__header">
            <div class="content-section__icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h2 class="content-section__title">About This Treatment</h2>
          </div>
          <p class="content-section__body">{{ product.about_treatment || product.description }}</p>
        </section>

        <!-- ── Treatment Details ── -->
        <section v-if="treatmentDetails.how_it_works || treatmentDetails.ingredients?.length || treatmentDetails.duration || treatmentDetails.usage" class="content-section">
          <div class="content-section__header">
            <div class="content-section__icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
            </div>
            <h2 class="content-section__title">Treatment Details</h2>
          </div>

          <div class="details-grid">
            <div v-if="treatmentDetails.how_it_works" class="detail-card">
              <h3 class="detail-card__heading">How It Works</h3>
              <p class="detail-card__body">{{ treatmentDetails.how_it_works }}</p>
            </div>

            <div v-if="treatmentDetails.ingredients?.length" class="detail-card">
              <h3 class="detail-card__heading">Key Ingredients</h3>
              <ul class="detail-card__list">
                <li v-for="(ingredient, i) in treatmentDetails.ingredients" :key="i" class="detail-card__list-item">
                  <span class="detail-card__bullet" />
                  {{ ingredient }}
                </li>
              </ul>
            </div>

            <div v-if="treatmentDetails.duration" class="detail-card">
              <h3 class="detail-card__heading">Treatment Duration</h3>
              <p class="detail-card__body">{{ treatmentDetails.duration }}</p>
            </div>

            <div v-if="treatmentDetails.usage" class="detail-card">
              <h3 class="detail-card__heading">Usage Instructions</h3>
              <p class="detail-card__body">{{ treatmentDetails.usage }}</p>
            </div>
          </div>
        </section>

        <!-- ── Personalized Pricing ── -->
        <section class="content-section">
          <div class="content-section__header">
            <div class="content-section__icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h2 class="content-section__title">Personalized Pricing</h2>
          </div>
          <p class="content-section__body">
            Pricing for {{ product.name }} is customized based on your individual health goals, medical history, and treatment plan. Our medical team will provide the best option for you based on your provided telehealth information.
          </p>
          <div class="pricing-cta">
            <p class="pricing-cta__text">Contact us to discuss pricing and treatment options</p>
            <button class="btn-primary" @click="navigate(`/pricing?slug=${product.slug}`)">
              Start my journey
            </button>
          </div>
        </section>

        <!-- ── The Process ── -->
        <section class="content-section">
          <div class="content-section__header">
            <div class="content-section__icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <h2 class="content-section__title">The Process</h2>
          </div>
          <ol class="process-list">
            <li v-for="step in processSteps" :key="step.number" class="process-step">
              <div class="process-step__num">{{ step.number }}</div>
              <div class="process-step__connector" v-if="step.number < processSteps.length" />
              <div class="process-step__content">
                <h3 class="process-step__title">{{ step.title }}</h3>
                <p class="process-step__desc">{{ step.description }}</p>
              </div>
            </li>
          </ol>
        </section>

        <!-- ── Clinical Research ── -->
        <section v-if="researchDescription || researchLinks.length > 0" class="content-section">
          <div class="content-section__header">
            <div class="content-section__icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16.5h10"/></svg>
            </div>
            <h2 class="content-section__title">Clinical Research &amp; Scientific Evidence</h2>
          </div>
          <p class="content-section__body">
            {{ researchDescription || `Our treatments are backed by peer-reviewed clinical research from leading medical journals and institutions. Below are scientific studies supporting the safety and efficacy of ${product.name}.` }}
          </p>
          <div class="research-list">
            <article v-for="research in researchLinks" :key="research.id" class="research-card">
              <div class="research-card__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <div class="research-card__body">
                <h4 class="research-card__title">{{ research.title }}</h4>
                <p class="research-card__meta">
                  {{ [research.authors, research.publication_year ? `(${research.publication_year})` : '', research.journal].filter(Boolean).join('. ') }}
                </p>
                <div class="research-card__tags">
                  <span v-if="research.pubmed_id" class="research-tag research-tag--blue">{{ research.pubmed_id }}</span>
                  <span v-if="research.doi" class="research-tag research-tag--gray">{{ research.doi }}</span>
                  <a v-if="research.article_url" :href="research.article_url" target="_blank" rel="noopener noreferrer" class="research-tag research-tag--link">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    View Article
                  </a>
                </div>
              </div>
            </article>
          </div>
          <div class="research-disclaimer">
            <strong>Important:</strong> The research citations above are provided for informational purposes. Always consult with a qualified healthcare provider before starting any new treatment. Individual results may vary based on health status, goals, and adherence to prescribed protocols.
          </div>
        </section>

        <!-- ── Product FAQs ── -->
        <section v-if="productFaqs.length > 0" ref="faqSection" class="content-section scroll-mt-24">
          <div class="content-section__header">
            <div class="content-section__icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h2 class="content-section__title">Questions About {{ product.name }}</h2>
          </div>
          <div class="faq-list">
            <div v-for="(faq, index) in productFaqs" :key="faq.id" class="faq-item" :class="{ 'faq-item--open': openFaqIndex === index }">
              <button class="faq-item__trigger" @click="openFaqIndex = openFaqIndex === index ? null : index">
                <span>{{ faq.question }}</span>
                <svg class="faq-item__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div v-if="openFaqIndex === index" class="faq-item__answer">
                <p>{{ faq.answer }}</p>
              </div>
            </div>
          </div>
          <div class="faq-footer">
            <p>Have more questions? View our general FAQ page or contact our support team.</p>
            <button class="faq-footer__link" @click="navigate('/faq')">View General FAQs →</button>
          </div>
        </section>

        <!-- ── Bottom CTA ── -->
        <section class="product-cta">
          <div class="product-cta__content">
            <h2 class="product-cta__title">Ready to get started?</h2>
            <p class="product-cta__subtitle">View pricing options and select your plan to continue with {{ product.name }}</p>
            <div class="product-cta__actions">
              <button class="btn-primary btn-primary--lg" @click="navigate(`/pricing?slug=${product.slug}`)">
                Start my journey
              </button>
              <button
                v-if="productFaqs.length > 0"
                class="btn-secondary"
                @click="scrollToFAQs"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                View Product FAQs
              </button>
              <button v-else class="btn-secondary" @click="navigate('/faq')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                View General FAQs
              </button>
            </div>
          </div>
        </section>

      </div>
    </template>
  </div>
</template>

<style scoped>
/* ─── Base ─────────────────────────────────────────── */
.product-page {
  min-height: 100vh;
  padding-top: 5rem;
  background: #fff;
  font-family: inherit;
}

.product-page__loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 5rem;
}

.product-page__spinner {
  width: 3.5rem;
  height: 3.5rem;
  border: 3px solid #e5e7eb;
  border-top-color: #059669;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.product-page__container {
  max-width: 1040px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 4rem;
}

/* ─── Breadcrumb ──────────────────────────────────── */
.product-page__breadcrumb { margin-bottom: 1.75rem; }

.product-page__back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #059669;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.375rem 0.75rem 0.375rem 0.375rem;
  border-radius: 0.5rem;
  transition: background 0.15s, color 0.15s;
}

.product-page__back-btn:hover {
  background: #ecfdf5;
  color: #047857;
}

/* ─── Buttons ─────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
  white-space: nowrap;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(5, 150, 105, 0.35);
}

.btn-primary--lg {
  padding: 0.875rem 2.25rem;
  font-size: 1rem;
  border-radius: 0.875rem;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: #ecfdf5;
  color: #059669;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.7rem 1.125rem;
  border: 2px solid #a7f3d0;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}

.btn-ghost:hover {
  background: #d1fae5;
  border-color: #6ee7b7;
  transform: translateY(-1px);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #f3f4f6;
  color: #374151;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-secondary:hover { background: #e5e7eb; }

/* ─── Hero ────────────────────────────────────────── */
.product-hero {
  display: grid;
  grid-template-columns: minmax(260px, 340px) 1fr;
  gap: 2.5rem;
  margin-bottom: 3rem;
  padding-bottom: 3rem;
  border-bottom: 1px solid #e5e7eb;
}

.product-hero__image-wrap {
  aspect-ratio: 3/4;
  background: linear-gradient(160deg, #ecfdf5, #eff6ff);
  border-radius: 1.25rem;
  border: 1px solid #d1fae5;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(5, 150, 105, 0.08);
}

.product-hero__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 2rem;
}

.product-hero__initial {
  width: 7rem;
  height: 7rem;
  background: #fff;
  border-radius: 50%;
  border: 2px solid #a7f3d0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.12);
}

.product-hero__initial span {
  font-size: 2.5rem;
  font-weight: 700;
  color: #059669;
}

.product-hero__content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.product-hero__badge {
  display: inline-block;
  background: #ecfdf5;
  color: #065f46;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #a7f3d0;
  margin-bottom: 0.875rem;
  width: fit-content;
}

.product-hero__title {
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 800;
  color: #111827;
  line-height: 1.2;
  margin: 0 0 0.875rem;
}

.product-hero__subtitle {
  font-size: 0.9375rem;
  color: #4b5563;
  line-height: 1.65;
  margin: 0 0 1.5rem;
}

.product-hero__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.75rem;
}

/* ─── Benefits Card ───────────────────────────────── */
.benefits-card {
  background: linear-gradient(160deg, #ecfdf5, #f0fdf4);
  border: 2px solid #a7f3d0;
  border-radius: 1.125rem;
  padding: 1.375rem 1.5rem;
  box-shadow: 0 2px 12px rgba(5, 150, 105, 0.07);
}

.benefits-card__title {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 1rem;
}

.benefits-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.benefits-card__item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.5;
}

.benefits-card__check {
  font-size: 0.75rem;
  font-weight: 800;
  color: #059669;
  flex-shrink: 0;
  margin-top: 0.1em;
}

/* ─── Content Sections ────────────────────────────── */
.content-section {
  margin-bottom: 2.75rem;
  padding-bottom: 2.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.content-section:last-of-type { border-bottom: none; }

.content-section__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.125rem;
}

.content-section__icon-wrap {
  width: 2.25rem;
  height: 2.25rem;
  background: #ecfdf5;
  border: 1.5px solid #a7f3d0;
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #059669;
  flex-shrink: 0;
}

.content-section__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.content-section__body {
  font-size: 0.9375rem;
  color: #4b5563;
  line-height: 1.7;
  margin: 0;
  white-space: pre-line;
}

/* ─── Details Grid ────────────────────────────────── */
.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 0.25rem;
}

.detail-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1.25rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.detail-card:hover {
  border-color: #6ee7b7;
  box-shadow: 0 2px 12px rgba(5, 150, 105, 0.08);
}

.detail-card__heading {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.625rem;
}

.detail-card__body {
  font-size: 0.875rem;
  color: #4b5563;
  line-height: 1.65;
  margin: 0;
  white-space: pre-line;
}

.detail-card__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.detail-card__list-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.detail-card__bullet {
  width: 5px;
  height: 5px;
  background: #059669;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ─── Pricing CTA ─────────────────────────────────── */
.pricing-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.25rem;
  background: linear-gradient(160deg, #ecfdf5, #f0fdf4);
  border: 2px solid #a7f3d0;
  border-radius: 1.125rem;
  padding: 1.375rem 1.75rem;
}

.pricing-cta__text {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

/* ─── Process List ────────────────────────────────── */
.process-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.process-step {
  display: grid;
  grid-template-columns: 2.75rem 1px 1fr;
  gap: 0 1.125rem;
  align-items: stretch;
  padding-bottom: 1.5rem;
}

.process-step:last-child { padding-bottom: 0; }

.process-step__num {
  width: 2.75rem;
  height: 2.75rem;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  font-weight: 800;
  font-size: 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
  position: relative;
  z-index: 1;
}

.process-step__connector {
  width: 2px;
  background: linear-gradient(180deg, #a7f3d0, #d1fae5);
  margin: 0 auto;
  margin-top: 2.75rem;
}

.process-step__content {
  padding: 0.3rem 0 1.5rem;
  grid-column: 3;
  grid-row: 1;
}

.process-step:last-child .process-step__content { padding-bottom: 0; }

.process-step__title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.3rem;
}

.process-step__desc {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
}

/* ─── Research ────────────────────────────────────── */
.research-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin-top: 1rem;
}

.research-card {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1.125rem 1.25rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.research-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.07);
}

.research-card__icon {
  color: #2563eb;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.research-card__body { flex: 1; min-width: 0; }

.research-card__title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.375rem;
}

.research-card__meta {
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0 0 0.75rem;
  line-height: 1.5;
}

.research-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.research-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
}

.research-tag--blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.research-tag--gray { background: #f9fafb; color: #374151; border: 1px solid #d1d5db; }
.research-tag--link {
  background: transparent;
  color: #2563eb;
  border: none;
  text-decoration: none;
  cursor: pointer;
  padding: 0.25rem 0;
  transition: color 0.15s;
}
.research-tag--link:hover { color: #1d4ed8; }

.research-disclaimer {
  margin-top: 1.25rem;
  padding: 1rem 1.125rem;
  background: #ecfdf5;
  border: 2px solid #a7f3d0;
  border-radius: 0.875rem;
  font-size: 0.8125rem;
  color: #374151;
  line-height: 1.6;
}

/* ─── FAQs ────────────────────────────────────────── */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.faq-item {
  border: 1px solid #e5e7eb;
  border-radius: 0.875rem;
  overflow: hidden;
  transition: border-color 0.2s;
}

.faq-item--open, .faq-item:hover { border-color: #6ee7b7; }

.faq-item__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.125rem;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  transition: background 0.15s;
}

.faq-item__trigger:hover { background: #f9fafb; }

.faq-item__chevron {
  flex-shrink: 0;
  color: #6b7280;
  transition: transform 0.25s ease;
}

.faq-item--open .faq-item__chevron { transform: rotate(180deg); }

.faq-item__answer {
  padding: 0 1.125rem 1.125rem;
}

.faq-item__answer p {
  font-size: 0.9375rem;
  color: #4b5563;
  line-height: 1.7;
  margin: 0;
}

.faq-footer {
  margin-top: 1.375rem;
  padding: 1rem 1.375rem;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.faq-footer p {
  font-size: 0.875rem;
  color: #4b5563;
  margin: 0;
}

.faq-footer__link {
  background: none;
  border: none;
  color: #059669;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.faq-footer__link:hover { color: #047857; }

/* ─── Bottom CTA ──────────────────────────────────── */
.product-cta {
  margin-top: 3rem;
  padding-top: 2.75rem;
  border-top: 1px solid #e5e7eb;
}

.product-cta__content { text-align: center; }

.product-cta__title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 0.625rem;
}

.product-cta__subtitle {
  font-size: 0.9375rem;
  color: #6b7280;
  margin: 0 0 1.75rem;
}

.product-cta__actions {
  display: flex;
  gap: 0.875rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* ─── Responsive ──────────────────────────────────── */
@media (max-width: 768px) {
  .product-hero {
    grid-template-columns: 1fr;
  }

  .product-hero__image-wrap {
    aspect-ratio: 4/3;
    max-height: 300px;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .pricing-cta {
    flex-direction: column;
    align-items: flex-start;
  }

  .faq-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
