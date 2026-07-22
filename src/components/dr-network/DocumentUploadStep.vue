<script setup>
import { computed, reactive, ref } from 'vue'
import { completeDocumentUpload, uploadDocument } from '@/api/drNetworkApi'
import DrNetworkStepShell from './DrNetworkStepShell.vue'

const props = defineProps({
  orderUuid: {
    type: String,
    required: true,
  },
  journey: {
    type: Object,
    default: null,
  },
  workflow: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['refreshJourney', 'refreshWorkflow'])

const OPERATOR_ANY = 'any'
const OPERATOR_ALL = 'all'
const OPERATOR_EXACT = 'exact'

const uploadStates = reactive({})
const uploadingKey = ref('')
const completing = ref(false)
const latestUploadResponse = ref(null)
const message = ref('')
const error = ref('')

const requirements = computed(() => {
  const direct = props.workflow?.step_data?.document_requirements || props.workflow?.document_requirements || []

  return Array.isArray(direct) ? direct : []
})

const prettyLabel = value => String(value || 'Required document')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase())

const requirementKey = requirement => String(requirement.rule_key || requirement.id || 'document')

const documentOptions = requirement => {
  const options = Array.isArray(requirement.document_type_options)
    ? requirement.document_type_options
    : []

  if (options.length) return options

  const ids = Array.isArray(requirement.document_ids) ? requirement.document_ids : []

  return ids.map(id => ({
    id,
    name: `Document Type ${id}`,
    description: '',
  }))
}

const requiredCount = requirement => {
  const options = documentOptions(requirement)
  const configuredCount = Number(requirement.satisfaction?.required_count)

  if (Number.isFinite(configuredCount) && configuredCount > 0) return configuredCount
  if (requirement.operator === OPERATOR_ALL) return options.length || 1

  return 1
}

const getRequirementState = requirement => {
  const key = requirementKey(requirement)

  if (!uploadStates[key]) {
    uploadStates[key] = {
      files: {},
      uploadedDocumentTypeIds: [],
      backendSatisfied: false,
      lastResponse: null,
    }
  }

  return uploadStates[key]
}

const uploadedCount = requirement => getRequirementState(requirement).uploadedDocumentTypeIds.length

const isOptionUploaded = (requirement, option) => getRequirementState(requirement)
  .uploadedDocumentTypeIds
  .map(String)
  .includes(String(option.id))

const isRequirementSatisfied = requirement => {
  const state = getRequirementState(requirement)
  if (state.backendSatisfied) return true

  const count = uploadedCount(requirement)
  const needed = requiredCount(requirement)

  if (requirement.operator === OPERATOR_EXACT) return count === needed
  if (requirement.operator === OPERATOR_ALL) return count >= needed

  return count >= needed
}

const canContinue = computed(() => {
  if (latestUploadResponse.value?.can_continue) return true
  if (latestUploadResponse.value?.all_satisfied) return true
  if (!requirements.value.length) return false

  return requirements.value.every(isRequirementSatisfied)
})

const operatorTitle = requirement => {
  const needed = requiredCount(requirement)

  if (requirement.operator === OPERATOR_ALL) return 'Upload every required document'
  if (requirement.operator === OPERATOR_EXACT) return `Choose exactly ${needed} document${needed === 1 ? '' : 's'}`

  return needed === 1
    ? 'Choose one accepted document'
    : `Choose any ${needed} accepted documents`
}

const requirementStatusText = requirement => {
  if (isRequirementSatisfied(requirement)) return 'Ready'

  const remaining = Math.max(requiredCount(requirement) - uploadedCount(requirement), 0)

  return remaining === 1 ? '1 needed' : `${remaining} needed`
}

const shellSubtitle = computed(() => (
  props.journey?.message
  || 'Upload the required document so your information can be verified.'
))

const acceptedMimeTypes = requirement => {
  const types = requirement.upload?.accepted_mime_types
  if (Array.isArray(types) && types.length) return types.join(',')

  const extensions = requirement.upload?.accepted_extensions
  if (Array.isArray(extensions) && extensions.length) {
    return extensions.map(ext => `.${String(ext).replace(/^\./, '')}`).join(',')
  }

  return 'image/*,.pdf'
}

const acceptedDescription = requirement => {
  const extensions = requirement.upload?.accepted_extensions
  const size = requirement.upload?.max_size_mb

  const extensionText = Array.isArray(extensions) && extensions.length
    ? extensions.map(ext => String(ext).replace(/^\./, '').toUpperCase()).join(', ')
    : 'JPG, PNG, WEBP, PDF'

  return `${extensionText}${size ? ` up to ${size} MB` : ''}`
}

const optionUploadDisabled = (requirement, option) => {
  if (uploadingKey.value) return true
  if (isOptionUploaded(requirement, option)) return true
  if (!isRequirementSatisfied(requirement)) return false

  return requirement.operator === OPERATOR_ANY || requirement.operator === OPERATOR_EXACT
}

const onFileChange = (requirement, option, event) => {
  const state = getRequirementState(requirement)

  state.files[option.id] = event.target.files?.[0] || null
  message.value = ''
  error.value = ''
}

const validateFile = (requirement, file) => {
  const maxSize = Number(requirement.upload?.max_size_bytes || 0)
  if (maxSize && file.size > maxSize) {
    return `File is too large. Maximum size is ${requirement.upload?.max_size_mb || Math.round(maxSize / 1024 / 1024)} MB.`
  }

  const acceptedTypes = requirement.upload?.accepted_mime_types
  if (Array.isArray(acceptedTypes) && acceptedTypes.length && file.type && !acceptedTypes.includes(file.type)) {
    return 'This file type is not accepted for this requirement.'
  }

  return ''
}

const markBackendSatisfaction = response => {
  requirements.value.forEach(requirement => {
    const state = getRequirementState(requirement)
    const key = requirementKey(requirement)
    const satisfied = Array.isArray(response?.satisfied) && response.satisfied.includes(key)
    const unsatisfied = Array.isArray(response?.unsatisfied) && response.unsatisfied.includes(key)

    if (response?.all_satisfied || satisfied) state.backendSatisfied = true
    if (unsatisfied) state.backendSatisfied = false
  })
}

const submitDocument = async (requirement, option) => {
  const key = requirementKey(requirement)
  const state = getRequirementState(requirement)
  const file = state.files[option.id]

  if (!file) {
    error.value = `Choose a ${option.name || 'document'} file before uploading.`

    return
  }

  const validationError = validateFile(requirement, file)
  if (validationError) {
    error.value = validationError

    return
  }

  uploadingKey.value = `${key}:${option.id}`
  message.value = ''
  error.value = ''

  try {
    const response = await uploadDocument(props.orderUuid, file, option.id)

    latestUploadResponse.value = response
    state.lastResponse = response

    if (!state.uploadedDocumentTypeIds.map(String).includes(String(option.id))) {
      state.uploadedDocumentTypeIds.push(option.id)
    }

    markBackendSatisfaction(response)

    message.value = canContinue.value
      ? 'Documents uploaded. Continue when you are ready.'
      : 'Document uploaded. Complete the remaining document requirements.'
  } catch (err) {
    error.value = err?.response?.data?.message || requirement.error_message || 'Unable to upload this document. Please try again.'
  } finally {
    uploadingKey.value = ''
  }
}

const continueWorkflow = async () => {
  if (!canContinue.value) {
    error.value = 'Complete all document requirements before continuing.'

    return
  }

  completing.value = true
  message.value = ''
  error.value = ''

  try {
    const response = await completeDocumentUpload(props.orderUuid)

    latestUploadResponse.value = response
    markBackendSatisfaction(response)

    message.value = response?.message || 'Document requirements completed.'
    emit('refreshJourney')
  } catch (err) {
    const response = err?.response?.data || null
    if (response) {
      latestUploadResponse.value = response
      markBackendSatisfaction(response)
    }

    error.value = response?.message || 'Required documents are not complete.'
  } finally {
    completing.value = false
  }
}
</script>

<template>
  <DrNetworkStepShell
    title="Upload your documents"
    :subtitle="shellSubtitle"
    badge="Document Verification"
  >
    <section class="dn-upload-page">
      <div
        v-if="!requirements.length"
        class="dn-panel dn-empty-state"
      >
        No document requirements were returned. Refreshing the workflow may show the next step.
      </div>

      <div
        v-else
        class="dn-panel dn-upload-card"
      >
        <article
          v-for="requirement in requirements"
          :key="requirementKey(requirement)"
          class="dn-requirement"
          :class="{ 'is-done': isRequirementSatisfied(requirement) }"
        >
          <div class="dn-requirement-header">
            <div class="dn-requirement-copy">
              <span class="dn-requirement-kicker">
                {{ prettyLabel(requirement.requirement_type || 'Requirement') }}
              </span>
              <h2>{{ requirement.rule_name || prettyLabel(requirement.rule_key) }}</h2>
              <p v-if="requirement.help_text">
                {{ requirement.help_text }}
              </p>
              <p v-else-if="requirement.satisfaction?.description">
                {{ requirement.satisfaction.description }}
              </p>
            </div>

            <div
              class="dn-rule-status"
              :class="{ 'is-done': isRequirementSatisfied(requirement) }"
            >
              <span class="dn-status-dot" />
              <strong>{{ requirementStatusText(requirement) }}</strong>
            </div>
          </div>

          <div
            v-if="requirement.error_message"
            class="dn-guidance"
          >
            {{ requirement.error_message }}
          </div>

          <div class="dn-upload-meta">
            <span>{{ operatorTitle(requirement) }}</span>
            <span>{{ acceptedDescription(requirement) }}</span>
            <span v-if="requirement.conditions?.max_age_days">
              Max age {{ requirement.conditions.max_age_days }} days
            </span>
          </div>

          <div class="dn-document-options">
            <article
              v-for="option in documentOptions(requirement)"
              :key="option.id"
              class="dn-document-option"
              :class="{ 'is-uploaded': isOptionUploaded(requirement, option) }"
            >
              <div class="dn-option-header">
                <div class="dn-option-title">
                  <h3>{{ option.name || `Document Type ${option.id}` }}</h3>
                  <p
                    v-if="option.description"
                    class="dn-option-desc"
                  >
                    {{ option.description }}
                  </p>
                </div>
                <span
                  v-if="isOptionUploaded(requirement, option)"
                  class="dn-uploaded-badge"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  Uploaded
                </span>
              </div>

              <div
                v-if="option.metadata?.requires_back_side || option.metadata?.requires_expiry_date"
                class="dn-option-notes"
              >
                <span v-if="option.metadata?.requires_back_side">Front and back</span>
                <span v-if="option.metadata?.requires_expiry_date">Expiration visible</span>
              </div>

              <label
                class="dn-file-control"
                :class="{ 'is-disabled': optionUploadDisabled(requirement, option), 'is-filled': !!getRequirementState(requirement).files[option.id] }"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                >
                  <path
                    d="M12 16V4m0 0L7 9m5-5l5 5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>{{ getRequirementState(requirement).files[option.id]?.name || 'Choose a file to upload' }}</span>
                <input
                  type="file"
                  :accept="acceptedMimeTypes(requirement)"
                  :disabled="optionUploadDisabled(requirement, option)"
                  @change="onFileChange(requirement, option, $event)"
                >
              </label>

              <button
                type="button"
                class="dn-upload-button"
                :class="{ 'is-done': isOptionUploaded(requirement, option) }"
                :disabled="optionUploadDisabled(requirement, option) || !getRequirementState(requirement).files[option.id]"
                @click="submitDocument(requirement, option)"
              >
                <span
                  v-if="uploadingKey === `${requirementKey(requirement)}:${option.id}`"
                  class="dn-btn-spinner"
                />
                {{
                  uploadingKey === `${requirementKey(requirement)}:${option.id}`
                    ? 'Uploading\u2026'
                    : isOptionUploaded(requirement, option)
                      ? 'Uploaded'
                      : 'Upload'
                }}
              </button>
            </article>
          </div>
        </article>

        <div
          v-if="message || error"
          class="status-stack"
        >
          <p
            v-if="message"
            class="status-banner status-banner--success"
          >
            {{ message }}
          </p>
          <p
            v-if="error"
            class="status-banner"
          >
            {{ error }}
          </p>
        </div>

        <div class="dn-continue-row">
          <button
            type="button"
            class="primary-btn"
            :disabled="!canContinue || completing"
            @click="continueWorkflow"
          >
            {{ completing ? 'Continuing\u2026' : 'Continue' }}
          </button>
        </div>
      </div>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.dn-upload-page {
  --ink: #1d1d1f;
  --ink-2: #6e6e73;
  --ink-3: #a1a1a6;
  --hairline: #e5e5ea;
  --surface: #ffffff;
  --surface-2: #fafafe;
  --accent: #0071e3;
  --success: #1a936f;
  --success-bg: rgba(26, 147, 111, 0.1);
  --warning: #b7791f;
  --warning-bg: #fff8e8;
  --warning-border: #f5deb3;
  --danger: #d70015;
  --danger-bg: #fff1f0;
  --danger-border: #ffd6d3;
  --radius-lg: 22px;
  --radius-md: 14px;
  --radius-sm: 10px;
  --shadow: 0 18px 44px rgba(15, 23, 42, 0.055), 0 2px 7px rgba(15, 23, 42, 0.035);
  --ease: cubic-bezier(0.28, 0.11, 0.32, 1);
  width: min(680px, 100%);
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  color: var(--ink);
  display: grid;
  gap: 0.8rem;
}

h1, h2, h3, p {
  margin: 0;
}

/* ---------- shared panel ---------- */

.dn-panel {
  background: var(--surface);
  border: 1px solid rgba(229, 229, 234, 0.85);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 1.5rem;
  animation: panel-in 0.32s var(--ease) both;
}

@keyframes panel-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dn-empty-state {
  color: var(--ink-2);
  font-size: 0.92rem;
  text-align: center;
}

/* ---------- requirement list ---------- */

.dn-upload-card {
  display: grid;
  gap: 0;
}

.dn-requirement {
  min-width: 0;
}

.dn-requirement + .dn-requirement {
  padding-top: 1.25rem;
  margin-top: 1.25rem;
  border-top: 1px solid var(--hairline);
}

.dn-requirement-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.dn-requirement-kicker {
  display: block;
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.075em;
  text-transform: uppercase;
  color: var(--accent);
}

.dn-requirement-copy h2 {
  margin-top: 0.35rem;
  font-size: 1.08rem;
  font-weight: 650;
  line-height: 1.25;
  color: var(--ink);
}

.dn-requirement-copy p {
  margin-top: 0.4rem;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--ink-2);
}

.dn-rule-status {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 30px;
  padding: 0.35rem 0.62rem;
  background: rgba(0, 113, 227, 0.08);
  border-radius: 999px;
}

.dn-rule-status.is-done {
  background: var(--success-bg);
}

.dn-status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  background: var(--accent);
  border-radius: 999px;
}

.dn-rule-status.is-done .dn-status-dot {
  background: var(--success);
}

.dn-rule-status strong {
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1;
  color: var(--accent);
}

.dn-rule-status.is-done strong {
  color: var(--success);
}

.dn-guidance {
  padding: 0.62rem 0.75rem;
  margin-top: 0.85rem;
  font-size: 0.82rem;
  font-weight: 560;
  color: var(--warning);
  background: var(--warning-bg);
  border: 1px solid var(--warning-border);
  border-radius: var(--radius-sm);
}

.dn-upload-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 1rem;
}

.dn-upload-meta span {
  display: inline-flex;
  align-items: center;
  padding: 0.32rem 0.62rem;
  font-size: 0.74rem;
  font-weight: 560;
  color: #596789;
  background: var(--surface-2);
  border: 1px solid rgba(229, 229, 234, 0.75);
  border-radius: 999px;
}

/* ---------- document options ---------- */

.dn-document-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.7rem;
  margin-top: 1.1rem;
}

.dn-document-option {
  display: grid;
  gap: 0.7rem;
  padding: 1rem;
  background: var(--surface-2);
  border: 1px solid rgba(229, 229, 234, 0.75);
  border-radius: var(--radius-md);
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.dn-document-option:hover {
  transform: translateY(-1px);
  border-color: rgba(0, 113, 227, 0.22);
}

.dn-document-option.is-uploaded {
  background: var(--success-bg);
  border-color: rgba(26, 147, 111, 0.35);
}

.dn-option-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.dn-option-title h3 {
  font-size: 0.98rem;
  font-weight: 650;
  line-height: 1.25;
  color: var(--ink);
}

.dn-uploaded-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex: 0 0 auto;
  padding: 0.25rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--success);
  background: rgba(26, 147, 111, 0.14);
  border-radius: 999px;
}

.dn-option-desc {
  margin-top: 0.25rem;
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--ink-2);
}

.dn-option-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.dn-option-notes span {
  padding: 0.28rem 0.55rem;
  color: #0066cc;
  font-size: 0.74rem;
  font-weight: 560;
  background: rgba(0, 113, 227, 0.08);
  border-radius: 999px;
}

.dn-file-control {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  min-height: 86px;
  padding: 0.9rem;
  text-align: center;
  color: var(--ink-2);
  background: var(--surface);
  border: 1.5px dashed var(--hairline);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease;
}

.dn-file-control:hover {
  border-color: var(--accent);
}

.dn-file-control.is-filled {
  color: var(--ink);
  border-style: solid;
  border-color: var(--accent);
  background: rgba(0, 113, 227, 0.05);
}

.dn-file-control span {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 0.84rem;
  font-weight: 560;
  line-height: 1.35;
}

.dn-file-control input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.dn-file-control.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.dn-upload-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 40px;
  padding: 0 1rem;
  font: inherit;
  font-weight: 600;
  font-size: 0.86rem;
  color: #fff;
  background: var(--accent);
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(0, 113, 227, 0.16);
  transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
}

.dn-upload-button:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #0077ed;
  box-shadow: 0 10px 22px rgba(0, 113, 227, 0.2);
}

.dn-upload-button:disabled {
  color: #7d89aa;
  background: #edf2fb;
  border-color: rgba(229, 229, 234, 0.9);
  box-shadow: none;
  cursor: not-allowed;
}

.dn-upload-button.is-done {
  color: #fff;
  background: var(--success);
  border-color: transparent;
  box-shadow: 0 8px 18px rgba(26, 147, 111, 0.16);
  opacity: 1;
}

.dn-btn-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---------- status + continue ---------- */

.status-stack {
  display: grid;
  gap: 0.6rem;
  margin-top: 0.1rem;
}

.status-banner {
  margin: 0;
  padding: 0.75rem 0.9rem;
  font-size: 0.87rem;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  color: var(--danger);
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
}

.status-banner--success {
  color: var(--success);
  background: var(--success-bg);
  border-color: rgba(26, 147, 111, 0.25);
}

.dn-continue-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.15rem;
  padding-top: 0.95rem;
  border-top: 1px solid var(--hairline);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 170px;
  min-height: 48px;
  padding: 0 1.3rem;
  font: inherit;
  font-weight: 650;
  font-size: 0.96rem;
  color: #fff;
  background: var(--accent);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #0077ed;
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .dn-panel {
    animation: none;
  }
}

@media (max-width: 760px) {
  .dn-upload-page {
    width: min(620px, 100%);
  }

  .dn-panel {
    padding: 1.25rem 1.15rem;
    border-radius: var(--radius-md);
  }

  .dn-requirement-header {
    flex-direction: column;
    gap: 0.8rem;
  }

  .dn-rule-status {
    align-self: flex-start;
  }

  .dn-document-options {
    grid-template-columns: 1fr;
  }

  .dn-continue-row {
    justify-content: stretch;
  }

  .primary-btn {
    width: 100%;
  }
}
</style>
