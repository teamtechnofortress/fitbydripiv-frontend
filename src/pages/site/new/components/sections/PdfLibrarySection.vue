<script setup>
import { computed } from 'vue'
import { getPublicPdfDownloadUrl } from '@/network/const'

const props = defineProps({
  section: {
    type: Object,
    required: true,
  },
})

const content = computed(() => props.section.content || {})
const settings = computed(() => props.section.settings || content.value.settings || {})
const heading = computed(() => content.value.headline || props.section.headline || props.section.title || 'Instruction PDFs')
const description = computed(() => content.value.description || props.section.description || '')
const uploadHelp = computed(() => content.value.upload_help || props.section.upload_help || '')

const viewerEnabled = computed(() => (
  props.section.viewer_enabled ?? settings.value.viewer_enabled ?? true
))

const viewerEmbedMode = computed(() => (
  props.section.viewer_embed_mode || settings.value.viewer_embed_mode || 'iframe'
))

const PDF_DOWNLOAD_ROUTE_SUFFIX = '/public/media/pdf-download'
const ADMIN_DOCUMENTS_SEGMENT = 'admin/documents/'

const decodeValue = value => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const extractAdminDocumentPath = value => {
  if (typeof value !== 'string')
    return ''

  let candidate = value.trim()
  if (!candidate)
    return ''

  try {
    const parsed = new URL(candidate, window.location.origin)
    if (parsed.pathname.endsWith(PDF_DOWNLOAD_ROUTE_SUFFIX)) {
      const pathFromQuery = parsed.searchParams.get('path')
      if (pathFromQuery)
        candidate = pathFromQuery
    } else {
      candidate = parsed.pathname || candidate
    }
  } catch {
    // Keep raw candidate for non-URL input values.
  }

  candidate = decodeValue(candidate).split('?')[0].split('#')[0]

  const markerIndex = candidate.toLowerCase().indexOf(ADMIN_DOCUMENTS_SEGMENT)
  if (markerIndex < 0)
    return ''

  const normalizedPath = candidate
    .slice(markerIndex)
    .replace(/^\/+/, '')
    .trim()

  if (!/\.pdf$/i.test(normalizedPath))
    return ''

  return normalizedPath
}

const resolveDownloadName = raw => {
  const candidates = [
    raw.download_name,
    raw.name,
    raw.file_name,
    raw.filename,
    raw.fileName,
    raw.label,
    raw.title,
    raw.item?.name,
    raw.item?.title,
    raw.item?.label,
  ]

  const resolved = candidates.find(candidate => typeof candidate === 'string' && candidate.trim())

  return resolved ? resolved.trim() : ''
}

const resolveDownloadUrl = raw => {
  const downloadName = resolveDownloadName(raw)

  const candidates = [
    raw.download_url,
    raw.item?.download_url,
    raw.pdf_url,
    raw.view_url,
  ]

  for (const candidate of candidates) {
    const path = extractAdminDocumentPath(candidate)
    if (path)
      return getPublicPdfDownloadUrl(path, downloadName)
  }

  const fallback = candidates.find(candidate => typeof candidate === 'string' && candidate.trim())

  return fallback || null
}

const documentItem = computed(() => {
  const listDocument = Array.isArray(props.section.documents) ? props.section.documents[0] : null
  const contentListDocument = Array.isArray(content.value.documents) ? content.value.documents[0] : null
  const raw = props.section.document || content.value.document || listDocument || contentListDocument
  if (!raw || typeof raw !== 'object')
    return null

  const viewUrl = raw.view_url || raw.pdf_url || null
  const downloadUrl = resolveDownloadUrl(raw)

  return {
    ...raw,
    label: raw.label || raw.title || 'Instruction PDF',
    view_url: viewUrl,
    download_url: downloadUrl,
    download_label: raw.download_label || raw.item?.label || 'Download PDF',
    can_view: raw.can_view ?? !!viewUrl,
    can_download: raw.can_download ?? !!downloadUrl,
  }
})
</script>

<template>
  <section class="py-12 px-4 border-t border-gray-200 bg-white">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-8">
        <h2 class="section-title">
          {{ heading }}
        </h2>
        <p
          v-if="description"
          class="text-sm text-gray-600 mt-2"
        >
          {{ description }}
        </p>
        <p
          v-if="uploadHelp"
          class="text-xs text-gray-500 mt-2"
        >
          {{ uploadHelp }}
        </p>
      </div>

      <div
        v-if="!documentItem"
        class="card p-6 text-center text-sm text-gray-600"
      >
        Instruction document is not available yet.
      </div>

      <template v-else>
        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-200 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <h3 class="text-base font-semibold text-gray-900 truncate">
                {{ documentItem.label }}
              </h3>
              <p class="text-xs text-gray-600 mt-0.5">
                PDF Viewer
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">
              <a
                v-if="documentItem.can_view && documentItem.view_url"
                :href="documentItem.view_url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-secondary"
              >
                View PDF
              </a>
              <a
                v-if="documentItem.can_download"
                :href="documentItem.download_url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-primary"
              >
                {{ documentItem.download_label }}
              </a>
            </div>
          </div>

          <div
            v-if="viewerEnabled && documentItem.view_url"
            class="bg-gray-50"
          >
            <iframe
              v-if="viewerEmbedMode === 'iframe'"
              :src="documentItem.view_url"
              class="w-full h-[720px] bg-white"
              title="PDF preview"
            />

            <object
              v-else
              :data="documentItem.view_url"
              type="application/pdf"
              class="w-full h-[720px] bg-white"
            >
              <div class="p-6 text-sm text-slate-600">
                Preview is unavailable in this browser.
                <a
                  :href="documentItem.download_url || documentItem.view_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-700 font-semibold"
                  style="margin-inline-start: 0.25rem;"
                >
                  Open PDF in a new tab
                </a>
              </div>
            </object>
          </div>

          <div
            v-else
            class="h-[420px] flex items-center justify-center px-6 text-center bg-gray-50"
          >
            <div>
              <p class="text-sm font-semibold text-gray-800">
                Preview not available
              </p>
              <p class="text-xs text-gray-600 mt-1">
                {{ viewerEnabled ? 'This document does not have a view URL yet.' : 'Viewer is disabled in settings.' }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
