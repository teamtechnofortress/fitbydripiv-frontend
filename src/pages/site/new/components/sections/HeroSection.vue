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

const content = computed(() => props.section.content || {})
const cta = computed(() => content.value.cta || {})
const background = computed(() => content.value.background || {})
const words = computed(() => String(content.value.headline || '').split(' ').filter(Boolean))
const eyebrow = computed(() => String(props.section.subtitle || content.value.eyebrow || '').trim())

const backgroundImageStyle = computed(() => {
  const imageUrl = background.value.type === 'image' ? background.value.url : background.value.poster

  if (!imageUrl)
    return null

  return { backgroundImage: `url(${imageUrl})` }
})

const navigate = path => {
  const target = normalizePublicSitePath(path)
  if (!target) return
  router.push(target)
  window.scrollTo(0, 0)
}
</script>

<template>
  <section class="relative overflow-hidden px-4 pt-24 pb-12 min-h-[500px] flex items-center justify-center">
    <video
      v-if="background.type === 'video' && background.url"
      autoplay
      loop
      muted
      playsinline
      class="absolute inset-0 w-full h-full object-cover opacity-75"
      :poster="background.poster"
    >
      <source :src="background.url" type="video/mp4">
    </video>
    <div
      v-else-if="backgroundImageStyle"
      class="absolute inset-0 bg-cover bg-center bg-no-repeat"
      :style="backgroundImageStyle"
    />
    <div v-else class="absolute inset-0 bg-gray-800" />
    <div
      class="absolute inset-0"
      style="background: linear-gradient(to bottom, rgba(17,24,39,0.4), rgba(17,24,39,0.25), rgba(17,24,39,0.4));"
    />

    <div class="max-w-5xl mx-auto text-center relative z-10">
      <!-- <div
        v-if="eyebrow"
        class="inline-flex px-4 py-2 rounded-full border border-white/25 bg-white/10 text-xs font-semibold uppercase tracking-[0.14em] text-white mb-5"
      >
        {{ eyebrow }}
      </div> -->

      <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 min-h-[120px] md:min-h-[100px] flex flex-wrap justify-center items-center gap-x-3 gap-y-2 text-stroke">
        <span
          v-for="(word, index) in words"
          :key="`${word}-${index}`"
          class="inline-block animate-fadeInUp"
          :style="{ animationDelay: `${index * 0.15}s`, opacity: 0, animationFillMode: 'forwards' }"
        >{{ word }}</span>
      </h1>

      <p v-if="content.description" class="text-lg text-white/95 mb-6 max-w-3xl mx-auto text-stroke-light">
        {{ content.description }}
      </p>

      <button class="btn-primary" @click="navigate(cta.link)">
        {{ cta.label || 'Start my journey' }}
      </button>
    </div>
  </section>
</template>
