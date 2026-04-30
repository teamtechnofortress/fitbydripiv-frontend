<script setup>
import { computed } from 'vue'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const heights = computed(() => ({
  base: Number(props.section.height ?? props.section.content?.height ?? 32),
  desktop: Number(props.section.desktop ?? props.section.content?.desktop ?? props.section.height ?? props.section.content?.height ?? 32),
  tablet: Number(props.section.tablet ?? props.section.content?.tablet ?? props.section.height ?? props.section.content?.height ?? 32),
  mobile: Number(props.section.mobile ?? props.section.content?.mobile ?? props.section.height ?? props.section.content?.height ?? 32),
}))
</script>

<template>
  <section
    class="page-spacer"
    :style="{
      '--spacer-base': `${heights.base}px`,
      '--spacer-desktop': `${heights.desktop}px`,
      '--spacer-tablet': `${heights.tablet}px`,
      '--spacer-mobile': `${heights.mobile}px`,
    }"
    aria-hidden="true"
  />
</template>

<style scoped>
.page-spacer {
  block-size: var(--spacer-desktop);
}

@media (max-width: 959px) {
  .page-spacer {
    block-size: var(--spacer-tablet);
  }
}

@media (max-width: 599px) {
  .page-spacer {
    block-size: var(--spacer-mobile);
  }
}
</style>
