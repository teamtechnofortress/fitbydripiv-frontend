<script setup>
import { computed } from 'vue'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
  pageSlug: {
    type: String,
    default: '',
  },
})

const category = computed(() => props.section.category || {})

const backgroundStyle = computed(() => {
  const bannerImage = category.value?.landscape_banner || category.value?.banner_image || props.section.image

  if (category.value?.background_video)
    return null

  if (bannerImage)
    return { backgroundImage: `url(${bannerImage})` }

  return null
})
</script>

<template>
  <section class="category-hero">
    <video
      v-if="category?.background_video"
      autoplay
      loop
      muted
      playsinline
      class="category-hero__media"
    >
      <source :src="category.background_video" type="video/mp4">
    </video>
    <div
      v-else-if="backgroundStyle"
      class="category-hero__media category-hero__media--image"
      :style="backgroundStyle"
    />
    <div
      v-else
      class="category-hero__media category-hero__media--fallback"
    />

    <div class="category-hero__overlay" />

    <div class="category-hero__inner">
      <div v-if="section.subtitle" class="category-hero__eyebrow">
        {{ section.subtitle }}
      </div>
      <h1 class="category-hero__title">
        {{ category?.name || section.content?.headline || pageSlug }}
      </h1>
      <p class="category-hero__description">
        {{ category?.description || section.content?.description || 'Explore treatments tailored to this category.' }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.category-hero {
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 4rem 1rem;
}

.category-hero__media,
.category-hero__overlay {
  position: absolute;
  inset: 0;
}

.category-hero__media {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-hero__media--image {
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.category-hero__media--fallback {
  background: #1f2937;
}

.category-hero__overlay {
  background: linear-gradient(to bottom, rgba(17, 24, 39, 0.4), rgba(17, 24, 39, 0.25), rgba(17, 24, 39, 0.4));
}

.category-hero__inner {
  position: relative;
  z-index: 1;
  max-width: 64rem;
  margin: 0 auto;
  text-align: center;
  color: #fff;
}

.category-hero__eyebrow {
  display: inline-block;
  margin-bottom: 1rem;
  padding: 0.45rem 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.82rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.category-hero__title {
  margin: 0 0 1rem;
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.05;
  text-shadow: 0 2px 10px rgba(15, 23, 42, 0.35);
}

.category-hero__description {
  max-width: 48rem;
  margin: 0 auto;
  font-size: 1.08rem;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 8px rgba(15, 23, 42, 0.35);
}

</style>
