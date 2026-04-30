<script setup>
import { computed, reactive, ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  ADMIN_CONTENT_LAYOUT_URL,
  ADMIN_CONTENT_PAGES_URL,
  ADMIN_CONTENT_SETTINGS_URL,
  ADMIN_MEDIA_UPLOAD_URL,
  CMS_GET_CATEGORIES,
  SERVER_DOMAIN,
} from '@/network/const'
import { getApiToken } from '@/store/authData'

const router = useRouter()
const toast = useToast()

const activePanel = ref('')
const activeGlobalSection = ref('')
const loadingPages = ref(false)
const loadingSettings = ref(false)
const loadingLayout = ref(false)
const savingSettings = ref(false)
const savingLayout = ref(false)
const uploadingSettingKey = ref('')
const uploadingLayoutAssetKey = ref('')

const pages = ref([])
const categories = ref([])
const settingsRows = ref([])
const layoutRows = ref([])
const footerResearchDraft = reactive({
  title: '',
  article_url: '',
  authors: '',
  journal: '',
  publication_year: '',
  pubmed_id: '',
  doi: '',
})

const settingsSchema = {
  general: [
    { key: 'app_name', label: 'App Name', type: 'string', placeholder: 'FitByShot' },
    { key: 'logo', label: 'Logo', type: 'file', accept: 'image/*' },
    { key: 'favicon', label: 'Favicon', type: 'file', accept: 'image/*' },
  ],
  contact: [
    { key: 'contact_email', label: 'Contact Email', type: 'string', placeholder: 'support@fitbyshot.com' },
    { key: 'support_phone', label: 'Support Phone', type: 'string', placeholder: '+1 234 567 890' },
    { key: 'contact_address', label: 'Contact Address', type: 'textarea', placeholder: 'Office address' },
  ],
  social: [
    { key: 'instagram_url', label: 'Instagram URL', type: 'string', placeholder: 'https://instagram.com/...' },
    { key: 'facebook_url', label: 'Facebook URL', type: 'string', placeholder: 'https://facebook.com/...' },
    { key: 'twitter_url', label: 'Twitter URL', type: 'string', placeholder: 'https://x.com/...' },
  ],
}

const settingsForm = reactive(Object.fromEntries(
  Object.values(settingsSchema)
    .flat()
    .map(field => [field.key, '']),
))

const settingsInitialValues = reactive(Object.fromEntries(
  Object.values(settingsSchema)
    .flat()
    .map(field => [field.key, '']),
))

const createHeaderDraft = () => ({
  key: 'header',
  config: {
    brand: {
      name: 'FitByShot',
      logo: '',
      description: '',
      home_url: '/',
    },
    layout: {
      show_menu_toggle: true,
      show_brand_centered: true,
    },
    menu: [],
  },
})

const createFooterDraft = () => ({
  key: 'footer',
  config: {
    columns: [],
    bottom: {
      copyright: '',
      credit: '',
    },
  },
})

const layoutForm = reactive({
  header: createHeaderDraft(),
  footer: createFooterDraft(),
})

const quickActions = [
  {
    title: 'General Settings',
    description: 'Branding, contact details, social links, and core site preferences.',
    icon: 'tabler-adjustments-horizontal',
    action: 'general',
  },
  {
    title: 'Site Dynamic Pages',
    description: 'Open the dynamic pages list and manage public page metadata.',
    icon: 'tabler-layout-dashboard',
    action: 'pages',
  },
  {
    title: 'Global Sections',
    description: 'Configure the public website header and footer with dynamic sources.',
    icon: 'tabler-layout-navbar',
    action: 'global-sections',
  },
]

const groupedSettingsFields = [
  { group: 'general', title: 'General', description: 'Core brand settings for the public site.', fields: settingsSchema.general },
  { group: 'contact', title: 'Contact', description: 'Primary contact information shown across the site.', fields: settingsSchema.contact },
  { group: 'social', title: 'Social', description: 'Social profile links and external brand presence.', fields: settingsSchema.social },
]

const headerGroupSourceOptions = [
  { title: 'Categories', value: 'categories' },
  { title: 'Research Links', value: 'research_links' },
  { title: 'Static Pages', value: 'static_pages' },
  { title: 'Social Links', value: 'social_links' },
  { title: 'Manual', value: 'manual' },
]

const footerSourceOptions = [
  { title: 'Brand', value: 'brand' },
  { title: 'Categories', value: 'categories' },
  { title: 'Static Pages', value: 'static_pages' },
  { title: 'Research Links', value: 'research_links' },
  { title: 'Social Links', value: 'social_links' },
]

const socialItemOptions = [
  { title: 'Facebook', value: 'facebook' },
  { title: 'Instagram', value: 'instagram' },
  { title: 'Twitter / X', value: 'twitter' },
  { title: 'Email', value: 'email' },
]

const getAuthHeaders = (extraHeaders = {}) => {
  const token = getApiToken()
  if (!token) throw new Error('Authentication token missing. Please login again.')

  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  }
}

const buildErrorMessage = error => {
  const responseData = error?.response?.data
  if (typeof responseData === 'string') return responseData
  if (responseData?.message) return responseData.message
  if (responseData?.err_msg) return responseData.err_msg
  if (responseData?.errors) {
    const firstKey = Object.keys(responseData.errors)[0]
    if (firstKey) {
      const entry = responseData.errors[firstKey]
      return Array.isArray(entry) ? entry[0] : entry
    }
  }

  return error?.message || 'Request failed. Please try again.'
}

const normalizeRows = body => {
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body?.data?.data)) return body.data.data
  return []
}

const normalizeLayoutResponse = body => {
  const data = body?.data?.data || body?.data || {}

  if (Array.isArray(data)) {
    return {
      header: data.find(item => item?.key === 'header') || null,
      footer: data.find(item => item?.key === 'footer') || null,
    }
  }

  return {
    header: data.header || null,
    footer: data.footer || null,
  }
}

const pageRows = computed(() => pages.value.slice().sort((a, b) => String(a?.title || '').localeCompare(String(b?.title || ''))))
const categoryOptions = computed(() => categories.value.map(item => ({ title: item.name, value: item.slug })))
const staticPageOptions = computed(() => pageRows.value.map(item => ({ title: item.title || item.slug, value: item.slug })))
const settingsByKey = computed(() => Object.fromEntries(settingsRows.value.map(item => [item.key, item])))

const activeLayoutConfig = computed(() => activeGlobalSection.value === 'footer' ? layoutForm.footer : layoutForm.header)

const getFilePreviewUrl = value => {
  if (!value) return ''
  if (/^https?:\/\//.test(value)) return value
  if (value.startsWith('/')) return `${SERVER_DOMAIN}${value}`
  return `${SERVER_DOMAIN}/storage/${value.replace(/^\/+/, '')}`
}

const isSourceSelectable = source => ['categories', 'static_pages', 'social_links', 'manual'].includes(source)
const isLinkSource = source => source !== 'brand'

const createHeaderMenuItem = (type = 'group') => (
  type === 'link'
    ? {
        type: 'link',
        label: '',
        slug: '',
        href: '',
        external: false,
      }
    : {
        type: 'group',
        label: '',
        source: 'categories',
        items: [],
      }
)

const createFooterColumn = source => (
  source === 'brand'
    ? {
        source: 'brand',
        title: 'FitByShot',
      }
    : source === 'research_links'
      ? {
          source: 'research_links',
          title: 'Research & Resources',
          items: [],
        }
    : {
        source,
        title: '',
        items: [],
      }
)

const hydrateSettingsForm = rows => {
  settingsRows.value = rows

  Object.values(settingsSchema)
    .flat()
    .forEach(field => {
      const matchedRow = rows.find(item => item.key === field.key)
      const value = matchedRow?.value || ''
      settingsForm[field.key] = value
      settingsInitialValues[field.key] = value
    })
}

const hydrateLayoutForm = payload => {
  const header = payload.header || createHeaderDraft()
  const footer = payload.footer || createFooterDraft()

  layoutRows.value = [header, footer].filter(Boolean)

  layoutForm.header = {
    key: 'header',
    config: {
      brand: {
        name: header?.config?.brand?.name || header?.data?.brand?.name || 'FitByShot',
        logo: header?.config?.brand?.logo || header?.data?.brand?.logo || '',
        description: header?.config?.brand?.description || header?.data?.brand?.description || '',
        home_url: header?.config?.brand?.home_url || header?.data?.brand?.home_url || '/',
      },
      layout: {
        show_menu_toggle: header?.config?.layout?.show_menu_toggle ?? header?.data?.layout?.show_menu_toggle ?? true,
        show_brand_centered: header?.config?.layout?.show_brand_centered ?? header?.data?.layout?.show_brand_centered ?? true,
      },
      menu: (header?.config?.menu || []).map(item => ({
        type: item.type || 'group',
        label: item.label || '',
        source: item.source || 'categories',
        items: Array.isArray(item.items) ? [...item.items] : [],
        slug: item.slug || '',
        href: item.href || '',
        external: !!item.external,
      })),
    },
  }

  layoutForm.footer = {
    key: 'footer',
    config: {
      columns: (footer?.config?.columns || []).map(column => ({
        source: column.source || (column.type === 'brand' ? 'brand' : 'static_pages'),
        title: column.title || '',
        items: Array.isArray(column.items) ? [...column.items] : [],
      })),
      bottom: {
        copyright: footer?.config?.bottom?.copyright || '',
        credit: footer?.config?.bottom?.credit || '',
      },
    },
  }
}

const fetchSettings = async () => {
  loadingSettings.value = true
  try {
    const response = await axios.get(ADMIN_CONTENT_SETTINGS_URL, {
      headers: getAuthHeaders({ Accept: 'application/json' }),
    })

    hydrateSettingsForm(normalizeRows(response?.data))
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    loadingSettings.value = false
  }
}

const fetchPages = async () => {
  loadingPages.value = true
  try {
    const response = await axios.get(ADMIN_CONTENT_PAGES_URL, {
      headers: getAuthHeaders({ Accept: 'application/json' }),
    })

    pages.value = normalizeRows(response?.data)
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    loadingPages.value = false
  }
}

const fetchCategories = async () => {
  try {
    const response = await axios.get(CMS_GET_CATEGORIES)
    categories.value = normalizeRows(response?.data)
  } catch {
    categories.value = []
  }
}

const fetchLayout = async () => {
  loadingLayout.value = true
  try {
    const response = await axios.get(ADMIN_CONTENT_LAYOUT_URL, {
      headers: getAuthHeaders({ Accept: 'application/json' }),
    })

    hydrateLayoutForm(normalizeLayoutResponse(response?.data))
  } catch (error) {
    toast.error(buildErrorMessage(error))
    hydrateLayoutForm({})
  } finally {
    loadingLayout.value = false
  }
}

const saveSettings = async () => {
  const changedFields = Object.values(settingsSchema)
    .flat()
    .filter(field => settingsForm[field.key] !== settingsInitialValues[field.key])

  if (!changedFields.length) {
    toast.info('No settings changed.')
    return
  }

  savingSettings.value = true
  try {
    await Promise.all(changedFields.map(field => axios.post(
      ADMIN_CONTENT_SETTINGS_URL,
      {
        id: settingsByKey.value[field.key]?.id,
        key: field.key,
        value: settingsForm[field.key],
      },
      {
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      },
    )))

    toast.success('Site settings saved successfully.')
    await fetchSettings()
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    savingSettings.value = false
  }
}

const uploadSettingFile = async (files, key) => {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  uploadingSettingKey.value = key
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'misc')

    const response = await axios.post(ADMIN_MEDIA_UPLOAD_URL, formData, {
      headers: getAuthHeaders({ 'Content-Type': 'multipart/form-data' }),
    })

    const payload = response?.data?.data || {}
    settingsForm[key] = payload.path || payload.url || ''
    toast.success(`${file.name} uploaded`)
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    uploadingSettingKey.value = ''
  }
}

const uploadLayoutAsset = async (files, sectionKey, fieldKey) => {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  uploadingLayoutAssetKey.value = `${sectionKey}.${fieldKey}`
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'misc')

    const response = await axios.post(ADMIN_MEDIA_UPLOAD_URL, formData, {
      headers: getAuthHeaders({ 'Content-Type': 'multipart/form-data' }),
    })

    const payload = response?.data?.data || {}
    layoutForm[sectionKey].config.brand[fieldKey] = payload.path || payload.url || ''
    toast.success(`${file.name} uploaded`)
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    uploadingLayoutAssetKey.value = ''
  }
}

const addHeaderMenuItem = type => {
  layoutForm.header.config.menu.push(createHeaderMenuItem(type))
}

const moveHeaderMenuItem = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= layoutForm.header.config.menu.length) return
  const items = [...layoutForm.header.config.menu]
  const [moved] = items.splice(index, 1)
  items.splice(targetIndex, 0, moved)
  layoutForm.header.config.menu = items
}

const removeHeaderMenuItem = index => {
  layoutForm.header.config.menu.splice(index, 1)
}

const addFooterColumn = source => {
  layoutForm.footer.config.columns.push(createFooterColumn(source))
}

const moveFooterColumn = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= layoutForm.footer.config.columns.length) return
  const columns = [...layoutForm.footer.config.columns]
  const [moved] = columns.splice(index, 1)
  columns.splice(targetIndex, 0, moved)
  layoutForm.footer.config.columns = columns
}

const removeFooterColumn = index => {
  layoutForm.footer.config.columns.splice(index, 1)
}

const addFooterResearchLink = column => {
  const title = footerResearchDraft.title.trim()
  const articleUrl = footerResearchDraft.article_url.trim()

  if (!title || !articleUrl) {
    toast.error('Research title and article URL are required.')
    return
  }

  column.items = [
    ...(Array.isArray(column.items) ? column.items : []),
    {
      title,
      article_url: articleUrl,
      authors: footerResearchDraft.authors.trim() || undefined,
      journal: footerResearchDraft.journal.trim() || undefined,
      publication_year: footerResearchDraft.publication_year ? Number(footerResearchDraft.publication_year) : undefined,
      pubmed_id: footerResearchDraft.pubmed_id.trim() || undefined,
      doi: footerResearchDraft.doi.trim() || undefined,
      display_order: Array.isArray(column.items) ? column.items.length : 0,
    },
  ]

  Object.assign(footerResearchDraft, {
    title: '',
    article_url: '',
    authors: '',
    journal: '',
    publication_year: '',
    pubmed_id: '',
    doi: '',
  })
}

const removeFooterResearchLink = (column, index) => {
  column.items = (column.items || []).filter((_, itemIndex) => itemIndex !== index)
}

const moveFooterResearchLink = (column, index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= (column.items || []).length) return

  const items = [...column.items]
  const [current] = items.splice(index, 1)
  items.splice(targetIndex, 0, current)
  column.items = items
}

const buildHeaderPayload = () => ({
  key: 'header',
  config: {
    brand: {
      name: layoutForm.header.config.brand.name || undefined,
      logo: layoutForm.header.config.brand.logo || undefined,
      description: layoutForm.header.config.brand.description || undefined,
      home_url: layoutForm.header.config.brand.home_url || '/',
    },
    layout: {
      show_menu_toggle: !!layoutForm.header.config.layout.show_menu_toggle,
      show_brand_centered: !!layoutForm.header.config.layout.show_brand_centered,
    },
    menu: layoutForm.header.config.menu.map(item => (
      item.type === 'link'
        ? {
            type: 'link',
            label: item.label,
            slug: item.slug || undefined,
            href: item.href || undefined,
            external: !!item.external,
          }
        : {
            type: 'group',
            label: item.label,
            source: item.source || 'categories',
            items: Array.isArray(item.items) ? item.items.filter(Boolean) : [],
          }
    )),
  },
})

const buildFooterPayload = () => ({
  key: 'footer',
  config: {
    columns: layoutForm.footer.config.columns.map(column => {
      if (column.source === 'brand') {
        return {
          source: 'brand',
          title: column.title || 'FitByShot',
          logo: layoutForm.footer.config.brandLogo || undefined,
        }
      }

      return {
        source: column.source,
        title: column.title,
        items: column.source === 'research_links'
          ? (Array.isArray(column.items) ? column.items.map((item, index) => ({
              title: item.title,
              article_url: item.article_url,
              authors: item.authors || undefined,
              journal: item.journal || undefined,
              publication_year: item.publication_year || undefined,
              pubmed_id: item.pubmed_id || undefined,
              doi: item.doi || undefined,
              display_order: index,
            })) : [])
          : (Array.isArray(column.items) ? column.items.filter(Boolean) : []),
      }
    }),
    bottom: {
      copyright: layoutForm.footer.config.bottom.copyright || '',
      credit: layoutForm.footer.config.bottom.credit || '',
    },
  },
})

const saveLayoutSection = async key => {
  savingLayout.value = true
  try {
    const payload = key === 'footer' ? buildFooterPayload() : buildHeaderPayload()

    await axios.post(ADMIN_CONTENT_LAYOUT_URL, payload, {
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    })

    toast.success(`${key === 'footer' ? 'Footer' : 'Header'} saved successfully.`)
    await fetchLayout()
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    savingLayout.value = false
  }
}

const openPanel = async action => {
  if (!action) return

  activePanel.value = action

  if (action === 'general') {
    await fetchSettings()
    return
  }

  if (action === 'pages') {
    await fetchPages()
    return
  }

  if (action === 'global-sections') {
    activeGlobalSection.value = ''
    await Promise.all([fetchLayout(), fetchPages(), fetchCategories()])
  }
}

const shorten = (value, fallback) => {
  if (!value) return fallback
  return value.length > 120 ? `${value.slice(0, 120)}...` : value
}

const openPageBuilder = page => {
  if (!page?.id) return
  router.push(`/admin/site-pages/${page.id}`)
}
</script>

<template>
  <div class="site-settings-page">
    <VCard class="site-settings-hero">
      <VCardText class="d-flex flex-column gap-6 pa-8">
        <div class="d-flex flex-column gap-2">
          <span class="site-settings-eyebrow">Site Settings</span>
          <div class="text-h4 font-weight-bold">
            Site configuration workspace
          </div>
          <p class="mb-0 text-body-1 text-medium-emphasis">
            Manage the public website settings, dynamic pages, and global layout from one admin area.
          </p>
        </div>

        <VRow>
          <VCol
            v-for="action in quickActions"
            :key="action.title"
            cols="12"
            md="4"
          >
            <button
              type="button"
              class="site-settings-block text-start"
              :class="{ 'site-settings-block--active': activePanel === action.action }"
              @click="openPanel(action.action)"
            >
              <VIcon
                :icon="action.icon"
                size="24"
                class="mb-4"
              />
              <div class="text-subtitle-1 font-weight-semibold mb-2">
                {{ action.title }}
              </div>
              <p class="mb-0 text-body-2 text-medium-emphasis">
                {{ action.description }}
              </p>
            </button>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VCard
      v-if="activePanel === 'general'"
      class="site-settings-hero"
    >
      <VCardText class="pa-8">
        <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between gap-4 mb-6">
          <div>
            <div class="text-h5 font-weight-bold mb-1">
              General Settings
            </div>
            <p class="mb-0 text-body-2 text-medium-emphasis">
              Update the main site identity, contact information, and social profiles.
            </p>
          </div>

          <VBtn
            color="primary"
            prepend-icon="tabler-device-floppy"
            :loading="savingSettings"
            @click="saveSettings"
          >
            Save Settings
          </VBtn>
        </div>

        <VProgressLinear
          v-if="loadingSettings"
          indeterminate
          color="primary"
          rounded
          class="mb-6"
        />

        <VRow v-else>
          <VCol
            v-for="section in groupedSettingsFields"
            :key="section.group"
            cols="12"
            md="4"
          >
            <div class="site-page-card site-settings-form-card">
              <div>
                <div class="text-subtitle-1 font-weight-bold mb-1">
                  {{ section.title }}
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  {{ section.description }}
                </p>
              </div>

              <div class="d-flex flex-column gap-4">
                <template
                  v-for="field in section.fields"
                  :key="field.key"
                >
                  <VTextarea
                    v-if="field.type === 'textarea'"
                    v-model="settingsForm[field.key]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    variant="outlined"
                    rows="3"
                    hide-details="auto"
                  />

                  <div
                    v-else-if="field.type === 'file'"
                    class="site-setting-file"
                  >
                    <div class="site-page-label">
                      {{ field.label }}
                    </div>

                    <div
                      v-if="getFilePreviewUrl(settingsForm[field.key])"
                      class="site-setting-file__preview"
                    >
                      <img
                        :src="getFilePreviewUrl(settingsForm[field.key])"
                        :alt="field.label"
                        class="site-setting-file__image"
                      >
                    </div>

                    <VTextField
                      :model-value="settingsForm[field.key]"
                      :label="`${field.label} Path`"
                      variant="outlined"
                      hide-details="auto"
                      readonly
                    />

                    <VFileInput
                      :label="`Upload ${field.label}`"
                      variant="outlined"
                      density="comfortable"
                      prepend-icon="tabler-upload"
                      hide-details="auto"
                      :accept="field.accept"
                      :loading="uploadingSettingKey === field.key"
                      @update:model-value="value => uploadSettingFile(value, field.key)"
                    />
                  </div>

                  <VTextField
                    v-else
                    v-model="settingsForm[field.key]"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    variant="outlined"
                    hide-details="auto"
                  />
                </template>
              </div>
            </div>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VCard
      v-if="activePanel === 'global-sections'"
      class="site-settings-hero"
    >
      <VCardText class="pa-8">
        <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between gap-4 mb-6">
          <div>
            <div class="text-h5 font-weight-bold mb-1">
              Global Sections
            </div>
            <p class="mb-0 text-body-2 text-medium-emphasis">
              Configure the dynamic public header and footer using the layout admin API.
            </p>
          </div>
        </div>

        <VProgressLinear
          v-if="loadingLayout"
          indeterminate
          color="primary"
          rounded
          class="mb-6"
        />

        <div
          v-else
          class="global-sections-shell"
        >
          <div class="global-sections-switcher">
            <button
              type="button"
              class="site-page-card text-start"
              :class="{ 'site-settings-block--active': activeGlobalSection === 'header' }"
              @click="activeGlobalSection = 'header'"
            >
              <div class="text-subtitle-1 font-weight-bold mb-2">
                Header
              </div>
              <p class="mb-0 text-body-2 text-medium-emphasis">
                Brand, top navigation, grouped menus, and direct links.
              </p>
            </button>

            <button
              type="button"
              class="site-page-card text-start"
              :class="{ 'site-settings-block--active': activeGlobalSection === 'footer' }"
              @click="activeGlobalSection = 'footer'"
            >
              <div class="text-subtitle-1 font-weight-bold mb-2">
                Footer
              </div>
              <p class="mb-0 text-body-2 text-medium-emphasis">
                Footer columns, brand block, links, social, and bottom bar content.
              </p>
            </button>
          </div>

          <div
            v-if="activeGlobalSection"
            class="site-page-card site-settings-form-card"
          >
            <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between gap-4">
              <div>
                <div class="text-h6 font-weight-bold mb-1">
                  {{ activeGlobalSection === 'header' ? 'Header Settings' : 'Footer Settings' }}
                </div>
                <p class="mb-0 text-body-2 text-medium-emphasis">
                  {{ activeGlobalSection === 'header'
                    ? 'Configure centered branding, menu toggle behavior, and the top menu structure.'
                    : 'Configure footer columns and the copyright / credit line.' }}
                </p>
              </div>

              <VBtn
                color="primary"
                prepend-icon="tabler-device-floppy"
                :loading="savingLayout"
                @click="saveLayoutSection(activeGlobalSection)"
              >
                Save {{ activeGlobalSection === 'header' ? 'Header' : 'Footer' }}
              </VBtn>
            </div>

            <template v-if="activeGlobalSection === 'header'">
              <div class="global-section-group">
                <div class="text-subtitle-1 font-weight-bold">
                  Brand
                </div>
                <VRow>
                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="layoutForm.header.config.brand.name"
                      label="Brand Name"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="layoutForm.header.config.brand.home_url"
                      label="Home URL"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12">
                    <VTextarea
                      v-model="layoutForm.header.config.brand.description"
                      label="Brand Description"
                      variant="outlined"
                      rows="3"
                    />
                  </VCol>
                  <VCol cols="12">
                    <div class="site-setting-file">
                      <div class="site-page-label">
                        Header Logo
                      </div>

                      <div
                        v-if="getFilePreviewUrl(layoutForm.header.config.brand.logo)"
                        class="site-setting-file__preview"
                      >
                        <img
                          :src="getFilePreviewUrl(layoutForm.header.config.brand.logo)"
                          alt="Header logo"
                          class="site-setting-file__image"
                        >
                      </div>

                      <VTextField
                        v-model="layoutForm.header.config.brand.logo"
                        label="Header Logo Path"
                        variant="outlined"
                        readonly
                      />

                      <VFileInput
                        label="Upload Header Logo"
                        variant="outlined"
                        prepend-icon="tabler-upload"
                        accept="image/*"
                        :loading="uploadingLayoutAssetKey === 'header.logo'"
                        @update:model-value="value => uploadLayoutAsset(value, 'header', 'logo')"
                      />
                    </div>
                  </VCol>
                </VRow>
              </div>

              <div class="global-section-group">
                <div class="text-subtitle-1 font-weight-bold">
                  Layout Options
                </div>
                <div class="global-layout-switches">
                  <VSwitch
                    v-model="layoutForm.header.config.layout.show_menu_toggle"
                    label="Show Menu Toggle"
                    color="primary"
                    inset
                  />
                  <VSwitch
                    v-model="layoutForm.header.config.layout.show_brand_centered"
                    label="Center Brand"
                    color="primary"
                    inset
                  />
                </div>
              </div>

              <div class="global-section-group">
                <div class="d-flex align-center justify-space-between gap-4">
                  <div class="text-subtitle-1 font-weight-bold">
                    Menu Items
                  </div>
                  <div class="d-flex gap-2 flex-wrap">
                    <VBtn size="small" variant="tonal" prepend-icon="tabler-plus" @click="addHeaderMenuItem('group')">
                      Add Group
                    </VBtn>
                    <VBtn size="small" variant="tonal" prepend-icon="tabler-plus" @click="addHeaderMenuItem('link')">
                      Add Link
                    </VBtn>
                  </div>
                </div>

                <div class="d-flex flex-column gap-4">
                  <VCard
                    v-for="(item, index) in layoutForm.header.config.menu"
                    :key="`header-item-${index}`"
                    variant="outlined"
                  >
                    <VCardText class="pa-4">
                      <div class="d-flex align-center justify-space-between gap-3 mb-4">
                        <div class="text-subtitle-2 font-weight-semibold">
                          Menu Item {{ index + 1 }}
                        </div>
                        <div class="d-flex gap-2">
                          <VBtn size="small" variant="text" icon="tabler-arrow-up" :disabled="index === 0" @click="moveHeaderMenuItem(index, -1)" />
                          <VBtn size="small" variant="text" icon="tabler-arrow-down" :disabled="index === layoutForm.header.config.menu.length - 1" @click="moveHeaderMenuItem(index, 1)" />
                          <VBtn size="small" color="error" variant="text" icon="tabler-trash" @click="removeHeaderMenuItem(index)" />
                        </div>
                      </div>

                      <VRow>
                        <VCol cols="12" md="4">
                          <VSelect
                            v-model="item.type"
                            :items="[
                              { title: 'Group', value: 'group' },
                              { title: 'Link', value: 'link' },
                            ]"
                            label="Item Type"
                            variant="outlined"
                          />
                        </VCol>
                        <VCol cols="12" md="8">
                          <VTextField
                            v-model="item.label"
                            label="Label"
                            variant="outlined"
                          />
                        </VCol>

                        <template v-if="item.type === 'group'">
                          <VCol cols="12" md="4">
                            <VSelect
                              v-model="item.source"
                              :items="headerGroupSourceOptions"
                              label="Source"
                              variant="outlined"
                            />
                          </VCol>
                          <VCol
                            v-if="item.source === 'categories'"
                            cols="12"
                            md="8"
                          >
                            <VSelect
                              v-model="item.items"
                              :items="categoryOptions"
                              label="Category Slugs"
                              variant="outlined"
                              multiple
                              chips
                            />
                          </VCol>
                          <VCol
                            v-else-if="item.source === 'static_pages'"
                            cols="12"
                            md="8"
                          >
                            <VSelect
                              v-model="item.items"
                              :items="staticPageOptions"
                              label="Page Slugs"
                              variant="outlined"
                              multiple
                              chips
                            />
                          </VCol>
                          <VCol
                            v-else-if="item.source === 'social_links'"
                            cols="12"
                            md="8"
                          >
                            <VSelect
                              v-model="item.items"
                              :items="socialItemOptions"
                              label="Social Items"
                              variant="outlined"
                              multiple
                              chips
                            />
                          </VCol>
                          <VCol
                            v-else-if="item.source === 'manual'"
                            cols="12"
                            md="8"
                          >
                            <VCombobox
                              v-model="item.items"
                              label="Manual Item Labels / Slugs"
                              variant="outlined"
                              multiple
                              chips
                            />
                          </VCol>
                        </template>

                        <template v-else>
                          <VCol cols="12" md="4">
                            <VTextField
                              v-model="item.slug"
                              label="Internal Page Slug"
                              variant="outlined"
                            />
                          </VCol>
                          <VCol cols="12" md="5">
                            <VTextField
                              v-model="item.href"
                              label="Href"
                              variant="outlined"
                            />
                          </VCol>
                          <VCol cols="12" md="3">
                            <VSwitch
                              v-model="item.external"
                              label="External"
                              color="primary"
                              inset
                            />
                          </VCol>
                        </template>
                      </VRow>
                    </VCardText>
                  </VCard>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="global-section-group">
                <div class="d-flex align-center justify-space-between gap-4">
                  <div class="text-subtitle-1 font-weight-bold">
                    Footer Columns
                  </div>
                  <div class="d-flex gap-2 flex-wrap">
                    <VBtn size="small" variant="tonal" prepend-icon="tabler-plus" @click="addFooterColumn('brand')">
                      Brand
                    </VBtn>
                    <VBtn size="small" variant="tonal" prepend-icon="tabler-plus" @click="addFooterColumn('categories')">
                      Categories
                    </VBtn>
                    <VBtn size="small" variant="tonal" prepend-icon="tabler-plus" @click="addFooterColumn('static_pages')">
                      Static Pages
                    </VBtn>
                    <VBtn size="small" variant="tonal" prepend-icon="tabler-plus" @click="addFooterColumn('research_links')">
                      Research
                    </VBtn>
                    <VBtn size="small" variant="tonal" prepend-icon="tabler-plus" @click="addFooterColumn('social_links')">
                      Social
                    </VBtn>
                  </div>
                </div>

                <div class="d-flex flex-column gap-4">
                  <VCard
                    v-for="(column, index) in layoutForm.footer.config.columns"
                    :key="`footer-column-${index}`"
                    variant="outlined"
                  >
                    <VCardText class="pa-4">
                      <div class="d-flex align-center justify-space-between gap-3 mb-4">
                        <div class="text-subtitle-2 font-weight-semibold">
                          Column {{ index + 1 }}
                        </div>
                        <div class="d-flex gap-2">
                          <VBtn size="small" variant="text" icon="tabler-arrow-up" :disabled="index === 0" @click="moveFooterColumn(index, -1)" />
                          <VBtn size="small" variant="text" icon="tabler-arrow-down" :disabled="index === layoutForm.footer.config.columns.length - 1" @click="moveFooterColumn(index, 1)" />
                          <VBtn size="small" color="error" variant="text" icon="tabler-trash" @click="removeFooterColumn(index)" />
                        </div>
                      </div>

                      <VRow>
                        <VCol cols="12" md="4">
                          <VSelect
                            v-model="column.source"
                            :items="footerSourceOptions"
                            label="Source"
                            variant="outlined"
                          />
                        </VCol>
                        <VCol cols="12" md="8">
                          <VTextField
                            v-model="column.title"
                            label="Column Title"
                            variant="outlined"
                          />
                        </VCol>

                        <template v-if="column.source === 'brand'">
                          <VCol cols="12">
                            <VAlert color="info" variant="tonal">
                              Brand column uses the global header/site brand settings and public resolver defaults. Title is configurable here.
                            </VAlert>
                          </VCol>
                        </template>

                        <VCol
                          v-else-if="column.source === 'categories'"
                          cols="12"
                        >
                          <VSelect
                            v-model="column.items"
                            :items="categoryOptions"
                            label="Category Slugs"
                            variant="outlined"
                            multiple
                            chips
                          />
                        </VCol>

                        <VCol
                          v-else-if="column.source === 'static_pages'"
                          cols="12"
                        >
                          <VSelect
                            v-model="column.items"
                            :items="staticPageOptions"
                            label="Page Slugs"
                            variant="outlined"
                            multiple
                            chips
                          />
                        </VCol>

                        <VCol
                          v-else-if="column.source === 'social_links'"
                          cols="12"
                        >
                          <VSelect
                            v-model="column.items"
                            :items="socialItemOptions"
                            label="Social Items"
                            variant="outlined"
                            multiple
                            chips
                          />
                        </VCol>

                        <VCol
                          v-else-if="column.source === 'research_links'"
                          cols="12"
                        >
                          <div class="research-links-editor">
                            <VRow>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="footerResearchDraft.title"
                                  label="Title"
                                  placeholder="PubMed Research"
                                  variant="outlined"
                                  density="comfortable"
                                  hide-details="auto"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="footerResearchDraft.article_url"
                                  label="Article URL"
                                  placeholder="https://pubmed.ncbi.nlm.nih.gov/"
                                  variant="outlined"
                                  density="comfortable"
                                  hide-details="auto"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="footerResearchDraft.authors"
                                  label="Authors"
                                  variant="outlined"
                                  density="comfortable"
                                  hide-details="auto"
                                />
                              </VCol>
                              <VCol cols="12" md="6">
                                <VTextField
                                  v-model="footerResearchDraft.journal"
                                  label="Journal"
                                  variant="outlined"
                                  density="comfortable"
                                  hide-details="auto"
                                />
                              </VCol>
                              <VCol cols="12" md="4">
                                <VTextField
                                  v-model="footerResearchDraft.publication_year"
                                  label="Publication Year"
                                  type="number"
                                  variant="outlined"
                                  density="comfortable"
                                  hide-details="auto"
                                />
                              </VCol>
                              <VCol cols="12" md="4">
                                <VTextField
                                  v-model="footerResearchDraft.pubmed_id"
                                  label="PubMed ID"
                                  variant="outlined"
                                  density="comfortable"
                                  hide-details="auto"
                                />
                              </VCol>
                              <VCol cols="12" md="4">
                                <VTextField
                                  v-model="footerResearchDraft.doi"
                                  label="DOI"
                                  variant="outlined"
                                  density="comfortable"
                                  hide-details="auto"
                                />
                              </VCol>
                            </VRow>

                            <div class="d-flex justify-end mt-4">
                              <VBtn color="primary" @click="addFooterResearchLink(column)">
                                Add Research Link
                              </VBtn>
                            </div>

                            <div
                              v-if="column.items?.length"
                              class="footer-research-list"
                            >
                              <div
                                v-for="(item, itemIndex) in column.items"
                                :key="`${item.title}-${itemIndex}`"
                                class="footer-research-card"
                              >
                                <div class="d-flex justify-space-between gap-4">
                                  <div>
                                    <h6 class="text-subtitle-2 font-weight-bold mb-1">{{ item.title }}</h6>
                                    <a
                                      :href="item.article_url"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      class="research-card__link"
                                    >
                                      {{ item.article_url }}
                                    </a>
                                  </div>

                                  <div class="d-flex gap-2">
                                    <VBtn size="x-small" variant="text" icon="tabler-arrow-up" :disabled="itemIndex === 0" @click="moveFooterResearchLink(column, itemIndex, -1)" />
                                    <VBtn size="x-small" variant="text" icon="tabler-arrow-down" :disabled="itemIndex === column.items.length - 1" @click="moveFooterResearchLink(column, itemIndex, 1)" />
                                    <VBtn size="x-small" color="error" variant="text" icon="tabler-trash" @click="removeFooterResearchLink(column, itemIndex)" />
                                  </div>
                                </div>

                                <div class="footer-research-meta">
                                  <div v-if="item.authors"><strong>Authors:</strong> {{ item.authors }}</div>
                                  <div v-if="item.journal"><strong>Journal:</strong> {{ item.journal }}</div>
                                  <div v-if="item.publication_year"><strong>Year:</strong> {{ item.publication_year }}</div>
                                  <div v-if="item.pubmed_id"><strong>PubMed:</strong> {{ item.pubmed_id }}</div>
                                  <div v-if="item.doi"><strong>DOI:</strong> {{ item.doi }}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </VCol>

                        <VCol
                          v-else
                          cols="12"
                        >
                          <VAlert color="info" variant="tonal">
                            This source resolves dynamically from backend data. No manual item selection is needed.
                          </VAlert>
                        </VCol>
                      </VRow>
                    </VCardText>
                  </VCard>
                </div>
              </div>

              <div class="global-section-group">
                <div class="text-subtitle-1 font-weight-bold">
                  Bottom Bar
                </div>
                <VRow>
                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="layoutForm.footer.config.bottom.copyright"
                      label="Copyright"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="layoutForm.footer.config.bottom.credit"
                      label="Credit"
                      variant="outlined"
                    />
                  </VCol>
                </VRow>
              </div>
            </template>
          </div>
        </div>
      </VCardText>
    </VCard>

    <VCard
      v-if="activePanel === 'pages'"
      class="site-settings-hero"
    >
      <VCardText class="pa-8">
        <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between gap-4 mb-6">
          <div>
            <div class="text-h5 font-weight-bold mb-1">
              Site Dynamic Pages
            </div>
            <p class="mb-0 text-body-2 text-medium-emphasis">
              Admin content pages loaded from the dynamic pages API.
            </p>
          </div>

          <VChip
            color="primary"
            variant="tonal"
            size="small"
          >
            {{ pageRows.length }} Pages
          </VChip>
        </div>

        <VProgressLinear
          v-if="loadingPages"
          indeterminate
          color="primary"
          rounded
          class="mb-6"
        />

        <div
          v-else-if="!pageRows.length"
          class="site-settings-empty"
        >
          <VIcon
            icon="tabler-files"
            size="34"
            class="mb-3"
          />
          <div class="text-h6 font-weight-semibold mb-1">
            No pages found
          </div>
          <p class="mb-0 text-body-2 text-medium-emphasis">
            The admin content pages API returned an empty list.
          </p>
        </div>

        <VRow v-else>
          <VCol
            v-for="page in pageRows"
            :key="page.id"
            cols="12"
            md="6"
          >
            <div
              class="site-page-card text-start"
              role="button"
              tabindex="0"
              @click="openPageBuilder(page)"
              @keydown.enter="openPageBuilder(page)"
              @keydown.space.prevent="openPageBuilder(page)"
            >
              <div class="d-flex align-start justify-space-between gap-4 mb-4">
                <div>
                  <div class="text-subtitle-1 font-weight-bold mb-1">
                    {{ page.title || 'Untitled Page' }}
                  </div>
                  <div class="site-page-slug">
                    /{{ page.slug || 'no-slug' }}
                  </div>
                </div>

                <VChip
                  size="small"
                  color="primary"
                  variant="outlined"
                >
                  Page
                </VChip>
              </div>

              <div class="site-page-section">
                <div class="site-page-label">
                  Meta Title
                </div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ shorten(page.meta_title, 'No meta title added yet.') }}
                </div>
              </div>

              <div class="site-page-section">
                <div class="site-page-label">
                  Meta Description
                </div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ shorten(page.meta_description, 'No meta description added yet.') }}
                </div>
              </div>

              <div class="d-flex align-center justify-space-between gap-3">
                <div class="site-page-id">
                  {{ page.id }}
                </div>

                <span class="site-page-open">
                  Open
                  <VIcon icon="tabler-arrow-up-right" size="16" />
                </span>
              </div>
            </div>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.site-settings-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.site-settings-hero {
  border: 1px solid rgba(var(--v-theme-primary), 0.14);
  background:
    radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.14), transparent 36%),
    linear-gradient(145deg, rgba(var(--v-theme-surface), 1), rgba(var(--v-theme-surface), 0.94));
  border-radius: 28px;
}

.site-settings-eyebrow {
  color: rgb(var(--v-theme-primary));
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.site-settings-block {
  inline-size: 100%;
  height: 100%;
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 20px;
  background: rgba(var(--v-theme-surface-bright), 0.42);
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.site-settings-block:hover {
  border-color: rgba(var(--v-theme-primary), 0.22);
  transform: translateY(-2px);
}

.site-settings-block--active {
  border-color: rgba(var(--v-theme-primary), 0.28);
  background: rgba(var(--v-theme-primary), 0.08);
}

.site-page-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 20px;
  background: rgba(var(--v-theme-surface-bright), 0.42);
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.site-settings-form-card {
  gap: 24px;
}

.site-page-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.24);
  transform: translateY(-2px);
}

.site-page-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.site-page-slug {
  color: rgb(var(--v-theme-primary));
  font-size: 0.88rem;
  font-weight: 600;
}

.site-page-label {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.site-page-id {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
  font-size: 0.78rem;
  margin-block-start: auto;
  word-break: break-all;
}

.site-page-open {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.82rem;
  font-weight: 700;
}

.site-setting-file {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.site-setting-file__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  background: rgba(var(--v-theme-surface), 0.9);
  overflow: hidden;
}

.site-setting-file__image {
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
}

.site-settings-empty {
  padding: 48px 24px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 24px;
  text-align: center;
}

.global-sections-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.global-sections-switcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.global-section-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.global-layout-switches {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.research-links-editor {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.footer-research-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-research-card {
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  background: rgba(var(--v-theme-surface), 0.9);
}

.footer-research-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 10px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.84rem;
}

.research-card__link {
  color: rgb(var(--v-theme-primary));
  font-size: 0.88rem;
  text-decoration: none;
  word-break: break-all;
}

@media (max-width: 959px) {
  .global-sections-switcher {
    grid-template-columns: 1fr;
  }
}
</style>
