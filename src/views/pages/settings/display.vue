<script setup>
import { ContentWidth } from '@/@layouts/enums'
import { useThemeConfig } from '@core/composable/useThemeConfig'
import { Skins } from '@core/enums'
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const { theme, skin, navbarType, footerType, appContentWidth, appContentLayoutNav, isLessThanOverlayNavBreakpoint } = useThemeConfig()

const screenSaverEnabled = ref(false)
const screenSaverDisabled = ref(true)
const selectedSleepTime = ref(null)

const sleepOptions = [
  { label: '5 min', value: '5' },
  { label: '10 min', value: '10' },
  { label: '20 min', value: '20' },
  { label: '45 min', value: '45' },
  { label: '1 hr', value: '60' },
]

// Optional logic to ensure only one of Enable/Disable is selected
watch(screenSaverEnabled, val => {
  if (val) screenSaverDisabled.value = false
})
watch(screenSaverDisabled, val => {
  if (val) screenSaverEnabled.value = false
})

function updateDialog(value) {
  emit('update:modelValue', value)
}

function saveSettings() {
  // Handle save logic
  console.log('Screen Saver:', screenSaverEnabled.value ? 'Enabled' : 'Disabled')
  console.log('Sleep After (min):', selectedSleepTime)
  closeDialog()
}

function closeDialog() {
  emit('update:modelValue', false)
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="400"
    @update:model-value="updateDialog"
  >
    <VCard>
      <VCardTitle class="text-h6 mt-2 text-center">
        DISPLAY
      </VCardTitle>
      
      <!-- SECTION Theming -->
      <VCardText>
        <!-- 👉 Skin -->
        <h6 class="mt-3 text-base font-weight-regular">
          Skins
        </h6>
        <VRadioGroup
          v-model="skin"
          inline
          class="mx-4"
        >
          <VRadio
            v-for="[key, val] in Object.entries(Skins)"
            :key="key"
            :label="key"
            :value="val"
          />
        </VRadioGroup>

        <!-- 👉 Theme -->
        <h6 class="mt-3 text-base font-weight-regular">
          Theme
        </h6>
        <div class="d-flex align-center">
          <VLabel
            for="pricing-plan-toggle"
            class="me-3 mx-4"
          >
            Light
          </VLabel>

          <div>
            <VSwitch
              id="pricing-plan-toggle"
              v-model="theme"
              label="Dark"
              true-value="dark"
              false-value="light"
            />
          </div>
        </div> 
          
        <!--  -->
        <h6 class="mt-3 text-base font-weight-regular">
          Content width
        </h6>
        <VRadioGroup
          v-model="appContentWidth"
          inline
          class="mx-4"
        >
          <VRadio
            v-for="[key, val] in Object.entries(ContentWidth)"
            :key="key"
            :label="key"
            :value="val"
          />
        </VRadioGroup>
      </VCardText>
      <!-- !SECTION -->

      <VCardActions class="justify-end">
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
          @click="closeDialog"
        >
          Exit
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

