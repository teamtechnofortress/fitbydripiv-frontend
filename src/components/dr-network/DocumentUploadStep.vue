<script setup>
import { computed, reactive, ref } from 'vue'
import { completeDocumentUpload, uploadDocument } from '@/api/drNetworkApi'

const props = defineProps({
  orderUuid: {
    type: String,
    required: true,
  },
  workflow: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['refresh-journey', 'refresh-workflow'])

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

const satisfiedRequirementCount = computed(() => requirements.value.filter(isRequirementSatisfied).length)

const canContinue = computed(() => {
  if (latestUploadResponse.value?.can_continue) return true
  if (latestUploadResponse.value?.all_satisfied) return true
  if (!requirements.value.length) return false

  return requirements.value.every(isRequirementSatisfied)
})

const operatorTitle = requirement => {
  if (requirement.operator === OPERATOR_ALL) return 'Upload all required document types'
  if (requirement.operator === OPERATOR_EXACT) return `Upload exactly ${requiredCount(requirement)} document${requiredCount(requirement) === 1 ? '' : 's'}`

  return `Upload any ${requiredCount(requirement)} accepted document${requiredCount(requirement) === 1 ? '' : 's'}`
}

const requirementStatusText = requirement => {
  if (isRequirementSatisfied(requirement)) return 'Satisfied'

  const remaining = Math.max(requiredCount(requirement) - uploadedCount(requirement), 0)

  return `${remaining} more required`
}

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
    emit('refresh-journey')
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
  <section class="dn-upload-page">
    <header class="dn-flow-header">
      <div class="dn-brand">
        FitBy<span>Shot</span>
      </div>
      <div class="dn-count-pill">
        {{ satisfiedRequirementCount }}/{{ requirements.length || 1 }}
      </div>
    </header>

    <div class="dn-progress-track">
      <span :style="{ width: requirements.length ? `${(satisfiedRequirementCount / requirements.length) * 100}%` : '0%' }" />
    </div>

    <section class="dn-upload-hero">
      <p class="dn-kicker">
        Document verification
      </p>
      <h1>Upload your required documents</h1>
      <p>Complete each requirement below. When the backend confirms everything is satisfied, you can continue to the next step.</p>
    </section>

    <section class="dn-upload-panel">
      <div
        v-if="!requirements.length"
        class="dn-empty"
      >
        No document requirements were returned. Refreshing the workflow may show the next step.
      </div>

      <article
        v-for="(requirement, requirementIndex) in requirements"
        :key="requirementKey(requirement)"
        class="dn-requirement"
        :class="{ 'dn-requirement--done': isRequirementSatisfied(requirement) }"
      >
        <div class="dn-requirement-header">
          <div class="dn-requirement-index">
            {{ requirementIndex + 1 }}
          </div>
          <div class="dn-requirement-copy">
            <span>{{ prettyLabel(requirement.requirement_type || requirement.operator) }}</span>
            <h2>{{ requirement.rule_name || prettyLabel(requirement.rule_key) }}</h2>
            <p v-if="requirement.help_text">
              {{ requirement.help_text }}
            </p>
            <p v-else-if="requirement.satisfaction?.description">
              {{ requirement.satisfaction.description }}
            </p>
          </div>
          <div class="dn-rule-status">
            <strong>{{ requirementStatusText(requirement) }}</strong>
            <small>{{ operatorTitle(requirement) }}</small>
          </div>
        </div>

        <div
          v-if="requirement.error_message"
          class="dn-guidance"
        >
          {{ requirement.error_message }}
        </div>

        <div class="dn-upload-meta">
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
            :class="{ 'dn-document-option--uploaded': isOptionUploaded(requirement, option) }"
          >
            <div class="dn-option-header">
              <div>
                <span class="dn-option-category">{{ prettyLabel(option.category || 'Document') }}</span>
                <h3>{{ option.name || `Document Type ${option.id}` }}</h3>
              </div>
              <span
                v-if="isOptionUploaded(requirement, option)"
                class="dn-uploaded-badge"
              >
                Uploaded
              </span>
            </div>

            <p v-if="option.description">
              {{ option.description }}
            </p>
            <p
              v-if="option.metadata?.requires_back_side"
              class="dn-option-note"
            >
              Include the front and back side when uploading this document.
            </p>
            <p
              v-if="option.metadata?.requires_expiry_date"
              class="dn-option-note"
            >
              Make sure the expiration date is visible.
            </p>

            <label
              class="dn-file-control"
              :class="{ 'dn-file-control--disabled': optionUploadDisabled(requirement, option) }"
            >
              <VIcon
                icon="tabler-cloud-upload"
                size="28"
              />
              <span>{{ getRequirementState(requirement).files[option.id]?.name || 'Choose a file to upload' }}</span>
              <small>{{ acceptedDescription(requirement) }}</small>
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
              :disabled="optionUploadDisabled(requirement, option) || !getRequirementState(requirement).files[option.id]"
              @click="submitDocument(requirement, option)"
            >
              <span v-if="uploadingKey === `${requirementKey(requirement)}:${option.id}`">Uploading...</span>
              <span v-else-if="isOptionUploaded(requirement, option)">Uploaded</span>
              <span v-else>Upload document</span>
            </button>
          </article>
        </div>
      </article>

      <p
        v-if="message"
        class="dn-message dn-message--success"
      >
        {{ message }}
      </p>
      <p
        v-if="error"
        class="dn-message dn-message--error"
      >
        {{ error }}
      </p>

      <button
        type="button"
        class="dn-continue"
        :disabled="!canContinue || completing"
        @click="continueWorkflow"
      >
        {{ completing ? 'Continuing...' : 'Continue' }}
      </button>
    </section>
  </section>
</template>

<style scoped>
.dn-upload-page {
  width: min(900px, 100%);
  margin: 0 auto;
  color: var(--text, #171717);
}

.dn-flow-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-bottom: 0.75rem;
}

h2,
h3,
p {
  margin: 0;
}

.dn-brand {
  color: var(--text, #222);
  font-family: var(--font-display, Georgia, "Times New Roman", serif);
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1;
}

.dn-brand span {
  color: var(--green, #059669);
}

.dn-count-pill {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 30px;
  padding: 0 0.65rem;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  background: var(--green, #059669);
  border-radius: 999px;
}

.dn-progress-track {
  height: 6px;
  overflow: hidden;
  background: var(--border, #e5e7eb);
  border-radius: 999px;
}

.dn-progress-track span {
  display: block;
  height: 100%;
  background: var(--gradient, linear-gradient(135deg, #059669, #2563eb));
  border-radius: inherit;
  transition: width 0.25s ease;
}

.dn-upload-hero {
  width: min(760px, 100%);
  margin: 1.5rem auto 1rem;
  padding: 28px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: var(--radius-lg, 18px);
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(15, 23, 42, 0.06));
}

.dn-kicker {
  margin-bottom: 0.45rem;
  color: var(--green, #059669);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.dn-upload-hero h1 {
  color: var(--text, #171717);
  font-family: var(--font-display, Georgia, "Times New Roman", serif);
  font-size: 1.55rem;
  font-weight: 650;
  line-height: 1.28;
}

.dn-upload-hero p {
  max-width: 640px;
  margin: 0.5rem 0 0;
  color: var(--text-3, #5f6368);
  font-size: 0.92rem;
  font-weight: 500;
  line-height: 1.55;
}

.dn-upload-panel {
  display: grid;
  gap: 1rem;
}

.dn-empty {
  padding: 1rem;
  color: var(--text-3, #4b5563);
  background: var(--surface, #ffffff);
  border: 1.5px dashed var(--border, #d1d5db);
  border-radius: var(--radius, 14px);
}

.dn-requirement {
  padding: 1rem;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #d1d5db);
  border-radius: var(--radius-lg, 18px);
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(15, 23, 42, 0.06));
}

.dn-requirement--done {
  background: var(--green-light, #ecfdf5);
  border-color: var(--green, #059669);
}

.dn-requirement-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(180px, 0.32fr);
  gap: 0.85rem;
  align-items: start;
}

.dn-requirement-index {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 0.86rem;
  font-weight: 700;
  background: var(--green, #059669);
  border-radius: 999px;
}

.dn-requirement-copy span,
.dn-option-category {
  color: var(--green, #059669);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.dn-requirement-copy h2 {
  margin-top: 0.2rem;
  color: var(--text, #171717);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
}

.dn-requirement-copy p,
.dn-document-option p {
  margin-top: 0.45rem;
  color: var(--text-3, #4b5563);
  font-size: 0.86rem;
  line-height: 1.55;
}

.dn-rule-status {
  padding: 0.7rem 0.75rem;
  background: var(--surface-2, #f8fafc);
  border: 1.5px solid var(--border, #d1d5db);
  border-radius: var(--radius-sm, 10px);
}

.dn-rule-status strong {
  display: block;
  color: var(--text, #171717);
  font-size: 0.88rem;
  font-weight: 700;
}

.dn-rule-status small {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-3, #6b7280);
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.4;
}

.dn-guidance {
  padding: 0.7rem 0.8rem;
  margin-top: 0.85rem;
  color: #92400e;
  font-size: 0.86rem;
  font-weight: 600;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-sm, 10px);
}

.dn-upload-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.85rem;
}

.dn-upload-meta span {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  padding: 0.28rem 0.55rem;
  color: var(--text-2, #4b5563);
  font-size: 0.75rem;
  font-weight: 600;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 999px;
}

.dn-document-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.dn-document-option {
  display: grid;
  gap: 0.65rem;
  padding: 0.85rem;
  background: var(--surface-2, #f8fafc);
  border: 1.5px solid var(--border, #d1d5db);
  border-radius: var(--radius, 14px);
}

.dn-document-option--uploaded {
  background: var(--green-light, #ecfdf5);
  border-color: var(--green, #059669);
}

.dn-option-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.dn-option-header h3 {
  margin-top: 0.25rem;
  color: var(--text, #171717);
  font-size: 0.96rem;
  font-weight: 700;
}

.dn-uploaded-badge {
  align-self: start;
  padding: 0.24rem 0.5rem;
  color: var(--green-dark, #065f46);
  font-size: 0.72rem;
  font-weight: 700;
  background: #d1fae5;
  border-radius: 999px;
}

.dn-option-note {
  color: #0369a1;
  font-size: 0.82rem;
  font-weight: 600;
}

.dn-file-control {
  position: relative;
  display: grid;
  align-items: center;
  justify-items: center;
  gap: 0.25rem;
  min-height: 96px;
  padding: 0.85rem;
  color: var(--text-2, #374151);
  text-align: center;
  background: var(--surface, #ffffff);
  border: 1.5px dashed var(--border, #a3a3a3);
  border-radius: var(--radius-sm, 10px);
  cursor: pointer;
}

.dn-file-control span {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 0.88rem;
  font-weight: 700;
}

.dn-file-control small {
  color: var(--text-3, #6b7280);
  font-size: 0.75rem;
  font-weight: 500;
}

.dn-file-control input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.dn-file-control--disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.dn-upload-button,
.dn-continue {
  width: 100%;
  min-height: 42px;
  padding: 0.65rem 1rem;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 700;
  background: var(--gradient, linear-gradient(135deg, #059669, #2563eb));
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.18);
}

.dn-upload-button:disabled,
.dn-continue:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.dn-continue {
  justify-self: end;
  width: auto;
  min-width: 150px;
  margin-top: 0.25rem;
}

.dn-message {
  font-size: 0.88rem;
  font-weight: 600;
  text-align: center;
}

.dn-message--success {
  color: #065f46;
}

.dn-message--error {
  color: #b91c1c;
}

@media (max-width: 760px) {
  .dn-flow-header {
    min-height: 42px;
  }

  .dn-brand {
    font-size: 1.35rem;
  }

  .dn-count-pill {
    min-width: 34px;
    min-height: 28px;
    padding: 0 0.5rem;
    font-size: 0.78rem;
  }

  .dn-upload-hero {
    margin-top: 1rem;
    padding: 20px;
  }

  .dn-upload-hero h1 {
    font-size: 1.32rem;
  }

  .dn-upload-hero p {
    font-size: 0.88rem;
  }

  .dn-requirement-header {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .dn-rule-status {
    grid-column: 1 / -1;
  }

  .dn-document-options {
    grid-template-columns: 1fr;
  }

  .dn-continue {
    width: 100%;
  }
}
</style>
