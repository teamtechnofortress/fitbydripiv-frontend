<script setup>
import AdminPageBuilder from '@/views/pages/admin/site-pages/AdminPageBuilder.vue'
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <AdminPageBuilder :page-id="String(route.params.id || '')" />
</template>

<route lang="yaml">
meta:
  layout: blank
</route>
