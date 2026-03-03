<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import '@/styles/public-site.css'

const router = useRouter()
const route = useRoute()
const mobileMenuOpen = ref(false)

const navLinks = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'about', label: 'About', path: '/about' },
  { id: 'faq', label: 'FAQ', path: '/faq' },
  { id: 'contact', label: 'Contact', path: '/contact' },
]

const productCategories = [
  { id: 'weight-loss', label: 'Weight Loss', path: '/weight-loss' },
  { id: 'wellness', label: 'Wellness', path: '/wellness' },
  { id: 'longevity', label: 'Longevity', path: '/longevity' },
]

const footerLinks = {
  products: [
    { label: 'Weight Loss', path: '/weight-loss' },
    { label: 'Wellness', path: '/wellness' },
    { label: 'Longevity', path: '/longevity' },
  ],
  company: [
    { label: 'About Us', path: '/about' },
    { label: 'Contact', path: '/contact' },
    { label: 'Login', path: '/login', disabled: false },
  ],
  legal: [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
    { label: 'Legal', path: '/legal' },
    { label: 'Instructions', path: '/instructions' },
  ],
  resources: [
    { label: 'Frequently Asked Questions', path: '/faq', isExternal: false },
    { label: 'PubMed Research', url: 'https://pubmed.ncbi.nlm.nih.gov/', isExternal: true },
    { label: 'PMC Articles', url: 'https://www.ncbi.nlm.nih.gov/pmc/', isExternal: true },
    { label: 'NEJM Journal', url: 'https://www.nejm.org/', isExternal: true },
  ],
}

const navigate = (path) => {
  if (!path) return
  router.push(path)
  mobileMenuOpen.value = false
  window.scrollTo(0, 0)
}

const isActive = (path) => route.path === path

const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="public-site">
    <div class="min-h-screen bg-white" style="display: flex; flex-direction: column;">
      <!-- Header -->
      <header class="fixed w-full top-0 z-50 bg-white border-b border-gray-200">
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <button
              class="p-2 text-gray-600 hover:text-gray-900"
              @click="mobileMenuOpen = !mobileMenuOpen"
            >
              <svg v-if="!mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <div
              class="absolute left-1/2 transform -translate-x-1/2 cursor-pointer flex items-center hover:opacity-80 transition-opacity duration-200"
              @click="navigate('/')"
            >
              <h1 class="text-xl font-bold text-gray-900">FitByShot</h1>
            </div>

            <div class="w-10"></div>
          </div>

          <!-- Mobile Menu -->
          <div v-if="mobileMenuOpen" class="py-3 space-y-1 border-t border-gray-200">
            <button
              v-for="link in navLinks"
              :key="link.id"
              class="block w-full text-left px-4 py-2 text-sm font-medium rounded"
              :class="isActive(link.path)
                ? 'text-emerald-700 font-semibold gradient-bg-light'
                : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'"
              @click="navigate(link.path)"
            >
              {{ link.label }}
            </button>

            <div class="border-t border-gray-200 pt-2">
              <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Products</div>
              <button
                v-for="cat in productCategories"
                :key="cat.id"
                class="block w-full text-left px-4 py-2 text-sm font-medium rounded"
                :class="isActive(cat.path)
                  ? 'text-emerald-700 font-semibold gradient-bg-light'
                  : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'"
                @click="navigate(cat.path)"
              >
                {{ cat.label }}
              </button>
            </div>
          </div>
        </nav>
      </header>

      <!-- Main Content -->
      <main style="flex: 1;">
        <router-view />
      </main>

      <!-- Footer -->
      <footer class="border-t border-gray-200" style="background: linear-gradient(to bottom right, rgba(236,253,245,0.3), rgba(240,253,250,0.2), rgba(236,254,255,0.3));">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
            <!-- Brand -->
            <div class="lg:col-span-1">
              <div class="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                <h3 class="text-xl font-bold text-gray-900">FitByShot</h3>
              </div>
              <p class="text-sm text-gray-600 leading-relaxed">
                Prescription Weight Loss, Longevity, and Wellness specific to your goals.
              </p>
            </div>

            <!-- Products -->
            <div>
              <h4 class="font-semibold text-gray-900 mb-3">Products</h4>
              <ul class="space-y-2">
                <li v-for="link in footerLinks.products" :key="link.path">
                  <button
                    class="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                    @click="navigate(link.path)"
                  >{{ link.label }}</button>
                </li>
              </ul>
            </div>

            <!-- Company -->
            <div>
              <h4 class="font-semibold text-gray-900 mb-3">Company</h4>
              <ul class="space-y-2">
                <li v-for="link in footerLinks.company" :key="link.label">
                  <button
                    :class="link.disabled
                      ? 'text-sm text-gray-400 cursor-not-allowed'
                      : 'text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200'"
                    :disabled="link.disabled"
                    @click="navigate(link.path)"
                  >{{ link.label }}</button>
                </li>
              </ul>
            </div>

            <!-- Legal -->
            <div>
              <h4 class="font-semibold text-gray-900 mb-3">Legal</h4>
              <ul class="space-y-2">
                <li v-for="link in footerLinks.legal" :key="link.path">
                  <button
                    class="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                    @click="navigate(link.path)"
                  >{{ link.label }}</button>
                </li>
              </ul>
            </div>

            <!-- Research & Resources -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16.5h10"/></svg>
                <h4 class="font-semibold text-gray-900">Research &amp; Resources</h4>
              </div>
              <ul class="space-y-2">
                <li v-for="link in footerLinks.resources" :key="link.label">
                  <a
                    v-if="link.isExternal"
                    :href="link.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm text-gray-600 hover:text-emerald-600 transition-colors duration-200 flex items-center gap-1"
                  >
                    {{ link.label }}
                    <span class="text-xs">↗</span>
                  </a>
                  <button
                    v-else
                    class="text-sm text-gray-600 hover:text-emerald-600 transition-colors duration-200 font-medium"
                    @click="navigate(link.path)"
                  >{{ link.label }}</button>
                </li>
              </ul>
            </div>

            <!-- Connect -->
            <div>
              <h4 class="font-semibold text-gray-900 mb-3">Connect</h4>
              <div class="flex space-x-4 mb-4">
                <a href="#" class="text-gray-600 hover:text-emerald-600 transition-colors duration-200" aria-label="Facebook">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="#" class="text-gray-600 hover:text-emerald-600 transition-colors duration-200" aria-label="Instagram">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="#" class="text-gray-600 hover:text-emerald-600 transition-colors duration-200" aria-label="Twitter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
                </a>
                <a href="#" class="text-gray-600 hover:text-emerald-600 transition-colors duration-200" aria-label="Email">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </a>
              </div>
            </div>
          </div>

          <!-- Bottom bar -->
          <div class="border-t border-gray-200 mt-8 pt-6 text-center text-sm text-gray-600">
            <p class="mb-1">&copy; 2025-26 FitByShot. All Rights Reserved Worldwide.</p>
            <p>
              Designed by
              <a
                href="https://www.godesign.pk"
                target="_blank"
                rel="noopener noreferrer"
                class="text-emerald-600 hover:text-emerald-700"
              >GoDesign</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>
