<script setup>
const props = defineProps({
  messageContent: {
    type: Object,
    required: true,
  },
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits([
  'update:isDialogVisible',
  'okay',
])

const updateModelValue = val => {
  emit('update:isDialogVisible', val)
}

const onConfirmation = () => {
  emit('okay', true)
  updateModelValue(false)
}
</script>

<template>  
  <VDialog
    max-width="840"
    :model-value="props.isDialogVisible"
    @update:model-value="updateModelValue"
  >
    <VCard class="px-10 pt-6">      
      <template
        v-for="(content, key) in props.messageContent"
        :key="key"
      >
        <h5 class="text-primary text-uppercase">
          {{ key }}
        </h5>
        <VTextarea
          class="w-100 font-weight-medium border border-warning mb-4"
          :value="content"
        />
      </template>

      <VCardActions class="align-center justify-center gap-2">
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
