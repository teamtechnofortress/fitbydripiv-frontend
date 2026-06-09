<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import { useRouter, useRoute } from 'vue-router'
import { CMS_GET_SITE_SETTINGS, PUBLIC_LAYOUT_URL, SERVER_DOMAIN } from '@/network/const'
import { devLog } from '@/utils/devLogger'
import '@/styles/public-site.css'

const router = useRouter()
const route = useRoute()
const mobileMenuOpen = ref(false)
const layoutLoading = ref(false)
const layoutData = ref(null)
const siteSettingsRows = ref([])

const fallbackLayout = {
  header: {
    data: {
      brand: {
        name: '',
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
        credit: '',
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

const footerConfigColumns = computed(() => (
  Array.isArray(layoutData.value?.footer?.config?.columns)
    ? layoutData.value.footer.config.columns
    : []
))

const siteSettingsByKey = computed(() => Object.fromEntries(siteSettingsRows.value.map(item => [item.key, item])))

const siteLogo = computed(() => {
  const value = siteSettingsByKey.value.logo?.value
  
  return typeof value === 'string' ? value.trim() : ''
})

const brandConfig = computed(() => {
  const brand = headerConfig.value?.brand || fallbackLayout.header.data.brand

  return {
    ...brand,
    logo: siteLogo.value || brand?.logo || fallbackLayout.header.data.brand.logo,
  }
})

const headerMenu = computed(() => headerConfig.value?.menu || [])

const toStartNewRowFlag = value => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return false
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
  }

  return !!value
}

const footerColumns = computed(() => {
  const renderColumns = Array.isArray(footerConfig.value?.columns) ? footerConfig.value.columns : []
  const metaColumns = footerConfigColumns.value

  const normalized = renderColumns.map((column, index) => {
    const metaColumnById = metaColumns.find(item => (
      String(item?.id || '').trim()
      && String(item?.id || '').trim() === String(column?.id || '').trim()
    ))

    const metaColumnBySort = metaColumns.find(item => Number(item?.sort_order) === Number(column?.sort_order))
    const metaColumn = metaColumnById || metaColumnBySort || metaColumns[index] || {}

    const parsedSort = Number(column?.sort_order ?? metaColumn?.sort_order)

    return {
      ...column,
      id: column?.id || metaColumn?.id,
      sort_order: Number.isFinite(parsedSort) && parsedSort > 0 ? Math.floor(parsedSort) : index + 1,
      start_new_row: toStartNewRowFlag(
        column?.start_new_row ?? metaColumn?.start_new_row,
      ),
    }
  })

  normalized.sort((a, b) => a.sort_order - b.sort_order)

  return normalized
})

const footerRows = computed(() => {
  const rows = []

  footerColumns.value.forEach((column, index) => {
    if (index === 0 || column.start_new_row || rows.length === 0) {
      rows.push([column])
      
      return
    }

    rows[rows.length - 1].push(column)
  })

  return rows
})

const getFooterRowStyle = row => ({
  '--footer-row-cols': Math.max(1, Number(row?.length) || 1),
})

const footerBottom = computed(() => footerConfig.value?.bottom || {})
const centeredBrand = computed(() => headerConfig.value?.layout?.show_brand_centered !== false)

const normalizePath = value => {
  if (!value) return ''

  const rawValue = typeof value === 'object'
    ? value.href || value.url || value.value || value.slug || value.path || ''
    : value

  const path = String(rawValue || '').trim()
  if (!path) return ''
  if (/^\[object object\]$/i.test(path)) return ''
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path
  if (path === 'home' || path === '/home') return '/'
  
  return path.startsWith('/') ? path : `/${path}`
}

const resolveLinkHref = link => {
  if (!link) return ''
  if (typeof link === 'string') return normalizePath(link)
  if (link.href) return normalizePath(link.href)
  if (link.slug === 'home') return '/'
  if (link.slug) return normalizePath(link.slug)
  
  return ''
}

const isAbsoluteLink = href => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(String(href || '').trim())
const isAnchorLink = link => isAbsoluteLink(resolveLinkHref(link))

const getFooterLinkLabel = link => {
  if (typeof link === 'string') {
    const href = resolveLinkHref(link)
    if (href === '/') return 'Home'
    
    return href.replace(/^\/+/, '').replace(/[-_]/g, ' ') || link
  }

  const label = typeof link?.label === 'string' ? link.label.trim() : ''
  if (label) return label

  const title = typeof link?.title === 'string' ? link.title.trim() : ''
  if (title) return title

  const slug = normalizePath(link?.slug)
  if (slug && slug !== '/') return slug.replace(/^\/+/, '')
  if (slug === '/') return 'Home'

  const href = normalizePath(link?.href)
  if (href && href !== '/') return href.replace(/^\/+/, '')
  if (href === '/') return 'Home'

  return ''
}

const navigate = path => {
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
  if (/^(?:mailto:|tel:|sms:)/i.test(href)) {
    window.location.href = href
    
    return
  }
  if (isAbsoluteLink(href)) {
    if (link.external) {
      window.open(href, '_blank', 'noopener,noreferrer')
      
      return
    }

    window.location.href = href
    
    return
  }
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
    whatsapp: 'tabler-brand-whatsapp',
    email: 'tabler-mail',
    mail: 'tabler-mail',
    youtube: 'tabler-brand-youtube',
    linkedin: 'tabler-brand-linkedin',
    tiktok: 'tabler-brand-tiktok',
    telegram: 'tabler-brand-telegram',
    pinterest: 'tabler-brand-pinterest',
    snapchat: 'tabler-brand-snapchat',
    discord: 'tabler-brand-discord',
    threads: 'tabler-brand-threads',
    github: 'tabler-brand-github',
  }

  return iconMap[String(icon || '').toLowerCase()] || 'tabler-link'
}

const normalizeRows = body => {
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body?.data?.data)) return body.data.data
  
  return []
}

const loadLayout = async () => {
  layoutLoading.value = true
  try {
    const response = await axios.get(PUBLIC_LAYOUT_URL)

    devLog('Global sections fetch response (public)', response?.data)
    devLog('Global sections payload (public)', response?.data?.data || null)
    layoutData.value = response?.data?.data || null
  } catch {
    devLog('Global sections fetch error (public)', { endpoint: PUBLIC_LAYOUT_URL })
    layoutData.value = null
  } finally {
    layoutLoading.value = false
  }
}

const loadSiteSettings = async () => {
  try {
    const response = await axios.get(CMS_GET_SITE_SETTINGS)

    siteSettingsRows.value = normalizeRows(response?.data)
  } catch {
    siteSettingsRows.value = []
  }
}

onMounted(() => {
  loadSiteSettings()
  loadLayout()
})
</script>

<template>
  <div class="public-site">
    <div
      class="min-h-screen bg-white"
      style="display: flex; flex-direction: column;"
    >
      <!-- Header -->
      <header class="public-header">
        <nav class="public-header__nav">
          <div class="public-header__row">
            <div class="flex min-w-0 flex-1">
              <button
                v-if="headerConfig.layout?.show_menu_toggle !== false"
                class="public-menu-toggle"
                :aria-expanded="mobileMenuOpen"
                aria-label="Toggle navigation menu"
                @click="mobileMenuOpen = !mobileMenuOpen"
              >
                <svg
                  v-if="!mobileMenuOpen"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ><line
                  x1="3"
                  y1="12"
                  x2="21"
                  y2="12"
                /><line
                  x1="3"
                  y1="6"
                  x2="21"
                  y2="6"
                /><line
                  x1="3"
                  y1="18"
                  x2="21"
                  y2="18"
                /></svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ><line
                  x1="18"
                  y1="6"
                  x2="6"
                  y2="18"
                /><line
                  x1="6"
                  y1="6"
                  x2="18"
                  y2="18"
                /></svg>
              </button>
            </div>

            <div
              class="public-header__brand-shell pointer-events-none"
              :class="centeredBrand ? '' : 'md:justify-start md:pl-20'"
            >
              <div
                class="public-layout__brand public-layout__brand--header cursor-pointer hover:opacity-80 transition-opacity duration-200 pointer-events-auto"
                @click="navigate(brandConfig.home_url || '/')"
              >
                <span
                  v-if="brandConfig.logo"
                  class="public-layout__brand-mark"
                >
                  <img
                    :src="resolveAssetUrl(brandConfig.logo)"
                    :alt="brandConfig.name"
                    class="public-layout__brand-logo public-layout__brand-logo--header"
                  >
                </span>
              </div>
            </div>

            <div class="flex justify-end flex-1">
              <div
                v-if="headerConfig.layout?.show_menu_toggle !== false"
                class="public-header__spacer"
                aria-hidden="true"
              />
            </div>
          </div>

          <div
            v-if="mobileMenuOpen"
            class="public-mobile-menu"
          >
            <template
              v-for="item in headerMenu"
              :key="`${item.type}-${item.label}`"
            >
              <div
                v-if="item.type === 'group'"
                class="public-mobile-menu__group"
              >
                <div class="public-mobile-menu__label">
                  {{ item.label }}
                </div>
                <button
                  v-for="entry in item.items || []"
                  :key="resolveLinkHref(entry) || entry.label"
                  class="public-mobile-menu__item"
                  :class="{ 'public-mobile-menu__item--active': isActive(resolveLinkHref(entry)) }"
                  @click="openLink(entry)"
                >
                  {{ entry.label }}
                </button>
              </div>

              <button
                v-else
                class="public-mobile-menu__item"
                :class="{ 'public-mobile-menu__item--active': isActive(resolveLinkHref(item)) }"
                @click="openLink(item)"
              >
                {{ item.label }}
              </button>
            </template>
          </div>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="public-main">
        <RouterView />
      </main>

      <!-- Footer -->
      <footer
        class="border-t border-gray-200"
        style="background: linear-gradient(to bottom right, rgba(236,253,245,0.3), rgba(240,253,250,0.2), rgba(236,254,255,0.3));"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div class="flex flex-col gap-8">
            <div
              v-for="(row, rowIndex) in footerRows"
              :key="`footer-row-${rowIndex}`"
              class="public-footer-row"
              :style="getFooterRowStyle(row)"
            >
              <template
                v-for="(column, index) in row"
                :key="`${column.id || column.type || column.source}-${column.title}-${rowIndex}-${index}`"
              >
                <div
                  v-if="column.type === 'brand' || column.source === 'brand'"
                  class="public-footer-column public-footer-column--brand"
                >
                  <div
                    class="public-layout__brand public-layout__brand--footer mb-3"
                    :class="{ 'cursor-pointer': column.home_url }"
                    @click="column.home_url ? navigate(column.home_url) : undefined"
                  >
                    <span
                      v-if="column.logo"
                      class="public-layout__brand-mark public-layout__brand-mark--footer"
                    >
                      <img
                        :src="resolveAssetUrl(column.logo)"
                        :alt="column.title"
                        class="public-layout__brand-logo public-layout__brand-logo--header"
                      >
                    </span>
                    <h3
                      v-else
                      class="text-xl font-bold text-gray-900"
                    >
                      {{ column.title }}
                    </h3>
                  </div>
                  <p class="text-sm text-gray-600 leading-relaxed">
                    {{ column.content }}
                  </p>
                </div>

                <div
                  v-else-if="column.type === 'certification' || column.source === 'certification'"
                  class="public-footer-column"
                >
                  <h4 class="font-semibold text-gray-900 mb-3">
                    {{ column.title }}
                  </h4>
                  <div
                    v-if="column.items?.[0]?.image || column.items?.[0]?.description"
                    class="public-footer-certification"
                  >
                    <div
                      v-if="column.items?.[0]?.image"
                      class="public-footer-certification__media"
                    >
                      <img
                        :src="resolveAssetUrl(column.items[0].image)"
                        :alt="column.title"
                        class="public-footer-certification__image"
                      >
                    </div>
                    <p
                      v-if="column.items?.[0]?.description"
                      class="public-footer-certification__description"
                    >
                      {{ column.items[0].description }}
                    </p>
                  </div>
                </div>

                <div
                  v-else-if="column.type === 'social_links' || column.source === 'social_links'"
                  class="public-footer-column"
                >
                  <h4 class="font-semibold text-gray-900 mb-3">
                    {{ column.title }}
                  </h4>
                  <div class="flex justify-center space-x-4 mb-4">
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
                      <VIcon
                        :icon="getSocialIcon(item.icon || item.label)"
                        size="20"
                      />
                    </a>
                  </div>
                </div>

                <div
                  v-else
                  class="public-footer-column"
                >
                  <h4 class="font-semibold text-gray-900 mb-3">
                    {{ column.title }}
                  </h4>
                  <ul class="public-footer-links">
                    <li
                      v-for="item in column.items || []"
                      :key="resolveLinkHref(item) || getFooterLinkLabel(item)"
                      class="public-footer-links__item"
                    >
                      <!--
                        <span class="public-footer-links__tick" aria-hidden="true">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span> 
                      -->
                      <a
                        v-if="isAnchorLink(item)"
                        :href="resolveLinkHref(item)"
                        :target="item.external ? '_blank' : undefined"
                        :rel="item.external ? 'noopener noreferrer' : undefined"
                        class="public-footer-links__link"
                      >
                        <span>{{ getFooterLinkLabel(item) }}</span>
                        <span class="public-footer-links__arrow">↗</span>
                      </a>
                      <button
                        v-else
                        class="public-footer-links__link public-footer-links__link--button"
                        @click="openLink(item)"
                      >
                        {{ getFooterLinkLabel(item) }}
                      </button>
                    </li>
                  </ul>
                </div>
              </template>
            </div>
          </div>

          <!-- Bottom bar -->
          <div class="border-t border-gray-200 mt-8 pt-6 text-center text-sm text-gray-600">
            <p class="mb-1">
              {{ footerBottom.copyright || fallbackLayout.footer.data.bottom.copyright }}
            </p>
            <p>{{ footerBottom.credit || fallbackLayout.footer.data.bottom.credit }}</p>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.public-header {
  position: fixed;
  top: 0;
  z-index: 50;
  width: 100%;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.public-header__nav {
  max-width: 80rem;
  margin: 0 auto;
  padding: 0 1rem;
}

.public-header__row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 6rem;
}

.public-header__brand-shell {
  position: absolute;
  inset-inline: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.public-header__spacer {
  width: 2.5rem;
}

.public-main {
  flex: 1;
  padding-top: 2rem;
}

.public-layout__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

.public-layout__brand-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}

.public-layout__brand--header {
  gap: 0.85rem;
}

.public-layout__brand--footer {
  gap: 0;
}

.public-layout__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 88px;
  padding: 0;
}

.public-layout__brand-logo--header {
  width: 100%;
  height: 100%;
}

.public-layout__brand-mark--footer {
  width: 150px;
  height: 88px;
}

.public-footer-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  justify-items: center;
  row-gap: 2rem;
  column-gap: clamp(1.25rem, 3vw, 2.5rem);
}

.public-footer-column {
  width: 100%;
  max-width: 320px;
  min-width: 0;
  text-align: center;
}

.public-footer-column--brand {
  max-width: 360px;
}

.public-footer-column .public-footer-links {
  align-items: center;
}

.public-footer-column .public-footer-links__item {
  justify-content: center;
}

.public-footer-column .public-footer-links__link {
  text-align: center;
}

.public-footer-certification {
  display: grid;
  gap: 0.75rem;
  padding: 0.9rem;
  border: 1px solid rgba(16, 185, 129, 0.16);
  border-radius: 1rem;
  background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.94), rgba(236, 253, 245, 0.82));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.public-footer-certification:hover {
  transform: translateY(-2px);
  border-color: rgba(16, 185, 129, 0.28);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.1);
}

.public-footer-certification__media {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 6.5rem;
  padding: 0.85rem;
  border-radius: 0.85rem;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.public-footer-certification__image {
  width: 100%;
  max-height: 5.25rem;
  object-fit: contain;
}

.public-footer-certification__description {
  margin: 0;
  color: #475569;
  font-size: 0.875rem;
  line-height: 1.6;
}

.public-footer-links {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.public-footer-links__item {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.public-footer-links__tick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.3rem;
  height: 1.3rem;
  margin-top: 0.05rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb 0%, #38bdf8 100%);
  color: #fff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.24);
  flex-shrink: 0;
}

.public-footer-links__link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: #475569;
  font-size: 0.92rem;
  line-height: 1.5;
  text-decoration: none;
  text-align: left;
  transition: color 0.2s ease, transform 0.2s ease;
}

.public-footer-links__link:hover {
  color: #2563eb;
  transform: translateX(2px);
}

.public-footer-links__link--button {
  cursor: pointer;
}

.public-footer-links__arrow {
  font-size: 0.72rem;
  color: #2563eb;
}

.public-layout__brand-name {
  font-size: 1.95rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
}

.public-menu-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: #4b5563;
  transition: color 0.2s ease;
}

.public-menu-toggle svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.public-menu-toggle:hover {
  color: #111827;
}

.public-menu-toggle--spacer {
  visibility: hidden;
}

@media (min-width: 640px) {
  .public-header__nav {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 768px) {
  .public-footer-row {
    grid-template-columns: repeat(var(--footer-row-cols, 1), minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .public-header__nav {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

@media (max-width: 767px) {
  .public-footer-column {
    max-width: 100%;
  }

  .public-layout__brand-mark {
    width: 68px;
    height: 68px;
  }
}

@media (max-width: 767px) {
  .public-layout__brand-name {
    font-size: 1.4rem;
  }
}

.public-mobile-menu {
  padding: 0.75rem 0;
  border-top: 1px solid #e5e7eb;
}

.public-mobile-menu > * + * {
  margin-top: 0.25rem;
}

.public-mobile-menu__group {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.5rem;
}

.public-mobile-menu__label {
  padding: 0.5rem 1rem;
  color: #6b7280;
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 600;
  text-transform: uppercase;
}

.public-mobile-menu__item {
  width: 100%;
  display: block;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  color: #374151;
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  text-align: left;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.public-mobile-menu__item:hover {
  color: #059669;
  background: #f9fafb;
}

.public-mobile-menu__item--active {
  color: #047857;
  font-weight: 600;
  background: linear-gradient(to bottom right, #ecfdf5, #eff6ff);
}
</style>
