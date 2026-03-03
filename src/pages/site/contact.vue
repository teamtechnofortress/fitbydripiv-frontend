<script setup>
import { ref } from 'vue'
import { useCmsDataStore } from '@/store/cmsData'

const store = useCmsDataStore()
const formData = ref({ name: '', email: '', message: '' })
const submitted = ref(false)
const loading = ref(false)

const handleSubmit = async () => {
  loading.value = true
  const success = await store.submitContact({
    name: formData.value.name,
    email: formData.value.email,
    message: formData.value.message,
    type: 'general',
  })
  if (success) {
    submitted.value = true
    formData.value = { name: '', email: '', message: '' }
    setTimeout(() => { submitted.value = false }, 5000)
  }
  loading.value = false
}
</script>

<template>
  <div class="min-h-screen pt-20 bg-white">
    <section class="py-8 px-4 border-b border-gray-200">
      <div class="max-w-4xl mx-auto text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p class="text-base text-gray-700">We're here to answer your questions and help you start your health journey</p>
      </div>
    </section>

    <section class="py-12 bg-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-2 gap-10">
          <div>
            <h2 class="text-xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p class="text-sm text-gray-700 mb-6 leading-relaxed">
              Ready to begin? Complete our Telehealth form to tell us about your health and goals. Our medical team will review your information to determine your eligibility for treatment. Have questions? We're here to help!
            </p>
            <div class="space-y-4">
              <div class="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-1"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <div class="ml-3">
                  <h3 class="text-sm font-semibold text-gray-900">Email Support</h3>
                  <p class="text-sm text-gray-600">Support@FitbyShot.com</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <form class="card p-6" @submit.prevent="handleSubmit">
              <div class="mb-5">
                <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  id="name" v-model="formData.name" type="text" required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all text-sm bg-white text-gray-900"
                />
              </div>
              <div class="mb-5">
                <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email" v-model="formData.email" type="email" required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all text-sm bg-white text-gray-900"
                />
              </div>
              <div class="mb-5">
                <label for="message" class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  id="message" v-model="formData.message" rows="5" required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all text-sm bg-white text-gray-900"
                ></textarea>
              </div>
              <div v-if="submitted" class="mb-5 p-3 gradient-bg-light text-emerald-800 rounded-lg text-sm border-2 border-emerald-200">
                Thank you! We'll get back to you soon.
              </div>
              <button type="submit" :disabled="loading" class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {{ loading ? 'Sending...' : 'Send Message' }}
              </button>
            </form>
          </div>
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
