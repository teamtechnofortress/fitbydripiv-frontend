<template>
  <transition name="modal-fade">
    <div v-if="open" class="modal-overlay" @click="$emit('reject')">
      <div class="modal-content" @click.stop>
        <!-- Decorative gradient header -->
        <div class="modal-header-bg"></div>
        
        <div class="modal-header">
          <div class="header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div class="header-text">
            <h2 class="modal-title">Patient Record Found</h2>
            <p class="modal-subtitle">Please verify your information</p>
          </div>
          <button class="modal-close-btn" @click="$emit('reject')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="info-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4m0-4h.01"/>
            </svg>
            We found this information in our system
          </div>

          <div class="patient-details-grid">
            <div class="detail-item">
              <div class="detail-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="detail-content">
                <span class="detail-label">Full Name</span>
                <span class="detail-value">{{ patient?.firstName }} {{ patient?.lastName }}</span>
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div class="detail-content">
                <span class="detail-label">Email Address</span>
                <span class="detail-value">{{ patient?.email }}</span>
              </div>
            </div>

            <div v-if="patient?.phone" class="detail-item">
              <div class="detail-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div class="detail-content">
                <span class="detail-label">Phone Number</span>
                <span class="detail-value">{{ patient.phone }}</span>
              </div>
            </div>

            <div class="detail-item">
              <div class="detail-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="detail-content">
                <span class="detail-label">Date of Birth</span>
                <span class="detail-value">{{ formatDate(patient?.dateOfBirth) || 'Not on file' }}</span>
              </div>
            </div>

            <div v-if="patient?.city && patient?.state" class="detail-item span-2">
              <div class="detail-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div class="detail-content">
                <span class="detail-label">Location</span>
                <span class="detail-value">{{ patient.city }}, {{ patient.state }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="modal-btn secondary" @click="$emit('reject')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            This isn't me
          </button>
          <button type="button" class="modal-btn primary" @click="$emit('confirm')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            Confirm & Continue
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  patient: {
    type: Object,
    default: null,
  },
  open: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['confirm', 'reject'])

const formatDate = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}
</script>

<style scoped>
/* ── CSS Variables ─────────────────────────────────────── */
:root {
  --green: #059669;
  --green-light: #ecfdf5;
  --green-mid: #a7f3d0;
  --green-dark: #047857;
  --blue: #2563eb;
  --gradient: linear-gradient(135deg, #059669 0%, #2563eb 100%);
  --surface: #ffffff;
  --surface-2: #f9fafb;
  --border: #e5e7eb;
  --text: #111827;
  --text-2: #374151;
  --text-3: #6b7280;
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 18px;
  --shadow-sm: 0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.04);
  --shadow: 0 4px 16px rgba(15,23,42,.08), 0 1px 4px rgba(15,23,42,.04);
  --shadow-lg: 0 20px 40px rgba(15,23,42,.15), 0 4px 8px rgba(15,23,42,.08);
  --font-display: 'Open Sans', 'Segoe UI', 'Helvetica Neue', sans-serif;
  --font-body: 'Open Sans', 'Segoe UI', 'Helvetica Neue', sans-serif;
}

/* ── Modal Overlay ─────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 20px;
  animation: overlay-fade-in .3s ease;
}

@keyframes overlay-fade-in {
  from { 
    opacity: 0;
    backdrop-filter: blur(0);
  }
  to { 
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

/* ── Modal Content ─────────────────────────────────────── */
.modal-content {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 600px;
  width: 100%;
  overflow: hidden;
  position: relative;
  animation: modal-slide-in .4s cubic-bezier(.34, 1.56, .64, 1);
}

@keyframes modal-slide-in {
  from { 
    opacity: 0; 
    transform: translateY(40px) scale(0.9);
  }
  to { 
    opacity: 1; 
    transform: translateY(0) scale(1);
  }
}

/* ── Decorative Header Background ──────────────────────── */
.modal-header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 140px;
  background: var(--gradient);
  opacity: .08;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

/* ── Modal Header ──────────────────────────────────────── */
.modal-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 28px 28px 24px;
  border-bottom: 1px solid var(--border);
}

.header-icon {
  width: 48px;
  height: 48px;
  background: var(--gradient);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 8px 20px rgba(37,99,235,.25);
}

.header-text {
  flex: 1;
  padding-top: 4px;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px;
  letter-spacing: -.02em;
}

.modal-subtitle {
  font-size: 14px;
  color: var(--text-3);
  margin: 0;
  font-weight: 500;
}

.modal-close-btn {
  width: 36px;
  height: 36px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .2s;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: var(--surface);
  border-color: var(--text-2);
  color: var(--text);
  transform: rotate(90deg);
}

/* ── Modal Body ────────────────────────────────────────── */
.modal-body { 
  padding: 28px;
}

.info-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--green-dark);
  background: var(--green-light);
  border: 1px solid var(--green-mid);
  border-radius: 999px;
  padding: 7px 14px;
  margin-bottom: 20px;
}

/* ── Patient Details Grid ──────────────────────────────── */
.patient-details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (max-width: 560px) {
  .patient-details-grid {
    grid-template-columns: 1fr;
  }
  .span-2 {
    grid-column: span 1 !important;
  }
}

.span-2 {
  grid-column: span 2;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--surface-2);
  border-radius: var(--radius);
  border: 1.5px solid var(--border);
  transition: all .2s;
}

.detail-item:hover {
  border-color: var(--green-mid);
  background: var(--green-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(5,150,105,.1);
}

.detail-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--green-light) 0%, rgba(37,99,235,.08) 100%);
  border: 1px solid var(--green-mid);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--green);
  flex-shrink: 0;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.detail-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: .08em;
}

.detail-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  word-break: break-word;
}

/* ── Modal Footer ──────────────────────────────────────── */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 28px 28px;
  background: var(--surface-2);
  border-top: 1px solid var(--border);
}

@media (max-width: 480px) {
  .modal-footer {
    flex-direction: column-reverse;
  }
}

.modal-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
  border: none;
  outline: none;
  white-space: nowrap;
}

.modal-btn.secondary {
  background: var(--surface);
  color: var(--text-2);
  border: 1.5px solid var(--border);
}

.modal-btn.secondary:hover {
  border-color: var(--text-2);
  background: var(--surface-2);
  color: var(--text);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
}

.modal-btn.primary {
  background: var(--gradient);
  color: #fff;
  box-shadow: 0 8px 20px rgba(37,99,235,.25);
  border: 1.5px solid transparent;
}

.modal-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(37,99,235,.35);
}

.modal-btn.primary:active {
  transform: translateY(0);
}

/* ── Transitions ───────────────────────────────────────── */
.modal-fade-enter-active {
  transition: opacity .3s ease;
}

.modal-fade-leave-active {
  transition: opacity .2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-content {
  transform: translateY(40px) scale(0.9);
}

.modal-fade-leave-to .modal-content {
  transform: translateY(-20px) scale(0.95);
}
</style>