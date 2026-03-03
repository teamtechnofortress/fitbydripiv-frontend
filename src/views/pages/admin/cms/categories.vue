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
