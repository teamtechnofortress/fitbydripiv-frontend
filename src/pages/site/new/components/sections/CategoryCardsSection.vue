<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { normalizePublicSitePath } from '../../composables/normalizePublicSitePath'

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
  const target = normalizePublicSitePath(path)
  if (!target) return
  router.push(target)
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
</script>

<template>
  <section class="py-12 px-4 border-t border-gray-200">
    <div class="max-w-6xl mx-auto">
      <div class="grid md:grid-cols-3 gap-6">
        <div
          v-for="item in orderedItems"
          :key="item.title"
          class="card overflow-hidden cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 relative"
          style="background: linear-gradient(to bottom right, rgba(219,234,254,0.4), rgba(207,250,254,0.3), rgba(219,234,254,0.4));"
          @click="navigate(getContentPagePath(item))"
        >
          <div class="relative z-10 p-6 text-center">
            <h3 class="text-xl font-bold text-gray-900 mb-2">{{ item.title }}</h3>
            <p class="text-sm text-gray-700 mb-4">{{ item.description }}</p>
            <button
              class="text-emerald-600 font-semibold text-sm hover:text-emerald-700 transition-colors"
              @click.stop="navigate(getContentPagePath(item))"
            >
              {{ item.cta_text || section.content?.cta_label || 'View Products' }} →
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
