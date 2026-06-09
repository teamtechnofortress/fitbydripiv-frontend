<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DynamicContentPage from '../new/components/DynamicContentPage.vue'

const route = useRoute()

const slug = computed(() => {
  return String(route.path || '').replace(/^\/+|\/+$/g, '')
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
