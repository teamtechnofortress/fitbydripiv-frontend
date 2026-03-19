<template>
  <div class="patient-search-stage">
    <div class="stage-card">
      <button class="back-search-btn" @click="$emit('back')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/>
        </svg>
        Back
      </button>

      <div class="stage-header">
        <h2 class="stage-title">Find Your Record</h2>
        <p class="stage-desc">Enter the email address associated with your account to retrieve your existing patient information.</p>
      </div>

      <div v-if="validationError" class="error-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>{{ validationError }}</span>
      </div>

      <div class="search-form">
        <div class="field-group">
          <label class="field-label">Email Address <span class="required-star">*</span></label>
          <div class="input-with-btn">
            <input
              :value="searchEmail"
              type="email"
              class="form-input search-input"
              placeholder="you@example.com"
              @input="onInput"
              @keydown.enter.prevent="$emit('search')"
            >
            <button
              type="button"
              class="search-btn"
              :disabled="!searchEmail.trim()"
              @click="$emit('search')"
            >
              <span v-if="lookupStatus.status === 'loading'" class="spinner-mini"></span>
              {{ lookupStatus.status === 'loading' ? 'Searching...' : 'Search' }}
            </button>
          </div>
        </div>

        <div
          v-if="lookupStatus.message"
          class="lookup-status"
          :class="lookupStatus.status"
        >
          {{ lookupStatus.message }}
        </div>

        <div v-if="lookupStatus.status === 'not-found'" class="not-found-section">
          <p class="not-found-text">We couldn't find a record with this email. Would you like to register as a new patient?</p>
          <button class="nav-btn primary" @click="$emit('startNew')">
            Register as New Patient
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
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

const onInput = (event) => {
  emit('update:searchEmail', event.target.value)
}
</script>

<style scoped>
.patient-search-stage { margin-top: 32px; }
.stage-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-sm);
}
.back-search-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 10px;
  background: transparent;
  border: none;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  color: var(--green);
  cursor: pointer;
  transition: all .15s;
}
.back-search-btn:hover { background: var(--green-light); }
.stage-header {
  text-align: center;
  margin-bottom: 24px;
}
.stage-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 8px;
  letter-spacing: -.015em;
}
.stage-desc {
  font-size: 15px;
  color: var(--text-3);
  margin: 0;
  line-height: 1.5;
}
.error-banner {
  margin-top: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius);
  padding: 16px 18px;
  color: #b91c1c;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}
.search-form {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  letter-spacing: .03em;
}
.required-star { color: #ef4444; margin-left: 2px; }
.input-with-btn {
  display: flex;
  gap: 8px;
}
.form-input {
  flex: 1;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text);
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 9px 13px;
  transition: border-color .15s, box-shadow .15s;
  outline: none;
}
.form-input:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(5,150,105,.12);
}
.search-btn {
  padding: 9px 20px;
  background: var(--gradient);
  border: none;
  border-radius: var(--radius-sm);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all .2s;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.search-btn:hover:not(:disabled) { filter: brightness(.98); }
.search-btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}
.spinner-mini {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.lookup-status {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
}
.lookup-status.loading {
  background: #eff6ff;
  color: var(--blue);
  border: 1px solid #bfdbfe;
}
.lookup-status.success {
  background: var(--green-light);
  color: var(--green-dark);
  border: 1px solid var(--green-mid);
}
.lookup-status.error,
.lookup-status.not-found {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.not-found-section {
  margin-top: 16px;
  padding: 20px;
  background: var(--surface-2);
  border-radius: var(--radius);
  text-align: center;
}
.not-found-text {
  font-size: 14px;
  color: var(--text-2);
  margin: 0 0 16px;
  line-height: 1.5;
}
.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 22px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all .2s;
}
.nav-btn.primary {
  background: var(--gradient);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 11px 22px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
}
.nav-btn.primary:hover { filter: brightness(.98); }
</style>
