<script setup>
const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const iconMap = {
  'clipboard-list': 'tabler-clipboard-list',
  stethoscope: 'tabler-stethoscope',
  truck: 'tabler-truck-delivery',
}
</script>

<template>
  <section class="process-shell">
    <div class="process-shell__inner">
      <article
        v-for="item in section.items"
        :key="item.title"
        class="process-card"
      >
        <div class="process-card__orb">
          <VIcon :icon="iconMap[item.icon] || 'tabler-circle'" size="28" color="primary" />
        </div>
        <h3>{{ item.title }}</h3>
        <p>{{ item.description }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.process-shell {
  padding: 0 1.5rem 4rem;
}

.process-shell__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  border-radius: 34px;
  background:
    radial-gradient(circle at top left, rgba(16, 185, 129, 0.12), transparent 28%),
    linear-gradient(180deg, #effcf7, #eef7ff);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.2rem;
}

.process-card {
  padding: 1.5rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.16);
  text-align: center;
}

.process-card__orb {
  width: 74px;
  height: 74px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.08);
}

.process-card h3 {
  margin: 0 0 0.7rem;
  color: #0f172a;
  font-size: 1.12rem;
}

.process-card p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

@media (max-width: 959px) {
  .process-shell__inner {
    grid-template-columns: 1fr;
    padding: 1.25rem;
  }
}
</style>

