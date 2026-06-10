<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { useRoute, useRouter } from 'vue-router'
import { requiredValidator } from '@/@core/utils/validators'
import ProductPreviewDrawer from '@/views/pages/admin/components/ProductPreviewDrawer.vue'
import {
  ADMIN_INGREDIENTS_URL,
  ADMIN_MEDIA_UPLOAD_URL,
  ADMIN_PRODUCTS_IMAGE_CONFIG_URL,
  ADMIN_PRODUCTS_STEP1_URL,
  ADMIN_PRODUCTS_STEP2_URL,
  ADMIN_PRODUCTS_STEP3_URL,
  ADMIN_PRODUCTS_STEP4_URL,
  ADMIN_PRODUCTS_STEP5_URL,
  getAdminProductPublishStatusUrl,
  getAdminProductPublishUrl,
  getAdminProductStepUrl,
  getAdminProductStepStatusUrl,
  getAdminProductUnpublishUrl,
} from '@/network/const'
import { getApiToken } from '@/store/authData'

const toast = useToast()
const route = useRoute()
const router = useRouter()
const routeProductId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const previewDrawerOpen = ref(false)
const statusLoading = ref(false)
const stepDataLoading = ref(false)
const completedStepLookup = ref({})

const STEP_DEFINITIONS = Object.freeze([
  {
    id: 1,
    title: 'Product Basics',
    description: 'Start the draft and upload the required product image types.',
    icon: 'tabler-package',
    color: 'primary',
  },
  {
    id: 2,
    title: 'Benefits & FAQs',
    description: 'Build the key benefits and product questions in a flexible list editor.',
    icon: 'tabler-sparkles',
    color: 'success',
  },
  {
    id: 3,
    title: 'Additional Details',
    description: 'Add treatment guidance, usage details, and key ingredients.',
    icon: 'tabler-file-description',
    color: 'warning',
  },
  {
    id: 4,
    title: 'Research & Evidence',
    description: 'Save the clinical research description and full list of supporting references.',
    icon: 'tabler-microscope',
    color: 'info',
  },
  {
    id: 5,
    title: 'Pricing Plans',
    description: 'Configure one-time and subscription pricing with separate plan groups.',
    icon: 'tabler-credit-card',
    color: 'secondary',
  },
  {
    id: 6,
    title: 'Complete',
    description: 'The pricing step is saved and the wizard is complete.',
    icon: 'tabler-circle-check',
    color: 'success',
  },
])

const categoryOptions = [
  { title: 'Weight Loss', value: 'weight_loss' },
  { title: 'Wellness', value: 'wellness' },
  { title: 'Longevity', value: 'longevity' },
]

const basicsFormRef = ref()
const selectedStep = ref(routeProductId.value ? 2 : 1)
const isUploading = ref(false)
const isSavingStep1 = ref(false)
const isSavingStep2 = ref(false)
const isSavingStep3 = ref(false)
const isSavingStep4 = ref(false)
const isSavingStep5 = ref(false)
const publishStatusLoading = ref(false)
const publishActionLoading = ref(false)
const imageConfigLoading = ref(false)
const imageConfigError = ref('')
const imageTypeConfigs = ref([])
const dragTargetKey = ref('')
const imageInputRefs = ref({})
const selectedImageTab = ref('')
const benefitDraft = ref('')
const ingredientSearch = ref('')
const ingredientSearchResults = ref([])
const ingredientSearchLoading = ref(false)
const selectedIngredientSuggestionId = ref('')
const ingredientSearchOpen = ref(false)
let ingredientSearchTimeout = null

const faqDraft = reactive({
  question: '',
  answer: '',
})

const ingredientDraft = reactive({
  name: '',
  description: '',
})

const researchLinkDraft = reactive({
  title: '',
  article_url: '',
  authors: '',
  journal: '',
  publication_year: '',
  pubmed_id: '',
  doi: '',
  description: '',
})

const createPricingGroup = () => ({
  title: '',
  description: '',
  is_active: false,
  options: [],
})

const createPricingDraft = billingInterval => ({
  label: '',
  billing_interval: billingInterval,
  interval_count: 1,
  price: '',
  discount_percent: 0,
  final_price: '',
  is_default: false,
  mg: '',
  tagline: '',
  savings_label: '',
})

const pricingDrafts = reactive({
  subscription: createPricingDraft('month'),
  one_time: createPricingDraft('one_time'),
})

const createInitialProductState = productId => ({
  id: productId,
  name: '',
  slug: '',
  category: '',
  description: '',
  images: [],
  benefits: [],
  faqs: [],
  about_treatment: '',
  how_it_works: '',
  treatment_duration: '',
  usage_instructions: '',
  ingredients: [],
  clinical_research_description: '',
  research_links: [],
  pricing: {
    subscription: createPricingGroup(),
    one_time: createPricingGroup(),
  },
  completion_status: 'not_started',
  completion_percentage: 0,
  completion_step: productId ? 2 : 1,
  cover_image_id: '',
})

const productState = reactive(createInitialProductState(routeProductId.value))

const publishState = reactive({
  is_published: false,
  can_publish: false,
  can_unpublish: false,
})

const createImageTypeConfig = (config = {}, index = 0) => ({
  type: String(config.type || '').trim(),
  label: String(config.label || `Image Type ${index + 1}`).trim(),
  required: !!config.required,
  max_images: Math.max(1, Number(config.max_images || 1)),
  used_for: String(config.used_for || '').trim(),
})

const uploadingCount = computed(() => productState.images.filter(image => image.isUploading).length)
const uploadedImages = computed(() => productState.images.filter(image => !image.isUploading && !image.uploadError))
const hasUploadedImages = computed(() => uploadedImages.value.length > 0)

const imageTypeLookup = computed(() => imageTypeConfigs.value.reduce((acc, config, index) => {
  acc[config.type] = {
    ...config,
    index,
  }

  return acc
}, {}))

const imageCountsByType = computed(() => productState.images.reduce((acc, image) => {
  if (!image.image_url) return acc
  acc[image.image_type] = (acc[image.image_type] || 0) + 1

  return acc
}, {}))

const missingRequiredImageConfigs = computed(() => imageTypeConfigs.value.filter(config => (
  config.required && !imageCountsByType.value[config.type]
)))

const legacyImageTypeConfigs = computed(() => Array.from(new Set(
  productState.images
    .map(image => image.image_type)
    .filter(type => type && !imageTypeLookup.value[type]),
)).map((type, index) => createImageTypeConfig({
  type,
  label: `Legacy ${type.replace(/[_-]+/g, ' ')}`,
  required: false,
  max_images: Math.max(imageCountsByType.value[type] || 0, 1),
  used_for: 'Existing saved image type not returned by the current image config.',
}, imageTypeConfigs.value.length + index)))

const imageConfigsWithSlots = computed(() => [...imageTypeConfigs.value, ...legacyImageTypeConfigs.value].map(config => ({
  ...config,
  currentCount: imageCountsByType.value[config.type] || 0,
  slots: Array.from({ length: config.max_images }, (_, index) => ({
    key: `${config.type}-${index + 1}`,
    type: config.type,
    slotPosition: index + 1,
    image: getImageByTypeSlot(config.type, index + 1),
  })),
})))

const coverImageConfig = computed(() => imageConfigsWithSlots.value.find(config => config.type === 'cover') || null)

const secondaryImageConfigs = computed(() => imageConfigsWithSlots.value.filter(config => config.type !== 'cover'))

const activeSecondaryImageConfig = computed(() => (
  secondaryImageConfigs.value.find(config => config.type === selectedImageTab.value)
  || secondaryImageConfigs.value[0]
  || null
))

const completionPercentage = computed(() => {
  const value = Number(productState.completion_percentage || 0)
  
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
})

const completionLabel = computed(() => {
  if (productState.completion_status === 'complete') return 'Complete'
  if (completionPercentage.value > 0) return 'In Progress'
  
  return 'Not Started'
})

const canPreviewProduct = computed(() => !!productState.id && isStepCompleted(1))
const selectedStepDefinition = computed(() => STEP_DEFINITIONS.find(step => step.id === selectedStep.value) || STEP_DEFINITIONS[0])

const unlockedMaxStep = computed(() => {
  const step = Number(productState.completion_step || 1)
  
  return Math.max(1, Math.min(STEP_DEFINITIONS.length, step))
})

const showStatusLoader = computed(() => !!routeProductId.value && statusLoading.value)
const showStepLoader = computed(() => !!routeProductId.value && (statusLoading.value || stepDataLoading.value))
const publishStatusTone = computed(() => (publishState.is_published ? 'success' : 'warning'))
const publishStatusLabel = computed(() => (publishState.is_published ? 'Published' : 'Not Published'))
const publishHeroIcon = computed(() => (publishState.is_published ? 'tabler-world-check' : 'tabler-eye-off'))

const selectedIngredientSuggestion = computed(() => (
  ingredientSearchResults.value.find(item => item.id === selectedIngredientSuggestionId.value) || null
))

const pricingGroups = computed(() => ([
  {
    key: 'subscription',
    title: 'Subscription Pricing',
    description: 'Use recurring plans for long-term treatment programs.',
    color: 'success',
    toggleLabel: 'Enable Subscription',
    billingInterval: 'month',
  },
  {
    key: 'one_time',
    title: 'One-Time Pricing',
    description: 'Use standalone purchase plans without recurring billing.',
    color: 'primary',
    toggleLabel: 'Enable One-Time',
    billingInterval: 'one_time',
  },
]))

const resetPricingDraft = groupKey => {
  Object.assign(pricingDrafts[groupKey], createPricingDraft(groupKey === 'subscription' ? 'month' : 'one_time'))
}

const resetWizardState = () => {
  Object.assign(productState, createInitialProductState(''))
  publishState.is_published = false
  publishState.can_publish = false
  publishState.can_unpublish = false
  selectedStep.value = 1
  completedStepLookup.value = {}
  benefitDraft.value = ''
  faqDraft.question = ''
  faqDraft.answer = ''
  ingredientDraft.name = ''
  ingredientDraft.description = ''
  ingredientSearch.value = ''
  ingredientSearchResults.value = []
  ingredientSearchOpen.value = false
  selectedIngredientSuggestionId.value = ''
  researchLinkDraft.title = ''
  researchLinkDraft.article_url = ''
  researchLinkDraft.authors = ''
  researchLinkDraft.journal = ''
  researchLinkDraft.publication_year = ''
  researchLinkDraft.pubmed_id = ''
  researchLinkDraft.doi = ''
  researchLinkDraft.description = ''
  resetPricingDraft('subscription')
  resetPricingDraft('one_time')
}

const getImageTypeOrder = type => {
  const index = imageTypeLookup.value[type]?.index

  return Number.isInteger(index) ? index : Number.MAX_SAFE_INTEGER
}

const sortImagesWithinType = images => [...images].sort((left, right) => (
  Number(left.slot_index || 0) - Number(right.slot_index || 0)
  || Number(left.sort_order || 0) - Number(right.sort_order || 0)
  || String(left.local_id || '').localeCompare(String(right.local_id || ''))
))

const getImagesByType = type => sortImagesWithinType(
  productState.images.filter(image => image.image_type === type),
)

const getImageByTypeSlot = (type, slotPosition) => getImagesByType(type).find(image => (
  Number(image.slot_index || 0) === Number(slotPosition)
))

const getNextSlotIndex = imageType => getImagesByType(imageType).length + 1

const canUploadMoreImages = config => {
  if (!config) return false
  if (config.max_images === 1) return true

  return getImagesByType(config.type).length < config.max_images
}

const getImageUploaderSummary = config => {
  if (!config) return ''
  if (config.max_images === 1)
    return config.currentCount ? 'Upload a new file here to replace the current image.' : 'Upload one image for this slot.'

  const remainingCount = Math.max(0, config.max_images - config.currentCount)

  return remainingCount
    ? `You can upload ${remainingCount} more image${remainingCount === 1 ? '' : 's'} for this type.`
    : 'Maximum images reached. Reorder or remove an image before uploading another.'
}

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

const isStepCompleted = stepId => {
  if (completedStepLookup.value[stepId] !== undefined) return !!completedStepLookup.value[stepId]
  
  return stepId < unlockedMaxStep.value
}

const isStepLocked = stepId => stepId > unlockedMaxStep.value

const selectStep = stepId => {
  if (isStepLocked(stepId)) return
  selectedStep.value = stepId
}

const syncImageMeta = () => {
  const groups = new Map()

  productState.images
    .filter(image => image?.image_url || image?.isUploading || image?.uploadError)
    .forEach((image, index) => {
      const imageType = image.image_type || imageTypeConfigs.value[0]?.type || 'cover'

      const nextImage = {
        local_id: image.local_id || `${Date.now()}-${imageType}-${index}`,
        id: image.id || null,
        image_url: image.image_url || '',
        upload_path: image.upload_path || '',
        original_name: image.original_name || '',
        image_type: imageType,
        sort_order: Number(image.sort_order ?? index),
        slot_index: Number(image.slot_index || 1),
        isUploading: !!image.isUploading,
        uploadError: image.uploadError || '',
      }

      if (!groups.has(imageType)) groups.set(imageType, [])
      groups.get(imageType).push(nextImage)
    })

  const orderedTypes = [
    ...imageTypeConfigs.value.map(config => config.type),
    ...Array.from(groups.keys()).filter(type => !imageTypeLookup.value[type]),
  ]

  const normalizedImages = orderedTypes.flatMap(type => {
    const images = sortImagesWithinType(groups.get(type) || [])
    const maxImages = imageTypeLookup.value[type]?.max_images || images.length || 1

    return images.slice(0, maxImages).map((image, index) => ({
      ...image,
      slot_index: index + 1,
    }))
  })

  productState.images = normalizedImages.map((image, index) => ({
    ...image,
    sort_order: index,
  }))

  const coverImage = productState.images.find(image => image.image_type === 'cover' && image.image_url)

  productState.cover_image_id = coverImage?.id || coverImage?.local_id || ''
}

const removeImage = localId => {
  productState.images = productState.images.filter(image => image.local_id !== localId)
  syncImageMeta()
}

const setImageInputRef = (slotKey, element) => {
  if (element) {
    imageInputRefs.value[slotKey] = element

    return
  }

  delete imageInputRefs.value[slotKey]
}

const openFilePicker = slotKey => {
  imageInputRefs.value[slotKey]?.click()
}

const beginImageUpload = (file, imageType, slotPosition) => {
  const existingImage = getImageByTypeSlot(imageType, slotPosition)

  if (existingImage) {
    productState.images = productState.images.map(image => (image.local_id === existingImage.local_id
      ? {
        ...image,
        original_name: file.name,
        isUploading: true,
        uploadError: '',
      }
      : image))

    return {
      localId: existingImage.local_id,
      isReplacement: true,
    }
  }

  const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  productState.images.push({
    local_id: localId,
    id: null,
    image_url: '',
    upload_path: '',
    original_name: file.name,
    image_type: imageType,
    sort_order: productState.images.length,
    slot_index: slotPosition,
    isUploading: true,
    uploadError: '',
  })
  syncImageMeta()

  return {
    localId,
    isReplacement: false,
  }
}

const uploadSingleFile = async (file, imageType, slotPosition) => {
  const { localId, isReplacement } = beginImageUpload(file, imageType, slotPosition)
  const formData = new FormData()

  formData.append('file', file)
  formData.append('type', 'product')

  try {
    const response = await axios.post(ADMIN_MEDIA_UPLOAD_URL, formData, {
      headers: getAuthHeaders({ 'Content-Type': 'multipart/form-data' }),
    })

    const payload = response?.data?.data || {}

    productState.images = productState.images.map(image => {
      if (image.local_id !== localId) return image
      
      return {
        ...image,
        image_url: payload.url || '',
        upload_path: payload.path || '',
        original_name: payload.original_name || file.name,
        image_type: imageType,
        slot_index: slotPosition,
        isUploading: false,
        uploadError: '',
      }
    })

    syncImageMeta()
    toast.success(`${file.name} uploaded`)
  } catch (error) {
    productState.images = productState.images.map(image => {
      if (image.local_id !== localId) return image

      return {
        ...image,
        isUploading: false,
        uploadError: isReplacement ? '' : buildErrorMessage(error),
      }
    })
    syncImageMeta()
    toast.error(buildErrorMessage(error))
  }
}

const getFilesToUploadForType = (config, files) => {
  if (config.max_images === 1) return files.slice(0, 1)

  const remainingCount = Math.max(0, config.max_images - config.currentCount)
  if (!remainingCount) {
    toast.error('Remove an uploaded image before adding another one.')

    return []
  }

  const filesToUpload = files.slice(0, remainingCount)
  if (filesToUpload.length < files.length)
    toast.info(`Only the first ${remainingCount} file${remainingCount === 1 ? '' : 's'} will be uploaded for ${config.label}.`)

  return filesToUpload
}

const uploadFilesForType = async (config, input) => {
  const files = Array.from(input || []).filter(Boolean)
  if (!files.length || !config) return

  const filesToUpload = getFilesToUploadForType(config, files)
  if (!filesToUpload.length) return

  const baseSlotIndex = config.max_images === 1 ? 1 : getNextSlotIndex(config.type)

  isUploading.value = true
  try {
    for (const [index, file] of filesToUpload.entries()) {
      const slotIndex = config.max_images === 1 ? 1 : baseSlotIndex + index

      await uploadSingleFile(file, config.type, slotIndex)
    }
  } finally {
    syncImageMeta()
    isUploading.value = false
  }
}

const handleFiles = async (imageType, slotPosition, input) => {
  const file = Array.from(input || []).filter(Boolean)[0]
  if (!file) return

  isUploading.value = true
  try {
    await uploadSingleFile(file, imageType, slotPosition)
  } finally {
    syncImageMeta()
    isUploading.value = false
  }
}

const onFileChange = async (imageType, slotPosition, event) => {
  await handleFiles(imageType, slotPosition, event?.target?.files)
  if (event?.target) event.target.value = ''
}

const onConfigFileChange = async (config, event) => {
  await uploadFilesForType(config, event?.target?.files)
  if (event?.target) event.target.value = ''
}

const onDrop = async (slotKey, imageType, slotPosition, event) => {
  dragTargetKey.value = ''
  await handleFiles(imageType, slotPosition, event.dataTransfer?.files)
}

const onConfigDrop = async (slotKey, config, event) => {
  dragTargetKey.value = ''
  await uploadFilesForType(config, event.dataTransfer?.files)
}

const moveImageWithinType = (imageType, localId, direction) => {
  const images = getImagesByType(imageType)
  const currentIndex = images.findIndex(image => image.local_id === localId)
  const targetIndex = currentIndex + direction

  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= images.length) return

  const reorderedImages = [...images]
  const [currentImage] = reorderedImages.splice(currentIndex, 1)

  reorderedImages.splice(targetIndex, 0, currentImage)

  const nextImageLookup = new Map(reorderedImages.map((image, index) => [image.local_id, {
    ...image,
    slot_index: index + 1,
    sort_order: index,
  }]))

  productState.images = productState.images.map(image => (
    image.image_type === imageType && nextImageLookup.has(image.local_id)
      ? nextImageLookup.get(image.local_id)
      : image
  ))
  syncImageMeta()
}

const loadImageConfig = async () => {
  imageConfigLoading.value = true
  imageConfigError.value = ''

  try {
    const response = await axios.get(ADMIN_PRODUCTS_IMAGE_CONFIG_URL, {
      headers: getAuthHeaders({ Accept: 'application/json' }),
    })

    const imageTypes = response?.data?.image_types || response?.data?.data?.image_types || []

    imageTypeConfigs.value = imageTypes
      .map((config, index) => createImageTypeConfig(config, index))
      .filter(config => config.type)

    if (!imageTypeConfigs.value.length)
      throw new Error('No image upload types were returned by the server.')

    syncImageMeta()
  } catch (error) {
    imageConfigError.value = buildErrorMessage(error)
    toast.error(imageConfigError.value)
  } finally {
    imageConfigLoading.value = false
  }
}

const openPreviewDrawer = () => {
  if (!canPreviewProduct.value) {
    toast.error('Save Product Basics first to preview the product.')
    
    return
  }

  previewDrawerOpen.value = true
}

const addBenefit = () => {
  const value = benefitDraft.value.trim()
  if (!value) {
    toast.error('Enter a key benefit first.')
    
    return
  }

  productState.benefits.push({
    local_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    benefit_text: value,
  })
  benefitDraft.value = ''
}

const removeBenefit = localId => {
  productState.benefits = productState.benefits.filter(item => item.local_id !== localId)
}

const moveBenefit = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= productState.benefits.length) return
  const items = [...productState.benefits]
  const [current] = items.splice(index, 1)

  items.splice(targetIndex, 0, current)
  productState.benefits = items
}

const addFaq = () => {
  const question = faqDraft.question.trim()
  const answer = faqDraft.answer.trim()

  if (!question || !answer) {
    toast.error('Enter both question and answer before adding an FAQ.')
    
    return
  }

  productState.faqs.push({
    local_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    question,
    answer,
  })

  faqDraft.question = ''
  faqDraft.answer = ''
}

const removeFaq = localId => {
  productState.faqs = productState.faqs.filter(item => item.local_id !== localId)
}

const moveFaq = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= productState.faqs.length) return
  const items = [...productState.faqs]
  const [current] = items.splice(index, 1)

  items.splice(targetIndex, 0, current)
  productState.faqs = items
}

const addIngredient = () => {
  const selected = selectedIngredientSuggestion.value
  const name = selected?.name || ingredientDraft.name.trim()
  const description = selected?.description || ingredientDraft.description.trim()

  if (!name) {
    toast.error('Enter or select an ingredient name first.')
    
    return
  }

  const alreadyExists = productState.ingredients.some(item => (
    (selected?.id && item.id === selected.id)
    || item.name.toLowerCase() === name.toLowerCase()
  ))

  if (alreadyExists) {
    toast.error('This ingredient is already in the list.')
    
    return
  }

  productState.ingredients.push({
    local_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: selected?.id,
    name,
    description,
  })

  ingredientDraft.name = ''
  ingredientDraft.description = ''
  ingredientSearch.value = ''
  ingredientSearchResults.value = []
  selectedIngredientSuggestionId.value = ''
  ingredientSearchOpen.value = false
}

const removeIngredient = localId => {
  productState.ingredients = productState.ingredients.filter(item => item.local_id !== localId)
}

const moveIngredient = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= productState.ingredients.length) return
  const items = [...productState.ingredients]
  const [current] = items.splice(index, 1)

  items.splice(targetIndex, 0, current)
  productState.ingredients = items
}

const addResearchLink = () => {
  const title = researchLinkDraft.title.trim()
  const articleUrl = researchLinkDraft.article_url.trim()

  if (!title || !articleUrl) {
    toast.error('Research title and article URL are required.')
    
    return
  }

  productState.research_links.push({
    local_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    article_url: articleUrl,
    authors: researchLinkDraft.authors.trim(),
    journal: researchLinkDraft.journal.trim(),
    publication_year: researchLinkDraft.publication_year ? Number(researchLinkDraft.publication_year) : undefined,
    pubmed_id: researchLinkDraft.pubmed_id.trim(),
    doi: researchLinkDraft.doi.trim(),
    description: researchLinkDraft.description.trim(),
  })

  Object.assign(researchLinkDraft, {
    title: '',
    article_url: '',
    authors: '',
    journal: '',
    publication_year: '',
    pubmed_id: '',
    doi: '',
    description: '',
  })
}

const removeResearchLink = localId => {
  productState.research_links = productState.research_links.filter(item => item.local_id !== localId)
}

const moveResearchLink = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= productState.research_links.length) return
  const items = [...productState.research_links]
  const [current] = items.splice(index, 1)

  items.splice(targetIndex, 0, current)
  productState.research_links = items
}

const normalizePricingNumbers = value => {
  const parsed = Number(value)
  
  return Number.isFinite(parsed) ? parsed : 0
}

const addPricingOption = groupKey => {
  const draft = pricingDrafts[groupKey]
  const group = productState.pricing[groupKey]

  if (!group.is_active) {
    toast.error(`Enable ${groupKey === 'subscription' ? 'subscription' : 'one-time'} pricing first.`)
    
    return
  }

  if (!draft.label.trim()) {
    toast.error('Pricing option label is required.')
    
    return
  }

  const price = normalizePricingNumbers(draft.price)
  const finalPrice = normalizePricingNumbers(draft.final_price)
  if (!price || !finalPrice) {
    toast.error('Price and final price are required.')
    
    return
  }

  const option = {
    local_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: draft.label.trim(),
    billing_interval: groupKey === 'subscription' ? (draft.billing_interval || 'month') : 'one_time',
    interval_count: Number(draft.interval_count || 1),
    price,
    discount_percent: normalizePricingNumbers(draft.discount_percent),
    final_price: finalPrice,
    is_default: !!draft.is_default,
    metadata: {
      ...(draft.mg.trim() ? { mg: draft.mg.trim() } : {}),
      ...(draft.tagline.trim() ? { tagline: draft.tagline.trim() } : {}),
      ...(draft.savings_label.trim() ? { savings_label: draft.savings_label.trim() } : {}),
    },
  }

  if (option.is_default) {
    group.options = group.options.map(item => ({ ...item, is_default: false }))
  } else if (!group.options.length) {
    option.is_default = true
  }

  group.options.push(option)
  Object.assign(draft, createPricingDraft(groupKey === 'subscription' ? 'month' : 'one_time'))
}

const removePricingOption = (groupKey, localId) => {
  const group = productState.pricing[groupKey]
  const removed = group.options.find(item => item.local_id === localId)

  group.options = group.options.filter(item => item.local_id !== localId)

  if (removed?.is_default && group.options.length) {
    group.options[0].is_default = true
  }
}

const movePricingOption = (groupKey, index, direction) => {
  const group = productState.pricing[groupKey]
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= group.options.length) return
  const items = [...group.options]
  const [current] = items.splice(index, 1)

  items.splice(targetIndex, 0, current)
  group.options = items
}

const setDefaultPricingOption = (groupKey, localId) => {
  const group = productState.pricing[groupKey]

  group.options = group.options.map(item => ({
    ...item,
    is_default: item.local_id === localId,
  }))
}

const getOrderedStep1Images = () => [...productState.images]
  .filter(image => image.image_url)
  .sort((left, right) => (
    getImageTypeOrder(left.image_type) - getImageTypeOrder(right.image_type)
    || Number(left.slot_index || 0) - Number(right.slot_index || 0)
    || Number(left.sort_order || 0) - Number(right.sort_order || 0)
  ))

const buildStep1Payload = () => ({
  ...(productState.id ? { id: productState.id } : {}),
  name: productState.name,
  ...(productState.slug ? { slug: productState.slug } : {}),
  category: productState.category,
  description: productState.description,
  images: getOrderedStep1Images()
    .map((image, index) => ({
      image_url: image.image_url,
      image_type: image.image_type,
      sort_order: index,
    })),
})

const buildStep2Payload = () => ({
  product_id: productState.id,
  benefits: productState.benefits.map((item, index) => ({
    benefit_text: item.benefit_text,
    sort_order: index,
  })),
  faqs: productState.faqs.map((item, index) => ({
    question: item.question,
    answer: item.answer,
    sort_order: index,
  })),
})

const buildStep3Payload = () => ({
  product_id: productState.id,
  about_treatment: productState.about_treatment,
  how_it_works: productState.how_it_works,
  treatment_duration: productState.treatment_duration,
  usage_instructions: productState.usage_instructions,
  ingredients: productState.ingredients.map((item, index) => ({
    ...(item.id
      ? { ingredient_id: item.id }
      : {
        name: item.name,
        description: item.description || undefined,
      }),
    sort_order: index,
  })),
})

const buildStep4Payload = () => ({
  product_id: productState.id,
  clinical_research_description: productState.clinical_research_description,
  research_links: productState.research_links.map((item, index) => ({
    title: item.title,
    article_url: item.article_url,
    authors: item.authors || undefined,
    journal: item.journal || undefined,
    publication_year: item.publication_year || undefined,
    pubmed_id: item.pubmed_id || undefined,
    doi: item.doi || undefined,
    description: item.description || undefined,
    sort_order: index,
  })),
})

const buildPricingGroupPayload = groupKey => {
  const group = productState.pricing[groupKey]
  if (!group.is_active) return null

  return {
    title: group.title,
    description: group.description,
    is_active: true,
    options: group.options.map((option, index) => ({
      label: option.label,
      billing_interval: option.billing_interval,
      interval_count: Number(option.interval_count || 1),
      price: Number(option.price),
      discount_percent: Number(option.discount_percent || 0),
      final_price: Number(option.final_price),
      sort_order: index,
      is_default: !!option.is_default,
      metadata: Object.keys(option.metadata || {}).length ? option.metadata : {},
    })),
  }
}

const buildStep5Payload = () => {
  const pricing = {}
  const subscription = buildPricingGroupPayload('subscription')
  const oneTime = buildPricingGroupPayload('one_time')

  if (subscription) pricing.subscription = subscription
  if (oneTime) pricing.one_time = oneTime

  return {
    product_id: productState.id,
    pricing,
  }
}

const applyStepStatus = payload => {
  if (!payload) return
  productState.id = payload.product_id || productState.id
  productState.completion_status = payload.completion_status || productState.completion_status
  productState.completion_percentage = payload.completion_percentage ?? productState.completion_percentage
  productState.completion_step = payload.current_step ?? productState.completion_step
  selectedStep.value = payload.current_step ?? selectedStep.value
  completedStepLookup.value = Array.isArray(payload.steps)
    ? payload.steps.reduce((acc, item) => {
      acc[item.step] = !!item.is_completed

      return acc
    }, {})
    : {}
}

const getStep1ImagesCollection = images => {
  if (Array.isArray(images)) {
    return images
      .filter(Boolean)
      .map((image, index) => ({
        ...image,
        _frontend_slot_type: image.image_type || '',
        _frontend_slot_index: index,
      }))
  }

  if (images && typeof images === 'object') {
    return Object.entries(images)
      .filter(([, image]) => !!image)
      .map(([slotType, image], index) => ({
        ...image,
        _frontend_slot_type: slotType,
        _frontend_slot_index: index,
      }))
  }

  return []
}

const hydrateStep1Image = (image, index, coverImageId) => {
  const slotType = image._frontend_slot_type || image.image_type || (image.id && coverImageId === image.id ? 'cover' : imageTypeConfigs.value[0]?.type || 'cover')
  const slotIndex = image._frontend_slot_index ?? index

  return {
    local_id: `${slotType}-${image.id || image.local_id || `${Date.now()}-${slotIndex}`}`,
    id: image.id || null,
    image_url: image.image_url || image.url || '',
    upload_path: image.path || image.upload_path || '',
    original_name: image.original_name || image.name || '',
    image_type: slotType,
    sort_order: image.sort_order ?? slotIndex,
    slot_index: slotIndex + 1,
    isUploading: false,
    uploadError: '',
  }
}

const hydrateStep1 = payload => {
  productState.id = payload.product_id || productState.id
  productState.name = payload.name || ''
  productState.slug = payload.slug || ''
  productState.category = payload.category || ''
  productState.description = payload.description || ''
  productState.cover_image_id = payload.cover_image_id || ''

  const images = getStep1ImagesCollection(payload.images)

  productState.images = images.map((image, index) => hydrateStep1Image(image, index, payload.cover_image_id))
  syncImageMeta()
}

const hydrateStep2 = payload => {
  productState.benefits = (payload.benefits || []).map((item, index) => ({
    local_id: item.id || `${Date.now()}-benefit-${index}`,
    benefit_text: item.benefit_text || '',
  }))
  productState.faqs = (payload.faqs || []).map((item, index) => ({
    local_id: item.id || `${Date.now()}-faq-${index}`,
    question: item.question || '',
    answer: item.answer || '',
  }))
}

const hydrateStep3 = payload => {
  productState.about_treatment = payload.about_treatment || ''
  productState.how_it_works = payload.how_it_works || ''
  productState.treatment_duration = payload.treatment_duration || ''
  productState.usage_instructions = payload.usage_instructions || ''
  productState.ingredients = (payload.ingredients || []).map((item, index) => ({
    local_id: item.ingredient_id || item.id || `${Date.now()}-ingredient-${index}`,
    id: item.ingredient_id || item.id || undefined,
    name: item.name || '',
    description: item.description || '',
  }))
}

const hydrateStep4 = payload => {
  productState.clinical_research_description = payload.clinical_research_description || ''
  productState.research_links = (payload.research_links || []).map((item, index) => ({
    local_id: item.id || `${Date.now()}-research-${index}`,
    title: item.title || '',
    article_url: item.article_url || '',
    authors: item.authors || '',
    journal: item.journal || '',
    publication_year: item.publication_year || '',
    pubmed_id: item.pubmed_id || '',
    doi: item.doi || '',
    description: item.description || '',
  }))
}

const normalizeFetchedPricingGroup = (group, groupKey) => {
  if (!group) {
    productState.pricing[groupKey] = createPricingGroup()
    
    return
  }

  productState.pricing[groupKey] = {
    title: group.title || '',
    description: group.description || '',
    is_active: !!group.is_active,
    options: (group.options || []).map((option, index) => ({
      local_id: option.id || `${Date.now()}-${groupKey}-${index}`,
      label: option.label || '',
      billing_interval: option.billing_interval || (groupKey === 'subscription' ? 'month' : 'one_time'),
      interval_count: option.interval_count ?? 1,
      price: option.price ?? '',
      discount_percent: option.discount_percent ?? 0,
      final_price: option.final_price ?? '',
      is_default: !!option.is_default,
      metadata: option.metadata || {},
    })),
  }
}

const hydrateStep5 = payload => {
  const pricing = payload.pricing || {}

  normalizeFetchedPricingGroup(pricing.subscription, 'subscription')
  normalizeFetchedPricingGroup(pricing.one_time, 'one_time')
  resetPricingDraft('subscription')
  resetPricingDraft('one_time')
}

const applyFetchedStepData = (step, payload) => {
  if (!payload) return
  productState.id = payload.product_id || productState.id
  productState.completion_status = payload.completion_status || productState.completion_status
  productState.completion_percentage = payload.completion_percentage ?? productState.completion_percentage
  productState.completion_step = payload.completion_step ?? productState.completion_step

  switch (step) {
  case 1:
    hydrateStep1(payload)
    break
  case 2:
    hydrateStep2(payload)
    break
  case 3:
    hydrateStep3(payload)
    break
  case 4:
    hydrateStep4(payload)
    break
  case 5:
    hydrateStep5(payload)
    break
  }
}

const loadStepStatus = async productId => {
  if (!productId) return
  statusLoading.value = true
  try {
    const response = await axios.get(getAdminProductStepStatusUrl(productId), {
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    })

    applyStepStatus(response?.data?.data || {})
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    statusLoading.value = false
  }
}

const applyPublishStatus = payload => {
  publishState.is_published = !!payload?.is_published
  publishState.can_publish = !!payload?.can_publish
  publishState.can_unpublish = !!payload?.can_unpublish
  productState.completion_status = payload?.completion_status || productState.completion_status
  productState.completion_percentage = payload?.completion_percentage ?? productState.completion_percentage
  productState.completion_step = payload?.completion_step ?? productState.completion_step
}

const loadPublishStatus = async productId => {
  if (!productId) return

  publishStatusLoading.value = true
  try {
    const response = await axios.get(getAdminProductPublishStatusUrl(productId), {
      headers: getAuthHeaders({ Accept: 'application/json' }),
    })

    applyPublishStatus(response?.data?.data || {})
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    publishStatusLoading.value = false
  }
}

const loadStepData = async (productId, step) => {
  if (!productId || !step || step > 5) return
  stepDataLoading.value = true
  try {
    const response = await axios.get(getAdminProductStepUrl(productId, step), {
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    })

    applyFetchedStepData(step, response?.data?.data || {})
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    stepDataLoading.value = false
  }
}

const getStepOneValidationError = () => {
  if (imageConfigLoading.value) return 'Wait for the image configuration to finish loading.'
  if (imageConfigError.value || !imageTypeConfigs.value.length) return 'Image configuration is unavailable. Reload it before saving.'
  if (!hasUploadedImages.value) return 'Upload at least one product image before saving.'
  if (missingRequiredImageConfigs.value.length)
    return `Upload the required image types first: ${missingRequiredImageConfigs.value.map(item => item.label).join(', ')}.`
  if (uploadingCount.value > 0) return 'Wait for current image uploads to finish before saving.'

  return ''
}

const applySavedStep1Payload = payload => {
  hydrateStep1(payload)
  productState.completion_status = payload.completion_status || productState.completion_status
  productState.completion_percentage = payload.completion_percentage ?? productState.completion_percentage
  productState.completion_step = payload.completion_step ?? productState.completion_step
  selectedStep.value = Math.max(2, payload.completion_step || 2)
}

const persistStepOne = async () => {
  isSavingStep1.value = true
  try {
    syncImageMeta()

    const response = await axios.post(ADMIN_PRODUCTS_STEP1_URL, buildStep1Payload(), {
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    })

    const payload = response?.data?.data || {}

    applySavedStep1Payload(payload)

    if (payload.product_id)
      router.replace({ path: `/admin/products/${payload.product_id}`, query: { section: 'add' } })

    toast.success(response?.data?.message || 'Product basics saved successfully.')
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    isSavingStep1.value = false
  }
}

const saveStepOne = () => {
  basicsFormRef.value?.validate().then(({ valid }) => {
    if (!valid) return
    const validationError = getStepOneValidationError()
    if (validationError) {
      toast.error(validationError)

      return
    }

    persistStepOne()
  })
}

const saveStepTwo = async () => {
  if (!productState.id) {
    toast.error('Save the Product Basics step first.')
    
    return
  }
  if (productState.benefits.length === 0) {
    toast.error('Add at least one key benefit before saving this step.')
    
    return
  }
  if (productState.faqs.length === 0) {
    toast.error('Add at least one FAQ before saving this step.')
    
    return
  }

  isSavingStep2.value = true
  try {
    const response = await axios.post(ADMIN_PRODUCTS_STEP2_URL, buildStep2Payload(), {
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    })

    const payload = response?.data?.data || {}

    productState.id = payload.product_id || productState.id
    productState.completion_status = payload.completion_status || productState.completion_status
    productState.completion_percentage = payload.completion_percentage ?? productState.completion_percentage
    productState.completion_step = payload.completion_step ?? productState.completion_step
    selectedStep.value = Math.max(3, payload.completion_step || 3)

    toast.success(response?.data?.message || 'Benefits and FAQs saved successfully.')
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    isSavingStep2.value = false
  }
}

const saveStepThree = async () => {
  if (!productState.id) {
    toast.error('Save the previous steps first.')
    
    return
  }
  if (!productState.about_treatment.trim()) {
    toast.error('Add the treatment overview before saving this step.')
    
    return
  }
  if (!productState.how_it_works.trim()) {
    toast.error('Add how the treatment works before saving this step.')
    
    return
  }
  if (!productState.treatment_duration.trim()) {
    toast.error('Add the treatment duration before saving this step.')
    
    return
  }
  if (!productState.usage_instructions.trim()) {
    toast.error('Add the usage instructions before saving this step.')
    
    return
  }
  if (productState.ingredients.length === 0) {
    toast.error('Add at least one ingredient before saving this step.')
    
    return
  }

  isSavingStep3.value = true
  try {
    const response = await axios.post(ADMIN_PRODUCTS_STEP3_URL, buildStep3Payload(), {
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    })

    const payload = response?.data?.data || {}

    productState.id = payload.product_id || productState.id
    productState.completion_status = payload.completion_status || productState.completion_status
    productState.completion_percentage = payload.completion_percentage ?? productState.completion_percentage
    productState.completion_step = payload.completion_step ?? productState.completion_step
    selectedStep.value = Math.max(4, payload.completion_step || 4)

    toast.success(response?.data?.message || 'Additional details saved successfully.')
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    isSavingStep3.value = false
  }
}

const saveStepFour = async () => {
  if (!productState.id) {
    toast.error('Save the previous steps first.')
    
    return
  }
  if (!productState.clinical_research_description.trim()) {
    toast.error('Add the main clinical research description before saving this step.')
    
    return
  }
  if (productState.research_links.length === 0) {
    toast.error('Add at least one research link before saving this step.')
    
    return
  }

  isSavingStep4.value = true
  try {
    const response = await axios.post(ADMIN_PRODUCTS_STEP4_URL, buildStep4Payload(), {
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    })

    const payload = response?.data?.data || {}

    productState.id = payload.product_id || productState.id
    productState.completion_status = payload.completion_status || productState.completion_status
    productState.completion_percentage = payload.completion_percentage ?? productState.completion_percentage
    productState.completion_step = payload.completion_step ?? productState.completion_step
    productState.clinical_research_description = payload.clinical_research_description || productState.clinical_research_description
    selectedStep.value = Math.max(5, payload.completion_step || 5)

    toast.success(response?.data?.message || 'Research and evidence saved successfully.')
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    isSavingStep4.value = false
  }
}

const validatePricingGroup = (group, label) => {
  if (!group.is_active) return ''
  if (!group.title.trim()) return `${label} title is required.`
  if (!group.description.trim()) return `${label} description is required.`
  if (!group.options.length) return `Add at least one option in ${label}.`

  return ''
}

const getStepFiveValidationError = () => {
  if (!productState.id) return 'Save the previous steps first.'

  const subscription = productState.pricing.subscription
  const oneTime = productState.pricing.one_time
  const hasActiveGroup = subscription.is_active || oneTime.is_active

  if (!hasActiveGroup) return 'Enable at least one pricing section before saving.'

  return validatePricingGroup(subscription, 'Subscription pricing')
    || validatePricingGroup(oneTime, 'One-time pricing')
}

const saveStepFive = async () => {
  const validationError = getStepFiveValidationError()
  if (validationError) {
    toast.error(validationError)

    return
  }

  isSavingStep5.value = true
  try {
    const response = await axios.post(ADMIN_PRODUCTS_STEP5_URL, buildStep5Payload(), {
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    })

    const payload = response?.data?.data || {}

    productState.id = payload.product_id || productState.id
    productState.completion_status = payload.completion_status || productState.completion_status
    productState.completion_percentage = payload.completion_percentage ?? productState.completion_percentage
    productState.completion_step = payload.completion_step ?? productState.completion_step
    selectedStep.value = Math.max(6, payload.completion_step || 6)
    await loadPublishStatus(productState.id)

    toast.success(response?.data?.message || 'Pricing plans saved successfully.')
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    isSavingStep5.value = false
  }
}

const publishProduct = async shouldPublish => {
  if (!productState.id) return

  publishActionLoading.value = true
  try {
    const response = await axios.post(
      shouldPublish ? getAdminProductPublishUrl(productState.id) : getAdminProductUnpublishUrl(productState.id),
      {},
      {
        headers: getAuthHeaders({ Accept: 'application/json' }),
      },
    )

    await loadPublishStatus(productState.id)
    toast.success(response?.data?.message || (shouldPublish ? 'Product published successfully.' : 'Product unpublished successfully.'))
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    publishActionLoading.value = false
  }
}

const searchIngredients = async search => {
  if (!search.trim()) {
    ingredientSearchResults.value = []
    ingredientSearchLoading.value = false
    
    return
  }

  ingredientSearchLoading.value = true
  try {
    const response = await axios.get(ADMIN_INGREDIENTS_URL, {
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      params: {
        search,
        limit: 10,
      },
    })

    ingredientSearchResults.value = response?.data?.data || []
    ingredientSearchOpen.value = true
  } catch (error) {
    ingredientSearchResults.value = []
    toast.error(buildErrorMessage(error))
  } finally {
    ingredientSearchLoading.value = false
  }
}

watch(ingredientSearch, value => {
  ingredientDraft.name = value
  selectedIngredientSuggestionId.value = ''

  if (ingredientSearchTimeout) clearTimeout(ingredientSearchTimeout)

  if (!value.trim()) {
    ingredientSearchResults.value = []
    ingredientSearchOpen.value = false
    
    return
  }

  ingredientSearchTimeout = window.setTimeout(() => {
    searchIngredients(value)
  }, 300)
})

watch(selectedIngredientSuggestionId, value => {
  if (!value) return
  const selected = ingredientSearchResults.value.find(item => item.id === value)
  if (!selected) return
  ingredientDraft.name = selected.name || ''
  ingredientDraft.description = selected.description || ''
})

watch(secondaryImageConfigs, configs => {
  if (!configs.length) {
    selectedImageTab.value = ''

    return
  }

  const hasActiveTab = configs.some(config => config.type === selectedImageTab.value)
  if (!hasActiveTab)
    selectedImageTab.value = configs[0].type
}, { immediate: true })

onMounted(() => {
  loadImageConfig()

  if (routeProductId.value) {
    loadStepStatus(routeProductId.value).then(() => {
      loadStepData(routeProductId.value, selectedStep.value)
    })
  }
})

watch(selectedStep, step => {
  if (!productState.id || !step) return

  if (step <= 5) {
    loadStepData(productState.id, step)
    
    return
  }

  if (step === 6)
    loadPublishStatus(productState.id)
})

watch(routeProductId, nextId => {
  if (!nextId) {
    resetWizardState()
    
    return
  }

  productState.id = nextId

  loadStepStatus(nextId).then(() => {
    loadStepData(nextId, selectedStep.value)
  })
})
</script>

<template>
  <div class="add-product-page">
    <VRow>
      <VCol cols="12">
        <VCard
          class="setup-header-card"
          elevation="0"
        >
          <VCardText class="d-flex flex-column flex-lg-row justify-space-between align-start align-lg-center gap-4">
            <div>
              <div class="text-overline text-primary mb-1">
                Product Admin
              </div>
              <h4 class="text-h4 mb-2">
                Add Product
              </h4>
              <p class="text-body-1 text-medium-emphasis mb-0">
                Create a product with a guided draft flow, immediate media upload, and progressive completion tracking.
              </p>
            </div>

            <div class="setup-header-card__status d-flex flex-column align-start align-lg-end">
              <div
                v-if="canPreviewProduct"
                class="setup-header-card__actions mb-3"
              >
                <VBtn
                  color="secondary"
                  variant="flat"
                  prepend-icon="tabler-eye"
                  @click="openPreviewDrawer"
                >
                  Preview Product
                </VBtn>
              </div>

              <div class="setup-header-card__meta">
                <VChip
                  color="primary"
                  variant="flat"
                  size="small"
                >
                  {{ completionPercentage }}% Complete
                </VChip>
                <div class="text-caption text-medium-emphasis mt-2">
                  Status: {{ completionLabel }}
                </div>
                <div
                  v-if="productState.id"
                  class="text-caption text-medium-emphasis mt-1"
                >
                  Product ID: {{ productState.id }}
                </div>
                <div
                  v-if="productState.slug"
                  class="text-caption text-medium-emphasis mt-1"
                >
                  Slug: {{ productState.slug }}
                </div>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        cols="12"
        md="4"
      >
        <VCard
          class="steps-card"
          elevation="0"
        >
          <VCardText>
            <div class="steps-header mb-4">
              <h6 class="text-subtitle-1 font-weight-bold mb-1">
                Add Product Flow
              </h6>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Each successful save unlocks the next step. Pricing uses separate subscription and one-time sections controlled by switches.
              </p>
            </div>

            <div class="mb-6">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-caption text-medium-emphasis">Overall completion</span>
                <span class="text-caption font-weight-bold">{{ completionPercentage }}%</span>
              </div>
              <VProgressLinear
                :model-value="completionPercentage"
                height="6"
                color="primary"
                bg-color="grey-lighten-3"
                rounded
              />
            </div>

            <div
              v-if="showStatusLoader"
              class="steps-loader"
            >
              <VProgressCircular
                indeterminate
                color="primary"
                size="34"
                width="3"
              />
              <div class="text-body-2 text-medium-emphasis mt-3">
                Loading product progress...
              </div>
            </div>

            <div
              v-else
              class="steps-list"
            >
              <div
                v-for="(stepDef, index) in STEP_DEFINITIONS"
                :key="stepDef.id"
                class="step-item"
                :class="{
                  'step-item--active': selectedStep === stepDef.id,
                  'step-item--completed': isStepCompleted(stepDef.id),
                  'step-item--locked': isStepLocked(stepDef.id),
                  'step-item--clickable': !isStepLocked(stepDef.id),
                }"
                @click="selectStep(stepDef.id)"
              >
                <div class="step-item__indicator">
                  <div
                    class="step-item__icon"
                    :style="{
                      backgroundColor: selectedStep === stepDef.id
                        ? `rgb(var(--v-theme-${stepDef.color}))`
                        : isStepCompleted(stepDef.id)
                          ? 'rgb(var(--v-theme-success))'
                          : 'rgba(var(--v-theme-on-surface), 0.08)',
                    }"
                  >
                    <VIcon
                      :icon="stepDef.icon"
                      :color="selectedStep === stepDef.id || isStepCompleted(stepDef.id) ? 'white' : undefined"
                      size="18"
                    />
                  </div>
                  <div
                    v-if="index < STEP_DEFINITIONS.length - 1"
                    class="step-item__line"
                  />
                </div>

                <div class="step-item__content">
                  <div class="d-flex align-center gap-2">
                    <span class="step-item__title">{{ stepDef.title }}</span>
                    <VIcon
                      v-if="isStepCompleted(stepDef.id)"
                      icon="tabler-check"
                      size="14"
                      color="success"
                    />
                    <VChip
                      v-if="isStepLocked(stepDef.id)"
                      size="x-small"
                      color="secondary"
                      variant="tonal"
                    >
                      Locked
                    </VChip>
                  </div>
                  <p class="step-item__description">
                    {{ stepDef.description }}
                  </p>
                </div>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        cols="12"
        md="8"
      >
        <VCard
          class="form-card"
          elevation="0"
        >
          <VCardText>
            <div class="form-header mb-6">
              <div class="d-flex align-center gap-3">
                <div
                  class="form-header__icon"
                  :style="{ backgroundColor: `rgba(var(--v-theme-${selectedStepDefinition.color}), 0.1)` }"
                >
                  <VIcon
                    :icon="selectedStepDefinition.icon"
                    :color="selectedStepDefinition.color"
                    size="24"
                  />
                </div>
                <div>
                  <h5 class="text-h6 font-weight-bold mb-1">
                    {{ selectedStepDefinition.title }}
                  </h5>
                  <p class="text-body-2 text-medium-emphasis mb-0">
                    {{ selectedStepDefinition.description }}
                  </p>
                </div>
              </div>
            </div>

            <div
              v-if="showStepLoader"
              class="step-loader"
            >
              <VProgressCircular
                indeterminate
                color="primary"
                size="38"
                width="3"
              />
              <div class="text-body-2 text-medium-emphasis mt-3">
                {{ statusLoading ? 'Loading product setup...' : `Loading ${selectedStepDefinition.title}...` }}
              </div>
            </div>

            <VForm
              v-else-if="selectedStep === 1"
              ref="basicsFormRef"
              @submit.prevent="saveStepOne"
            >
              <VRow>
                <VCol
                  cols="12"
                  md="6"
                >
                  <VTextField
                    v-model="productState.name"
                    label="Product Name"
                    placeholder="Semaglutide"
                    :rules="[requiredValidator]"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </VCol>

                <VCol
                  cols="12"
                  md="6"
                >
                  <VTextField
                    :model-value="productState.slug"
                    label="Slug"
                    placeholder="Auto-generated after save"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                    readonly
                  />
                </VCol>

                <VCol
                  cols="12"
                  md="6"
                >
                  <VSelect
                    v-model="productState.category"
                    label="Category"
                    :items="categoryOptions"
                    item-title="title"
                    item-value="value"
                    :rules="[requiredValidator]"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </VCol>

                <VCol cols="12">
                  <VTextarea
                    v-model="productState.description"
                    label="Description"
                    placeholder="Add a clear product description for the draft."
                    :rules="[requiredValidator]"
                    rows="5"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </VCol>

                <VCol cols="12">
                  <div class="panel-card">
                    <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
                      <div>
                        <h6 class="text-subtitle-1 font-weight-bold mb-1">
                          Product Images
                        </h6>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          Upload each configured image type. Every uploaded file stores its final URL, path, and backend `image_type` in the draft.
                        </p>
                      </div>

                      <div class="d-flex align-center gap-2 flex-wrap">
                        <VChip
                          color="primary"
                          variant="tonal"
                          size="small"
                        >
                          {{ uploadedImages.length }} Uploaded
                        </VChip>
                        <VChip
                          v-if="uploadingCount"
                          color="warning"
                          variant="tonal"
                          size="small"
                        >
                          {{ uploadingCount }} Uploading
                        </VChip>
                      </div>
                    </div>

                    <div
                      v-if="imageConfigLoading"
                      class="empty-panel"
                    >
                      <VProgressCircular
                        indeterminate
                        color="primary"
                        size="28"
                        width="3"
                      />
                      <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
                        Loading image configuration...
                      </p>
                    </div>

                    <div
                      v-else-if="imageConfigError"
                      class="empty-panel"
                    >
                      <VIcon
                        icon="tabler-alert-circle"
                        color="error"
                        size="28"
                      />
                      <p class="text-body-2 text-error mt-3 mb-3">
                        {{ imageConfigError }}
                      </p>
                      <VBtn
                        color="primary"
                        variant="outlined"
                        @click="loadImageConfig"
                      >
                        Retry Image Config
                      </VBtn>
                    </div>

                    <div v-else>
                      <div
                        v-if="missingRequiredImageConfigs.length"
                        class="image-config-alert mb-4"
                      >
                        <VIcon
                          icon="tabler-alert-triangle"
                          color="warning"
                          size="18"
                        />
                        <span class="text-body-2">
                          Required image types pending: {{ missingRequiredImageConfigs.map(item => item.label).join(', ') }}
                        </span>
                      </div>

                      <div
                        v-if="coverImageConfig"
                        class="image-type-panel image-type-panel--cover mb-4"
                      >
                        <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
                          <div>
                            <div class="d-flex align-center gap-2 flex-wrap mb-1">
                              <h6 class="text-subtitle-1 font-weight-bold mb-0">
                                {{ coverImageConfig.label }}
                              </h6>
                              <VChip
                                size="x-small"
                                color="error"
                                variant="tonal"
                              >
                                Required
                              </VChip>
                              <VChip
                                size="x-small"
                                color="primary"
                                variant="tonal"
                              >
                                {{ coverImageConfig.currentCount }}/{{ coverImageConfig.max_images }}
                              </VChip>
                            </div>

                            <p class="text-body-2 text-medium-emphasis mb-1">
                              {{ coverImageConfig.used_for || 'Used in product presentation.' }}
                            </p>
                            <div class="text-caption text-medium-emphasis">
                              Type value sent to step 1: {{ coverImageConfig.type }}
                            </div>
                          </div>
                        </div>

                        <div class="image-grid">
                          <div
                            v-for="slot in coverImageConfig.slots"
                            :key="slot.key"
                            class="image-card image-card--slot"
                          >
                            <input
                              :ref="element => setImageInputRef(slot.key, element)"
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              class="d-none"
                              @change="event => onFileChange(slot.type, slot.slotPosition, event)"
                            >

                            <div
                              class="image-card__media upload-dropzone"
                              :class="{ 'upload-dropzone--active': dragTargetKey === slot.key }"
                              @click="openFilePicker(slot.key)"
                              @dragenter.prevent="dragTargetKey = slot.key"
                              @dragover.prevent="dragTargetKey = slot.key"
                              @dragleave.prevent="dragTargetKey = dragTargetKey === slot.key ? '' : dragTargetKey"
                              @drop.prevent="event => onDrop(slot.key, slot.type, slot.slotPosition, event)"
                            >
                              <div
                                v-if="slot.image?.isUploading"
                                class="image-card__loading"
                              >
                                <VProgressCircular
                                  indeterminate
                                  color="primary"
                                  size="28"
                                  width="3"
                                />
                                <span class="text-caption mt-2">Uploading...</span>
                              </div>

                              <div
                                v-else-if="slot.image?.uploadError"
                                class="image-card__error"
                              >
                                <VIcon
                                  icon="tabler-alert-circle"
                                  color="error"
                                  size="24"
                                />
                                <span class="text-caption text-error text-center mt-2">{{ slot.image.uploadError }}</span>
                              </div>

                              <img
                                v-else-if="slot.image?.image_url"
                                :src="slot.image.image_url"
                                :alt="slot.image.original_name || coverImageConfig.label"
                              >

                              <div
                                v-else
                                class="image-card__placeholder"
                              >
                                <VIcon
                                  :icon="isUploading ? 'tabler-loader-2' : 'tabler-cloud-upload'"
                                  :class="{ 'spin-icon': isUploading }"
                                  size="32"
                                  color="primary"
                                  class="mb-3"
                                />
                                <div class="text-body-2 font-weight-medium mb-1">
                                  Upload {{ coverImageConfig.label }}
                                </div>
                                <div class="text-caption text-medium-emphasis">
                                  Slot {{ slot.slotPosition }} of {{ coverImageConfig.max_images }}
                                </div>
                              </div>
                            </div>

                            <div class="image-card__body">
                              <div class="d-flex align-center justify-space-between gap-2 mb-2">
                                <VChip
                                  color="secondary"
                                  variant="tonal"
                                  size="x-small"
                                >
                                  {{ coverImageConfig.type }}
                                </VChip>

                                <VBtn
                                  v-if="slot.image"
                                  icon
                                  variant="text"
                                  color="error"
                                  size="x-small"
                                  :disabled="slot.image.isUploading"
                                  @click.stop="removeImage(slot.image.local_id)"
                                >
                                  <VIcon
                                    icon="tabler-trash"
                                    size="18"
                                  />
                                </VBtn>
                              </div>

                              <div class="text-body-2 font-weight-medium text-truncate mb-1">
                                {{ slot.image?.original_name || `${coverImageConfig.label} slot ${slot.slotPosition}` }}
                              </div>

                              <div class="text-caption text-medium-emphasis text-break mb-3">
                                {{ slot.image?.upload_path || slot.image?.image_url || 'Accepted: JPG, PNG, WEBP up to 5MB. Recommended: 1200 x 1200 px and under 500 KB.' }}
                              </div>

                              <VBtn
                                block
                                size="small"
                                variant="outlined"
                                color="primary"
                                :disabled="slot.image?.isUploading"
                                @click.stop="openFilePicker(slot.key)"
                              >
                                {{ slot.image?.image_url ? 'Replace Image' : 'Choose Image' }}
                              </VBtn>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        v-if="secondaryImageConfigs.length"
                        class="image-type-stack"
                      >
                        <div class="image-type-tabs">
                          <div class="text-subtitle-2 font-weight-bold mb-3">
                            Additional Image Types
                          </div>

                          <VTabs
                            v-model="selectedImageTab"
                            color="primary"
                            class="image-type-tabs__nav"
                          >
                            <VTab
                              v-for="config in secondaryImageConfigs"
                              :key="config.type"
                              :value="config.type"
                              class="image-type-tabs__tab"
                            >
                              <span>{{ config.label }}</span>
                              <VChip
                                v-if="config.currentCount"
                                size="x-small"
                                color="primary"
                                variant="flat"
                                class="image-type-tabs__count"
                              >
                                {{ config.currentCount }}
                              </VChip>
                            </VTab>
                          </VTabs>
                        </div>

                        <div
                          v-if="activeSecondaryImageConfig"
                          class="image-type-panel"
                        >
                          <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
                            <div>
                              <div class="d-flex align-center gap-2 flex-wrap mb-1">
                                <h6 class="text-subtitle-1 font-weight-bold mb-0">
                                  {{ activeSecondaryImageConfig.label }}
                                </h6>
                                <VChip
                                  size="x-small"
                                  :color="activeSecondaryImageConfig.required ? 'error' : 'secondary'"
                                  variant="tonal"
                                >
                                  {{ activeSecondaryImageConfig.required ? 'Required' : 'Optional' }}
                                </VChip>
                                <VChip
                                  size="x-small"
                                  color="primary"
                                  variant="tonal"
                                >
                                  {{ activeSecondaryImageConfig.currentCount }}/{{ activeSecondaryImageConfig.max_images }}
                                </VChip>
                              </div>

                              <p class="text-body-2 text-medium-emphasis mb-1">
                                {{ activeSecondaryImageConfig.used_for || 'Used in product presentation.' }}
                              </p>
                              <div class="text-caption text-medium-emphasis">
                                Type value sent to step 1: {{ activeSecondaryImageConfig.type }}
                              </div>
                            </div>
                          </div>

                          <input
                            :ref="element => setImageInputRef(`${activeSecondaryImageConfig.type}-uploader`, element)"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            :multiple="activeSecondaryImageConfig.max_images > 1"
                            class="d-none"
                            @change="event => onConfigFileChange(activeSecondaryImageConfig, event)"
                          >

                          <div
                            class="upload-dropzone upload-dropzone--type mb-4"
                            :class="{
                              'upload-dropzone--active': dragTargetKey === `${activeSecondaryImageConfig.type}-uploader`,
                              'upload-dropzone--disabled': !canUploadMoreImages(activeSecondaryImageConfig),
                            }"
                            @click="canUploadMoreImages(activeSecondaryImageConfig) && openFilePicker(`${activeSecondaryImageConfig.type}-uploader`)"
                            @dragenter.prevent="canUploadMoreImages(activeSecondaryImageConfig) && (dragTargetKey = `${activeSecondaryImageConfig.type}-uploader`)"
                            @dragover.prevent="canUploadMoreImages(activeSecondaryImageConfig) && (dragTargetKey = `${activeSecondaryImageConfig.type}-uploader`)"
                            @dragleave.prevent="dragTargetKey = dragTargetKey === `${activeSecondaryImageConfig.type}-uploader` ? '' : dragTargetKey"
                            @drop.prevent="event => canUploadMoreImages(activeSecondaryImageConfig) && onConfigDrop(`${activeSecondaryImageConfig.type}-uploader`, activeSecondaryImageConfig, event)"
                          >
                            <VIcon
                              :icon="isUploading ? 'tabler-loader-2' : 'tabler-cloud-upload'"
                              :class="{ 'spin-icon': isUploading }"
                              size="36"
                              color="primary"
                              class="mb-3"
                            />
                            <h6 class="text-h6 mb-2">
                              {{ activeSecondaryImageConfig.currentCount ? 'Upload More or Replace Images' : `Upload ${activeSecondaryImageConfig.label}` }}
                            </h6>
                            <p class="text-body-2 text-medium-emphasis mb-1">
                              {{ getImageUploaderSummary(activeSecondaryImageConfig) }}
                            </p>
                            <div class="text-caption text-medium-emphasis">
                              Accepted: JPG, PNG, WEBP up to 5MB. Recommended: 1200 x 1200 px and under 500 KB.
                            </div>
                          </div>

                          <div
                            v-if="getImagesByType(activeSecondaryImageConfig.type).length"
                            class="image-grid"
                          >
                            <div
                              v-for="(image, imageIndex) in getImagesByType(activeSecondaryImageConfig.type)"
                              :key="image.local_id"
                              class="image-card image-card--slot"
                            >
                              <div class="image-card__media">
                                <div
                                  v-if="image.isUploading"
                                  class="image-card__loading"
                                >
                                  <VProgressCircular
                                    indeterminate
                                    color="primary"
                                    size="28"
                                    width="3"
                                  />
                                  <span class="text-caption mt-2">Uploading...</span>
                                </div>

                                <div
                                  v-else-if="image.uploadError"
                                  class="image-card__error"
                                >
                                  <VIcon
                                    icon="tabler-alert-circle"
                                    color="error"
                                    size="24"
                                  />
                                  <span class="text-caption text-error text-center mt-2">{{ image.uploadError }}</span>
                                </div>

                                <img
                                  v-else-if="image.image_url"
                                  :src="image.image_url"
                                  :alt="image.original_name || activeSecondaryImageConfig.label"
                                >
                              </div>

                              <div class="image-card__body">
                                <div class="d-flex align-center justify-space-between gap-2 mb-2">
                                  <VChip
                                    color="secondary"
                                    variant="tonal"
                                    size="x-small"
                                  >
                                    {{ activeSecondaryImageConfig.type }}
                                  </VChip>

                                  <div class="d-flex align-center gap-1">
                                    <VBtn
                                      icon
                                      variant="text"
                                      color="primary"
                                      size="x-small"
                                      :disabled="image.isUploading || imageIndex === 0"
                                      @click.stop="moveImageWithinType(activeSecondaryImageConfig.type, image.local_id, -1)"
                                    >
                                      <VIcon
                                        icon="tabler-arrow-up"
                                        size="18"
                                      />
                                    </VBtn>

                                    <VBtn
                                      icon
                                      variant="text"
                                      color="primary"
                                      size="x-small"
                                      :disabled="image.isUploading || imageIndex === getImagesByType(activeSecondaryImageConfig.type).length - 1"
                                      @click.stop="moveImageWithinType(activeSecondaryImageConfig.type, image.local_id, 1)"
                                    >
                                      <VIcon
                                        icon="tabler-arrow-down"
                                        size="18"
                                      />
                                    </VBtn>

                                    <VBtn
                                      icon
                                      variant="text"
                                      color="error"
                                      size="x-small"
                                      :disabled="image.isUploading"
                                      @click.stop="removeImage(image.local_id)"
                                    >
                                      <VIcon
                                        icon="tabler-trash"
                                        size="18"
                                      />
                                    </VBtn>
                                  </div>
                                </div>

                                <div class="text-body-2 font-weight-medium text-truncate mb-1">
                                  {{ image.original_name || `${activeSecondaryImageConfig.label} image ${imageIndex + 1}` }}
                                </div>

                                <div class="text-caption text-medium-emphasis mb-1">
                                  Sort order: {{ imageIndex + 1 }}
                                </div>

                                <div class="text-caption text-medium-emphasis text-break">
                                  {{ image.upload_path || image.image_url || 'Waiting for upload...' }}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </VCol>
              </VRow>

              <VDivider class="my-6" />

              <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-4">
                <div class="text-body-2 text-medium-emphasis">
                  Saving this step creates the draft product and automatically unlocks the Benefits & FAQs step.
                </div>

                <VBtn
                  color="primary"
                  size="large"
                  :loading="isSavingStep1"
                  :disabled="isUploading || imageConfigLoading || !!imageConfigError || !imageTypeConfigs.length"
                  @click="saveStepOne"
                >
                  Save Product Basics
                </VBtn>
              </div>
            </VForm>

            <div
              v-else-if="selectedStep === 2"
              class="step-two-layout"
            >
              <VRow>
                <VCol cols="12">
                  <div class="panel-card">
                    <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
                      <div>
                        <h6 class="text-subtitle-1 font-weight-bold mb-1">
                          Key Benefits
                        </h6>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          Add as many benefits as you need. The list can be reordered before saving.
                        </p>
                      </div>
                      <VChip
                        color="success"
                        variant="tonal"
                        size="small"
                      >
                        {{ productState.benefits.length }} Benefits
                      </VChip>
                    </div>

                    <div class="composer-row mb-4">
                      <VTextField
                        v-model="benefitDraft"
                        label="Benefit"
                        placeholder="Supports appetite control"
                        variant="outlined"
                        density="comfortable"
                        hide-details="auto"
                        @keyup.enter="addBenefit"
                      />
                      <VBtn
                        color="primary"
                        size="large"
                        @click="addBenefit"
                      >
                        Add Benefit
                      </VBtn>
                    </div>

                    <div
                      v-if="productState.benefits.length"
                      class="stack-list"
                    >
                      <div
                        v-for="(benefit, index) in productState.benefits"
                        :key="benefit.local_id"
                        class="stack-item"
                      >
                        <div class="stack-item__index">
                          {{ index + 1 }}
                        </div>
                        <div class="stack-item__content">
                          <div class="text-body-1 font-weight-medium">
                            {{ benefit.benefit_text }}
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            Sort order: {{ index }}
                          </div>
                        </div>
                        <div class="stack-item__actions">
                          <VBtn
                            icon
                            variant="text"
                            size="x-small"
                            :disabled="index === 0"
                            @click="moveBenefit(index, -1)"
                          >
                            <VIcon
                              icon="tabler-arrow-up"
                              size="18"
                            />
                          </VBtn>
                          <VBtn
                            icon
                            variant="text"
                            size="x-small"
                            :disabled="index === productState.benefits.length - 1"
                            @click="moveBenefit(index, 1)"
                          >
                            <VIcon
                              icon="tabler-arrow-down"
                              size="18"
                            />
                          </VBtn>
                          <VBtn
                            icon
                            variant="text"
                            color="error"
                            size="x-small"
                            @click="removeBenefit(benefit.local_id)"
                          >
                            <VIcon
                              icon="tabler-trash"
                              size="18"
                            />
                          </VBtn>
                        </div>
                      </div>
                    </div>

                    <div
                      v-else
                      class="empty-panel"
                    >
                      <VIcon
                        icon="tabler-sparkles"
                        color="secondary"
                        size="28"
                        class="mb-2"
                      />
                      <div class="text-body-2 text-medium-emphasis">
                        No benefits added yet.
                      </div>
                    </div>
                  </div>
                </VCol>

                <VCol cols="12">
                  <div class="panel-card">
                    <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
                      <div>
                        <h6 class="text-subtitle-1 font-weight-bold mb-1">
                          FAQs
                        </h6>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          Create the question list exactly how you want it displayed. Reorder, remove, and save the full set in one request.
                        </p>
                      </div>
                      <VChip
                        color="info"
                        variant="tonal"
                        size="small"
                      >
                        {{ productState.faqs.length }} FAQs
                      </VChip>
                    </div>

                    <VRow class="mb-2">
                      <VCol cols="12">
                        <VTextField
                          v-model="faqDraft.question"
                          label="Question"
                          placeholder="How often do I use it?"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>
                      <VCol cols="12">
                        <VTextarea
                          v-model="faqDraft.answer"
                          label="Answer"
                          placeholder="Usually once weekly, based on provider guidance."
                          rows="3"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>
                      <VCol
                        cols="12"
                        class="d-flex justify-end"
                      >
                        <VBtn
                          color="primary"
                          size="large"
                          class="ingredient-add-btn"
                          @click="addFaq"
                        >
                          Add FAQ
                        </VBtn>
                      </VCol>
                    </VRow>

                    <div
                      v-if="productState.faqs.length"
                      class="faq-grid"
                    >
                      <div
                        v-for="(faq, index) in productState.faqs"
                        :key="faq.local_id"
                        class="faq-card"
                      >
                        <div class="faq-card__top">
                          <VChip
                            size="x-small"
                            color="primary"
                            variant="tonal"
                          >
                            FAQ {{ index + 1 }}
                          </VChip>
                          <div class="stack-item__actions">
                            <VBtn
                              icon
                              variant="text"
                              size="x-small"
                              :disabled="index === 0"
                              @click="moveFaq(index, -1)"
                            >
                              <VIcon
                                icon="tabler-arrow-up"
                                size="18"
                              />
                            </VBtn>
                            <VBtn
                              icon
                              variant="text"
                              size="x-small"
                              :disabled="index === productState.faqs.length - 1"
                              @click="moveFaq(index, 1)"
                            >
                              <VIcon
                                icon="tabler-arrow-down"
                                size="18"
                              />
                            </VBtn>
                            <VBtn
                              icon
                              variant="text"
                              color="error"
                              size="x-small"
                              @click="removeFaq(faq.local_id)"
                            >
                              <VIcon
                                icon="tabler-trash"
                                size="18"
                              />
                            </VBtn>
                          </div>
                        </div>
                        <h6 class="text-subtitle-1 font-weight-bold mb-2">
                          {{ faq.question }}
                        </h6>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          {{ faq.answer }}
                        </p>
                      </div>
                    </div>

                    <div
                      v-else
                      class="empty-panel"
                    >
                      <VIcon
                        icon="tabler-help-circle"
                        color="secondary"
                        size="28"
                        class="mb-2"
                      />
                      <div class="text-body-2 text-medium-emphasis">
                        No FAQs added yet.
                      </div>
                    </div>
                  </div>
                </VCol>
              </VRow>

              <VDivider class="my-6" />

              <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-4">
                <div class="text-body-2 text-medium-emphasis">
                  This step sends the full current list of benefits and FAQs so the backend can sync them cleanly in order.
                </div>

                <VBtn
                  color="primary"
                  size="large"
                  :loading="isSavingStep2"
                  @click="saveStepTwo"
                >
                  Save Benefits & FAQs
                </VBtn>
              </div>
            </div>

            <div
              v-else-if="selectedStep === 3"
              class="step-three-layout"
            >
              <VRow>
                <VCol cols="12">
                  <div class="panel-card">
                    <h6 class="text-subtitle-1 font-weight-bold mb-3">
                      Additional Details
                    </h6>
                    <p class="text-body-2 text-medium-emphasis mb-4">
                      Capture the treatment explanation, usage guidance, and key ingredients in one structured step.
                    </p>

                    <VRow>
                      <VCol cols="12">
                        <VTextarea
                          v-model="productState.about_treatment"
                          label="About This Treatment"
                          placeholder="A provider-guided treatment focused on sustainable metabolic support."
                          rows="4"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>

                      <VCol cols="12">
                        <VTextarea
                          v-model="productState.how_it_works"
                          label="How It Works"
                          placeholder="It helps regulate appetite signaling and improve consistency in caloric control."
                          rows="4"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>

                      <VCol cols="12">
                        <div class="ingredient-panel">
                          <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
                            <div>
                              <h6 class="text-subtitle-1 font-weight-bold mb-1">
                                Key Ingredients
                              </h6>
                              <p class="text-body-2 text-medium-emphasis mb-0">
                                Search existing ingredients while typing, or type a new ingredient name and description to create it inline.
                              </p>
                            </div>
                            <VChip
                              color="warning"
                              variant="tonal"
                              size="small"
                            >
                              {{ productState.ingredients.length }} Ingredients
                            </VChip>
                          </div>

                          <VRow>
                            <VCol
                              cols="12"
                              md="5"
                            >
                              <VTextField
                                v-model="ingredientSearch"
                                label="Ingredient Name"
                                placeholder="Start typing Vitamin B12 or L-Carnitine"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                                :loading="ingredientSearchLoading"
                                @focus="ingredientSearchOpen = true"
                              />

                              <div
                                v-if="ingredientSearchOpen && (ingredientSearchResults.length || ingredientSearch.trim())"
                                class="ingredient-search-results mt-2"
                              >
                                <label
                                  v-for="item in ingredientSearchResults"
                                  :key="item.id"
                                  class="ingredient-option"
                                >
                                  <input
                                    v-model="selectedIngredientSuggestionId"
                                    type="radio"
                                    :value="item.id"
                                    class="ingredient-option__radio"
                                  >
                                  <div>
                                    <div class="text-body-2 font-weight-medium">{{ item.name }}</div>
                                    <div class="text-caption text-medium-emphasis">{{ item.description || 'No description' }}</div>
                                  </div>
                                </label>

                                <div
                                  v-if="ingredientSearch.trim() && !ingredientSearchResults.length && !ingredientSearchLoading"
                                  class="ingredient-option ingredient-option--new"
                                >
                                  <VIcon
                                    icon="tabler-plus"
                                    size="16"
                                    class="me-2"
                                  />
                                  <span class="text-body-2">Use new ingredient: {{ ingredientSearch }}</span>
                                </div>
                              </div>
                            </VCol>

                            <VCol
                              cols="12"
                              md="5"
                            >
                              <VTextarea
                                v-model="ingredientDraft.description"
                                label="Ingredient Description"
                                placeholder="Optional for existing ingredient, recommended for a new ingredient."
                                rows="3"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                              />
                            </VCol>

                            <VCol
                              cols="12"
                              class="d-flex justify-end"
                            >
                              <VBtn
                                color="primary"
                                size="large"
                                class="ingredient-add-btn"
                                @click="addIngredient"
                              >
                                Add Ingredient
                              </VBtn>
                            </VCol>
                          </VRow>

                          <div
                            v-if="productState.ingredients.length"
                            class="stack-list mt-4"
                          >
                            <div
                              v-for="(ingredient, index) in productState.ingredients"
                              :key="ingredient.local_id"
                              class="stack-item stack-item--ingredient"
                            >
                              <div class="stack-item__index">
                                {{ index + 1 }}
                              </div>
                              <div class="stack-item__content">
                                <div class="d-flex align-center gap-2 mb-1">
                                  <div class="text-body-1 font-weight-medium">
                                    {{ ingredient.name }}
                                  </div>
                                  <VChip
                                    size="x-small"
                                    :color="ingredient.id ? 'success' : 'secondary'"
                                    variant="tonal"
                                  >
                                    {{ ingredient.id ? 'Existing' : 'New' }}
                                  </VChip>
                                </div>
                                <div class="text-body-2 text-medium-emphasis">
                                  {{ ingredient.description || 'No description added.' }}
                                </div>
                                <div class="text-caption text-medium-emphasis mt-1">
                                  Sort order: {{ index }}
                                </div>
                              </div>
                              <div class="stack-item__actions">
                                <VBtn
                                  icon
                                  variant="text"
                                  size="x-small"
                                  :disabled="index === 0"
                                  @click="moveIngredient(index, -1)"
                                >
                                  <VIcon
                                    icon="tabler-arrow-up"
                                    size="18"
                                  />
                                </VBtn>
                                <VBtn
                                  icon
                                  variant="text"
                                  size="x-small"
                                  :disabled="index === productState.ingredients.length - 1"
                                  @click="moveIngredient(index, 1)"
                                >
                                  <VIcon
                                    icon="tabler-arrow-down"
                                    size="18"
                                  />
                                </VBtn>
                                <VBtn
                                  icon
                                  variant="text"
                                  color="error"
                                  size="x-small"
                                  @click="removeIngredient(ingredient.local_id)"
                                >
                                  <VIcon
                                    icon="tabler-trash"
                                    size="18"
                                  />
                                </VBtn>
                              </div>
                            </div>
                          </div>

                          <div
                            v-else
                            class="empty-panel mt-4"
                          >
                            <VIcon
                              icon="tabler-flask"
                              color="secondary"
                              size="28"
                              class="mb-2"
                            />
                            <div class="text-body-2 text-medium-emphasis">
                              No ingredients added yet.
                            </div>
                          </div>
                        </div>
                      </VCol>

                      <VCol
                        cols="12"
                        md="6"
                      >
                        <VTextarea
                          v-model="productState.treatment_duration"
                          label="Treatment Duration"
                          placeholder="Typical programs run for 3 to 6 months depending on response."
                          rows="4"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>

                      <VCol
                        cols="12"
                        md="6"
                      >
                        <VTextarea
                          v-model="productState.usage_instructions"
                          label="Usage Instructions"
                          placeholder="Use once weekly exactly as prescribed by your provider."
                          rows="4"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>
                    </VRow>
                  </div>
                </VCol>
              </VRow>

              <VDivider class="my-6" />

              <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-4">
                <div class="text-body-2 text-medium-emphasis">
                  This step saves the full treatment content and the full ordered ingredient list, creating new ingredients inline when needed.
                </div>

                <VBtn
                  color="primary"
                  size="large"
                  :loading="isSavingStep3"
                  @click="saveStepThree"
                >
                  Save Additional Details
                </VBtn>
              </div>
            </div>

            <div
              v-else-if="selectedStep === 4"
              class="step-four-layout"
            >
              <VRow>
                <VCol cols="12">
                  <div class="panel-card panel-card--research mb-6">
                    <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
                      <div>
                        <h6 class="text-subtitle-1 font-weight-bold mb-1">
                          Main Research Description
                        </h6>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          This is the main scientific summary for the product. Keep it separate and clear from the individual research references below.
                        </p>
                      </div>
                      <VChip
                        color="info"
                        variant="tonal"
                        size="small"
                      >
                        Main Summary
                      </VChip>
                    </div>

                    <VTextarea
                      v-model="productState.clinical_research_description"
                      label="Clinical Research Description"
                      placeholder="Clinical research and scientific literature support this treatment’s role in metabolic and weight-management protocols."
                      rows="5"
                      variant="outlined"
                      density="comfortable"
                      hide-details="auto"
                    />
                  </div>
                </VCol>

                <VCol cols="12">
                  <div class="research-composer">
                    <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
                      <div class="research-composer__header mb-4">
                        <h6 class="text-subtitle-1 font-weight-bold mb-1">
                          Add New Research Link
                        </h6>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          Add one research article at a time. Only title and article URL are required, but the other fields make the section more professional.
                        </p>
                      </div>
                      <VChip
                        color="primary"
                        variant="tonal"
                        size="small"
                      >
                        Link Composer
                      </VChip>
                    </div>

                    <VRow>
                      <VCol
                        cols="12"
                        md="6"
                      >
                        <VTextField
                          v-model="researchLinkDraft.title"
                          label="Title"
                          placeholder="Weekly semaglutide in adults with overweight or obesity"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>
                      <VCol
                        cols="12"
                        md="6"
                      >
                        <VTextField
                          v-model="researchLinkDraft.article_url"
                          label="Article URL"
                          placeholder="https://www.nejm.org/example-link"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>
                      <VCol
                        cols="12"
                        md="6"
                      >
                        <VTextField
                          v-model="researchLinkDraft.authors"
                          label="Authors"
                          placeholder="Wilding JPH, et al."
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>
                      <VCol
                        cols="12"
                        md="6"
                      >
                        <VTextField
                          v-model="researchLinkDraft.journal"
                          label="Journal"
                          placeholder="New England Journal of Medicine"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>
                      <VCol
                        cols="12"
                        md="4"
                      >
                        <VTextField
                          v-model="researchLinkDraft.publication_year"
                          label="Publication Year"
                          placeholder="2021"
                          type="number"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>
                      <VCol
                        cols="12"
                        md="4"
                      >
                        <VTextField
                          v-model="researchLinkDraft.pubmed_id"
                          label="PubMed ID"
                          placeholder="33567185"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>
                      <VCol
                        cols="12"
                        md="4"
                      >
                        <VTextField
                          v-model="researchLinkDraft.doi"
                          label="DOI"
                          placeholder="10.1056/NEJMoa2032183"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>
                      <VCol cols="12">
                        <VTextarea
                          v-model="researchLinkDraft.description"
                          label="Description"
                          placeholder="Landmark study showing significant weight reduction."
                          rows="3"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </VCol>
                    </VRow>

                    <div class="d-flex justify-end mt-4">
                      <VBtn
                        color="primary"
                        size="large"
                        @click="addResearchLink"
                      >
                        Add Research Link
                      </VBtn>
                    </div>
                  </div>
                </VCol>

                <VCol cols="12">
                  <div class="panel-card">
                    <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
                      <div>
                        <h6 class="text-subtitle-1 font-weight-bold mb-1">
                          Saved Research Links
                        </h6>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          Review the references you have added, change their order, or remove them before saving the step.
                        </p>
                      </div>
                      <VChip
                        color="info"
                        variant="tonal"
                        size="small"
                      >
                        {{ productState.research_links.length }} Added
                      </VChip>
                    </div>

                    <div
                      v-if="productState.research_links.length"
                      class="research-list"
                    >
                      <div
                        v-for="(link, index) in productState.research_links"
                        :key="link.local_id"
                        class="research-card"
                      >
                        <div class="research-card__header">
                          <div>
                            <div class="d-flex align-center gap-2 mb-1">
                              <VChip
                                size="x-small"
                                color="info"
                                variant="tonal"
                              >
                                Research {{ index + 1 }}
                              </VChip>
                              <span class="text-caption text-medium-emphasis">Sort order: {{ index }}</span>
                            </div>
                            <h6 class="text-subtitle-1 font-weight-bold mb-1">
                              {{ link.title }}
                            </h6>
                            <a
                              :href="link.article_url"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="research-card__link"
                            >
                              {{ link.article_url }}
                            </a>
                          </div>
                          <div class="stack-item__actions">
                            <VBtn
                              icon
                              variant="text"
                              size="x-small"
                              :disabled="index === 0"
                              @click="moveResearchLink(index, -1)"
                            >
                              <VIcon
                                icon="tabler-arrow-up"
                                size="18"
                              />
                            </VBtn>
                            <VBtn
                              icon
                              variant="text"
                              size="x-small"
                              :disabled="index === productState.research_links.length - 1"
                              @click="moveResearchLink(index, 1)"
                            >
                              <VIcon
                                icon="tabler-arrow-down"
                                size="18"
                              />
                            </VBtn>
                            <VBtn
                              icon
                              variant="text"
                              color="error"
                              size="x-small"
                              @click="removeResearchLink(link.local_id)"
                            >
                              <VIcon
                                icon="tabler-trash"
                                size="18"
                              />
                            </VBtn>
                          </div>
                        </div>

                        <div class="research-meta">
                          <div
                            v-if="link.authors"
                            class="research-meta__item"
                          >
                            <strong>Authors:</strong> {{ link.authors }}
                          </div>
                          <div
                            v-if="link.journal"
                            class="research-meta__item"
                          >
                            <strong>Journal:</strong> {{ link.journal }}
                          </div>
                          <div
                            v-if="link.publication_year"
                            class="research-meta__item"
                          >
                            <strong>Year:</strong> {{ link.publication_year }}
                          </div>
                          <div
                            v-if="link.pubmed_id"
                            class="research-meta__item"
                          >
                            <strong>PubMed:</strong> {{ link.pubmed_id }}
                          </div>
                          <div
                            v-if="link.doi"
                            class="research-meta__item"
                          >
                            <strong>DOI:</strong> {{ link.doi }}
                          </div>
                        </div>

                        <p
                          v-if="link.description"
                          class="text-body-2 text-medium-emphasis mb-0"
                        >
                          {{ link.description }}
                        </p>
                      </div>
                    </div>

                    <div
                      v-else
                      class="empty-panel"
                    >
                      <VIcon
                        icon="tabler-microscope"
                        color="secondary"
                        size="28"
                        class="mb-2"
                      />
                      <div class="text-body-2 text-medium-emphasis">
                        No research links added yet.
                      </div>
                    </div>
                  </div>
                </VCol>
              </VRow>

              <VDivider class="my-6" />

              <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-4">
                <div class="text-body-2 text-medium-emphasis">
                  This step saves the product’s main clinical research description and replaces the full research-links list in the order shown.
                </div>

                <VBtn
                  color="primary"
                  size="large"
                  :loading="isSavingStep4"
                  @click="saveStepFour"
                >
                  Save Research & Evidence
                </VBtn>
              </div>
            </div>

            <div
              v-else-if="selectedStep === 5"
              class="step-five-layout"
            >
              <VRow>
                <VCol cols="12">
                  <div class="panel-card panel-card--pricing">
                    <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
                      <div>
                        <h6 class="text-subtitle-1 font-weight-bold mb-1">
                          Pricing Plans
                        </h6>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          Configure one-time and subscription pricing separately. Use the switches to enable or disable each pricing section.
                        </p>
                      </div>
                      <VChip
                        color="secondary"
                        variant="tonal"
                        size="small"
                      >
                        2 Pricing Sections
                      </VChip>
                    </div>

                    <div class="pricing-grid">
                      <div
                        v-for="groupInfo in pricingGroups"
                        :key="groupInfo.key"
                        class="pricing-panel"
                        :class="{ 'pricing-panel--disabled': !productState.pricing[groupInfo.key].is_active }"
                      >
                        <div class="pricing-panel__header">
                          <div>
                            <h6 class="text-subtitle-1 font-weight-bold mb-1">
                              {{ groupInfo.title }}
                            </h6>
                            <p class="text-body-2 text-medium-emphasis mb-0">
                              {{ groupInfo.description }}
                            </p>
                          </div>
                          <div class="pricing-panel__toggle">
                            <span class="text-caption text-medium-emphasis">{{ groupInfo.toggleLabel }}</span>
                            <VSwitch
                              v-model="productState.pricing[groupInfo.key].is_active"
                              color="primary"
                              hide-details
                              inset
                            />
                          </div>
                        </div>

                        <VRow>
                          <VCol
                            cols="12"
                            md="6"
                          >
                            <VTextField
                              v-model="productState.pricing[groupInfo.key].title"
                              label="Section Title"
                              :placeholder="groupInfo.key === 'subscription' ? 'Monthly Subscription' : 'One-Time Purchase'"
                              variant="outlined"
                              density="comfortable"
                              hide-details="auto"
                              :disabled="!productState.pricing[groupInfo.key].is_active"
                            />
                          </VCol>
                          <VCol
                            cols="12"
                            md="6"
                          >
                            <VTextarea
                              v-model="productState.pricing[groupInfo.key].description"
                              label="Section Description"
                              :placeholder="groupInfo.key === 'subscription' ? 'Best for recurring treatment plans.' : 'No commitment, order as needed.'"
                              rows="3"
                              variant="outlined"
                              density="comfortable"
                              hide-details="auto"
                              :disabled="!productState.pricing[groupInfo.key].is_active"
                            />
                          </VCol>
                        </VRow>

                        <div class="pricing-composer mt-4">
                          <div class="text-subtitle-2 font-weight-bold mb-3">
                            Add Pricing Option
                          </div>

                          <VRow>
                            <VCol
                              cols="12"
                              md="4"
                            >
                              <VTextField
                                v-model="pricingDrafts[groupInfo.key].label"
                                label="Label"
                                placeholder="1 Month"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                                :disabled="!productState.pricing[groupInfo.key].is_active"
                              />
                            </VCol>
                            <VCol
                              cols="12"
                              md="4"
                            >
                              <VTextField
                                v-model="pricingDrafts[groupInfo.key].interval_count"
                                label="Interval Count"
                                type="number"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                                :disabled="!productState.pricing[groupInfo.key].is_active"
                              />
                            </VCol>
                            <VCol
                              cols="12"
                              md="4"
                            >
                              <VTextField
                                v-model="pricingDrafts[groupInfo.key].billing_interval"
                                label="Billing Interval"
                                :disabled="groupInfo.key !== 'subscription' || !productState.pricing[groupInfo.key].is_active"
                                :placeholder="groupInfo.billingInterval"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                              />
                            </VCol>
                            <VCol
                              cols="12"
                              md="3"
                            >
                              <VTextField
                                v-model="pricingDrafts[groupInfo.key].price"
                                label="Price"
                                type="number"
                                step="0.01"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                                :disabled="!productState.pricing[groupInfo.key].is_active"
                              />
                            </VCol>
                            <VCol
                              cols="12"
                              md="3"
                            >
                              <VTextField
                                v-model="pricingDrafts[groupInfo.key].discount_percent"
                                label="Discount %"
                                type="number"
                                step="0.01"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                                :disabled="!productState.pricing[groupInfo.key].is_active"
                              />
                            </VCol>
                            <VCol
                              cols="12"
                              md="3"
                            >
                              <VTextField
                                v-model="pricingDrafts[groupInfo.key].final_price"
                                label="Final Price"
                                type="number"
                                step="0.01"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                                :disabled="!productState.pricing[groupInfo.key].is_active"
                              />
                            </VCol>
                            <VCol
                              cols="12"
                              md="3"
                              class="d-flex align-center"
                            >
                              <VCheckbox
                                v-model="pricingDrafts[groupInfo.key].is_default"
                                label="Default Option"
                                color="primary"
                                hide-details
                                :disabled="!productState.pricing[groupInfo.key].is_active"
                              />
                            </VCol>
                            <VCol
                              cols="12"
                              md="4"
                            >
                              <VTextField
                                v-model="pricingDrafts[groupInfo.key].mg"
                                label="MG"
                                placeholder="5mg"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                                :disabled="!productState.pricing[groupInfo.key].is_active"
                              />
                            </VCol>
                            <VCol
                              cols="12"
                              md="4"
                            >
                              <VTextField
                                v-model="pricingDrafts[groupInfo.key].tagline"
                                label="Tagline"
                                placeholder="Monthly recurring plan"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                                :disabled="!productState.pricing[groupInfo.key].is_active"
                              />
                            </VCol>
                            <VCol
                              cols="12"
                              md="4"
                            >
                              <VTextField
                                v-model="pricingDrafts[groupInfo.key].savings_label"
                                label="Savings Label"
                                placeholder="Best value"
                                variant="outlined"
                                density="comfortable"
                                hide-details="auto"
                                :disabled="!productState.pricing[groupInfo.key].is_active"
                              />
                            </VCol>
                          </VRow>

                          <div class="d-flex justify-end mt-4">
                            <VBtn
                              color="primary"
                              size="large"
                              :disabled="!productState.pricing[groupInfo.key].is_active"
                              @click="addPricingOption(groupInfo.key)"
                            >
                              Add Option
                            </VBtn>
                          </div>
                        </div>

                        <div class="pricing-list mt-5">
                          <div class="d-flex align-center justify-space-between mb-3">
                            <div class="text-subtitle-2 font-weight-bold">
                              Saved Options
                            </div>
                            <VChip
                              size="x-small"
                              color="secondary"
                              variant="tonal"
                            >
                              {{ productState.pricing[groupInfo.key].options.length }} Options
                            </VChip>
                          </div>

                          <div
                            v-if="productState.pricing[groupInfo.key].options.length"
                            class="stack-list"
                          >
                            <div
                              v-for="(option, index) in productState.pricing[groupInfo.key].options"
                              :key="option.local_id"
                              class="pricing-option-card"
                              :class="{ 'pricing-option-card--disabled': !productState.pricing[groupInfo.key].is_active }"
                            >
                              <div class="pricing-option-card__top">
                                <div>
                                  <div class="d-flex align-center gap-2 mb-1">
                                    <VChip
                                      size="x-small"
                                      :color="groupInfo.color"
                                      variant="tonal"
                                    >
                                      {{ option.label }}
                                    </VChip>
                                    <VChip
                                      v-if="option.is_default"
                                      size="x-small"
                                      color="success"
                                      variant="tonal"
                                    >
                                      Default
                                    </VChip>
                                  </div>
                                  <div class="text-body-2 text-medium-emphasis">
                                    {{ option.billing_interval }} / interval {{ option.interval_count }}
                                  </div>
                                </div>
                                <div class="stack-item__actions">
                                  <VBtn
                                    icon
                                    variant="text"
                                    size="x-small"
                                    :disabled="index === 0 || !productState.pricing[groupInfo.key].is_active"
                                    @click="movePricingOption(groupInfo.key, index, -1)"
                                  >
                                    <VIcon
                                      icon="tabler-arrow-up"
                                      size="18"
                                    />
                                  </VBtn>
                                  <VBtn
                                    icon
                                    variant="text"
                                    size="x-small"
                                    :disabled="index === productState.pricing[groupInfo.key].options.length - 1 || !productState.pricing[groupInfo.key].is_active"
                                    @click="movePricingOption(groupInfo.key, index, 1)"
                                  >
                                    <VIcon
                                      icon="tabler-arrow-down"
                                      size="18"
                                    />
                                  </VBtn>
                                  <VBtn
                                    icon
                                    variant="text"
                                    size="x-small"
                                    color="primary"
                                    :disabled="!productState.pricing[groupInfo.key].is_active"
                                    @click="setDefaultPricingOption(groupInfo.key, option.local_id)"
                                  >
                                    <VIcon
                                      icon="tabler-star"
                                      size="18"
                                    />
                                  </VBtn>
                                  <VBtn
                                    icon
                                    variant="text"
                                    color="error"
                                    size="x-small"
                                    :disabled="!productState.pricing[groupInfo.key].is_active"
                                    @click="removePricingOption(groupInfo.key, option.local_id)"
                                  >
                                    <VIcon
                                      icon="tabler-trash"
                                      size="18"
                                    />
                                  </VBtn>
                                </div>
                              </div>

                              <div class="pricing-option-card__meta">
                                <div><strong>Price:</strong> ${{ option.price }}</div>
                                <div><strong>Discount:</strong> {{ option.discount_percent }}%</div>
                                <div><strong>Final:</strong> ${{ option.final_price }}</div>
                              </div>

                              <div
                                v-if="Object.keys(option.metadata || {}).length"
                                class="pricing-option-card__meta"
                              >
                                <div v-if="option.metadata.mg">
                                  <strong>MG:</strong> {{ option.metadata.mg }}
                                </div>
                                <div v-if="option.metadata.tagline">
                                  <strong>Tagline:</strong> {{ option.metadata.tagline }}
                                </div>
                                <div v-if="option.metadata.savings_label">
                                  <strong>Savings:</strong> {{ option.metadata.savings_label }}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div
                            v-else
                            class="empty-panel"
                          >
                            <VIcon
                              icon="tabler-credit-card"
                              color="secondary"
                              size="28"
                              class="mb-2"
                            />
                            <div class="text-body-2 text-medium-emphasis">
                              {{ productState.pricing[groupInfo.key].is_active ? 'No pricing options added yet.' : 'Section is disabled.' }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </VCol>
              </VRow>

              <VDivider class="my-6" />

              <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-4">
                <div class="text-body-2 text-medium-emphasis">
                  Save the active pricing groups only. Disabled sections stay visible for context but are excluded from the payload.
                </div>

                <VBtn
                  color="primary"
                  size="large"
                  :loading="isSavingStep5"
                  @click="saveStepFive"
                >
                  Save Pricing Plans
                </VBtn>
              </div>
            </div>

            <div
              v-else
              class="complete-step"
            >
              <div
                class="complete-step__hero"
                :class="publishState.is_published ? 'complete-step__hero--published' : 'complete-step__hero--unpublished'"
              >
                <div class="complete-step__eyebrow">
                  <VChip
                    color="success"
                    variant="flat"
                    size="small"
                  >
                    Setup Complete
                  </VChip>
                  <VChip
                    :color="publishStatusTone"
                    variant="tonal"
                    size="small"
                  >
                    {{ publishStatusLabel }}
                  </VChip>
                </div>

                <div class="complete-step__hero-icon">
                  <VIcon
                    :icon="publishHeroIcon"
                    :color="publishStatusTone"
                    size="34"
                  />
                </div>

                <h6 class="text-h5 mb-2">
                  Product Ready For Release
                </h6>
                <p class="text-body-2 text-medium-emphasis mb-0 complete-step__hero-copy">
                  {{ publishState.is_published
                    ? 'This product is complete and currently live. You can keep it published or pull it back out of visibility at any time.'
                    : 'This product is fully complete but still hidden. Publish it when you are ready to make it visible.' }}
                </p>
              </div>

              <div
                v-if="publishStatusLoading"
                class="step-loader mt-6"
              >
                <VProgressCircular
                  indeterminate
                  color="primary"
                  size="38"
                  width="3"
                />
                <div class="text-body-2 text-medium-emphasis mt-3">
                  Loading publish status...
                </div>
              </div>

              <div
                v-else
                class="publish-panel mt-6"
                :class="publishState.is_published ? 'publish-panel--published' : 'publish-panel--unpublished'"
              >
                <div class="publish-panel__header">
                  <div>
                    <div
                      class="text-overline mb-2"
                      :class="publishState.is_published ? 'text-success' : 'text-warning'"
                    >
                      Publish Status
                    </div>
                    <h6 class="text-h6 mb-2">
                      Product is {{ publishState.is_published ? 'published' : 'not published' }}
                    </h6>
                    <p class="text-body-2 text-medium-emphasis mb-0">
                      {{ publishState.is_published
                        ? 'This product is currently live. You can unpublish it any time if you need to hide it again.'
                        : 'This product is complete but still hidden. Publish it when you want it to go live.' }}
                    </p>
                  </div>

                  <VChip
                    :color="publishStatusTone"
                    variant="tonal"
                    size="small"
                  >
                    {{ publishStatusLabel }}
                  </VChip>
                </div>

                <div class="publish-panel__meta">
                  <div class="publish-meta-card">
                    <span class="text-caption text-medium-emphasis">Completion Status</span>
                    <strong>{{ productState.completion_status }}</strong>
                  </div>
                  <div class="publish-meta-card">
                    <span class="text-caption text-medium-emphasis">Completion</span>
                    <strong>{{ completionPercentage }}%</strong>
                  </div>
                  <div class="publish-meta-card">
                    <span class="text-caption text-medium-emphasis">Step</span>
                    <strong>{{ productState.completion_step }}</strong>
                  </div>
                </div>

                <div class="publish-panel__actions">
                  <VBtn
                    color="primary"
                    size="large"
                    variant="flat"
                    :disabled="!publishState.can_publish || publishActionLoading"
                    :loading="publishActionLoading && publishState.can_publish"
                    @click="publishProduct(true)"
                  >
                    Publish Product
                  </VBtn>

                  <VBtn
                    color="warning"
                    variant="outlined"
                    size="large"
                    :disabled="!publishState.can_unpublish || publishActionLoading"
                    :loading="publishActionLoading && publishState.can_unpublish"
                    @click="publishProduct(false)"
                  >
                    Unpublish Product
                  </VBtn>
                </div>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <ProductPreviewDrawer
      v-model="previewDrawerOpen"
      :product-id="productState.id"
    />
  </div>
</template>

<style scoped>
.add-product-page {
  padding: 4px;
}

.setup-header-card,
.steps-card,
.form-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 20px;
  background: rgb(var(--v-theme-surface));
}

.setup-header-card {
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.12), transparent 32%),
    linear-gradient(135deg, rgba(var(--v-theme-primary), 0.04), rgba(var(--v-theme-surface), 1));
}

.setup-header-card__status {
  min-width: 180px;
}

.setup-header-card__actions {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.setup-header-card__meta {
  width: 100%;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.steps-loader,
.step-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1px dashed rgba(var(--v-theme-primary), 0.18);
  border-radius: 18px;
  background: rgba(var(--v-theme-primary), 0.025);
}

.steps-loader {
  min-height: 280px;
}

.step-loader {
  min-height: 420px;
}

.complete-step {
  display: flex;
  flex-direction: column;
}

.complete-step__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 220px;
  border: 1px dashed rgba(var(--v-theme-success), 0.24);
  border-radius: 20px;
  padding: 2rem;
  background: linear-gradient(180deg, rgba(var(--v-theme-success), 0.05), rgba(var(--v-theme-surface), 1));
}

.complete-step__hero--published {
  border-color: rgba(var(--v-theme-success), 0.28);
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-success), 0.14), transparent 34%),
    linear-gradient(180deg, rgba(var(--v-theme-success), 0.06), rgba(var(--v-theme-surface), 1));
}

.complete-step__hero--unpublished {
  border-color: rgba(var(--v-theme-warning), 0.28);
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-warning), 0.16), transparent 34%),
    linear-gradient(180deg, rgba(var(--v-theme-warning), 0.06), rgba(var(--v-theme-surface), 1));
}

.complete-step__eyebrow {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 1rem;
}

.complete-step__hero-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: rgba(var(--v-theme-surface), 0.7);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  margin-bottom: 1rem;
  backdrop-filter: blur(8px);
}

.complete-step__hero-copy {
  max-width: 640px;
}

.publish-panel {
  padding: 1.25rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 20px;
  background: rgba(var(--v-theme-on-surface), 0.015);
}

.publish-panel--published {
  border-color: rgba(var(--v-theme-success), 0.18);
  background: linear-gradient(180deg, rgba(var(--v-theme-success), 0.03), rgba(var(--v-theme-surface), 1));
}

.publish-panel--unpublished {
  border-color: rgba(var(--v-theme-warning), 0.18);
  background: linear-gradient(180deg, rgba(var(--v-theme-warning), 0.04), rgba(var(--v-theme-surface), 1));
}

.publish-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.publish-panel__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.25rem;
}

.publish-meta-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}

.publish-panel__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.step-item {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-radius: 16px;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.step-item--clickable {
  cursor: pointer;
}

.step-item--clickable:hover {
  background: rgba(var(--v-theme-primary), 0.04);
  transform: translateX(2px);
}

.step-item--locked {
  opacity: 0.72;
}

.step-item__indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
}

.step-item__line {
  width: 2px;
  flex: 1;
  min-height: 28px;
  margin-top: 0.5rem;
  background: rgba(var(--v-theme-on-surface), 0.12);
}

.step-item__content {
  flex: 1;
  min-width: 0;
}

.step-item__title {
  font-size: 0.95rem;
  font-weight: 700;
}

.step-item__description {
  margin: 0.35rem 0 0;
  color: rgba(var(--v-theme-on-surface), 0.64);
  font-size: 0.84rem;
  line-height: 1.45;
}

.step-item--active .step-item__title {
  color: rgb(var(--v-theme-primary));
}

.form-header__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
}

.panel-card {
  padding: 1.25rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 20px;
  background: rgba(var(--v-theme-on-surface), 0.015);
}

.panel-card--research {
  background:
    linear-gradient(180deg, rgba(var(--v-theme-info), 0.03), rgba(var(--v-theme-surface), 1));
}

.panel-card--pricing {
  background:
    linear-gradient(180deg, rgba(var(--v-theme-secondary), 0.04), rgba(var(--v-theme-surface), 1));
}

.ingredient-panel {
  padding: 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 18px;
  background: rgba(var(--v-theme-warning), 0.03);
}

.ingredient-add-btn {
  min-width: 180px;
}

.image-config-alert {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(var(--v-theme-warning), 0.24);
  border-radius: 16px;
  background: rgba(var(--v-theme-warning), 0.06);
}

.image-type-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.image-type-tabs {
  padding: 0.25rem 0 0.5rem;
}

.image-type-tabs__nav {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.image-type-tabs__tab {
  text-transform: none;
  letter-spacing: 0;
  min-width: 0;
}

.image-type-tabs__count {
  margin-left: 0.5rem;
}

.image-type-panel {
  padding: 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 18px;
  background: rgba(var(--v-theme-surface), 0.72);
}

.image-type-panel--cover {
  border-color: rgba(var(--v-theme-success), 0.2);
  background:
    linear-gradient(180deg, rgba(var(--v-theme-success), 0.04), rgba(var(--v-theme-surface), 0.9));
}

.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 1.5rem;
  border: 2px dashed rgba(var(--v-theme-primary), 0.28);
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(var(--v-theme-primary), 0.04), rgba(var(--v-theme-primary), 0.01));
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.upload-dropzone:hover,
.upload-dropzone--active {
  border-color: rgba(var(--v-theme-primary), 0.62);
  background:
    linear-gradient(135deg, rgba(var(--v-theme-primary), 0.08), rgba(var(--v-theme-primary), 0.02));
  transform: translateY(-1px);
}

.image-card__media.upload-dropzone {
  min-height: 180px;
  height: 180px;
  padding: 1rem;
  border-width: 1px;
  border-style: dashed;
  border-radius: 0;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.image-card {
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 18px;
  background: rgb(var(--v-theme-surface));
}

.image-card--slot {
  display: flex;
  flex-direction: column;
}

.image-card__media {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.image-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-card__loading,
.image-card__error,
.image-card__placeholder,
.upcoming-step,
.empty-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.image-card__loading,
.image-card__error,
.image-card__placeholder {
  width: 100%;
  height: 100%;
  padding: 1rem;
}

.image-card__body {
  padding: 1rem;
}

.composer-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: start;
}

.stack-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.stack-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}

.stack-item--ingredient {
  align-items: start;
}

.stack-item__index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}

.stack-item__actions {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.faq-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.ingredient-search-results {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 220px;
  overflow: auto;
  padding: 0.75rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}

.ingredient-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.65rem;
  align-items: start;
  padding: 0.7rem;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.ingredient-option:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}

@media (max-width: 767px) {
  .ingredient-add-btn {
    width: 100%;
  }
}

.ingredient-option--new {
  display: flex;
  align-items: center;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.ingredient-option__radio {
  margin-top: 0.2rem;
}

.research-composer {
  padding: 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 18px;
  background: rgba(var(--v-theme-info), 0.02);
}

.research-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.research-card {
  padding: 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 18px;
  background: rgb(var(--v-theme-surface));
}

.research-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.research-card__link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  word-break: break-word;
}

.research-card__link:hover {
  text-decoration: underline;
}

.research-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem 1rem;
  margin-bottom: 0.85rem;
}

.research-meta__item {
  font-size: 0.86rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.pricing-grid {
  display: grid;
  gap: 1.25rem;
}

.pricing-panel {
  padding: 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 18px;
  background: rgb(var(--v-theme-surface));
}

.pricing-panel--disabled {
  opacity: 0.72;
}

.pricing-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.pricing-panel__toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pricing-composer {
  padding: 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  background: rgba(var(--v-theme-secondary), 0.03);
}

.pricing-list {
  margin-top: 1rem;
}

.pricing-option-card {
  padding: 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.pricing-option-card--disabled {
  opacity: 0.7;
}

.pricing-option-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.pricing-option-card__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem 1rem;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.86rem;
  margin-bottom: 0.5rem;
}

.faq-card {
  padding: 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 18px;
  background: rgb(var(--v-theme-surface));
}

.faq-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.upcoming-step {
  min-height: 420px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.18);
  border-radius: 20px;
  padding: 2rem;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.empty-panel {
  min-height: 140px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 18px;
  padding: 1rem;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.step-two-layout,
.step-three-layout,
.step-four-layout,
.step-five-layout {
  min-height: 560px;
}

.spin-icon {
  animation: spin 0.9s linear infinite;
}

.text-break {
  word-break: break-word;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 959px) {
  .steps-card {
    margin-bottom: 1rem;
  }

  .composer-row {
    grid-template-columns: 1fr;
  }

  .stack-item,
  .research-card__header,
  .pricing-panel__header,
  .pricing-option-card__top {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .stack-item__actions {
    justify-content: flex-end;
  }

  .publish-panel__header {
    flex-direction: column;
  }

  .publish-panel__meta {
    grid-template-columns: 1fr;
  }
}
</style>
