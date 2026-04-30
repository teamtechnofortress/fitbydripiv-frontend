<script setup>
const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const isAccordion = props.section.content?.layout !== 'list'
</script>

<template>
  <section class="faq-shell">
    <div class="faq-shell__inner">
      <div class="faq-grid">
        <article
          v-for="faq in section.faqs"
          :key="faq.id || faq.question"
          class="faq-card"
        >
          <template v-if="isAccordion">
            <details>
              <summary>{{ faq.question }}</summary>
              <p>{{ faq.answer }}</p>
            </details>
          </template>

          <template v-else>
            <h3>{{ faq.question }}</h3>
            <p>{{ faq.answer }}</p>
          </template>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.faq-shell {
  padding: 0 1.5rem 4rem;
}

.faq-shell__inner {
  max-width: 1040px;
  margin: 0 auto;
}

.faq-grid {
  display: grid;
  gap: 1rem;
}

.faq-card {
  padding: 1.15rem 1.2rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.05);
}

.faq-card details {
  display: block;
}

.faq-card summary,
.faq-card h3 {
  color: #0f172a;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  list-style: none;
}

.faq-card summary::-webkit-details-marker {
  display: none;
}

.faq-card p {
  margin: 0.85rem 0 0;
  color: #475569;
  line-height: 1.7;
}
</style>
