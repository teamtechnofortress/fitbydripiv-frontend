<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  ADMIN_CONTENT_SECTIONS_URL,
  getAdminContentPageSectionsUrl,
  getAdminContentPageUrl,
  getAdminContentSectionUrl,
  getAdminContentSectionsReorderUrl,
} from '@/network/const'
import { getApiToken } from '@/store/authData'
import { normalizePage, sortByOrderOrIndex } from '@/utils/sitePageContent'
import { buildSectionPayload } from './sectionForms'
import AdminPagePreview from './components/AdminPagePreview.vue'
import PageSectionCard from './components/PageSectionCard.vue'
import PageSectionEditorDialog from './components/PageSectionEditorDialog.vue'

const props = defineProps({
  pageId: {
    type: String,
    required: true,
  },
})

const router = useRouter()
const toast = useToast()

const loading = ref(true)
const savingOrder = ref(false)
const savingSection = ref(false)
const deletingSection = ref(false)
const editorOpen = ref(false)
const activeSectionId = ref('')
const orderDirty = ref(false)
const page = ref(null)
const sections = ref([])
const editingSection = ref(null)
const pendingDeleteSection = ref(null)
const deleteDialog = ref(false)

const getAuthHeaders = () => {
  const token = getApiToken()
  if (!token) throw new Error('Authentication token missing. Please login again.')

  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
}

const normalizedPage = computed(() => normalizePage({
  ...(page.value || {}),
  sections: sections.value,
}))

const pageSummary = computed(() => ({
  title: page.value?.title || 'Untitled Page',
  slug: page.value?.slug || 'page',
  metaTitle: page.value?.meta_title || 'No meta title yet.',
  metaDescription: page.value?.meta_description || 'No meta description yet.',
}))

const nextSortOrder = computed(() => sections.value.length + 1)

const syncSectionOrder = () => {
  sections.value = sections.value.map((section, index) => ({
    ...section,
    sort_order: index + 1,
  }))
}

const loadPage = async () => {
  loading.value = true
  try {
    const response = await axios.get(getAdminContentPageUrl(props.pageId), {
      headers: getAuthHeaders(),
    })

    const pageData = response?.data?.data || null
    let pageSections = sortByOrderOrIndex(pageData?.sections || [])

    if (!pageSections.length) {
      const sectionsResponse = await axios.get(getAdminContentPageSectionsUrl(props.pageId), {
        headers: getAuthHeaders(),
      })

      pageSections = sortByOrderOrIndex(sectionsResponse?.data?.data || sectionsResponse?.data?.sections || [])
    }

    page.value = {
      ...pageData,
      sections: pageSections,
    }
    sections.value = normalizePage(page.value)?.sections || []
  } catch (error) {
    toast.error(error?.response?.data?.message || error?.message || 'Unable to load page builder.')
  } finally {
    loading.value = false
  }
}

const openCreateSection = () => {
  editingSection.value = null
  editorOpen.value = true
}

const openEditSection = section => {
  editingSection.value = section
  activeSectionId.value = section.id
  editorOpen.value = true
}

const previewSection = async section => {
  activeSectionId.value = section.id
  await nextTick()
  document.getElementById(`preview-section-${section.id}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

const moveSection = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= sections.value.length)
    return

  const updated = [...sections.value]
  const [moved] = updated.splice(index, 1)
  updated.splice(targetIndex, 0, moved)
  sections.value = updated
  syncSectionOrder()
  orderDirty.value = true
}

const saveOrder = async () => {
  savingOrder.value = true
  try {
    await axios.post(
      getAdminContentSectionsReorderUrl(props.pageId),
      {
        sections: sections.value.map((section, index) => ({
          id: section.id,
          sort_order: index + 1,
        })),
      },
      {
        headers: getAuthHeaders(),
      },
    )

    orderDirty.value = false
    toast.success('Section order updated successfully.')
    await loadPage()
  } catch (error) {
    toast.error(error?.response?.data?.message || error?.message || 'Unable to save section order.')
  } finally {
    savingOrder.value = false
  }
}

const saveSection = async sectionData => {
  savingSection.value = true
  try {
    const payload = buildSectionPayload({
      ...sectionData,
      page_id: props.pageId,
    })

    if (sectionData?.id) {
      await axios.post(ADMIN_CONTENT_SECTIONS_URL, payload, {
        headers: getAuthHeaders(),
      })
    } else {
      await axios.post(getAdminContentPageSectionsUrl(props.pageId), payload, {
        headers: getAuthHeaders(),
      })
    }

    editorOpen.value = false
    toast.success(`Section ${sectionData?.id ? 'updated' : 'created'} successfully.`)
    await loadPage()
  } catch (error) {
    toast.error(error?.response?.data?.message || error?.message || 'Unable to save section.')
  } finally {
    savingSection.value = false
  }
}

const confirmDeleteSection = section => {
  pendingDeleteSection.value = section
  deleteDialog.value = true
}

const closeDeleteDialog = () => {
  pendingDeleteSection.value = null
  deleteDialog.value = false
}

const deleteSection = async () => {
  if (!pendingDeleteSection.value?.id)
    return

  deletingSection.value = true
  try {
    await axios.delete(getAdminContentSectionUrl(pendingDeleteSection.value.id), {
      headers: getAuthHeaders(),
    })

    toast.success('Section deleted successfully.')
    closeDeleteDialog()
    await loadPage()
  } catch (error) {
    toast.error(error?.response?.data?.message || error?.message || 'Unable to delete section.')
  } finally {
    deletingSection.value = false
  }
}

const goBack = () => {
  router.push('/admin/site-settings')
}

onMounted(() => {
  loadPage()
})
</script>

<template>
  <div class="page-builder">
    <header class="page-builder__header">
      <div class="page-builder__header-copy">
        <div class="page-builder__eyebrow">
          Site Dynamic Pages
        </div>
        <h1 class="page-builder__title">
          {{ pageSummary.title }}
        </h1>
        <p class="page-builder__subtitle">
          /{{ pageSummary.slug }}
        </p>
      </div>

      <div class="page-builder__header-actions">
        <VBtn
          class="page-builder__header-btn page-builder__header-btn--ghost"
          variant="text"
          prepend-icon="tabler-arrow-left"
          @click="goBack"
        >
          Back
        </VBtn>
        <VBtn
          class="page-builder__header-btn"
          color="primary"
          variant="tonal"
          prepend-icon="tabler-plus"
          @click="openCreateSection"
        >
          Add Component
        </VBtn>
        <VBtn
          class="page-builder__header-btn page-builder__header-btn--solid"
          color="primary"
          :disabled="!orderDirty"
          :loading="savingOrder"
          prepend-icon="tabler-device-floppy"
          @click="saveOrder"
        >
          Save Order
        </VBtn>
      </div>
    </header>

    <div
      v-if="loading"
      class="page-builder__loading"
    >
      <VProgressCircular indeterminate color="primary" />
      <span>Loading page builder...</span>
    </div>

    <div
      v-else-if="normalizedPage"
      class="page-builder__body"
    >
      <section class="page-builder__meta-wrap">
        <VCard class="page-builder__meta-card" elevation="0">
          <VCardText class="pa-5">
            <div class="page-builder__meta-title mb-3">
              Page Details
            </div>
            <div class="page-builder__meta-grid">
              <div class="page-builder__meta-row">
                <span>Meta Title</span>
                <strong>{{ pageSummary.metaTitle }}</strong>
              </div>
              <div class="page-builder__meta-row">
                <span>Meta Description</span>
                <strong>{{ pageSummary.metaDescription }}</strong>
              </div>
            </div>
          </VCardText>
        </VCard>
      </section>

      <section class="page-builder__workspace">
        <div class="page-builder__workspace-header">
          <div class="page-builder__preview-title">
            Page Sections
          </div>
          <div class="page-builder__preview-subtitle">
            Each section card now sits beside its live preview for easier editing and ordering.
          </div>
        </div>

        <div class="page-builder__section-rows">
          <div
            v-for="(section, index) in sections"
            :key="section.id || section.section_key"
            class="page-builder__section-row"
          >
            <div class="page-builder__section-card-wrap">
              <PageSectionCard
                :section="section"
                :index="index"
                :total="sections.length"
                :active="activeSectionId === section.id"
                @preview="previewSection(section)"
                @edit="openEditSection(section)"
                @move-up="moveSection(index, -1)"
                @move-down="moveSection(index, 1)"
                @delete="confirmDeleteSection(section)"
              />
            </div>

            <div class="page-builder__section-preview-wrap">
              <div class="page-builder__section-preview-header">
                <div class="page-builder__section-preview-label">
                  Live Section Preview
                </div>
                <div class="page-builder__section-preview-key">
                  {{ section.section_key }}
                </div>
              </div>

              <div class="page-builder__section-preview">
                <AdminPagePreview
                  :page="{ ...normalizedPage, sections: [section] }"
                  :active-section-id="activeSectionId"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <PageSectionEditorDialog
      v-model="editorOpen"
      :section="editingSection"
      :page-id="pageId"
      :next-sort-order="nextSortOrder"
      :saving="savingSection"
      @save="saveSection"
    />

    <VDialog
      v-model="deleteDialog"
      max-width="440"
    >
      <VCard>
        <VCardTitle class="text-h6 py-4 px-5">
          Delete Section?
        </VCardTitle>
        <VCardText class="px-5 pb-2">
          This will remove the section from the page builder and delete its stored content.
        </VCardText>
        <VCardActions class="px-5 pb-4">
          <VSpacer />
          <VBtn variant="text" @click="closeDeleteDialog">
            Cancel
          </VBtn>
          <VBtn color="error" :loading="deletingSection" @click="deleteSection">
            Delete
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.page-builder {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 20%),
    linear-gradient(180deg, #eaf1ff 0%, #f4f7ff 44%, #edf4ff 100%);
  color: #0f172a;
}

.page-builder__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.4rem 1.75rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.16), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 249, 255, 0.98));
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.05);
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(14px);
}

.page-builder__header-copy {
  display: flex;
  flex-direction: column;
}

.page-builder__eyebrow {
  color: #1d4ed8;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 0.4rem;
}

.page-builder__title {
  margin: 0;
  color: #0f172a;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-size: clamp(1.8rem, 2.4vw, 2.5rem);
}

.page-builder__subtitle {
  margin: 0.2rem 0 0;
  color: #1e40af;
  font-size: 1.02rem;
  font-weight: 600;
}

.page-builder__header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.page-builder__header-btn {
  border-radius: 14px;
  min-height: 42px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.page-builder__header-btn--ghost {
  color: #1d4ed8;
}

.page-builder__header-btn--solid {
  box-shadow: 0 14px 28px rgba(99, 102, 241, 0.22);
}

.page-builder__loading {
  min-height: calc(100vh - 96px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #475569;
}

.page-builder__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.page-builder__meta-wrap {
  display: block;
}

.page-builder__meta-card {
  border: 1px solid rgba(99, 102, 241, 0.14);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(99, 102, 241, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 249, 255, 0.98));
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.05);
}

.page-builder__meta-title {
  color: #0f172a;
  font-size: 1rem;
  font-weight: 800;
}

.page-builder__meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.page-builder__meta-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.page-builder__meta-row span {
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.page-builder__meta-row strong {
  color: #0f172a;
  font-size: 0.95rem;
  line-height: 1.5;
}

.page-builder__sections {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.page-builder__workspace {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-builder__workspace-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.96));
  backdrop-filter: blur(14px);
}

.page-builder__preview-title {
  color: #0f172a;
  font-size: 1rem;
  font-weight: 800;
}

.page-builder__preview-subtitle {
  color: #475569;
  font-size: 0.92rem;
  margin-top: 0.2rem;
}

.page-builder__section-rows {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.page-builder__section-row {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 1rem;
  align-items: stretch;
}

.page-builder__section-card-wrap {
  display: flex;
  padding-bottom: 1rem;
}

.page-builder__section-card-wrap :deep(.section-card) {
  inline-size: 100%;
}

.page-builder__section-preview-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.page-builder__section-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1.15rem;
  border-inline: 1px solid rgba(148, 163, 184, 0.18);
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.98));
}

.page-builder__section-preview-label {
  color: #0f172a;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-builder__section-preview-key {
  color: #4f46e5;
  font-size: 0.82rem;
  font-weight: 700;
}

.page-builder__section-preview {
  overflow: hidden;
  border-inline: 1px solid rgba(148, 163, 184, 0.18);
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background: #fff;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.04);
}

.page-builder__section-row:first-child .page-builder__section-preview-header {
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
}

.page-builder__section-row:not(:first-child) .page-builder__section-preview-header {
  border-top: 0;
}

.page-builder__section-row:last-child .page-builder__section-preview {
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
}

@media (max-width: 1199px) {
  .page-builder__section-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .page-builder__meta-grid {
    grid-template-columns: 1fr;
  }

  .page-builder__section-preview-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 767px) {
  .page-builder__header {
    flex-direction: column;
  }

  .page-builder__header-actions {
    width: 100%;
  }
}
</style>
