<script setup>
import DisplayDialog from '@/views/pages/settings/display.vue'
import SecurityDialog from '@/views/pages/settings/security.vue'
import { useThemeConfig } from '@core/composable/useThemeConfig'
import {
  AppContentLayoutNav,
  NavbarType,
} from '@layouts/enums'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { useTheme } from 'vuetify'


const showDisplayDialog = ref(false)
const showBankingDialog = ref(false)
const showWifiDialog = ref(false)
const showEncryptionDialog = ref(false)
const showSecurityDialog = ref(false)
const isNavDrawerOpen = ref(false)
const { theme, skin, navbarType, footerType, appContentWidth, appContentLayoutNav, isLessThanOverlayNavBreakpoint } = useThemeConfig()
const isCodeShown = ref(false)

// 👉 Primary Color
const vuetifyTheme = useTheme()

const { width: windowWidth } = useWindowSize()

const headerValues = computed(() => {
  const entries = Object.entries(NavbarType)
  if (appContentLayoutNav.value === AppContentLayoutNav.Horizontal)
    return entries.filter(([_, val]) => val !== NavbarType.Hidden)
  
  return entries
})
</script>

<template>
  <!-- <template v-if="!isLessThanOverlayNavBreakpoint(windowWidth)"> -->
  <template v-if="true">    
    <VBtn
      icon
      size="small"
      class="app-customizer-toggler rounded-s-lg rounded-0"
      style="z-index: 1001;"
      @click="isNavDrawerOpen = true"
    >
      <VIcon icon="tabler-settings" />
    </VBtn>

    <VNavigationDrawer
      v-model="isNavDrawerOpen"
      temporary
      location="end"
      width="250"
      :scrim="false"
      class="app-customizer"
    >
      <!-- 👉 Header -->
      <div class="customizer-heading d-flex align-center justify-space-between">
        <div>
          <h6 class="text-h6">
            SETTING
          </h6>
        </div>
        <VBtn
          icon
          variant="text"
          color="secondary"
          size="x-small"
          @click="isNavDrawerOpen = false"
        >
          <VIcon
            icon="tabler-x"
            size="20"
          />
        </VBtn>
      </div>

      <VDivider />

      <PerfectScrollbar
        tag="ul"
        :options="{ wheelPropagation: false }"
      >
        <CustomizerSection :divider="false">
          <VCardItem class="mt-3 border text-center py-2">
            <VCardTitle class="text-sm">
              SECURITY
            </VCardTitle>
            <VBtn
              icon
              size="x-small"
              color="primary"
              variant="text"
              class="text-disabled" 
              @click="showSecurityDialog = true"             
            >
              <VIcon
                size="32"
                icon="tabler-shield-lock"
              />
            </VBtn>      
            <SecurityDialog v-model="showSecurityDialog" />         
          </VCardItem>  

          <VCardItem class="mt-3 border text-center py-2">
            <VCardTitle class="text-sm">
              DISPLAY
            </VCardTitle>
            <VBtn
              icon
              size="x-small"
              color="primary"
              variant="text"
              class="text-disabled"  
              @click="showDisplayDialog = true"            
            >
              <VIcon
                size="32"
                icon="tabler-device-desktop"
              />
            </VBtn>
            <DisplayDialog v-model="showDisplayDialog" />          
          </VCardItem>  
        </CustomizerSection>
      </PerfectScrollbar>
    </VNavigationDrawer>
  </template>
</template>

<style lang="scss">
.app-customizer {
  .customizer-section {
    padding: 1.25rem;
  }

  .customizer-heading {
    padding-block: 0.875rem;
    padding-inline: 1.25rem;
  }

  .v-navigation-drawer__content {
    display: flex;
    flex-direction: column;
  }
}

.app-customizer-toggler {
  position: fixed !important;
  inset-block-start: 50%;
  inset-inline-end: 0;
  transform: translateY(-50%);

  &:active {
    transform: translateY(-50%) !important;
  }
}
</style>
