<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AddProduct from '@/views/pages/admin/add-product.vue'
import ProductsListBase from '@/views/pages/admin/products-list-base.vue'

const route = useRoute()
const router = useRouter()

const activeSection = computed(() => {
  if (route.query.section === 'drafts')
    return 'drafts'

  if (route.query.section === 'add' || (typeof route.params.id === 'string' && route.params.id))
    return 'add'

  return 'all'
})

const moduleSections = [
  {
    key: 'all',
    title: 'All Products',
    icon: 'tabler-packages',
    color: 'primary',
  },
  {
    key: 'drafts',
    title: 'Draft Products',
    icon: 'tabler-file-pencil',
    color: 'warning',
  },
  {
    key: 'add',
    title: 'Add Product',
    icon: 'tabler-package',
    color: 'success',
  },
]

const buildProductsRoute = section => {
  const hasId = typeof route.params.id === 'string' && route.params.id

  if (section === 'add' && hasId) {
    return {
      path: `/admin/products/${route.params.id}`,
      query: { section: 'add' },
    }
  }

  return {
    path: '/admin/products',
    query: section === 'all' ? {} : { section },
  }
}

watch(
  () => [route.params.tab, route.params.id, route.query.section],
  ([tab, id, section]) => {
    if (tab === 'products')
      return

    if (tab === 'product_drafts') {
      router.replace({
        path: '/admin/products',
        query: { section: 'drafts' },
      })

      return
    }

    if (tab === 'add_product') {
      if (typeof id === 'string' && id) {
        router.replace({
          path: `/admin/products/${id}`,
          query: { section: 'add' },
        })
      } else {
        router.replace({
          path: '/admin/products',
          query: { section: 'add' },
        })
      }

      return
    }

    if (section === 'drafts' || section === 'add')
      return
  },
  { immediate: true },
)
</script>

<template>
  <section class="products-module">
    <div class="module-section-grid">
      <button
        v-for="section in moduleSections"
        :key="section.key"
        type="button"
        class="module-section-card"
        :class="{ 'module-section-card--active': activeSection === section.key }"
        @click="router.push(buildProductsRoute(section.key))"
      >
        <div
          class="module-section-card__icon"
          :style="{ backgroundColor: `rgba(var(--v-theme-${section.color}), 0.14)` }"
        >
          <VIcon
            :icon="section.icon"
            :color="section.color"
            size="22"
          />
        </div>
        <div>
          <div class="text-subtitle-1 font-weight-bold">
            {{ section.title }}
          </div>
        </div>
      </button>
    </div>

    <div class="mt-6">
      <ProductsListBase
        v-if="activeSection === 'all'"
        mode="all"
        :hide-navigation="true"
        :completed-only="true"
      />
      <ProductsListBase
        v-else-if="activeSection === 'drafts'"
        mode="drafts"
        :hide-navigation="true"
      />
      <AddProduct v-else />
    </div>
  </section>
</template>

<style scoped>
.module-hero {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.12), transparent 34%),
    linear-gradient(135deg, rgba(var(--v-theme-surface), 1), rgba(var(--v-theme-primary), 0.03));
}

.module-hero__copy {
  max-width: 720px;
}

.module-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.module-section-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.module-section-card {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 18px;
  background: rgba(var(--v-theme-surface), 1);
  text-align: start;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.module-section-card:hover,
.module-section-card--active {
  border-color: rgba(var(--v-theme-primary), 0.24);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.module-section-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 42px;
  border-radius: 12px;
}

@media (max-width: 960px) {
  .module-section-grid {
    grid-template-columns: 1fr;
  }
}
</style>
