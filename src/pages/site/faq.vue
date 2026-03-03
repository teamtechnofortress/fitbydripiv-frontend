<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const openIndex = ref(null)

const generalFAQs = [
  {
    question: 'How do I get started with FitByShot?',
    answer: 'Getting started is simple! Complete our Telehealth form about your health and goals. Our medical team will review your information to determine your eligibility for treatment. Once approved, your customized prescription will be delivered right to your door.',
  },
  {
    question: 'What treatments do you offer?',
    answer: 'We offer three main categories of treatments: Weight Loss (Semaglutide and Tirzepatide for prescription weight loss), Wellness (B12 for energy and metabolism, Glutathione for immunity and detoxification), and Longevity (NAD+ therapy for cellular energy and healthy aging).',
  },
  {
    question: 'How long until I see results?',
    answer: 'Results vary by treatment. Weight loss treatments typically show results within 2-4 weeks. NAD+ therapy may provide immediate energy benefits, with long-term cellular benefits over 4-8 weeks. B12 energy improvements are often noticed within 24-48 hours. Glutathione benefits may be noticed within 2-4 weeks.',
  },
  {
    question: 'Are these treatments safe?',
    answer: 'Yes, all our treatments are administered under medical supervision. Our medical professionals review your health information and eligibility before prescribing any treatment. We provide ongoing support and monitoring throughout your wellness journey.',
  },
  {
    question: 'How are the treatments delivered?',
    answer: 'Your customized prescription is delivered reliably right to your door. Delivery methods vary by treatment: weight loss medications are weekly injections, NAD+ is available as IV, nasal, oral, or injectable forms, B12 is administered via intramuscular injection, and Glutathione is available in multiple forms including IV, injection, or oral.',
  },
  {
    question: 'What if I need to adjust my treatment?',
    answer: 'Any subsequent orders will be reviewed in the context of your initial health and wellness goals. Our medical team monitors your progress and can adjust your treatment plan as needed to ensure optimal results. Contact us anytime if you have concerns or need modifications.',
  },
  {
    question: 'Do I need a prescription for these treatments?',
    answer: 'Yes, all our treatments require a prescription. After you complete our Telehealth form, our medical professionals will review your eligibility and prescribe the appropriate treatment based on your health goals and medical history.',
  },
  {
    question: 'What makes FitByShot different?',
    answer: 'FitByShot offers prescription weight loss, longevity, and wellness specific to your goals. We provide support for body, mind, and cellular health with treatments customized for your needs. Health is simplified and reliably delivered right to your door with ongoing medical oversight.',
  },
]

const toggleFAQ = (index) => {
  openIndex.value = openIndex.value === index ? null : index
}

const navigate = (path) => {
  router.push(path)
  window.scrollTo(0, 0)
}
</script>

<template>
  <div class="min-h-screen pt-20 bg-white">
    <section class="py-8 px-4 border-b border-gray-200 gradient-bg-light">
      <div class="max-w-4xl mx-auto text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
        <p class="text-base text-gray-700">Find answers to common questions about our treatments and services</p>
      </div>
    </section>

    <section class="py-12 bg-white">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="space-y-3">
          <div v-for="(faq, index) in generalFAQs" :key="index" class="card">
            <button
              class="w-full px-5 py-4 text-left flex items-center justify-between"
              @click="toggleFAQ(index)"
            >
              <h3 class="text-base font-semibold text-gray-900 pr-6">{{ faq.question }}</h3>
              <svg v-if="openIndex === index" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0"><polyline points="18 15 12 9 6 15"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-if="openIndex === index" class="px-5 pb-4">
              <p class="text-sm text-gray-700 leading-relaxed">{{ faq.answer }}</p>
            </div>
          </div>
        </div>

        <div class="mt-12 text-center py-8 border-t border-gray-200">
          <h2 class="text-xl font-bold text-gray-900 mb-2">Still have questions?</h2>
          <p class="text-sm text-gray-700 mb-4">Our team is here to help. Get in touch and we'll answer any questions you have.</p>
          <button class="btn-primary" @click="navigate('/contact')">Contact Us</button>
        </div>
      </div>
    </section>
  </div>
</template>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
