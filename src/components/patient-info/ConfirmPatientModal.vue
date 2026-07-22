<template>
  <Transition name="modal-fade">
    <div
      v-if="open"
      class="modal-overlay"
      @click="$emit('reject')"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <span class="header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>

          <div class="header-text">
            <p class="header-eyebrow">Record located</p>
            <h2 class="modal-title">Is this you?</h2>
          </div>

          <button type="button" class="close-btn" aria-label="Close" @click="$emit('reject')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25">
              <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <p class="body-hint">Please double-check these details before we continue.</p>

          <dl class="detail-list">
            <div class="detail-row">
              <dt>Full name</dt>
              <dd>{{ patient?.firstName }} {{ patient?.lastName }}</dd>
            </div>
            <div class="detail-row">
              <dt>Email address</dt>
              <dd>{{ patient?.email }}</dd>
            </div>
            <div v-if="patient?.phone" class="detail-row">
              <dt>Phone number</dt>
              <dd>{{ patient.phone }}</dd>
            </div>
            <div class="detail-row">
              <dt>Date of birth</dt>
              <dd>{{ formatDate(patient?.dateOfBirth) || 'Not on file' }}</dd>
            </div>
            <div v-if="patient?.city && patient?.state" class="detail-row">
              <dt>Location</dt>
              <dd>{{ patient.city }}, {{ patient.state }}</dd>
            </div>
          </dl>
        </div>

        <div class="modal-footer">
          <button type="button" class="ghost-btn" @click="$emit('reject')">
            This isn't me
          </button>
          <button type="button" class="primary-btn" @click="$emit('confirm')">
            Confirm & continue
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  patient: { type: Object, default: null },
  open: { type: Boolean, default: false },
})

defineEmits(['confirm', 'reject'])

const formatDate = dateString => {
  if (!dateString) return null
  const date = new Date(dateString)

  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(247, 247, 248, 0.72);
  backdrop-filter: blur(18px) saturate(1.05);
  -webkit-backdrop-filter: blur(18px) saturate(1.05);
  animation: overlay-in 0.22s ease both;
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  --ink: #1d1d1f;
  --ink-2: #6e6e73;
  --ink-3: #a1a1a6;
  --hairline: #e5e5ea;
  --surface: #ffffff;
  --surface-2: #fafafe;
  --accent: #0071e3;
  --radius-lg: 22px;
  --radius-sm: 10px;
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid rgba(229, 229, 234, 0.9);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.13), 0 4px 14px rgba(15, 23, 42, 0.06);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
  animation: modal-in 0.32s cubic-bezier(0.28, 0.11, 0.32, 1) both;
}

@keyframes modal-in {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.25rem 0.8rem;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  color: var(--accent);
  background: rgba(0, 113, 227, 0.1);
  border-radius: 11px;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.header-eyebrow {
  margin: 0 0 0.15rem;
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.075em;
  text-transform: uppercase;
  color: var(--accent);
}

.modal-title {
  margin: 0;
  font-size: 1.24rem;
  font-weight: 640;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 31px;
  height: 31px;
  flex: 0 0 auto;
  color: var(--ink-3);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.close-btn:hover {
  background: var(--surface-2);
  color: var(--ink);
}

.modal-body {
  padding: 0 1.25rem 1.15rem;
}

.body-hint {
  margin: 0 0 0.9rem;
  font-size: 0.86rem;
  line-height: 1.45;
  color: #66739a;
}

.detail-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.35rem;
  border: 1px solid rgba(229, 229, 234, 0.72);
  border-radius: 16px;
  background: #fbfbfd;
  overflow: hidden;
}

.detail-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  min-height: 42px;
  padding: 0.62rem 0.75rem;
  background: transparent;
  border-radius: 11px;
}

.detail-row + .detail-row {
  border-top: 1px solid rgba(229, 229, 234, 0.7);
}

.detail-row dt {
  flex: 0 0 auto;
  font-size: 0.8rem;
  color: #66739a;
}

.detail-row dd {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 560;
  color: #20232a;
  text-align: right;
  overflow-wrap: anywhere;
}

.modal-footer {
  display: flex;
  gap: 0.65rem;
  padding: 0.95rem 1.25rem 1.25rem;
  border-top: 1px solid var(--hairline);
}

.ghost-btn,
.primary-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 1rem;
  font: inherit;
  font-weight: 590;
  font-size: 0.9rem;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.ghost-btn {
  color: #20232a;
  background: #f6f6f8;
}

.ghost-btn:hover {
  background: var(--hairline);
}

.primary-btn {
  color: #fff;
  background: var(--accent);
  box-shadow: 0 8px 18px rgba(0, 113, 227, 0.18);
}

.primary-btn:hover {
  transform: translateY(-1px);
  background: #0077ed;
}

@media (max-width: 460px) {
  .modal-overlay {
    align-items: flex-end;
    padding: 0.75rem;
  }

  .modal-content {
    max-width: none;
    border-radius: 20px;
  }

  .modal-footer {
    flex-direction: column-reverse;
  }

  .detail-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.2rem;
  }

  .detail-row dd {
    text-align: left;
  }
}

.modal-fade-enter-active {
  transition: opacity 0.22s ease;
}

.modal-fade-leave-active {
  transition: opacity 0.16s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
