<script setup>
const props = defineProps({
  confirmationMsg: {
    type: String,
    required: true,
  },
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits([
  'update:isDialogVisible',
  'confirm',
])

const updateModelValue = val => {
  emit('update:isDialogVisible', val)
}

const onConfirmation = () => {
  emit('confirm', true)
  updateModelValue(false)
}

const onCancel = () => {
  emit('confirm', false)
  emit('update:isDialogVisible', false)
}
</script>

<template>
  <!-- 👉 Confirm Dialog -->
  <VDialog
    max-width="500"
    :model-value="props.isDialogVisible"
    @update:model-value="updateModelValue"
  >
    <VCard class="text-center px-10 py-6">
      <VCardText>
        <VBtn
          icon
          variant="outlined"
          color="primary"
          class="mb-4"
          style="width: 72px; height: 72px; pointer-events: none;"
        >
          <VIcon
            size="32"
            icon="tabler-laurel-wreath"
          />
        </VBtn>

        <h5 class="text-lg font-weight-medium">
          {{ props.confirmationMsg }}
        </h5>
      </VCardText>

      <VCardActions class="align-center justify-center gap-2 mt-4">
        <VBtn
          variant="elevated"
          @click="onConfirmation"
        >
          OK
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
