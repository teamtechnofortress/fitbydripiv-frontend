<script setup>
import { ref } from 'vue'

const openIndex = ref(null)

const telehealthFAQs = [
  { question: 'What is telehealth and how does it work?', answer: 'Telehealth allows you to consult with licensed medical professionals remotely through our secure online platform. You complete a comprehensive intake form about your health and goals, and our medical team reviews your information to determine eligibility for treatment. This convenient approach eliminates the need for in-person office visits while maintaining high standards of medical care.' },
  { question: 'How long does the telehealth review process take?', answer: 'Our medical professionals typically review your intake information within 0-48 hours. You will be notified once your review is complete and whether you have been approved for treatment. In some cases, our team may request additional information to ensure your safety and treatment effectiveness.' },
  { question: 'What information do I need to provide?', answer: 'You will need to provide comprehensive information about your current health status, medical history, current medications, allergies, treatment goals, and any relevant health conditions. Be thorough and honest in your responses to ensure our medical team can make the best determination for your care.' },
  { question: 'Who will review my medical information?', answer: 'Your information is reviewed by licensed medical professionals who specialize in the treatment areas we offer. All of our providers are qualified to prescribe medications and make medical determinations based on your health profile and treatment goals.' },
  { question: 'Is my health information secure?', answer: 'Yes, we take your privacy seriously. All of your personal health information is protected in compliance with HIPAA regulations. We use secure, encrypted systems to store and transmit your data, and only authorized medical professionals have access to your information.' },
  { question: 'What happens if I am not approved?', answer: 'If our medical team determines that a particular treatment is not appropriate for you based on your health profile, we will notify you of the decision and, when possible, suggest alternative options that may be more suitable for your goals and circumstances.' },
  { question: 'Can I speak directly with a medical provider?', answer: 'While our primary consultation process is through our comprehensive intake form and medical review, you can reach out to our medical team with questions or concerns at any time. For complex situations, direct consultations can be arranged.' },
  { question: 'What if my health status changes?', answer: 'You should inform our medical team immediately if your health status changes, if you start new medications, or if you experience any unexpected symptoms. All subsequent orders are reviewed in the context of your initial health profile and any updates you provide.' },
  { question: 'How often will I need follow-up consultations?', answer: 'Follow-up frequency depends on your specific treatment and individual needs. Some treatments require regular check-ins to monitor progress and adjust dosages, while others may need less frequent oversight. Our medical team will provide guidance specific to your treatment plan.' },
  { question: 'Can I use telehealth if I live in any state?', answer: 'Telehealth regulations vary by state. We are continuously expanding our service areas. During the intake process, we will verify that we can serve patients in your location. If we cannot currently serve your state, we will let you know.' },
]

const toggleFAQ = index => {
  openIndex.value = openIndex.value === index ? null : index
}
</script>

<template>
  <div class="min-h-screen pt-20 bg-white">
    <section class="py-8 px-4 border-b border-gray-200 gradient-bg-light">
      <div class="max-w-4xl mx-auto text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Personalized Telehealth Consultations
        </h1>
        <p class="text-base text-gray-700">
          Everything you need to know about our remote healthcare services
        </p>
      </div>
    </section>

    <section class="py-12 bg-white">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">
            How Telehealth Works at FitByShot
          </h2>
          <p class="text-sm text-gray-700 leading-relaxed mb-4">
            Our telehealth process is designed to be simple, secure, and effective. Complete our comprehensive intake form about your health and goals, and our licensed medical professionals will review your information to determine your eligibility for treatment. Once approved, your customized prescription is delivered directly to your door.
          </p>
          <p class="text-sm text-gray-700 leading-relaxed">
            All treatments are administered under medical supervision with ongoing support throughout your wellness journey.
          </p>
        </div>

        <div class="space-y-3">
          <div
            v-for="(faq, index) in telehealthFAQs"
            :key="index"
            class="card"
          >
            <button
              class="w-full px-5 py-4 text-left flex items-center justify-between"
              @click="toggleFAQ(index)"
            >
              <h3 class="text-base font-semibold text-gray-900 pr-6">
                {{ faq.question }}
              </h3>
              <svg
                v-if="openIndex === index"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
class="flex-shrink-0"
              ><polyline points="18 15 12 9 6 15" /></svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
class="flex-shrink-0"
              ><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            <div
              v-if="openIndex === index"
              class="px-5 pb-4 pt-1"
            >
              <p class="text-sm text-gray-700 leading-relaxed">
                {{ faq.answer }}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-12 bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-3">
            Ready to Get Started?
          </h3>
          <p class="text-sm text-gray-700 leading-relaxed mb-4">
            Take the first step toward your health and wellness goals. Complete our telehealth intake form, and our medical team will review your information within 0-48 hours to determine your eligibility for treatment.
          </p>
          <p class="text-sm text-gray-700 leading-relaxed">
            If you have additional questions about the telehealth process, please don't hesitate to contact our support team.
          </p>
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
