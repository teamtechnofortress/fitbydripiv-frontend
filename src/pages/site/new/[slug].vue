<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DynamicContentPage from './components/DynamicContentPage.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug || 'home'))
</script>

<template>
  <DynamicContentPage :slug="slug" />
</template>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
