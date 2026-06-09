<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DynamicContentPage from './new/components/DynamicContentPage.vue'

const route = useRoute()

const slug = computed(() => {
  const pathSlug = String(route.path || '')
    .replace(/^\/+|\/+$/g, '')

  return pathSlug || 'home'
})
</script>

<template>
  <DynamicContentPage :slug="slug" />
</template>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
