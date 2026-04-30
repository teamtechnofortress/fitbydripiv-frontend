<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { useRouter, useRoute } from 'vue-router'
import { PUBLIC_LAYOUT_URL, SERVER_DOMAIN } from '@/network/const'
import '@/styles/public-site.css'

const router = useRouter()
const route = useRoute()
const mobileMenuOpen = ref(false)
const layoutLoading = ref(false)
const layoutData = ref(null)

const fallbackLayout = {
  header: {
    data: {
      brand: {
        name: 'FitByShot',
        logo: null,
        description: 'Prescription Weight Loss, Longevity, and Wellness specific to your goals.',
        home_url: '/',
      },
      layout: {
        show_menu_toggle: true,
        show_brand_centered: true,
      },
      menu: [
        {
          type: 'group',
          label: 'Products',
          items: [
            { label: 'Weight Loss', href: '/weight-loss' },
            { label: 'Wellness', href: '/wellness' },
            { label: 'Longevity', href: '/longevity' },
          ],
        },
        { type: 'link', label: 'About', href: '/about', external: false },
        { type: 'link', label: 'FAQ', href: '/faq', external: false },
        { type: 'link', label: 'Contact', href: '/contact', external: false },
      ],
    },
  },
  footer: {
    data: {
      columns: [
        {
          type: 'brand',
          title: 'FitByShot',
          logo: null,
          content: 'Prescription Weight Loss, Longevity, and Wellness specific to your goals.',
          home_url: '/',
        },
        {
          type: 'links',
          title: 'Products',
          items: [
            { label: 'Weight Loss', href: '/weight-loss' },
            { label: 'Wellness', href: '/wellness' },
            { label: 'Longevity', href: '/longevity' },
          ],
        },
        {
          type: 'links',
          title: 'Company',
          items: [
            { label: 'About Us', href: '/about' },
            { label: 'Contact', href: '/contact' },
            { label: 'Login', href: '/login' },
          ],
        },
        {
          type: 'links',
          title: 'Legal',
          items: [
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
            { label: 'Legal', href: '/legal' },
            { label: 'Instructions', href: '/instructions' },
          ],
        },
      ],
      bottom: {
        copyright: '© 2025-26 FitByShot. All Rights Reserved Worldwide.',
        credit: 'Designed by GoDesign',
      },
    },
  },
}

const resolveAssetUrl = value => {
  if (!value) return ''
  if (/^https?:\/\//.test(value)) return value
  if (value.startsWith('/')) return `${SERVER_DOMAIN}${value}`
  return `${SERVER_DOMAIN}/storage/${value.replace(/^\/+/, '')}`
}

const headerConfig = computed(() => layoutData.value?.header?.data || fallbackLayout.header.data)
const footerConfig = computed(() => layoutData.value?.footer?.data || fallbackLayout.footer.data)
const brandConfig = computed(() => headerConfig.value?.brand || fallbackLayout.header.data.brand)
const headerMenu = computed(() => headerConfig.value?.menu || [])
const footerColumns = computed(() => footerConfig.value?.columns || [])
const footerBottom = computed(() => footerConfig.value?.bottom || {})
const centeredBrand = computed(() => headerConfig.value?.layout?.show_brand_centered !== false)

const normalizePath = value => {
  if (!value) return ''
  const path = String(value).trim()
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (path === 'home' || path === '/home') return '/'
  return path.startsWith('/') ? path : `/${path}`
}

const resolveLinkHref = link => {
  if (!link) return ''
  if (link.href) return normalizePath(link.href)
  if (link.slug === 'home') return '/'
  if (link.slug) return normalizePath(link.slug)
  return ''
}

const navigate = (path) => {
  if (!path) return
  router.push(path)
  mobileMenuOpen.value = false
  window.scrollTo(0, 0)
}

const isActive = path => {
  const normalizedTarget = normalizePath(path)
  const normalizedRoute = normalizePath(route.path)

  if (normalizedTarget === '/')
    return normalizedRoute === '/' || normalizedRoute === '/home'

  return normalizedRoute === normalizedTarget
}
const openLink = link => {
  const href = resolveLinkHref(link)
  if (!href) return
  if (link.external) {
    window.open(href, '_blank', 'noopener,noreferrer')
    return
  }

  navigate(href)
}

const getSocialIcon = icon => {
  const iconMap = {
    facebook: 'tabler-brand-facebook',
    instagram: 'tabler-brand-instagram',
    twitter: 'tabler-brand-x',
    x: 'tabler-brand-x',
    email: 'tabler-mail',
    youtube: 'tabler-brand-youtube',
    linkedin: 'tabler-brand-linkedin',
  }

  return iconMap[String(icon || '').toLowerCase()] || 'tabler-link'
}

const loadLayout = async () => {
  layoutLoading.value = true
  try {
    const response = await axios.get(PUBLIC_LAYOUT_URL)
    layoutData.value = response?.data?.data || null
  } catch {
    layoutData.value = null
  } finally {
    layoutLoading.value = false
  }
}

onMounted(() => {
  loadLayout()
})
</script>

<template>
  <div class="public-site">
    <div class="min-h-screen bg-white" style="display: flex; flex-direction: column;">
      <!-- Header -->
      <header class="fixed w-full top-0 z-50 bg-white border-b border-gray-200">
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="relative flex items-center h-16">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <div class="hidden md:flex items-center gap-2">
                <template
                  v-for="item in headerMenu"
                  :key="`${item.type}-${item.label}`"
                >
                  <div
                    v-if="item.type === 'group'"
                    class="relative group"
                  >
                    <button class="public-nav-link public-nav-link--group">
                      <span>{{ item.label }}</span>
                      <VIcon icon="tabler-chevron-down" size="16" />
                    </button>

                    <div class="public-nav-dropdown">
                      <button
                        v-for="entry in item.items || []"
                        :key="resolveLinkHref(entry) || entry.label"
                        class="public-nav-dropdown__item"
                        @click="openLink(entry)"
                      >
                        {{ entry.label }}
                      </button>
                    </div>
                  </div>

                  <button
                    v-else
                    class="public-nav-link"
                    :class="{ 'public-nav-link--active': isActive(resolveLinkHref(item)) }"
                    @click="openLink(item)"
                  >
                    {{ item.label }}
                  </button>
                </template>
              </div>

              <button
                v-if="headerConfig.layout?.show_menu_toggle !== false"
                class="p-2 text-gray-600 hover:text-gray-900 md:hidden"
                @click="mobileMenuOpen = !mobileMenuOpen"
              >
                <svg v-if="!mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div
              class="absolute inset-x-0 flex justify-center pointer-events-none"
              :class="centeredBrand ? '' : 'md:justify-start md:pl-20'"
            >
              <div
                class="cursor-pointer flex items-center gap-3 hover:opacity-80 transition-opacity duration-200 pointer-events-auto"
                @click="navigate(brandConfig.home_url || '/')"
              >
                <img
                  v-if="brandConfig.logo"
                  :src="resolveAssetUrl(brandConfig.logo)"
                  :alt="brandConfig.name"
                  class="public-layout__brand-logo"
                >
                <h1 class="text-xl font-bold text-gray-900">{{ brandConfig.name }}</h1>
              </div>
            </div>
          </div>

          <!-- Mobile Menu -->
          <div v-if="mobileMenuOpen" class="py-3 space-y-1 border-t border-gray-200">
            <template
              v-for="item in headerMenu"
              :key="`${item.type}-${item.label}`"
            >
              <div
                v-if="item.type === 'group'"
                class="border-t border-gray-200 pt-2"
              >
                <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{{ item.label }}</div>
                <button
                  v-for="entry in item.items || []"
                  :key="resolveLinkHref(entry) || entry.label"
                  class="block w-full text-left px-4 py-2 text-sm font-medium rounded"
                  :class="isActive(resolveLinkHref(entry))
                    ? 'text-emerald-700 font-semibold gradient-bg-light'
                    : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'"
                  @click="openLink(entry)"
                >
                  {{ entry.label }}
                </button>
              </div>

              <button
                v-else
                class="block w-full text-left px-4 py-2 text-sm font-medium rounded"
                :class="isActive(resolveLinkHref(item))
                  ? 'text-emerald-700 font-semibold gradient-bg-light'
                  : 'text-gray-700 hover:text-emerald-600 hover:bg-gray-50'"
                @click="openLink(item)"
              >
                {{ item.label }}
              </button>
            </template>
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
            <template
              v-for="(column, index) in footerColumns"
              :key="`${column.type}-${column.title}-${index}`"
            >
              <div
                v-if="column.type === 'brand'"
                class="lg:col-span-1"
              >
                <div class="flex items-center gap-2 mb-3">
                  <img
                    v-if="column.logo"
                    :src="resolveAssetUrl(column.logo)"
                    :alt="column.title"
                    class="public-layout__brand-logo"
                  >
                  <h3 class="text-xl font-bold text-gray-900">{{ column.title }}</h3>
                </div>
                <p class="text-sm text-gray-600 leading-relaxed">
                  {{ column.content }}
                </p>
              </div>

              <div v-else-if="column.type === 'social_links'">
                <h4 class="font-semibold text-gray-900 mb-3">{{ column.title }}</h4>
                <div class="flex space-x-4 mb-4">
                  <a
                    v-for="item in column.items || []"
                    :key="resolveLinkHref(item) || item.label"
                    :href="resolveLinkHref(item)"
                    :target="item.external ? '_blank' : undefined"
                    :rel="item.external ? 'noopener noreferrer' : undefined"
                    class="text-gray-600 hover:text-emerald-600 transition-colors duration-200"
                    :aria-label="item.label"
                    @click.prevent="openLink(item)"
                  >
                    <VIcon :icon="getSocialIcon(item.icon || item.label)" size="20" />
                  </a>
                </div>
              </div>

              <div v-else>
                <h4 class="font-semibold text-gray-900 mb-3">{{ column.title }}</h4>
                <ul class="space-y-2">
                  <li
                    v-for="item in column.items || []"
                    :key="resolveLinkHref(item) || item.label"
                  >
                    <a
                      v-if="item.external"
                      :href="resolveLinkHref(item)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-sm text-gray-600 hover:text-emerald-600 transition-colors duration-200 flex items-center gap-1"
                    >
                      {{ item.label }}
                      <span class="text-xs">↗</span>
                    </a>
                    <button
                      v-else
                      class="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                      @click="openLink(item)"
                    >
                      {{ item.label }}
                    </button>
                  </li>
                </ul>
              </div>
            </template>
          </div>

          <!-- Bottom bar -->
          <div class="border-t border-gray-200 mt-8 pt-6 text-center text-sm text-gray-600">
            <p class="mb-1">{{ footerBottom.copyright || fallbackLayout.footer.data.bottom.copyright }}</p>
            <p>{{ footerBottom.credit || fallbackLayout.footer.data.bottom.credit }}</p>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.public-layout__brand-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.public-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  color: #475569;
  font-size: 0.92rem;
  font-weight: 600;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.public-nav-link:hover,
.public-nav-link--group:hover {
  color: #0f172a;
  background: rgba(15, 23, 42, 0.05);
}

.public-nav-link--active {
  color: #047857;
  background: rgba(16, 185, 129, 0.12);
}

.public-nav-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 220px;
  padding: 0.9rem 0.5rem 0.5rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
  opacity: 0;
  pointer-events: none;
  transform: translateY(6px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 30;
}

.group:hover .public-nav-dropdown {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.group {
  padding-bottom: 0.9rem;
  margin-bottom: -0.9rem;
}

.public-nav-dropdown__item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0.7rem 0.85rem;
  border-radius: 0.8rem;
  color: #334155;
  font-size: 0.92rem;
  font-weight: 500;
  text-align: left;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.public-nav-dropdown__item:hover {
  background: rgba(16, 185, 129, 0.08);
  color: #047857;
}
</style>
