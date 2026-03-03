<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const wiFiEnabled = ref(false)
const wiFiDisabled = ref(true)

const currentNetworks = ref([{
  name: 'DisneyLand',
},
{
  name: '',
},
{
  name: '',
}])

// Optional logic to ensure only one of Enable/Disable is selected
watch(wiFiEnabled, val => {
  if (val) wiFiDisabled.value = false
})
watch(wiFiDisabled, val => {
  if (val) wiFiEnabled.value = false
})

function updateDialog(value) {
  emit('update:modelValue', value)
}

function saveWifiSettings() {
  // Handle save logic
  console.log('WiFi:', wiFiEnabled.value ? 'Enabled' : 'Disabled')
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
        WIFI SETTINGS
      </VCardTitle>
      
      <VCardText>
        <div class="text-subtitle-1 mb-2">
          Wi-Fi
        </div>
        
        <VRow class="mx-2">
          <VCol cols="6">
            <VCheckbox
              v-model="wiFiEnabled"
              label="ON"
            />
          </VCol>
          <VCol cols="6">
            <VCheckbox
              v-model="wiFiDisabled"
              label="OFF"
            />
          </VCol>
        </VRow>
        <VDivider class="mt-2" />  
        <div class="text-subtitle-1 mt-2 mb-2">
          Current Network
        </div>
        <VRow>
          <VList
            density="compact"
            class="w-100 mx-4"
          >
            <VListItem
              v-for="(item, index) in currentNetworks"
              :key="index"
              :value="index"
            >
              <div class="d-flex justify-space-between align-center w-100">
                <VListItemTitle variant="underlined">
                  {{ item.name.toUpperCase() }}
                </VListItemTitle>
              </div>
            </VListItem>                                
          </VList>
        </VRow>
      </VCardText>

      <VCardActions class="justify-end">
        <VBtn
          variant="flat"
          color="primary"
          @click="saveWifiSettings"
        >
          Save
        </VBtn>
        <VBtn
          variant="text"
          @click="closeDialog"
        >
          Cancel
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

