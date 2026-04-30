<script setup>
import { computed, ref, watch } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { ADMIN_MEDIA_UPLOAD_URL } from '@/network/const'
import { getApiToken } from '@/store/authData'
import {
  cloneEditableSection,
  createContentRowDraft,
  createFaqDraft,
  createSectionDraft,
  createSectionItemDraft,
  sectionTypeOptions,
} from '../sectionForms'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  section: {
    type: Object,
    default: null,
  },
  pageId: {
    type: String,
    default: '',
  },
  nextSortOrder: {
    type: Number,
    default: 1,
  },
  saving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'save'])
const toast = useToast()
const MAX_SERVER_VIDEO_UPLOAD_BYTES = 10 * 1024 * 1024

const localSection = ref(createSectionDraft('section_header', props.nextSortOrder))
const heroVideoInput = ref(null)
const heroVideoUploading = ref(false)
const heroVideoPreviewOpen = ref(false)

const isEditing = computed(() => Boolean(props.section?.id))
const isHero = computed(() => localSection.value.type === 'hero')
const isHeader = computed(() => localSection.value.type === 'section_header')
const isFeatured = computed(() => localSection.value.type === 'featured_products')
const isCategoryCards = computed(() => localSection.value.type === 'category_cards')
const isProcess = computed(() => localSection.value.type === 'process')
const isContentBlock = computed(() => localSection.value.type === 'content_block')
const isSpacer = computed(() => localSection.value.type === 'spacer')
const isFaq = computed(() => localSection.value.type === 'faq')
const isTelehealth = computed(() => localSection.value.type === 'telehealth_cta')

const itemEditorLabel = computed(() => (isProcess.value ? 'Step' : 'Card'))
const heroVideoUrl = computed(() => localSection.value.content?.background?.url || '')

const closeDialog = () => {
  emit('update:modelValue', false)
}

const getAuthHeaders = () => {
  const token = getApiToken()
  if (!token) throw new Error('Authentication token missing. Please login again.')

  return { Authorization: `Bearer ${token}` }
}

const getUploadHeaders = (extraHeaders = {}) => ({
  ...getAuthHeaders(),
  ...extraHeaders,
})

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

const syncSection = () => {
  const source = props.section
    ? cloneEditableSection(props.section, props.nextSortOrder)
    : createSectionDraft('section_header', props.nextSortOrder)

  source.page_id = props.pageId
  localSection.value = source
}

watch(() => props.modelValue, value => {
  if (value)
    syncSection()
})

watch(() => localSection.value.type, (type, previousType) => {
  if (!type || type === previousType || isEditing.value)
    return

  const freshDraft = createSectionDraft(type, localSection.value.sort_order || props.nextSortOrder)

  localSection.value = {
    ...freshDraft,
    page_id: props.pageId,
    section_key: localSection.value.section_key || freshDraft.section_key,
  }
})

const updateDialog = value => {
  emit('update:modelValue', value)
}

const openHeroVideoPicker = () => {
  heroVideoInput.value?.click()
}

const uploadHeroVideo = async event => {
  const file = event?.target?.files?.[0]
  if (!file)
    return

  if (String(file.type || '').startsWith('video/') && file.size > MAX_SERVER_VIDEO_UPLOAD_BYTES) {
    toast.error('Video is larger than the current server upload limit of 10MB.')
    if (event?.target)
      event.target.value = ''
    return
  }

  heroVideoUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'product')

    const response = await axios.post(ADMIN_MEDIA_UPLOAD_URL, formData, {
      headers: getUploadHeaders(),
    })

    const media = response?.data?.data || {}
    localSection.value.content.background.type = media.media_type === 'video' ? 'video' : localSection.value.content.background.type
    localSection.value.content.background.url = media.url || ''
    toast.success('Hero media uploaded successfully.')
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    heroVideoUploading.value = false
    if (event?.target)
      event.target.value = ''
  }
}

const removeHeroVideo = () => {
  localSection.value.content.background.url = ''
  heroVideoPreviewOpen.value = false
}

const addItem = () => {
  const nextSortOrder = (localSection.value.items?.length || 0) + 1
  localSection.value.items = [
    ...(localSection.value.items || []),
    createSectionItemDraft(localSection.value.type, nextSortOrder),
  ]
}

const removeItem = index => {
  localSection.value.items.splice(index, 1)
  localSection.value.items = localSection.value.items.map((item, itemIndex) => ({
    ...item,
    sort_order: itemIndex + 1,
  }))
}

const moveItem = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= localSection.value.items.length)
    return

  const updated = [...localSection.value.items]
  const [moved] = updated.splice(index, 1)
  updated.splice(targetIndex, 0, moved)
  localSection.value.items = updated.map((item, itemIndex) => ({
    ...item,
    sort_order: itemIndex + 1,
  }))
}

const addFaq = () => {
  const nextSortOrder = (localSection.value.faqs?.length || 0) + 1
  localSection.value.faqs = [
    ...(localSection.value.faqs || []),
    createFaqDraft(nextSortOrder),
  ]
}

const removeFaq = index => {
  localSection.value.faqs.splice(index, 1)
  localSection.value.faqs = localSection.value.faqs.map((faq, faqIndex) => ({
    ...faq,
    sort_order: faqIndex + 1,
  }))
}

const moveFaq = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= localSection.value.faqs.length)
    return

  const updated = [...localSection.value.faqs]
  const [moved] = updated.splice(index, 1)
  updated.splice(targetIndex, 0, moved)
  localSection.value.faqs = updated.map((faq, faqIndex) => ({
    ...faq,
    sort_order: faqIndex + 1,
  }))
}

const ensureContentArray = key => {
  if (!Array.isArray(localSection.value.content[key]))
    localSection.value.content[key] = []
}

const addParagraph = () => {
  ensureContentArray('paragraphs')
  localSection.value.content.paragraphs.push('')
}

const removeParagraph = index => {
  ensureContentArray('paragraphs')
  localSection.value.content.paragraphs.splice(index, 1)
}

const moveParagraph = (index, direction) => {
  ensureContentArray('paragraphs')
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= localSection.value.content.paragraphs.length)
    return

  const updated = [...localSection.value.content.paragraphs]
  const [moved] = updated.splice(index, 1)
  updated.splice(targetIndex, 0, moved)
  localSection.value.content.paragraphs = updated
}

const addBullet = () => {
  ensureContentArray('bullets')
  localSection.value.content.bullets.push('')
}

const removeBullet = index => {
  ensureContentArray('bullets')
  localSection.value.content.bullets.splice(index, 1)
}

const moveBullet = (index, direction) => {
  ensureContentArray('bullets')
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= localSection.value.content.bullets.length)
    return

  const updated = [...localSection.value.content.bullets]
  const [moved] = updated.splice(index, 1)
  updated.splice(targetIndex, 0, moved)
  localSection.value.content.bullets = updated
}

const addRow = () => {
  ensureContentArray('rows')
  localSection.value.content.rows.push(createContentRowDraft())
}

const removeRow = index => {
  ensureContentArray('rows')
  localSection.value.content.rows.splice(index, 1)
}

const moveRow = (index, direction) => {
  ensureContentArray('rows')
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= localSection.value.content.rows.length)
    return

  const updated = [...localSection.value.content.rows]
  const [moved] = updated.splice(index, 1)
  updated.splice(targetIndex, 0, moved)
  localSection.value.content.rows = updated
}

const saveSection = () => {
  emit('save', {
    ...localSection.value,
    page_id: props.pageId,
  })
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="1100"
    scrollable
    @update:model-value="updateDialog"
  >
    <VCard class="page-section-dialog">
      <VCardTitle class="d-flex align-center justify-space-between gap-4 py-5 px-6 border-b">
        <div>
          <div class="text-h5 font-weight-bold">
            {{ isEditing ? 'Edit Section' : 'Add Component' }}
          </div>
          <div class="text-body-2 text-medium-emphasis">
            Configure the section content and save it back to the page builder.
          </div>
        </div>

        <VBtn
          icon="tabler-x"
          variant="text"
          @click="closeDialog"
        />
      </VCardTitle>

      <VCardText class="px-6 py-6">
        <VRow>
          <VCol cols="12" md="4">
            <VSelect
              v-model="localSection.type"
              :items="sectionTypeOptions"
              label="Section Type"
              variant="outlined"
              :disabled="isEditing"
            />
          </VCol>

          <VCol cols="12" md="4">
            <VTextField
              v-model="localSection.section_key"
              label="Section Key"
              variant="outlined"
            />
          </VCol>

          <VCol cols="12" md="4">
            <VTextField
              v-model="localSection.sort_order"
              label="Sort Order"
              type="number"
              min="1"
              variant="outlined"
            />
          </VCol>

          <VCol cols="12" md="6">
            <VTextField
              v-model="localSection.title"
              label="Internal Title"
              variant="outlined"
            />
          </VCol>

          <VCol cols="12" md="6">
            <VTextField
              v-model="localSection.subtitle"
              label="Subtitle / Eyebrow"
              variant="outlined"
            />
          </VCol>
        </VRow>

        <VDivider class="my-4" />

        <div v-if="isHero" class="d-flex flex-column gap-4">
          <div class="text-subtitle-1 font-weight-semibold">
            Hero Content
          </div>
          <VTextField
            v-model="localSection.content.headline"
            label="Headline"
            variant="outlined"
          />
          <VTextarea
            v-model="localSection.content.description"
            label="Description"
            variant="outlined"
            rows="4"
          />
          <VRow>
            <VCol cols="12" md="4">
              <VSelect
                v-model="localSection.content.background.type"
                :items="['video', 'image']"
                label="Background Type"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="localSection.content.background.url"
                label="Background URL"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="localSection.content.background.poster"
                label="Poster URL"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="localSection.content.cta.label"
                label="CTA Label"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="localSection.content.cta.link"
                label="CTA Link"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="localSection.content.cta.style"
                label="CTA Style"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <div class="hero-media-uploader">
                <div class="hero-media-uploader__copy">
                  <div class="text-subtitle-2 font-weight-semibold">
                    Hero Video Upload
                  </div>
                  <p class="mb-0 text-body-2 text-medium-emphasis">
                    Upload a video directly and its public URL will be saved into the hero background link.
                  </p>
                </div>

                <div class="hero-media-uploader__actions">
                  <input
                    ref="heroVideoInput"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/mov"
                    class="d-none"
                    @change="uploadHeroVideo"
                  >

                  <VBtn
                    color="primary"
                    variant="tonal"
                    prepend-icon="tabler-upload"
                    :loading="heroVideoUploading"
                    @click="openHeroVideoPicker"
                  >
                    Upload Video
                  </VBtn>
                </div>

                <div
                  v-if="heroVideoUrl"
                  class="hero-media-uploader__preview"
                >
                  <div class="hero-media-uploader__preview-copy">
                    <div class="text-subtitle-2 font-weight-semibold">
                      Uploaded Video
                    </div>
                    <div class="text-body-2 text-medium-emphasis text-break">
                      {{ heroVideoUrl }}
                    </div>
                  </div>

                  <div class="d-flex align-center gap-2">
                    <VBtn
                      color="primary"
                      variant="text"
                      prepend-icon="tabler-player-play"
                      @click="heroVideoPreviewOpen = true"
                    >
                      Play
                    </VBtn>
                    <VBtn
                      color="error"
                      variant="text"
                      icon="tabler-x"
                      @click="removeHeroVideo"
                    />
                  </div>
                </div>
              </div>
            </VCol>
          </VRow>
        </div>

        <div v-else-if="isHeader" class="d-flex flex-column gap-4">
          <div class="text-subtitle-1 font-weight-semibold">
            Header Content
          </div>
          <VTextField
            v-model="localSection.content.headline"
            label="Headline"
            variant="outlined"
          />
          <VTextarea
            v-model="localSection.content.description"
            label="Description"
            variant="outlined"
            rows="4"
          />
          <VSelect
            v-model="localSection.content.alignment"
            :items="['left', 'center']"
            label="Alignment"
            variant="outlined"
          />
        </div>

        <div v-else-if="isFeatured" class="d-flex flex-column gap-4">
          <div class="text-subtitle-1 font-weight-semibold">
            Featured Products Configuration
          </div>
          <VAlert
            color="info"
            variant="tonal"
          >
            Featured product selection is configured in the products module. This section controls only the display settings.
          </VAlert>
          <VRow>
            <VCol cols="12" md="4">
              <VTextField
                v-model="localSection.content.limit"
                label="Product Limit"
                type="number"
                min="1"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="localSection.content.variant"
                label="Variant"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="localSection.content.cta_label"
                label="CTA Label"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </div>

        <div v-else-if="isCategoryCards || isProcess" class="d-flex flex-column gap-4">
          <div class="text-subtitle-1 font-weight-semibold">
            {{ isProcess ? 'Process Configuration' : 'Category Cards Configuration' }}
          </div>

          <VAlert
            v-if="isCategoryCards"
            color="info"
            variant="tonal"
          >
            Category data and product relationships should stay aligned with the categories configured elsewhere.
          </VAlert>

          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="localSection.content.variant"
                label="Variant"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="localSection.content[isProcess ? 'background_style' : 'cta_label']"
                :label="isProcess ? 'Background Style' : 'Default CTA Label'"
                variant="outlined"
              />
            </VCol>
          </VRow>

          <div class="d-flex align-center justify-space-between gap-4">
            <div class="text-subtitle-2 font-weight-semibold">
              {{ isProcess ? 'Section Steps' : 'Section Items' }}
            </div>
            <VBtn
              color="primary"
              variant="tonal"
              prepend-icon="tabler-plus"
              @click="addItem"
            >
              Add {{ itemEditorLabel }}
            </VBtn>
          </div>

          <div class="d-flex flex-column gap-4">
            <VCard
              v-for="(item, index) in localSection.items"
              :key="item.id || `${localSection.type}-${index}`"
              variant="outlined"
            >
              <VCardText class="pa-4">
                <div class="d-flex align-center justify-space-between gap-3 mb-4">
                  <div class="text-subtitle-2 font-weight-semibold">
                    {{ itemEditorLabel }} {{ index + 1 }}
                  </div>
                  <div class="d-flex align-center gap-2">
                    <VBtn size="small" variant="text" icon="tabler-arrow-up" :disabled="index === 0" @click="moveItem(index, -1)" />
                    <VBtn size="small" variant="text" icon="tabler-arrow-down" :disabled="index === localSection.items.length - 1" @click="moveItem(index, 1)" />
                    <VBtn size="small" color="error" variant="text" icon="tabler-trash" @click="removeItem(index)" />
                  </div>
                </div>

                <VRow>
                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="item.title"
                      label="Title"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12" md="6">
                    <VTextField
                      v-model="item.icon"
                      label="Icon"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12">
                    <VTextarea
                      v-model="item.description"
                      label="Description"
                      variant="outlined"
                      rows="3"
                    />
                  </VCol>
                  <VCol
                    v-if="isCategoryCards"
                    cols="12"
                    md="6"
                  >
                    <VTextField
                      v-model="item.cta_text"
                      label="CTA Text"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol
                    v-if="isCategoryCards"
                    cols="12"
                    md="6"
                  >
                    <VTextField
                      v-model="item.cta_link"
                      label="CTA Link"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol cols="12">
                    <VTextField
                      v-model="item.image"
                      label="Image URL"
                      variant="outlined"
                    />
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>
          </div>
        </div>

        <div v-else-if="isContentBlock" class="d-flex flex-column gap-4">
          <div class="text-subtitle-1 font-weight-semibold">
            Content Block Configuration
          </div>

          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="localSection.content.headline"
                label="Headline"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="localSection.content.alignment"
                :items="['left', 'center']"
                label="Alignment"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="localSection.content.max_width"
                :items="['content', 'wide', 'full']"
                label="Max Width"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="localSection.content.intro"
                label="Intro"
                variant="outlined"
                rows="3"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="localSection.content.background_style"
                label="Background Style"
                variant="outlined"
              />
            </VCol>
          </VRow>

          <div class="d-flex align-center justify-space-between gap-4">
            <div class="text-subtitle-2 font-weight-semibold">
              Paragraphs
            </div>
            <VBtn color="primary" variant="tonal" prepend-icon="tabler-plus" @click="addParagraph">
              Add Paragraph
            </VBtn>
          </div>

          <VCard
            v-for="(paragraph, index) in localSection.content.paragraphs || []"
            :key="`paragraph-${index}`"
            variant="outlined"
          >
            <VCardText class="pa-4">
              <div class="d-flex align-center justify-space-between gap-3 mb-4">
                <div class="text-subtitle-2 font-weight-semibold">
                  Paragraph {{ index + 1 }}
                </div>
                <div class="d-flex align-center gap-2">
                  <VBtn size="small" variant="text" icon="tabler-arrow-up" :disabled="index === 0" @click="moveParagraph(index, -1)" />
                  <VBtn size="small" variant="text" icon="tabler-arrow-down" :disabled="index === (localSection.content.paragraphs || []).length - 1" @click="moveParagraph(index, 1)" />
                  <VBtn size="small" color="error" variant="text" icon="tabler-trash" @click="removeParagraph(index)" />
                </div>
              </div>
              <VTextarea
                v-model="localSection.content.paragraphs[index]"
                label="Paragraph"
                variant="outlined"
                rows="4"
              />
            </VCardText>
          </VCard>

          <div class="d-flex align-center justify-space-between gap-4">
            <div class="text-subtitle-2 font-weight-semibold">
              Bullets
            </div>
            <VBtn color="primary" variant="tonal" prepend-icon="tabler-plus" @click="addBullet">
              Add Bullet
            </VBtn>
          </div>

          <VCard
            v-for="(bullet, index) in localSection.content.bullets || []"
            :key="`bullet-${index}`"
            variant="outlined"
          >
            <VCardText class="pa-4">
              <div class="d-flex align-center justify-space-between gap-3 mb-4">
                <div class="text-subtitle-2 font-weight-semibold">
                  Bullet {{ index + 1 }}
                </div>
                <div class="d-flex align-center gap-2">
                  <VBtn size="small" variant="text" icon="tabler-arrow-up" :disabled="index === 0" @click="moveBullet(index, -1)" />
                  <VBtn size="small" variant="text" icon="tabler-arrow-down" :disabled="index === (localSection.content.bullets || []).length - 1" @click="moveBullet(index, 1)" />
                  <VBtn size="small" color="error" variant="text" icon="tabler-trash" @click="removeBullet(index)" />
                </div>
              </div>
              <VTextField
                v-model="localSection.content.bullets[index]"
                label="Bullet"
                variant="outlined"
              />
            </VCardText>
          </VCard>

          <div class="d-flex align-center justify-space-between gap-4">
            <div class="text-subtitle-2 font-weight-semibold">
              Label / Value Rows
            </div>
            <VBtn color="primary" variant="tonal" prepend-icon="tabler-plus" @click="addRow">
              Add Row
            </VBtn>
          </div>

          <VCard
            v-for="(row, index) in localSection.content.rows || []"
            :key="`row-${index}`"
            variant="outlined"
          >
            <VCardText class="pa-4">
              <div class="d-flex align-center justify-space-between gap-3 mb-4">
                <div class="text-subtitle-2 font-weight-semibold">
                  Row {{ index + 1 }}
                </div>
                <div class="d-flex align-center gap-2">
                  <VBtn size="small" variant="text" icon="tabler-arrow-up" :disabled="index === 0" @click="moveRow(index, -1)" />
                  <VBtn size="small" variant="text" icon="tabler-arrow-down" :disabled="index === (localSection.content.rows || []).length - 1" @click="moveRow(index, 1)" />
                  <VBtn size="small" color="error" variant="text" icon="tabler-trash" @click="removeRow(index)" />
                </div>
              </div>
              <VRow>
                <VCol cols="12" md="4">
                  <VTextField
                    v-model="row.label"
                    label="Label"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12" md="8">
                  <VTextField
                    v-model="row.value"
                    label="Value"
                    variant="outlined"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </div>

        <div v-else-if="isSpacer" class="d-flex flex-column gap-4">
          <div class="text-subtitle-1 font-weight-semibold">
            Spacer Configuration
          </div>
          <VAlert
            color="info"
            variant="tonal"
          >
            Use this section to control vertical spacing between blocks in a backend-managed way.
          </VAlert>
          <VRow>
            <VCol cols="12" md="3">
              <VTextField
                v-model="localSection.content.height"
                label="Base Height"
                type="number"
                min="0"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="localSection.content.desktop"
                label="Desktop Height"
                type="number"
                min="0"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="localSection.content.tablet"
                label="Tablet Height"
                type="number"
                min="0"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="localSection.content.mobile"
                label="Mobile Height"
                type="number"
                min="0"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </div>

        <div v-else-if="isFaq" class="d-flex flex-column gap-4">
          <div class="text-subtitle-1 font-weight-semibold">
            FAQ Configuration
          </div>

          <VSelect
            v-model="localSection.content.layout"
            :items="['accordion', 'list']"
            label="Layout"
            variant="outlined"
          />

          <div class="d-flex align-center justify-space-between gap-4">
            <div class="text-subtitle-2 font-weight-semibold">
              FAQ Items
            </div>
            <VBtn
              color="primary"
              variant="tonal"
              prepend-icon="tabler-plus"
              @click="addFaq"
            >
              Add FAQ
            </VBtn>
          </div>

          <div class="d-flex flex-column gap-4">
            <VCard
              v-for="(faq, index) in localSection.faqs"
              :key="faq.id || `faq-${index}`"
              variant="outlined"
            >
              <VCardText class="pa-4">
                <div class="d-flex align-center justify-space-between gap-3 mb-4">
                  <div class="text-subtitle-2 font-weight-semibold">
                    FAQ {{ index + 1 }}
                  </div>
                  <div class="d-flex align-center gap-2">
                    <VSwitch
                      v-model="faq.is_active"
                      hide-details
                      color="primary"
                      inset
                      label="Active"
                    />
                    <VBtn size="small" variant="text" icon="tabler-arrow-up" :disabled="index === 0" @click="moveFaq(index, -1)" />
                    <VBtn size="small" variant="text" icon="tabler-arrow-down" :disabled="index === localSection.faqs.length - 1" @click="moveFaq(index, 1)" />
                    <VBtn size="small" color="error" variant="text" icon="tabler-trash" @click="removeFaq(index)" />
                  </div>
                </div>

                <VTextarea
                  v-model="faq.question"
                  label="Question"
                  variant="outlined"
                  rows="2"
                  class="mb-4"
                />
                <VTextarea
                  v-model="faq.answer"
                  label="Answer"
                  variant="outlined"
                  rows="4"
                />
              </VCardText>
            </VCard>
          </div>
        </div>

        <div v-else-if="isTelehealth" class="d-flex flex-column gap-4">
          <div class="text-subtitle-1 font-weight-semibold">
            CTA Configuration
          </div>
          <VRow>
            <VCol cols="12" md="4">
              <VTextField
                v-model="localSection.content.layout"
                label="Layout"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="localSection.content.button.label"
                label="Button Label"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="localSection.content.button.style"
                label="Button Style"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="localSection.content.button.link"
                label="Button Link"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </div>
      </VCardText>

      <VCardActions class="px-6 py-4 border-t">
        <VSpacer />
        <VBtn
          variant="text"
          @click="closeDialog"
        >
          Cancel
        </VBtn>
        <VBtn
          color="primary"
          :loading="saving"
          @click="saveSection"
        >
          Save Section
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog
    v-model="heroVideoPreviewOpen"
    max-width="900"
  >
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between gap-4 py-4 px-5">
        <div class="text-h6">
          Hero Video Preview
        </div>
        <VBtn
          icon="tabler-x"
          variant="text"
          @click="heroVideoPreviewOpen = false"
        />
      </VCardTitle>
      <VCardText class="px-5 pb-5">
        <video
          v-if="heroVideoUrl"
          :src="heroVideoUrl"
          controls
          playsinline
          class="hero-video-dialog__video"
        />
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
.page-section-dialog {
  border-radius: 28px;
}

.hero-media-uploader {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.24);
  border-radius: 20px;
  background: rgba(var(--v-theme-primary), 0.04);
}

.hero-media-uploader__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-media-uploader__preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  background: rgba(var(--v-theme-surface), 0.92);
}

.hero-media-uploader__preview-copy {
  min-width: 0;
}

.hero-video-dialog__video {
  width: 100%;
  max-height: 70vh;
  border-radius: 18px;
  background: #000;
}

@media (max-width: 767px) {
  .hero-media-uploader__preview {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
