<template>
  <div class="patient-search-stage">
    <div class="stage-card">
      <button type="button" class="ghost-btn back-btn" @click="$emit('back')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25">
          <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Back
      </button>

      <p class="stage-eyebrow">Returning patient</p>
      <h2 class="stage-title">Find your record</h2>
      <p class="stage-desc">
        Enter the email address on your account and we'll pull up your saved information.
      </p>

      <div v-if="validationError" class="status-banner">
        {{ validationError }}
      </div>

      <div class="search-form">
        <label class="field-group">
          <span>Email address <b>*</b></span>
          <div class="input-row">
            <input
              :value="searchEmail"
              type="email"
              class="field-input"
              :class="{ 'is-busy': isSearching }"
              placeholder="you@example.com"
              :disabled="isSearching"
              autofocus
              @input="onInput"
              @keydown.enter.prevent="$emit('search')"
            >
            <button
              type="button"
              class="primary-btn"
              :disabled="!searchEmail.trim() || isSearching"
              @click="$emit('search')"
            >
              <span v-if="isSearching" class="spinner" />
              {{ isSearching ? 'Searching' : 'Search' }}
            </button>
          </div>
        </label>

        <div class="status-region" aria-live="polite">
          <Transition name="status-fade" mode="out-in">
            <div v-if="isSearching" key="loading" class="loading-card" role="status">
              <span class="loading-ring" />
              <div class="loading-copy">
                <p class="loading-title">{{ lookupStatus.message || 'Searching for your record\u2026' }}</p>
                <p class="loading-text">This usually only takes a moment.</p>
              </div>
            </div>

            <div
              v-else-if="lookupStatus.message"
              key="message"
              class="lookup-note"
              :class="lookupStatus.status"
            >
              {{ lookupStatus.message }}
            </div>
          </Transition>
        </div>

        <div v-if="lookupStatus.status === 'not-found'" class="not-found-card">
          <p>We couldn't find a record with this email.</p>
          <button type="button" class="primary-btn" @click="$emit('startNew')">
            Register as a new patient
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  searchEmail: {
    type: String,
    default: '',
  },
  lookupStatus: {
    type: Object,
    default: () => ({ status: 'idle', message: '' }),
  },
  validationError: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['back', 'search', 'startNew', 'update:searchEmail'])
const isSearching = computed(() => props.lookupStatus?.status === 'loading')

const onInput = event => {
  emit('update:searchEmail', event.target.value)
}
</script>

<style scoped>
.patient-search-stage {
  width: min(620px, 100%);
  margin: 0 auto;
}

.stage-card {
  position: relative;
  background: var(--surface, #fff);
  border: 1px solid rgba(229, 229, 234, 0.8);
  border-radius: 20px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.055), 0 2px 7px rgba(15, 23, 42, 0.035);
  padding: 1.45rem 1.5rem;
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.8rem 0.4rem 0.55rem;
  font: inherit;
  font-weight: 600;
  font-size: 0.86rem;
  color: var(--ink, #1d1d1f);
  background: var(--surface-2, #f5f5f7);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.ghost-btn:hover {
  background: var(--hairline, #e5e5ea);
}

.back-btn {
  margin-bottom: 0.85rem;
}

.stage-eyebrow {
  margin: 0 0 0.4rem;
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.075em;
  text-transform: uppercase;
  color: var(--accent, #0071e3);
}

.stage-title {
  margin: 0;
  font-size: 1.28rem;
  font-weight: 640;
  letter-spacing: -0.02em;
  color: var(--ink, #1d1d1f);
}

.stage-desc {
  margin: 0.45rem 0 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #66739a;
}

.status-banner {
  margin-top: 0.85rem;
  padding: 0.75rem 0.9rem;
  font-size: 0.87rem;
  font-weight: 600;
  color: var(--danger, #d70015);
  background: var(--danger-bg, #fff1f0);
  border: 1px solid var(--danger-border, #ffd6d3);
  border-radius: var(--radius-sm, 10px);
}

.search-form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-group span {
  font-size: 0.83rem;
  font-weight: 560;
  color: var(--ink-2, #6e6e73);
}

.field-group b {
  color: var(--danger, #d70015);
  font-weight: 600;
}

.input-row {
  display: flex;
  gap: 0.6rem;
}

.field-input {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 0 0.9rem;
  font: inherit;
  font-size: 0.98rem;
  color: var(--ink, #1d1d1f);
  background: #fafafe;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 10px);
  outline: none;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.field-input::placeholder {
  color: var(--ink-3, #a1a1a6);
}

.field-input:focus {
  background: var(--surface, #fff);
  border-color: var(--accent, #0071e3);
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.14);
}

.field-input:disabled {
  cursor: wait;
  color: var(--ink-3, #a1a1a6);
}

.field-input.is-busy {
  border-color: var(--accent, #0071e3);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 1.3rem;
  font: inherit;
  font-weight: 600;
  font-size: 0.95rem;
  color: #fff;
  background: var(--accent, #0071e3);
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

.spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-region {
  min-height: 0;
}

.loading-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  background: var(--surface-2, #f5f5f7);
  border-radius: var(--radius-md, 14px);
}

.loading-ring {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  border: 2.5px solid rgba(0, 113, 227, 0.18);
  border-top-color: var(--accent, #0071e3);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-copy {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.loading-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 650;
  color: var(--ink, #1d1d1f);
}

.loading-text {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-2, #6e6e73);
}

.lookup-note {
  padding: 0.8rem 0.95rem;
  font-size: 0.87rem;
  font-weight: 600;
  border-radius: var(--radius-sm, 10px);
}

.lookup-note.success {
  color: var(--success, #1a936f);
  background: rgba(26, 147, 111, 0.1);
}

.lookup-note.error,
.lookup-note.not-found {
  color: var(--danger, #d70015);
  background: var(--danger-bg, #fff1f0);
}

.status-fade-enter-active,
.status-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.status-fade-enter-from,
.status-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.not-found-card {
  padding: 1.1rem;
  text-align: center;
  background: var(--surface-2, #f5f5f7);
  border-radius: var(--radius-md, 14px);
}

.not-found-card p {
  margin: 0 0 0.9rem;
  font-size: 0.9rem;
  color: var(--ink-2, #6e6e73);
}

.not-found-card .primary-btn {
  width: 100%;
}

@media (max-width: 640px) {
  .stage-card {
    padding: 1.5rem 1.25rem;
    border-radius: var(--radius-md, 14px);
  }

  .stage-title {
    font-size: 1.35rem;
  }

  .input-row {
    flex-direction: column;
  }

  .primary-btn {
    width: 100%;
  }
}
</style>
