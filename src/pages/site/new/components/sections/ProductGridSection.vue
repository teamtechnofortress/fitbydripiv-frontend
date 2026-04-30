<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
  pageSlug: {
    type: String,
    default: '',
  },
})

const router = useRouter()

const limitedProducts = computed(() => {
  const limit = Number(props.section.content?.limit || 12)
  return (props.section.products || []).slice(0, limit)
})

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
  <section class="product-grid-shell">
    <div class="product-grid-shell__inner">
      <div v-if="limitedProducts.length > 0" class="product-grid-shell__grid">
        <article
          v-for="product in limitedProducts"
          :key="product.id"
          class="product-grid-card"
          @click="navigate(getProductPath(product))"
        >
          <div class="product-grid-card__media">
            <img
              v-if="product.landscape_image || product.featured_image || product.cover_image?.image_url"
              :src="product.landscape_image || product.featured_image || product.cover_image?.image_url"
              :alt="product.name"
              class="product-grid-card__image"
              loading="lazy"
            >
            <div v-else class="product-grid-card__placeholder">
              <span>{{ product.name?.charAt(0) }}</span>
            </div>
          </div>

          <div class="product-grid-card__content">
            <h3>{{ product.name }}</h3>
            <p>{{ product.short_description || product.description }}</p>
            <button
              class="product-grid-card__button"
              @click.stop="navigate(getProductPath(product))"
            >
              {{ section.content?.cta_label || 'View Details' }}
            </button>
          </div>
        </article>
      </div>

      <div v-else class="product-grid-shell__empty">
        Products coming soon. Check back later!
      </div>
    </div>
  </section>
</template>

<style scoped>
.product-grid-shell {
  padding: 3rem 1rem;
  background: #fff;
}

.product-grid-shell__inner {
  max-width: 72rem;
  margin: 0 auto;
}

.product-grid-shell__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

.product-grid-card {
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 1);
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-grid-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
}

.product-grid-card__media {
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 1rem;
  background: #f9fafb;
}

.product-grid-card__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.product-grid-card__placeholder {
  width: 5rem;
  height: 5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(229, 231, 235, 1);
  border-radius: 999px;
  background: #fff;
}

.product-grid-card__placeholder span {
  color: #2563eb;
  font-size: 1.875rem;
  font-weight: 700;
}

.product-grid-card__content {
  padding: 1.25rem;
}

.product-grid-card__content h3 {
  margin: 0 0 0.5rem;
  color: #111827;
  font-size: 1.125rem;
  font-weight: 700;
}

.product-grid-card__content p {
  margin: 0 0 1rem;
  color: #4b5563;
  font-size: 0.875rem;
  line-height: 1.6;
}

.product-grid-card__button {
  width: 100%;
  padding: 0.6rem 1rem;
  border: 1px solid rgba(191, 219, 254, 0.5);
  border-radius: 0.5rem;
  background: linear-gradient(to right, rgba(96, 165, 250, 0.2), rgba(34, 211, 238, 0.15), rgba(96, 165, 250, 0.2));
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.product-grid-shell__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 12rem;
  color: #4b5563;
}

@media (max-width: 959px) {
  .product-grid-shell__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .product-grid-shell__grid {
    grid-template-columns: 1fr;
  }
}
</style>
