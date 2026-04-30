<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const router = useRouter()
const cta = props.section.content?.cta || {}
const background = props.section.content?.background || {}

const navigate = path => {
  if (!path) return
  router.push(path)
  window.scrollTo(0, 0)
}
</script>

<template>
  <section class="hero-shell">
    <div class="hero-background">
      <video
        v-if="background.type === 'video' && background.url"
        autoplay
        loop
        muted
        playsinline
        class="hero-background__media"
        :poster="background.poster"
      >
        <source :src="background.url" type="video/mp4">
      </video>
      <div v-else class="hero-background__fallback" />
      <div class="hero-background__overlay" />
    </div>

    <div class="hero-shell__inner">
      <div class="hero-copy">
        <div v-if="section.subtitle" class="hero-copy__eyebrow">{{ section.subtitle }}</div>
        <h1 class="hero-copy__title">{{ section.content?.headline }}</h1>
        <p class="hero-copy__description">{{ section.content?.description }}</p>

        <div class="hero-copy__actions">
          <button class="hero-button" @click="navigate(cta.link)">
            {{ cta.label || 'Get Started' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-shell {
  position: relative;
  padding: 6rem 1.5rem 4rem;
  overflow: hidden;
}

.hero-background,
.hero-background__media,
.hero-background__fallback,
.hero-background__overlay {
  position: absolute;
  inset: 0;
}

.hero-background__media,
.hero-background__fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-background__fallback {
  background: linear-gradient(135deg, #0f172a, #1d4ed8, #10b981);
}

.hero-background__overlay {
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.2), transparent 24%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.74), rgba(15, 23, 42, 0.58));
}

.hero-shell__inner {
  position: relative;
  z-index: 1;
  max-width: 1120px;
  margin: 0 auto;
  display: block;
}

.hero-copy__eyebrow {
  display: inline-flex;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #d1fae5;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy__title {
  margin: 1rem 0;
  color: #fff;
  font-size: clamp(2.8rem, 5vw, 5rem);
  line-height: 0.98;
  font-weight: 800;
  letter-spacing: -0.04em;
  max-width: 880px;
}

.hero-copy__description {
  max-width: 680px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 1.05rem;
  line-height: 1.75;
}

.hero-copy__actions {
  margin-top: 1.75rem;
}

.hero-button {
  border: none;
  border-radius: 999px;
  padding: 0.95rem 1.5rem;
  background: linear-gradient(90deg, #10b981, #2563eb);
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hero-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 22px 44px rgba(37, 99, 235, 0.32);
}

@media (max-width: 959px) {
  .hero-shell {
    padding-top: 5.25rem;
  }
}
</style>
