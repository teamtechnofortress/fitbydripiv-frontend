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
const heroMediaInput = ref(null)
const heroMediaUploading = ref(false)
const heroMediaPreviewOpen = ref(false)
const heroMediaDragActive = ref(false)
const pdfDocumentInput = ref(null)
const pdfDocumentUploading = ref(false)
const pdfDocumentDragActive = ref(false)

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
const isPdfLibrary = computed(() => ['pdf_library', 'pen_instruction_library'].includes(localSection.value.type))

const itemEditorLabel = computed(() => 'Step')
const heroMediaUrl = computed(() => localSection.value.content?.background?.url || '')
const heroMediaType = computed(() => localSection.value.content?.background?.type || '')
const isHeroVideo = computed(() => heroMediaType.value === 'video')

const pdfDocumentSourceUrl = computed(() => (
  localSection.value.content?.document?.view_url
  || localSection.value.content?.document?.download_url
  || localSection.value.content?.document?.pdf_url
  || ''
))

const pdfDocumentFileName = computed(() => {
  const source = String(pdfDocumentSourceUrl.value || '').trim()
  if (!source)
    return ''

  const cleanSource = source.split('?')[0].split('#')[0]
  const sourceSegments = cleanSource.split('/').filter(Boolean)
  const fileName = sourceSegments.length ? sourceSegments[sourceSegments.length - 1] : ''
  if (!fileName)
    return ''

  try {
    return decodeURIComponent(fileName)
  } catch {
    return fileName
  }
})

const createPdfDocumentDraft = () => ({
  key: 'document_1',
  label: '',
  view_url: '',
  download_url: '',
  pdf_url: '',
  download_label: 'Download PDF',
})

const normalizePdfDocument = document => {
  const source = document && typeof document === 'object' ? document : {}
  const resolvedUrl = source.view_url || source.download_url || source.pdf_url || source.item?.download_url || ''

  return {
    ...createPdfDocumentDraft(),
    ...source,
    key: source.key || 'document_1',
    label: source.label || source.title || '',
    view_url: source.view_url || resolvedUrl,
    download_url: source.download_url || resolvedUrl,
    pdf_url: source.pdf_url || resolvedUrl,
    download_label: source.download_label || source.item?.label || 'Download PDF',
  }
}

const ensurePdfLibraryShape = () => {
  if (!localSection.value.content || typeof localSection.value.content !== 'object')
    localSection.value.content = {}

  const settings = localSection.value.content.settings

  localSection.value.content.settings = {
    viewer_enabled: settings?.viewer_enabled ?? true,
    viewer_embed_mode: settings?.viewer_embed_mode || 'iframe',
  }

  const rawDocuments = Array.isArray(localSection.value.content.documents)
    ? localSection.value.content.documents
    : (Array.isArray(localSection.value.documents) ? localSection.value.documents : [])

  const normalized = normalizePdfDocument(localSection.value.content.document || rawDocuments[0] || {})

  localSection.value.content.document = normalized
  localSection.value.content.documents = [normalized]
}

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
  if (isPdfLibrary.value)
    ensurePdfLibraryShape()
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

  if (['pdf_library', 'pen_instruction_library'].includes(type))
    ensurePdfLibraryShape()
})

const updateDialog = value => {
  emit('update:modelValue', value)
}

const inferMediaType = file => {
  const mime = String(file?.type || '').toLowerCase()
  const name = String(file?.name || '').toLowerCase()

  if (mime.startsWith('image/'))
    return 'image'
  if (mime.startsWith('video/'))
    return 'video'
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(name))
    return 'image'
  if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(name))
    return 'video'

  return ''
}

const uploadAdminMedia = async file => {
  const formData = new FormData()

  formData.append('file', file)
  formData.append('type', 'product')

  const response = await axios.post(ADMIN_MEDIA_UPLOAD_URL, formData, {
    headers: getUploadHeaders(),
  })

  return response?.data?.data || {}
}

const openHeroMediaPicker = () => {
  heroMediaInput.value?.click()
}

const applyHeroMedia = (mediaUrl, mediaType) => {
  localSection.value.content.background.type = mediaType
  localSection.value.content.background.url = mediaUrl || ''

  if (mediaType !== 'video')
    localSection.value.content.background.poster = ''
}

const handleHeroMediaFile = async file => {
  if (!file)
    return

  const mediaType = inferMediaType(file)
  if (!mediaType) {
    toast.error('Unsupported file type. Upload an image or video.')
    
    return
  }

  if (mediaType === 'video' && file.size > MAX_SERVER_VIDEO_UPLOAD_BYTES) {
    toast.error('Video is larger than the current server upload limit of 10MB.')
    
    return
  }

  heroMediaUploading.value = true
  try {
    const media = await uploadAdminMedia(file)
    const resolvedType = media.media_type === 'video' ? 'video' : media.media_type === 'image' ? 'image' : mediaType

    applyHeroMedia(media.url || '', resolvedType)
    toast.success('Hero media uploaded successfully.')
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    heroMediaUploading.value = false
  }
}

const onHeroMediaInputChange = async event => {
  const file = event?.target?.files?.[0]

  await handleHeroMediaFile(file)
  if (event?.target)
    event.target.value = ''
}

const onHeroMediaDrop = async event => {
  heroMediaDragActive.value = false

  const file = event?.dataTransfer?.files?.[0]

  await handleHeroMediaFile(file)
}

const removeHeroMedia = () => {
  localSection.value.content.background.type = 'image'
  localSection.value.content.background.url = ''
  localSection.value.content.background.poster = ''
  heroMediaPreviewOpen.value = false
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

const addGridBullet = () => {
  ensureContentArray('grid_bullets')
  localSection.value.content.grid_bullets.push('')
}

const removeGridBullet = index => {
  ensureContentArray('grid_bullets')
  localSection.value.content.grid_bullets.splice(index, 1)
}

const moveGridBullet = (index, direction) => {
  ensureContentArray('grid_bullets')

  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= localSection.value.content.grid_bullets.length)
    return

  const updated = [...localSection.value.content.grid_bullets]
  const [moved] = updated.splice(index, 1)

  updated.splice(targetIndex, 0, moved)
  localSection.value.content.grid_bullets = updated
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

const isPdfFile = file => {
  const mime = String(file?.type || '').toLowerCase()
  const name = String(file?.name || '').toLowerCase()

  return mime === 'application/pdf' || name.endsWith('.pdf')
}

const uploadPdfDocumentFile = async file => {
  if (!file)
    return

  if (!isPdfFile(file)) {
    toast.error('Only PDF files are supported.')

    return
  }

  pdfDocumentUploading.value = true
  try {
    const media = await uploadAdminMedia(file)
    const mediaUrl = media.url || ''
    if (!mediaUrl)
      throw new Error('Upload completed but file URL is missing.')

    ensurePdfLibraryShape()

    const current = normalizePdfDocument(localSection.value.content.document)

    const updated = {
      ...current,
      view_url: mediaUrl,
      download_url: mediaUrl,
      pdf_url: mediaUrl,
    }

    localSection.value.content.document = updated
    localSection.value.content.documents = [updated]
    toast.success('PDF uploaded successfully.')
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    pdfDocumentUploading.value = false
  }
}

const openPdfDocumentPicker = () => {
  if (pdfDocumentUploading.value)
    return

  pdfDocumentInput.value?.click()
}

const onPdfDocumentInputChange = async event => {
  const file = event?.target?.files?.[0]

  await uploadPdfDocumentFile(file)
  if (event?.target)
    event.target.value = ''
}

const activatePdfDropzone = event => {
  event.preventDefault()
  if (pdfDocumentUploading.value)
    return

  pdfDocumentDragActive.value = true
}

const onPdfDocumentDragLeave = event => {
  const container = event?.currentTarget
  const nextTarget = event?.relatedTarget
  if (container && nextTarget && container.contains(nextTarget))
    return

  pdfDocumentDragActive.value = false
}

const onPdfDocumentDrop = async event => {
  event.preventDefault()
  pdfDocumentDragActive.value = false
  if (pdfDocumentUploading.value)
    return

  const file = event?.dataTransfer?.files?.[0]

  await uploadPdfDocumentFile(file)
}

const saveSection = () => {
  if (isPdfLibrary.value)
    ensurePdfLibraryShape()

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
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="localSection.type"
              :items="sectionTypeOptions"
              label="Section Type"
              variant="outlined"
              :disabled="isEditing"
            />
          </VCol>

          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="localSection.section_key"
              label="Section Key"
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="localSection.sort_order"
              label="Sort Order"
              type="number"
              min="1"
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              v-model="localSection.title"
              label="Internal Title"
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              v-model="localSection.subtitle"
              label="Subtitle / Eyebrow"
              variant="outlined"
            />
          </VCol>
        </VRow>

        <VDivider class="my-4" />

        <div
          v-if="isHero"
          class="d-flex flex-column gap-4"
        >
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
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                :model-value="heroMediaType || 'image'"
                label="Detected Background Type"
                variant="outlined"
                readonly
              />
            </VCol>
            <VCol
              cols="12"
              md="8"
            >
              <VTextField
                v-model="localSection.content.background.url"
                label="Background URL"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="localSection.content.background.poster"
                label="Poster URL"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="localSection.content.cta.label"
                label="CTA Label"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="localSection.content.cta.link"
                label="CTA Link"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
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
                    Hero Media Upload
                  </div>
                  <p class="mb-0 text-body-2 text-medium-emphasis">
                    Drop an image or video here. The uploader will detect the media type and store its public URL in the hero background.
                  </p>
                </div>

                <input
                  ref="heroMediaInput"
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime,video/mov"
                  class="d-none"
                  @change="onHeroMediaInputChange"
                >

                <div
                  class="hero-media-uploader__dropzone"
                  :class="{ 'hero-media-uploader__dropzone--active': heroMediaDragActive }"
                  @click="openHeroMediaPicker"
                  @dragenter.prevent="heroMediaDragActive = true"
                  @dragover.prevent="heroMediaDragActive = true"
                  @dragleave.prevent="heroMediaDragActive = false"
                  @drop.prevent="onHeroMediaDrop"
                >
                  <VIcon
                    :icon="heroMediaUploading ? 'tabler-loader-2' : 'tabler-cloud-upload'"
                    :class="{ 'spin-icon': heroMediaUploading }"
                    size="34"
                    color="primary"
                    class="mb-3"
                  />
                  <div class="text-subtitle-1 font-weight-semibold mb-1">
                    Drop hero media here or click to upload
                  </div>
                  <div class="text-body-2 text-medium-emphasis text-center">
                    Accepted: images and videos. Uploading a new file replaces the current hero media.
                  </div>
                </div>

                <div
                  v-if="heroMediaUrl"
                  class="hero-media-uploader__preview"
                >
                  <div class="hero-media-uploader__preview-copy">
                    <div class="d-flex align-center gap-2 mb-1">
                      <div class="text-subtitle-2 font-weight-semibold">
                        Current Hero Media
                      </div>
                      <VChip
                        color="primary"
                        variant="tonal"
                        size="x-small"
                      >
                        {{ isHeroVideo ? 'Video' : 'Image' }}
                      </VChip>
                    </div>
                    <div class="text-body-2 text-medium-emphasis text-break">
                      {{ heroMediaUrl }}
                    </div>
                  </div>
                  <div class="d-flex align-center gap-2">
                    <VBtn
                      color="primary"
                      variant="text"
                      :prepend-icon="isHeroVideo ? 'tabler-player-play' : 'tabler-eye'"
                      @click="heroMediaPreviewOpen = true"
                    >
                      {{ isHeroVideo ? 'Play' : 'Preview' }}
                    </VBtn>
                    <VBtn
                      color="error"
                      variant="text"
                      icon="tabler-x"
                      @click="removeHeroMedia"
                    />
                  </div>
                </div>
              </div>
            </VCol>
          </VRow>
        </div>

        <div
          v-else-if="isHeader"
          class="d-flex flex-column gap-4"
        >
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

        <div
          v-else-if="isFeatured"
          class="d-flex flex-column gap-4"
        >
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
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="localSection.content.limit"
                label="Product Limit"
                type="number"
                min="1"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="localSection.content.variant"
                label="Variant"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="localSection.content.cta_label"
                label="CTA Label"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </div>

        <div
          v-else-if="isCategoryCards"
          class="d-flex flex-column gap-4"
        >
          <div class="text-subtitle-1 font-weight-semibold">
            Category Cards Configuration
          </div>

          <VAlert
            color="info"
            variant="tonal"
          >
            Categories are loaded automatically from the CMS categories module and ordered by each category's display order. This section only controls the shared CTA label.
          </VAlert>

          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="localSection.content.cta_label"
                label="Default CTA Label"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </div>

        <div
          v-else-if="isProcess"
          class="d-flex flex-column gap-4"
        >
          <div class="text-subtitle-1 font-weight-semibold">
            Process Configuration
          </div>

          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="localSection.content.variant"
                label="Variant"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="localSection.content.background_style"
                label="Background Style"
                variant="outlined"
              />
            </VCol>
          </VRow>

          <div class="d-flex align-center justify-space-between gap-4">
            <div class="text-subtitle-2 font-weight-semibold">
              Section Steps
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
                    <VBtn
                      size="small"
                      variant="text"
                      icon="tabler-arrow-up"
                      :disabled="index === 0"
                      @click="moveItem(index, -1)"
                    />
                    <VBtn
                      size="small"
                      variant="text"
                      icon="tabler-arrow-down"
                      :disabled="index === localSection.items.length - 1"
                      @click="moveItem(index, 1)"
                    />
                    <VBtn
                      size="small"
                      color="error"
                      variant="text"
                      icon="tabler-trash"
                      @click="removeItem(index)"
                    />
                  </div>
                </div>

                <VRow>
                  <VCol
                    cols="12"
                    md="6"
                  >
                    <VTextField
                      v-model="item.title"
                      label="Title"
                      variant="outlined"
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="6"
                  >
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

        <div
          v-else-if="isContentBlock"
          class="d-flex flex-column gap-4"
        >
          <div class="text-subtitle-1 font-weight-semibold">
            Content Block Configuration
          </div>

          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="localSection.content.headline"
                label="Headline"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VSelect
                v-model="localSection.content.alignment"
                :items="['left', 'center']"
                label="Alignment"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
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
            <VBtn
              color="primary"
              variant="tonal"
              prepend-icon="tabler-plus"
              @click="addParagraph"
            >
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
                  <VBtn
                    size="small"
                    variant="text"
                    icon="tabler-arrow-up"
                    :disabled="index === 0"
                    @click="moveParagraph(index, -1)"
                  />
                  <VBtn
                    size="small"
                    variant="text"
                    icon="tabler-arrow-down"
                    :disabled="index === (localSection.content.paragraphs || []).length - 1"
                    @click="moveParagraph(index, 1)"
                  />
                  <VBtn
                    size="small"
                    color="error"
                    variant="text"
                    icon="tabler-trash"
                    @click="removeParagraph(index)"
                  />
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
            <VBtn
              color="primary"
              variant="tonal"
              prepend-icon="tabler-plus"
              @click="addBullet"
            >
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
                  <VBtn
                    size="small"
                    variant="text"
                    icon="tabler-arrow-up"
                    :disabled="index === 0"
                    @click="moveBullet(index, -1)"
                  />
                  <VBtn
                    size="small"
                    variant="text"
                    icon="tabler-arrow-down"
                    :disabled="index === (localSection.content.bullets || []).length - 1"
                    @click="moveBullet(index, 1)"
                  />
                  <VBtn
                    size="small"
                    color="error"
                    variant="text"
                    icon="tabler-trash"
                    @click="removeBullet(index)"
                  />
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
              Responsive Bullet Grid
            </div>
            <VBtn
              color="primary"
              variant="tonal"
              prepend-icon="tabler-plus"
              @click="addGridBullet"
            >
              Add Grid Bullet
            </VBtn>
          </div>

          <VCard
            v-for="(bullet, index) in localSection.content.grid_bullets || []"
            :key="`grid-bullet-${index}`"
            variant="outlined"
          >
            <VCardText class="pa-4">
              <div class="d-flex align-center justify-space-between gap-3 mb-4">
                <div class="text-subtitle-2 font-weight-semibold">
                  Grid Bullet {{ index + 1 }}
                </div>
                <div class="d-flex align-center gap-2">
                  <VBtn
                    size="small"
                    variant="text"
                    icon="tabler-arrow-up"
                    :disabled="index === 0"
                    @click="moveGridBullet(index, -1)"
                  />
                  <VBtn
                    size="small"
                    variant="text"
                    icon="tabler-arrow-down"
                    :disabled="index === (localSection.content.grid_bullets || []).length - 1"
                    @click="moveGridBullet(index, 1)"
                  />
                  <VBtn
                    size="small"
                    color="error"
                    variant="text"
                    icon="tabler-trash"
                    @click="removeGridBullet(index)"
                  />
                </div>
              </div>
              <VTextField
                v-model="localSection.content.grid_bullets[index]"
                label="Grid Bullet"
                variant="outlined"
              />
            </VCardText>
          </VCard>

          <div class="d-flex align-center justify-space-between gap-4">
            <div class="text-subtitle-2 font-weight-semibold">
              Label / Value Rows
            </div>
            <VBtn
              color="primary"
              variant="tonal"
              prepend-icon="tabler-plus"
              @click="addRow"
            >
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
                  <VBtn
                    size="small"
                    variant="text"
                    icon="tabler-arrow-up"
                    :disabled="index === 0"
                    @click="moveRow(index, -1)"
                  />
                  <VBtn
                    size="small"
                    variant="text"
                    icon="tabler-arrow-down"
                    :disabled="index === (localSection.content.rows || []).length - 1"
                    @click="moveRow(index, 1)"
                  />
                  <VBtn
                    size="small"
                    color="error"
                    variant="text"
                    icon="tabler-trash"
                    @click="removeRow(index)"
                  />
                </div>
              </div>
              <VRow>
                <VCol
                  cols="12"
                  md="4"
                >
                  <VTextField
                    v-model="row.label"
                    label="Label"
                    variant="outlined"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="8"
                >
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

        <div
          v-else-if="isPdfLibrary"
          class="d-flex flex-column gap-4"
        >
          <div class="text-subtitle-1 font-weight-semibold">
            PDF Library
          </div>

          <VAlert
            color="info"
            variant="tonal"
          >
            Upload PDFs and manage only the required public fields: view URL, download URL, and button label.
          </VAlert>

          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="localSection.content.headline"
                label="Headline"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="localSection.content.upload_help"
                label="Upload Help Text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="localSection.content.description"
                label="Description"
                variant="outlined"
                rows="3"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSwitch
                v-model="localSection.content.settings.viewer_enabled"
                color="primary"
                inset
                label="Enable PDF Viewer"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="localSection.content.settings.viewer_embed_mode"
                :items="['iframe', 'object']"
                label="Viewer Embed Mode"
                variant="outlined"
              />
            </VCol>
          </VRow>

          <VCard variant="outlined">
            <VCardText class="pa-4">
              <div class="text-subtitle-2 font-weight-semibold mb-4">
                Single Document
              </div>

              <VRow>
                <VCol
                  cols="12"
                  md="4"
                >
                  <VTextField
                    v-model="localSection.content.document.key"
                    label="Document Key"
                    variant="outlined"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="4"
                >
                  <VTextField
                    v-model="localSection.content.document.label"
                    label="Document Label"
                    variant="outlined"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="4"
                >
                  <VTextField
                    v-model="localSection.content.document.download_label"
                    label="Download Button Label"
                    variant="outlined"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <VTextField
                    v-model="localSection.content.document.view_url"
                    label="View URL"
                    variant="outlined"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <VTextField
                    v-model="localSection.content.document.download_url"
                    label="Download URL"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12">
                  <div class="pdf-document-uploader">
                    <input
                      ref="pdfDocumentInput"
                      class="d-none"
                      type="file"
                      accept="application/pdf,.pdf"
                      @change="onPdfDocumentInputChange"
                    >
                    <div
                      class="pdf-document-uploader__dropzone"
                      :class="{ 'pdf-document-uploader__dropzone--active': pdfDocumentDragActive }"
                      role="button"
                      tabindex="0"
                      @click="openPdfDocumentPicker"
                      @keydown.enter.prevent="openPdfDocumentPicker"
                      @keydown.space.prevent="openPdfDocumentPicker"
                      @dragenter="activatePdfDropzone"
                      @dragover="activatePdfDropzone"
                      @dragleave="onPdfDocumentDragLeave"
                      @drop="onPdfDocumentDrop"
                    >
                      <VIcon
                        :icon="pdfDocumentUploading ? 'tabler-loader-2' : 'tabler-file-type-pdf'"
                        :class="{ 'spin-icon': pdfDocumentUploading }"
                        size="36"
                        color="primary"
                      />
                      <div class="text-subtitle-2 font-weight-semibold mt-3">
                        {{ pdfDocumentUploading ? 'Uploading PDF...' : (pdfDocumentDragActive ? 'Drop PDF to upload' : 'Drag and drop a PDF here') }}
                      </div>
                      <div class="text-body-2 text-medium-emphasis mt-1">
                        or click to browse your files
                      </div>
                      <div class="text-caption text-medium-emphasis mt-2">
                        Only `.pdf` files are supported
                      </div>
                    </div>

                    <div class="pdf-document-uploader__meta d-flex flex-wrap align-center gap-2">
                      <VChip
                        v-if="pdfDocumentFileName"
                        color="primary"
                        variant="tonal"
                        size="small"
                        prepend-icon="tabler-file-type-pdf"
                      >
                        {{ pdfDocumentFileName }}
                      </VChip>
                      <span class="text-body-2 text-medium-emphasis">
                        Uploading a PDF sets both view and download URLs.
                      </span>
                    </div>
                  </div>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </div>

        <div
          v-else-if="isSpacer"
          class="d-flex flex-column gap-4"
        >
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
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                v-model="localSection.content.height"
                label="Base Height"
                type="number"
                min="0"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                v-model="localSection.content.desktop"
                label="Desktop Height"
                type="number"
                min="0"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VTextField
                v-model="localSection.content.tablet"
                label="Tablet Height"
                type="number"
                min="0"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
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

        <div
          v-else-if="isFaq"
          class="d-flex flex-column gap-4"
        >
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
                    <VBtn
                      size="small"
                      variant="text"
                      icon="tabler-arrow-up"
                      :disabled="index === 0"
                      @click="moveFaq(index, -1)"
                    />
                    <VBtn
                      size="small"
                      variant="text"
                      icon="tabler-arrow-down"
                      :disabled="index === localSection.faqs.length - 1"
                      @click="moveFaq(index, 1)"
                    />
                    <VBtn
                      size="small"
                      color="error"
                      variant="text"
                      icon="tabler-trash"
                      @click="removeFaq(index)"
                    />
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

        <div
          v-else-if="isTelehealth"
          class="d-flex flex-column gap-4"
        >
          <div class="text-subtitle-1 font-weight-semibold">
            CTA Configuration
          </div>
          <VRow>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="localSection.content.layout"
                label="Layout"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="localSection.content.button.label"
                label="Button Label"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
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
    v-model="heroMediaPreviewOpen"
    max-width="900"
  >
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between gap-4 py-4 px-5">
        <div class="text-h6">
          Hero Media Preview
        </div>
        <VBtn
          icon="tabler-x"
          variant="text"
          @click="heroMediaPreviewOpen = false"
        />
      </VCardTitle>
      <VCardText class="px-5 pb-5">
        <video
          v-if="isHeroVideo && heroMediaUrl"
          :src="heroMediaUrl"
          controls
          playsinline
          class="hero-video-dialog__video"
        />
        <img
          v-else-if="heroMediaUrl"
          :src="heroMediaUrl"
          alt="Hero media preview"
          class="hero-video-dialog__image"
        >
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

.hero-media-uploader__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: 24px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.28);
  border-radius: 18px;
  background: rgba(var(--v-theme-surface), 0.92);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.hero-media-uploader__dropzone--active {
  border-color: rgba(var(--v-theme-primary), 0.6);
  background: rgba(var(--v-theme-primary), 0.08);
  transform: translateY(-1px);
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

.pdf-document-uploader {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pdf-document-uploader__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 184px;
  padding: 22px 20px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.3);
  border-radius: 16px;
  background: rgba(var(--v-theme-primary), 0.04);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.pdf-document-uploader__dropzone:hover {
  border-color: rgba(var(--v-theme-primary), 0.52);
  background: rgba(var(--v-theme-primary), 0.07);
}

.pdf-document-uploader__dropzone--active {
  border-color: rgba(var(--v-theme-primary), 0.7);
  background: rgba(var(--v-theme-primary), 0.11);
  transform: translateY(-1px);
}

.pdf-document-uploader__meta {
  min-height: 28px;
}

.hero-video-dialog__video {
  width: 100%;
  max-height: 70vh;
  border-radius: 18px;
  background: #000;
}

.hero-video-dialog__image {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  margin: 0 auto;
  border-radius: 18px;
}

.spin-icon {
  animation: spin 0.9s linear infinite;
}

@media (max-width: 767px) {
  .hero-media-uploader__preview {
    flex-direction: column;
    align-items: flex-start;
  }

  .pdf-document-uploader__dropzone {
    min-height: 160px;
    padding: 18px 14px;
  }
}
</style>
