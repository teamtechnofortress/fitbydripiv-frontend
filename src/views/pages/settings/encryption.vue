<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const form = ref({
  encryption: '',
})

function updateDialog(value) {
  emit('update:modelValue', value)
}

function saveSettings() {
  closeDialog()
}

function closeDialog() {
  emit('update:modelValue', false)
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="500"
    @update:model-value="updateDialog"
  >
    <VCard>
      <VCardTitle class="text-h6 mt-2 text-center">
        ENCRYPTION
      </VCardTitle>
      
      <VCardText>        
        <VRow class="mb-4 mx-2">
          <VTextarea
            v-model="form.encryption"
            class="mx-4"
            rows="8"
          />
        </VRow>
      </VCardText>

      <VCardActions class="justify-end me-4">
        <VBtn
          variant="flat"
          color="primary"
          @click="saveSettings"
        >
          SAVE
        </VBtn>

        <VBtn
          variant="text"
          color="primary"
          @click="closeDialog"
        >
          CANCEL
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

