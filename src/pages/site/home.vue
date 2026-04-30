<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  router.replace('/')
})
</script>

<template>
  <div class="min-h-screen" />
</template>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
