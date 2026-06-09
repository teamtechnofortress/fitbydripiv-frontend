<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { normalizePublicSitePath } from '../../composables/normalizePublicSitePath'

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

const router = useRouter()

const title = computed(() => props.section.headline || props.pageSlug)
const words = computed(() => String(title.value || '').split(' ').filter(Boolean))

const description = computed(() =>
  props.section.description || 'Explore treatments tailored to this category.',
)

const eyebrow = computed(() => String(props.section.subtitle || props.section.eyebrow || '').trim())

const cta = computed(() => props.section.cta || props.section.content?.button || {})
const background = computed(() => props.section.background || null)

const backgroundImageStyle = computed(() => {
  if (background.value?.type !== 'image' || !background.value?.url)
    return null

  return { backgroundImage: `url(${background.value.url})` }
})

const navigate = path => {
  const target = normalizePublicSitePath(path)
  if (!target) return
  router.push(target)
  window.scrollTo(0, 0)
}
</script>

<template>
  <section class="relative overflow-hidden px-4 pt-24 pb-12 min-h-[420px] flex items-center justify-center">
    <video
      v-if="background?.type === 'video' && background?.url"
      autoplay
      loop
      muted
      playsinline
      class="absolute inset-0 w-full h-full object-cover opacity-75"
    >
      <source
        :src="background.url"
        type="video/mp4"
      >
    </video>

    <div
      v-else-if="backgroundImageStyle"
      class="absolute inset-0 bg-cover bg-center bg-no-repeat"
      :style="backgroundImageStyle"
    />

    <div
      v-else
      class="absolute inset-0 bg-gray-800"
    />

    <div
      class="absolute inset-0"
      style="background: linear-gradient(to bottom, rgba(17,24,39,0.4), rgba(17,24,39,0.25), rgba(17,24,39,0.4));"
    />

    <div class="max-w-5xl mx-auto text-center relative z-10">
      <!--
        <div
        v-if="eyebrow"
        class="inline-flex px-4 py-2 rounded-full border border-white/25 bg-white/10 text-xs font-semibold uppercase tracking-[0.14em] text-white mb-5"
        >
        {{ eyebrow }}
        </div> 
      -->

      <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 min-h-[80px] flex flex-wrap justify-center items-center gap-x-3 gap-y-2 text-stroke">
        <span
          v-for="(word, index) in words"
          :key="`${word}-${index}`"
          class="inline-block animate-fadeInUp"
          :style="{ animationDelay: `${index * 0.12}s`, opacity: 0, animationFillMode: 'forwards' }"
        >{{ word }}</span>
      </h1>

      <p class="text-lg text-white/95 mb-6 max-w-3xl mx-auto text-stroke-light">
        {{ description }}
      </p>

      <button
        v-if="cta.link"
        class="btn-primary"
        @click="navigate(cta.link)"
      >
        {{ cta.label || 'Start my journey' }}
      </button>
    </div>
  </section>
</template>
