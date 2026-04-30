<script setup>
import DynamicContentPage from './components/DynamicContentPage.vue'
</script>

<template>
  <DynamicContentPage slug="home" />
</template>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
