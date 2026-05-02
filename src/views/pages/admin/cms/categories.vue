<script setup>
import { requiredValidator } from "@/@core/utils/validators"
import * as Network from "@/network"
import * as Const from "@/network/const"
import { getApiToken } from "@/store/authData"
import axios from "axios"
import { onMounted } from "vue"
import { useToast } from "vue-toastification"

const toast = useToast()
const refVForm = ref()
const isSaving = ref(false)
const isLoading = ref(false)
const categories = ref([])
const currentCategory = ref({})
const isConfirmDialogVisible = ref(false)
const deletingCategoryId = ref(null)
const categoryMediaInput = ref(null)
const categoryMediaUploading = ref(false)
const categoryMediaDragActive = ref(false)
const MAX_SERVER_VIDEO_UPLOAD_BYTES = 10 * 1024 * 1024

const newCategory = () => ({
  id: null,
  name: "",
  slug: "",
  description: "",
  banner_image: "",
  landscape_banner: "",
  background_video: "",
  video_playback_speed: 1,
  display_order: 0,
})

const resetForm = () => {
  currentCategory.value = newCategory()
  refVForm.value?.resetValidation()
}

const editCategory = item => {
  currentCategory.value = { ...item }
}

const loadCategories = () => {
  isLoading.value = true
  Network.getRequest(Const.CMS_ADMIN_CATEGORIES, {}, {}, response => {
    isLoading.value = false
    if (response.data?.success) {
      categories.value = response.data.data || []
      return
    }
    toast.error(`Failed to load categories: ${response.data?.err_msg || "Unknown error"}`)
  })
}

const getAuthHeaders = () => {
  const token = getApiToken()
  if (!token) throw new Error("Authentication token missing. Please login again.")

  return { Authorization: `Bearer ${token}` }
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

const currentPrimaryMediaType = () => (
  currentCategory.value.background_video ? 'video' : (currentCategory.value.banner_image || currentCategory.value.landscape_banner ? 'image' : '')
)

const currentPrimaryMediaUrl = () => (
  currentCategory.value.background_video || currentCategory.value.landscape_banner || currentCategory.value.banner_image || ''
)

const uploadAdminMedia = async file => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', 'product')

  const response = await axios.post(Const.ADMIN_MEDIA_UPLOAD_URL, formData, {
    headers: getAuthHeaders(),
  })

  return response?.data?.data || {}
}

const openCategoryMediaPicker = () => {
  categoryMediaInput.value?.click()
}

const applyCategoryPrimaryMedia = (mediaUrl, mediaType) => {
  if (mediaType === 'video') {
    currentCategory.value.background_video = mediaUrl || ''
    currentCategory.value.banner_image = ''
    currentCategory.value.landscape_banner = ''
    return
  }

  currentCategory.value.background_video = ''
  currentCategory.value.banner_image = mediaUrl || ''
  currentCategory.value.landscape_banner = mediaUrl || ''
}

const handleCategoryMediaFile = async file => {
  if (!file)
    return

  const mediaType = inferMediaType(file)
  if (!mediaType) {
    toast.error("Unsupported file type. Upload an image or video.")
    return
  }

  if (mediaType === 'video' && file.size > MAX_SERVER_VIDEO_UPLOAD_BYTES) {
    toast.error("Video is larger than the current server upload limit of 10MB.")
    return
  }

  categoryMediaUploading.value = true
  try {
    const media = await uploadAdminMedia(file)
    const resolvedType = media.media_type === 'video' ? 'video' : media.media_type === 'image' ? 'image' : mediaType
    applyCategoryPrimaryMedia(media.url || '', resolvedType)
    toast.success("Category media uploaded successfully.")
  } catch (error) {
    toast.error(buildErrorMessage(error))
  } finally {
    categoryMediaUploading.value = false
  }
}

const onCategoryMediaInputChange = async event => {
  const file = event?.target?.files?.[0]
  await handleCategoryMediaFile(file)
  if (event?.target)
    event.target.value = ''
}

const onCategoryMediaDrop = async event => {
  categoryMediaDragActive.value = false
  const file = event?.dataTransfer?.files?.[0]
  await handleCategoryMediaFile(file)
}

const clearCategoryPrimaryMedia = () => {
  currentCategory.value.banner_image = ''
  currentCategory.value.landscape_banner = ''
  currentCategory.value.background_video = ''
}

const saveCategory = () => {
  refVForm.value?.validate().then(({ valid: isValid }) => {
    if (!isValid) {
      toast.error("Please fill required fields.")
      return
    }

    isSaving.value = true

    const payload = {
      ...currentCategory.value,
      id: currentCategory.value.id || undefined,
      slug: currentCategory.value.slug || undefined,
      video_playback_speed: currentCategory.value.video_playback_speed || 1,
      display_order: Number(currentCategory.value.display_order || 0),
    }

    if (payload.background_video) {
      payload.banner_image = ''
      payload.landscape_banner = ''
    } else if (payload.banner_image || payload.landscape_banner) {
      payload.background_video = ''
    }

    Network.postRequest(Const.CMS_ADMIN_CATEGORIES, {}, payload, response => {
      isSaving.value = false
      if (response.data?.success) {
        toast.success(currentCategory.value.id ? "Category updated" : "Category created")
        loadCategories()
        resetForm()
        return
      }
      toast.error(`Failed to save category: ${response.data?.err_msg || "Unknown error"}`)
    })
  })
}

const askDelete = id => {
  deletingCategoryId.value = id
  isConfirmDialogVisible.value = true
}

const doDelete = async value => {
  if (!value || !deletingCategoryId.value) return

  try {
    await axios.delete(`${Const.CMS_ADMIN_CATEGORIES}/${deletingCategoryId.value}`, {
      headers: {
        Authorization: `Bearer ${getApiToken()}`,
      },
    })
    toast.success("Category deleted")
    if (currentCategory.value.id === deletingCategoryId.value) resetForm()
    loadCategories()
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || "Delete failed"
    toast.error(`Failed to delete category: ${message}`)
  } finally {
    deletingCategoryId.value = null
  }
}

onMounted(() => {
  resetForm()
  loadCategories()
})
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard>
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <div class="d-flex align-center justify-space-between mb-3">
                  <h4>CMS CATEGORIES</h4>
                  <VBtn color="primary" size="small" @click="resetForm">+ New</VBtn>
                </div>

                <VProgressLinear v-if="isLoading" indeterminate class="mb-3" />

                <VTable class="border rounded">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Order</th>
                      <th class="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in categories"
                      :key="item.id"
                      class="cursor-pointer"
                      @click="editCategory(item)"
                    >
                      <td>{{ item.name }}</td>
                      <td>{{ item.slug }}</td>
                      <td>{{ item.display_order ?? 0 }}</td>
                      <td class="text-right">
                        <VBtn
                          icon
                          variant="text"
                          color="default"
                          size="x-small"
                          @click.stop="askDelete(item.id)"
                        >
                          <VIcon icon="tabler-trash" :size="20" color="error" />
                        </VBtn>
                      </td>
                    </tr>
                    <tr v-if="!categories.length && !isLoading">
                      <td colspan="4" class="text-center py-6">No categories found.</td>
                    </tr>
                  </tbody>
                </VTable>
              </VCol>

              <VCol cols="12" md="6">
                <h4 class="mb-3">{{ currentCategory.id ? "EDIT CATEGORY" : "ADD CATEGORY" }}</h4>
                <VForm ref="refVForm" @submit.prevent="saveCategory">
                  <VRow>
                    <VCol cols="12">
                      <VTextField
                        v-model="currentCategory.name"
                        label="Name"
                        :rules="[requiredValidator]"
                      />
                    </VCol>

                    <VCol cols="12">
                      <VTextField
                        v-model="currentCategory.slug"
                        label="Slug (optional, auto-generated if blank)"
                      />
                    </VCol>

                    <VCol cols="12">
                      <VTextarea
                        v-model="currentCategory.description"
                        label="Description"
                        rows="3"
                      />
                    </VCol>

                    <VCol cols="12">
                      <div class="category-media-uploader">
                        <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center gap-3">
                          <div>
                            <div class="text-subtitle-1 font-weight-bold mb-1">Primary Category Media</div>
                            <p class="text-body-2 text-medium-emphasis mb-0">
                              Drop an image or video here. Images populate the banner fields. Videos populate the background video field and clear image fields.
                            </p>
                          </div>
                          <VChip
                            v-if="currentPrimaryMediaType()"
                            color="primary"
                            variant="tonal"
                            size="small"
                          >
                            {{ currentPrimaryMediaType() === 'video' ? 'Video Active' : 'Image Active' }}
                          </VChip>
                        </div>

                        <input
                          ref="categoryMediaInput"
                          type="file"
                          accept="image/*,video/mp4,video/webm,video/quicktime,video/mov"
                          class="d-none"
                          @change="onCategoryMediaInputChange"
                        >

                        <div
                          class="category-media-uploader__dropzone"
                          :class="{ 'category-media-uploader__dropzone--active': categoryMediaDragActive }"
                          @click="openCategoryMediaPicker"
                          @dragenter.prevent="categoryMediaDragActive = true"
                          @dragover.prevent="categoryMediaDragActive = true"
                          @dragleave.prevent="categoryMediaDragActive = false"
                          @drop.prevent="onCategoryMediaDrop"
                        >
                          <VIcon
                            :icon="categoryMediaUploading ? 'tabler-loader-2' : 'tabler-cloud-upload'"
                            :class="{ 'spin-icon': categoryMediaUploading }"
                            size="34"
                            color="primary"
                            class="mb-3"
                          />
                          <div class="text-subtitle-1 font-weight-semibold mb-1">
                            Drop image or video here or click to upload
                          </div>
                          <div class="text-body-2 text-medium-emphasis text-center">
                            Accepted: images and videos. Uploading a new file replaces the current primary category media.
                          </div>
                        </div>

                        <div
                          v-if="currentPrimaryMediaUrl()"
                          class="category-media-uploader__preview"
                        >
                          <div>
                            <div class="text-subtitle-2 font-weight-semibold mb-1">Current Media</div>
                            <div class="text-body-2 text-medium-emphasis text-break">
                              {{ currentPrimaryMediaUrl() }}
                            </div>
                          </div>
                          <div class="d-flex align-center gap-2">
                            <VBtn
                              color="primary"
                              variant="text"
                              prepend-icon="tabler-external-link"
                              @click.stop="window.open(currentPrimaryMediaUrl(), '_blank', 'noopener,noreferrer')"
                            >
                              Open
                            </VBtn>
                            <VBtn
                              color="error"
                              variant="text"
                              icon="tabler-x"
                              @click.stop="clearCategoryPrimaryMedia"
                            />
                          </div>
                        </div>
                      </div>
                    </VCol>

                    <VCol cols="12">
                      <VTextField
                        v-model="currentCategory.banner_image"
                        label="Banner Image URL"
                      />
                    </VCol>

                    <VCol cols="12">
                      <VTextField
                        v-model="currentCategory.landscape_banner"
                        label="Landscape Banner URL"
                      />
                    </VCol>

                    <VCol cols="12">
                      <VTextField
                        v-model="currentCategory.background_video"
                        label="Background Video URL"
                      />
                    </VCol>

                    <VCol cols="6">
                      <VTextField
                        v-model="currentCategory.video_playback_speed"
                        label="Video Speed"
                        type="number"
                        step="0.1"
                      />
                    </VCol>

                    <VCol cols="6">
                      <VTextField
                        v-model="currentCategory.display_order"
                        label="Display Order"
                        type="number"
                      />
                    </VCol>

                    <VCol cols="12" class="d-flex justify-end gap-2">
                      <VBtn color="secondary" variant="tonal" @click="resetForm">Cancel</VBtn>
                      <VBtn color="primary" type="submit" :loading="isSaving">
                        {{ currentCategory.id ? "Update" : "Save" }}
                      </VBtn>
                    </VCol>
                  </VRow>
                </VForm>
              </VCol>
            </VRow>

            <ConfirmDialog
              v-model:isDialogVisible="isConfirmDialogVisible"
              confirmation-msg="Are you sure you want to delete this category?"
              @confirm="doDelete"
            />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>

<style scoped>
.category-media-uploader {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.24);
  border-radius: 20px;
  background: rgba(var(--v-theme-primary), 0.04);
}

.category-media-uploader__dropzone {
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

.category-media-uploader__dropzone--active {
  border-color: rgba(var(--v-theme-primary), 0.6);
  background: rgba(var(--v-theme-primary), 0.08);
  transform: translateY(-1px);
}

.category-media-uploader__preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
  background: rgba(var(--v-theme-surface), 0.92);
}

.spin-icon {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .category-media-uploader__preview {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
