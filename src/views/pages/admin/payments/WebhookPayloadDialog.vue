<script setup>
import { computed } from 'vue'
import { formatDateTime, prettyLabel, statusColor } from '@/views/pages/admin/payments/detailShared'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  webhook:    { type: Object,  default: null  },
  loading:    { type: Boolean, default: false },
  error:      { type: String,  default: ''    },
  parentLabel:{ type: String,  default: ''    },
})

const emit = defineEmits(['update:modelValue', 'openParent'])

const payloadText = computed(() => {
  if (!props.webhook?.payload) return ''
  try { return JSON.stringify(props.webhook.payload, null, 2) }
  catch { return '' }
})

const closeDialog  = () => emit('update:modelValue', false)
const openParent   = () => emit('openParent')
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="900"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="dialog-card">

      <!-- Header -->
      <div class="dialog-header">
        <div class="dialog-header-left">
          <div class="dialog-icon">
            <span class="mdi mdi-webhook" />
          </div>
          <div>
            <h2 class="dialog-title">Webhook Payload</h2>
            <p v-if="webhook" class="dialog-subtitle">{{ webhook.event_type || 'Event details' }}</p>
          </div>
        </div>
        <button class="close-btn" @click="closeDialog">
          <span class="mdi mdi-close" />
        </button>
      </div>

      <div class="dialog-body">

        <!-- Loading -->
        <div v-if="loading" class="dialog-state">
          <VProgressCircular indeterminate color="primary" :size="44" :width="4" />
          <p>Loading webhook payload…</p>
        </div>

        <!-- Error -->
        <VAlert v-else-if="error" type="error" variant="tonal">{{ error }}</VAlert>

        <!-- Content -->
        <template v-else-if="webhook">

          <!-- Meta grid -->
          <div class="meta-grid">
            <div class="meta-tile">
              <span class="meta-label">Event type</span>
              <strong>{{ webhook.event_type || '—' }}</strong>
            </div>
            <div class="meta-tile">
              <span class="meta-label">Status</span>
              <VChip
                :color="webhook.processed ? 'success' : 'warning'"
                size="small"
                variant="tonal"
              >
                {{ webhook.processed ? 'Processed' : 'Pending' }}
              </VChip>
            </div>
            <div class="meta-tile">
              <span class="meta-label">Stripe event ID</span>
              <strong class="mono break">{{ webhook.stripe_event_id || '—' }}</strong>
            </div>
            <div class="meta-tile">
              <span class="meta-label">Attached to</span>
              <strong>{{ prettyLabel(webhook.webhookable_type) }} #{{ webhook.webhookable_id || '—' }}</strong>
            </div>
            <div class="meta-tile">
              <span class="meta-label">Created</span>
              <strong>{{ formatDateTime(webhook.created_at) }}</strong>
            </div>
            <div class="meta-tile">
              <span class="meta-label">Processed at</span>
              <strong>{{ formatDateTime(webhook.processed_at) }}</strong>
            </div>
          </div>

          <!-- Payload code block -->
          <div class="payload-header">
            <span class="payload-label">
              <span class="mdi mdi-code-braces" />
              Raw payload
            </span>
          </div>
          <div class="payload-shell">
            <pre class="payload-code">{{ payloadText || 'No payload stored for this webhook.' }}</pre>
          </div>

        </template>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <button
          v-if="webhook && parentLabel"
          class="footer-primary-btn"
          @click="openParent"
        >
          <span class="mdi mdi-open-in-new" />
          {{ parentLabel }}
        </button>
        <div class="footer-spacer" />
        <button class="footer-close-btn" @click="closeDialog">
          Close
        </button>
      </div>

    </div>
  </VDialog>
</template>

<style scoped>
/* ── Dialog shell ────────────────────────────────────── */
.dialog-card {
  background: rgb(var(--v-theme-surface));
  border-radius: 24px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

/* ── Header ──────────────────────────────────────────── */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.06) 0%, rgb(var(--v-theme-surface)) 60%);
  flex-shrink: 0;
}
.dialog-header-left { display: flex; align-items: center; gap: 14px; }
.dialog-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 20px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.dialog-title    { font-size: 1rem; font-weight: 700; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); margin: 0; }
.dialog-subtitle { font-size: 0.8rem; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); margin: 2px 0 0; font-family: monospace; }

.close-btn {
  width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface)); color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0;
}
.close-btn:hover { background: rgba(var(--v-theme-on-surface), 0.06); color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); }

/* ── Body ────────────────────────────────────────────── */
.dialog-body { padding: 24px; overflow-y: auto; flex: 1; }

/* ── State ───────────────────────────────────────────── */
.dialog-state {
  min-height: 200px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 14px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.875rem;
}

/* ── Meta grid ───────────────────────────────────────── */
.meta-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;
}
.meta-tile {
  display: flex; flex-direction: column; gap: 6px;
  padding: 14px; border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.meta-label {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.meta-tile strong { font-size: 0.85rem; font-weight: 600; color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity)); }
.mono  { font-family: monospace; font-size: 0.78rem !important; }
.break { word-break: break-all; }

/* ── Payload ─────────────────────────────────────────── */
.payload-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.payload-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.payload-shell {
  border-radius: 16px;
  background: rgba(var(--v-theme-on-surface), 0.95);
  padding: 20px;
  overflow: auto;
  max-height: 400px;
}
.payload-code {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'JetBrains Mono', Menlo, Monaco, Consolas, monospace;
  color: rgb(var(--v-theme-surface));
}

/* ── Footer ──────────────────────────────────────────── */
.dialog-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.02);
  flex-shrink: 0;
}
.footer-spacer { flex: 1; }

.footer-primary-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border-radius: 11px; border: none;
  background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-on-primary));
  font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
  box-shadow: 0 2px 10px rgba(var(--v-theme-primary), 0.3);
}
.footer-primary-btn:hover { opacity: 0.9; }

.footer-close-btn {
  padding: 9px 18px; border-radius: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 0.15s;
}
.footer-close-btn:hover { background: rgba(var(--v-theme-on-surface), 0.06); }

/* ── Responsive ──────────────────────────────────────── */
@media (max-width: 720px) {
  .meta-grid { grid-template-columns: 1fr 1fr; }
  .dialog-body { padding: 16px; }
  .dialog-header { padding: 16px; }
}
@media (max-width: 480px) {
  .meta-grid { grid-template-columns: 1fr; }
}
</style>