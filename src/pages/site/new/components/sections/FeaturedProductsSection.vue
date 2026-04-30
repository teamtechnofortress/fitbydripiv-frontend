<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const router = useRouter()
const products = computed(() => (props.section.products || []).slice(0, props.section.content?.limit || 6))

const navigate = path => {
  if (!path) return
  router.push(path)
  window.scrollTo(0, 0)
}

const getProductPath = product => {
  if (product?.slug) return `/product/${product.slug}`
  return '/products/select'
}
</script>

<template>
  <section class="featured-shell">
    <div class="featured-shell__inner">
      <div v-if="loading && !products.length" class="featured-loading">
        <div class="featured-loading__spinner" />
        <span>Loading featured products...</span>
      </div>

      <div v-else class="featured-grid">
        <article
          v-for="product in products"
          :key="product.id"
          class="featured-card"
          @click="navigate(getProductPath(product))"
        >
          <div class="featured-card__copy">
            <div class="featured-card__eyebrow">Featured Treatment</div>
            <h3>{{ product.name }}</h3>
            <p>{{ product.short_description || product.description }}</p>
            <button
              class="featured-card__button"
              @click.stop="navigate(getProductPath(product))"
            >
              {{ section.content?.cta_label || 'View Details' }}
            </button>
          </div>

          <div class="featured-card__media">
            <img
              v-if="product.landscape_image || product.featured_image || product.cover_image?.image_url"
              :src="product.landscape_image || product.featured_image || product.cover_image?.image_url"
              :alt="product.name"
            >
            <div v-else class="featured-card__placeholder">
              {{ product.name?.charAt(0) }}
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.featured-shell {
  padding: 0 1.5rem;
}

.featured-shell__inner {
  max-width: 1200px;
  margin: 0 auto;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.featured-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 1.25rem;
  padding: 1.4rem;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
}

.featured-card:hover {
  transform: translateY(-2px);
  border-color: rgba(37, 99, 235, 0.22);
  box-shadow: 0 24px 46px rgba(15, 23, 42, 0.08);
}

.featured-card__eyebrow {
  color: #2563eb;
  text-transform: uppercase;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  margin-bottom: 0.8rem;
}

.featured-card__copy h3 {
  margin: 0 0 0.75rem;
  font-size: 1.55rem;
  line-height: 1.1;
  color: #0f172a;
}

.featured-card__copy p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.featured-card__button {
  margin-top: 1.25rem;
  border: none;
  background: none;
  color: #0f766e;
  font-weight: 700;
  padding: 0;
}

.featured-card__media {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  border-radius: 22px;
  background: linear-gradient(135deg, #f8fafc, #eef2ff);
  overflow: hidden;
}

.featured-card__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.25s ease;
}

.featured-card:hover .featured-card__media img {
  transform: scale(1.04);
}

.featured-card__placeholder {
  width: 84px;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #dbeafe;
  color: #2563eb;
  font-size: 2rem;
  font-weight: 800;
}

.featured-loading {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #475569;
  gap: 0.85rem;
}

.featured-loading__spinner {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid rgba(37, 99, 235, 0.15);
  border-top-color: #2563eb;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 959px) {
  .featured-grid {
    grid-template-columns: 1fr;
  }

  .featured-card {
    grid-template-columns: 1fr;
  }

  .featured-card__media {
    min-height: 280px;
  }
}
</style>
