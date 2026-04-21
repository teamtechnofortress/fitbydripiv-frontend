<script setup>
import { computed, reactive, ref } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { requiredValidator } from '@/@core/utils/validators'
import { ADMIN_MEDIA_UPLOAD_URL, ADMIN_PRODUCTS_STEP1_URL } from '@/network/const'
import { getApiToken } from '@/store/authData'

const toast = useToast()

const STEP_DEFINITIONS = Object.freeze([
  {
    id: 1,
    title: 'Product Basics',
    description: 'Create the draft, upload images, and choose the cover image.',
    icon: 'tabler-package',
    color: 'primary',
  },
  // {
  //   id: 2,
  //   title: 'Pricing & Offers',
  //   description: 'Attach pricing plans and offer logic in the next phase.',
  //   icon: 'tabler-currency-dollar',
  //   color: 'success',
  // },
  // {
  //   id: 3,
  //   title: 'Content & Details',
  //   description: 'Add product details, content blocks, and supporting copy.',
  //   icon: 'tabler-file-text',
  //   color: 'warning',
  // },
  // {
  //   id: 4,
  //   title: 'Review & Publish',
  //   description: 'Verify the draft and complete the product setup flow.',
  //   icon: 'tabler-circle-check',
  //   color: 'info',
  // },
])

const categoryOptions = [
  { title: 'Weight Loss', value: 'weight_loss' },
  { title: 'Wellness', value: 'wellness' },
  { title: 'Longevity', value: 'longevity' },
]

const formRef = ref()
const fileInputRef = ref()
const selectedStep = ref(1)
const isUploading = ref(false)
const isSaving = ref(false)
const dragActive = ref(false)

const productState = reactive({
  id: '',
  name: '',
  category: '',
  description: '',
  images: [],
  completion_status: 'not_started',
  completion_percentage: 0,
  completion_step: 1,
  cover_image_id: '',
})

const uploadingCount = computed(() => productState.images.filter(image => image.isUploading).length)
const uploadedImages = computed(() => productState.images.filter(image => !image.isUploading && !image.uploadError))
const hasUploadedImages = computed(() => uploadedImages.value.length > 0)
const completionPercentage = computed(() => {
  const value = Number(productState.completion_percentage || 0)
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
})
const completionLabel = computed(() => {
  if (productState.completion_status === 'complete') return 'Complete'
  if (completionPercentage.value > 0) return 'In Progress'
  return 'Not Started'
})
const selectedStepDefinition = computed(() => STEP_DEFINITIONS.find(step => step.id === selectedStep.value) || STEP_DEFINITIONS[0])

const isStepCompleted = stepId => {
  if (stepId === 1) return completionPercentage.value > 0
  return stepId < (productState.completion_step || 1)
}

const isStepLocked = stepId => stepId !== 1

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
  I’m extending the same Add Product flow so step 2 advances directly into a real step 3. That means adding the new endpoint constants, treatment-detail fields, ingredient autocomplete/search, and a save step that submits the full ingredient list in one payload.
  
  
  if (responseData?.errors) {
    const firstKey = Object.keys(responseData.errors)[0]
    if (firstKey) {
      const entry = responseData.errors[firstKey]
      return Array.isArray(entry) ? entry[0] : entry
    }
  }
  return error?.message || 'Request failed. Please try again.'
}

const normalizeImages = () => {
  productState.images = productState.images
    .filter(image => image?.image_url || image?.isUploading)
    .map((image, index) => ({
      local_id: image.local_id || `${Date.now()}-${index}`,
      id: image.id || null,
      image_url: image.image_url || '',
      upload_path: image.upload_path || '',
      original_name: image.original_name || '',
      image_type: image.image_type || 'gallery',
      sort_order: index,
      slot_position: index + 1,
      isUploading: !!image.isUploading,
      uploadError: image.uploadError || '',
    }))

  const coverImage = productState.images.find(image => image.image_type === 'cover' && image.image_url)
  productState.cover_image_id = coverImage?.id || coverImage?.local_id || ''
}

const setCoverImage = localId => {
  productState.images = productState.images.map(image => ({
    ...image,
    image_type: image.local_id === localId ? 'cover' : 'gallery',
  }))
  normalizeImages()
}

const removeImage = localId => {
  const target = productState.images.find(image => image.local_id === localId)
  productState.images = productState.images.filter(image => image.local_id !== localId)
  normalizeImages()

  if (target?.image_type === 'cover' && productState.images.length) {
    setCoverImage(productState.images[0].local_id)
  }
}

const appendUploadingImage = file => {
  const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  productState.images.push({
    local_id: localId,
    id: null,
    image_url: '',
    upload_path: '',
    original_name: file.name,
    image_type: productState.images.length === 0 ? 'cover' : 'gallery',
    sort_order: productState.images.length,
    slot_position: productState.images.length + 1,
    isUploading: true,
    uploadError: '',
  })
  return localId
}

const uploadSingleFile = async file => {
  const localId = appendUploadingImage(file)
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
        isUploading: false,
        uploadError: '',
      }
    })

    normalizeImages()
    toast.success(`${file.name} uploaded`)
  } catch (error) {
    productState.images = productState.images.map(image => {
      if (image.local_id !== localId) return image
      return {
        ...image,
        isUploading: false,
        uploadError: buildErrorMessage(error),
      }
    })
    toast.error(buildErrorMessage(error))
  }
}

const handleFiles = async input => {
  const files = Array.from(input || []).filter(Boolean)
  if (!files.length) return

  isUploading.value = true
  try {
    for (const file of files) {
      await uploadSingleFile(file)
    }
  } finally {
    normalizeImages()
    isUploading.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const onFileChange = event => handleFiles(event?.target?.files)

const onDrop = async event => {
  dragActive.value = false
  await handleFiles(event.dataTransfer?.files)
}

const openFilePicker = () => {
  fileInputRef.value?.click()
}

const buildPayload = () => ({
  ...(productState.id ? { id: productState.id } : {}),
  name: productState.name,
  category: productState.category,
  description: productState.description,
  images: productState.images
    .filter(image => image.image_url)
    .map((image, index) => ({
      image_url: image.image_url,
      image_type: image.image_type === 'cover' ? 'cover' : 'gallery',
      sort_order: index,
      slot_position: index + 1,
    })),
})

const saveStepOne = () => {
  formRef.value?.validate().then(async ({ valid }) => {
    if (!valid) return
    if (!hasUploadedImages.value) {
      toast.error('Upload at least one product image before saving.')
      return
    }
    if (uploadingCount.value > 0) {
      toast.error('Wait for current image uploads to finish before saving.')
      return
    }

    isSaving.value = true
    try {
      normalizeImages()
      const response = await axios.post(ADMIN_PRODUCTS_STEP1_URL, buildPayload(), {
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      })

      const payload = response?.data?.data || {}
      productState.id = payload.product_id || productState.id
      productState.completion_status = payload.completion_status || productState.completion_status
      productState.completion_percentage = payload.completion_percentage ?? productState.completion_percentage
      productState.completion_step = payload.completion_step ?? productState.completion_step
      productState.cover_image_id = payload.cover_image_id || productState.cover_image_id

      toast.success(response?.data?.message || 'Product basics saved successfully.')
    } catch (error) {
      toast.error(buildErrorMessage(error))
    } finally {
      isSaving.value = false
    }
  })
}
</script>

<template>
  <div class="product-setup-page">
    <VRow>
      <VCol cols="12">
        <VCard class="setup-header-card" elevation="0">
          <VCardText class="d-flex flex-column flex-lg-row justify-space-between align-start align-lg-center gap-4">
            <div>
              <div class="text-overline text-primary mb-1">Product Admin</div>
              <h4 class="text-h4 mb-2">Product Setup</h4>
              <p class="text-body-1 text-medium-emphasis mb-0">
                Build the product draft in a guided flow. Step one is active now, and the next sections are ready for follow-up work.
              </p>
            </div>

            <div class="setup-header-card__status">
              <VChip color="primary" variant="flat" size="small">
                {{ completionPercentage }}% Complete
              </VChip>
              <div class="text-caption text-medium-emphasis mt-2">
                Status: {{ completionLabel }}
              </div>
              <div v-if="productState.id" class="text-caption text-medium-emphasis mt-1">
                Draft ID: {{ productState.id }}
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="4">
        <VCard class="steps-card" elevation="0">
          <VCardText>
            <div class="steps-header mb-4">
              <h6 class="text-subtitle-1 font-weight-bold mb-1">Setup Progress</h6>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Save the basics first. The backend will return product completion data after each successful submit.
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

            <div class="steps-list">
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
                @click="!isStepLocked(stepDef.id) && (selectedStep = stepDef.id)"
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
                      Soon
                    </VChip>
                  </div>
                  <p class="step-item__description">{{ stepDef.description }}</p>
                </div>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="8">
        <VCard class="form-card" elevation="0">
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
                  <h5 class="text-h6 font-weight-bold mb-1">{{ selectedStepDefinition.title }}</h5>
                  <p class="text-body-2 text-medium-emphasis mb-0">{{ selectedStepDefinition.description }}</p>
                </div>
              </div>
            </div>

            <div v-if="selectedStep !== 1" class="upcoming-step">
              <VIcon icon="tabler-clock-hour-4" color="secondary" size="36" class="mb-3" />
              <h6 class="text-h6 mb-2">This step is not active yet</h6>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Step one is complete enough to start product drafting. The remaining screens can be connected next.
              </p>
            </div>

            <VForm v-else ref="formRef" @submit.prevent="saveStepOne">
              <VRow>
                <VCol cols="12" md="6">
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

                <VCol cols="12" md="6">
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
                  <div class="image-upload-section">
                    <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3 mb-4">
                      <div>
                        <h6 class="text-subtitle-1 font-weight-bold mb-1">Product Images</h6>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          Upload images now. Each file uploads immediately and its final URL is stored in the draft state.
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

                    <input
                      ref="fileInputRef"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      multiple
                      class="d-none"
                      @change="onFileChange"
                    >

                    <div
                      class="upload-dropzone"
                      :class="{ 'upload-dropzone--active': dragActive }"
                      @click="openFilePicker"
                      @dragenter.prevent="dragActive = true"
                      @dragover.prevent="dragActive = true"
                      @dragleave.prevent="dragActive = false"
                      @drop.prevent="onDrop"
                    >
                      <VIcon
                        :icon="isUploading ? 'tabler-loader-2' : 'tabler-cloud-upload'"
                        :class="{ 'spin-icon': isUploading }"
                        size="36"
                        color="primary"
                        class="mb-3"
                      />
                      <h6 class="text-h6 mb-2">Drop images here or click to upload</h6>
                      <p class="text-body-2 text-medium-emphasis mb-0">
                        Accepted: JPG, PNG, WEBP up to 5MB. The first uploaded image becomes the cover by default.
                      </p>
                    </div>

                    <div v-if="productState.images.length" class="image-grid mt-4">
                      <div
                        v-for="image in productState.images"
                        :key="image.local_id"
                        class="image-card"
                        :class="{ 'image-card--cover': image.image_type === 'cover' }"
                      >
                        <div class="image-card__media">
                          <div v-if="image.isUploading" class="image-card__loading">
                            <VProgressCircular indeterminate color="primary" size="28" width="3" />
                            <span class="text-caption mt-2">Uploading...</span>
                          </div>

                          <div v-else-if="image.uploadError" class="image-card__error">
                            <VIcon icon="tabler-alert-circle" color="error" size="24" />
                            <span class="text-caption text-error text-center mt-2">{{ image.uploadError }}</span>
                          </div>

                          <img
                            v-else
                            :src="image.image_url"
                            :alt="image.original_name || 'Product image'"
                          >
                        </div>

                        <div class="image-card__body">
                          <div class="d-flex align-center justify-space-between gap-2 mb-2">
                            <VChip
                              :color="image.image_type === 'cover' ? 'success' : 'secondary'"
                              variant="tonal"
                              size="x-small"
                            >
                              {{ image.image_type === 'cover' ? 'Cover' : 'Gallery' }}
                            </VChip>

                            <VBtn
                              icon
                              variant="text"
                              color="error"
                              size="x-small"
                              :disabled="image.isUploading"
                              @click.stop="removeImage(image.local_id)"
                            >
                              <VIcon icon="tabler-trash" size="18" />
                            </VBtn>
                          </div>

                          <div class="text-body-2 font-weight-medium text-truncate mb-1">
                            {{ image.original_name || 'Uploaded image' }}
                          </div>

                          <div class="text-caption text-medium-emphasis text-break mb-3">
                            {{ image.upload_path || image.image_url || 'Waiting for upload...' }}
                          </div>

                          <VBtn
                            block
                            size="small"
                            variant="outlined"
                            color="primary"
                            :disabled="image.isUploading || !!image.uploadError"
                            @click.stop="setCoverImage(image.local_id)"
                          >
                            {{ image.image_type === 'cover' ? 'Selected as Cover' : 'Use as Cover' }}
                          </VBtn>
                        </div>
                      </div>
                    </div>
                  </div>
                </VCol>
              </VRow>

              <VDivider class="my-6" />

              <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-4">
                <div class="text-body-2 text-medium-emphasis">
                  Saving step one creates or updates the product draft and stores the returned `product_id` for the next steps.
                </div>

                <VBtn
                  color="primary"
                  size="large"
                  :loading="isSaving"
                  :disabled="isUploading"
                  @click="saveStepOne"
                >
                  Save Product Basics
                </VBtn>
              </div>
            </VForm>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style scoped>
.product-setup-page {
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
  min-width: 160px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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
  transition: transform 0.2s ease;
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

.image-upload-section {
  padding: 1.25rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 20px;
  background: rgba(var(--v-theme-on-surface), 0.015);
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

.image-card--cover {
  border-color: rgba(var(--v-theme-success), 0.4);
  box-shadow: 0 10px 24px rgba(var(--v-theme-success), 0.08);
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
.upcoming-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.image-card__loading,
.image-card__error {
  width: 100%;
  height: 100%;
  padding: 1rem;
}

.image-card__body {
  padding: 1rem;
}

.spin-icon {
  animation: spin 0.9s linear infinite;
}

.upcoming-step {
  min-height: 420px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.18);
  border-radius: 20px;
  padding: 2rem;
  background: rgba(var(--v-theme-on-surface), 0.02);
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
}
</style>
