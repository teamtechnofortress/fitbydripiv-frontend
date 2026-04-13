<script setup>
import { computed } from 'vue'
import { formatDateTime, prettyLabel } from '@/views/pages/admin/payments/detailShared'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  payment: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])

const webhooks = computed(() => props.payment?.webhooks || [])

const closeDialog = () => emit('update:modelValue', false)
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="760"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard class="payment-webhooks-dialog">
      <VCardItem>
        <template #prepend>
          <VIcon icon="mdi-webhook" />
        </template>
        <VCardTitle>Payment Webhooks</VCardTitle>
        <VCardSubtitle>
          Payment #{{ payment?.id || '—' }} · {{ webhooks.length }} {{ webhooks.length === 1 ? 'event' : 'events' }}
        </VCardSubtitle>
      </VCardItem>

      <VDivider />

      <VCardText class="dialog-body">
        <VAlert
          v-if="!webhooks.length"
          type="info"
          variant="tonal"
        >
          No webhooks are attached to this payment.
        </VAlert>

        <div v-else class="webhook-list">
          <div
            v-for="hook in webhooks"
            :key="hook.id"
            class="webhook-row"
          >
            <div class="webhook-main">
              <strong>{{ hook.event_type || 'Unknown event' }}</strong>
              <span class="webhook-meta">Webhook #{{ hook.id || '—' }}</span>
              <span class="webhook-meta">{{ formatDateTime(hook.created_at) }}</span>
              <span
                v-if="hook.stripe_event_id"
                class="webhook-meta webhook-meta--mono"
              >
                {{ hook.stripe_event_id }}
              </span>
            </div>

            <div class="webhook-side">
              <VChip
                :color="hook.processed ? 'success' : 'warning'"
                size="small"
                variant="tonal"
              >
                {{ hook.processed ? 'Processed' : 'Pending' }}
              </VChip>
              <span class="webhook-type">{{ prettyLabel(hook.webhookable_type) }}</span>
            </div>
          </div>
        </div>
      </VCardText>

      <VDivider />

      <VCardActions class="justify-end pa-4">
        <VBtn variant="text" @click="closeDialog">
          Close
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.payment-webhooks-dialog {
  border-radius: 20px;
}

.dialog-body {
  padding: 20px 24px;
}

.webhook-list {
  display: grid;
  gap: 12px;
}

.webhook-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.webhook-main {
  display: grid;
  gap: 4px;
}

.webhook-main strong {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}

.webhook-meta {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.webhook-meta--mono {
  font-family: monospace;
  word-break: break-all;
}

.webhook-side {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.webhook-type {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

@media (max-width: 640px) {
  .webhook-row {
    flex-direction: column;
  }

  .webhook-side {
    justify-items: start;
  }
}
</style>
