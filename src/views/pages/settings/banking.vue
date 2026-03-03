<script setup>
import {
  requiredValidator,
} from '@validators'
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const form = ref({
  institution: '',
  account: '',
  routing: '',
  taxRate: '',
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
        BANKING
      </VCardTitle>
      
      <VCardText>        
        <VRow class="mb-4 mx-2">
          <label class="mt-4">Bank Institution</label>
          <VTextField
            v-model="form.institution"
            :rules="[requiredValidator]"
            class="mx-4"
            variant="underlined"
          />
        </VRow>
        <VRow class="mb-4 mx-2">
          <label class="mt-4">Account#</label>
          <VTextField
            v-model="form.account"
            :rules="[requiredValidator]"
            class="mx-4"
            variant="underlined"
          />
        </VRow>
        <VRow class="mb-4 mx-2">
          <label class="mt-4">Routing#</label>
          <VTextField
            v-model="form.routing"
            :rules="[requiredValidator]"
            class="mx-4"
            variant="underlined"
          />
        </VRow>
        <VRow class="mb-4 mx-2">
          <label class="mt-4">Sales Tax Rate</label>
          <VTextarea
            v-model="form.taxRate"
            :rules="[requiredValidator]"
            class="mx-4"
            variant="underlined"
            row="8"
          />
        </VRow>
      </VCardText>

      <VCardActions class="justify-end me-4">
        <!--
          <VBtn
          variant="flat"
          color="primary"
          @click="saveSettings"
          >
          Save
          </VBtn>
        -->
        <VBtn
          variant="text"
          color="primary"
          @click="closeDialog"
        >
          EXIT
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

