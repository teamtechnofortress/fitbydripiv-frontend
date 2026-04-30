<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const router = useRouter()

const orderedItems = computed(() => (
  [...(props.section.items || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
))

const navigate = path => {
  if (!path) return
  router.push(path)
  window.scrollTo(0, 0)
}

const getContentPagePath = item => {
  const categorySlug = item?.category?.slug
  if (categorySlug)
    return `/new/${categorySlug}`

  if (item?.cta_link) {
    try {
      const parsed = new URL(item.cta_link, window.location.origin)
      const queryCategory = parsed.searchParams.get('category')
      if (queryCategory)
        return `/new/${queryCategory}`

      const pathSlug = parsed.pathname.split('/').filter(Boolean).at(-1)
      if (pathSlug)
        return `/new/${pathSlug}`
    } catch {
      const rawSlug = item.cta_link.replace(/^\/+/, '').split('?')[0]
      if (rawSlug)
        return `/new/${rawSlug.split('/').filter(Boolean).at(-1)}`
    }
  }

  return `/new/${item.title?.toLowerCase?.().replace(/\s+/g, '-')}`
}

const iconMap = {
  activity: 'tabler-activity',
  sparkles: 'tabler-sparkles',
  'shield-heart': 'tabler-shield-heart',
}
</script>

<template>
  <section class="categories-shell">
    <div class="categories-shell__inner">
      <article
        v-for="item in orderedItems"
        :key="item.title"
        class="category-card"
        @click="navigate(getContentPagePath(item))"
      >
        <div class="category-card__icon">
          <VIcon :icon="iconMap[item.icon] || 'tabler-circle'" size="24" color="primary" />
        </div>
        <h3>{{ item.title }}</h3>
        <p>{{ item.description }}</p>
        <button class="category-card__button">{{ item.cta_text || section.content?.cta_label || 'View Products' }}</button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.categories-shell {
  padding: 0 1.5rem;
}

.categories-shell__inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.1rem;
}

.category-card {
  position: relative;
  padding: 1.5rem;
  border-radius: 26px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background:
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.1), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(240, 249, 255, 0.98));
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
}

.category-card__icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(37, 99, 235, 0.08);
  margin-bottom: 1rem;
}

.category-card h3 {
  margin: 0 0 0.75rem;
  font-size: 1.35rem;
  color: #0f172a;
}

.category-card p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.category-card__button {
  margin-top: 1.1rem;
  border: none;
  background: none;
  color: #0f766e;
  font-weight: 700;
  padding: 0;
}

@media (max-width: 959px) {
  .categories-shell__inner {
    grid-template-columns: 1fr;
  }
}
</style>
