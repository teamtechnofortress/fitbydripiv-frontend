<script setup>
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthDataStore } from '@/store/authData'
import { GET_TWO_FACTOR_STATUS_URL } from '@/network/const'
import { useToast } from 'vue-toastification'
import { devLog } from '@/utils/devLogger'

const authStore = useAuthDataStore()
const toast = useToast()
const router = useRouter()

const status = ref({ enabled: false, confirmed_at: null })
const statusLoading = ref(false)
const setupLoading = ref(false)
const confirmLoading = ref(false)
const enableSwitch = ref(false)
const setupPayload = ref(null)
const otpCode = ref('')
const disableDialog = ref(false)
const disableLoading = ref(false)
const regenerateDialog = ref(false)
const regenerateLoading = ref(false)

const isSetupVisible = computed(() => !!setupPayload.value && !status.value?.enabled)

const loadStatus = async () => {
  statusLoading.value = true
  try {
    const token = localStorage.getItem('accessToken')
    const { data } = await axios.get(GET_TWO_FACTOR_STATUS_URL, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = data?.data ?? data ?? {}
    status.value = {
      enabled: !!payload.enabled,
      confirmed_at: payload.confirmed_at || null,
    }
    enableSwitch.value = !!status.value.enabled
    devLog('TwoFactor status loaded', status.value)
    window.dispatchEvent(new CustomEvent('two-factor-status-updated', { detail: status.value }))
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to load 2FA status')
  } finally {
    statusLoading.value = false
  }
}

const startSetup = async () => {
  setupLoading.value = true
  try {
    const payload = await authStore.enableTwoFactor()
    setupPayload.value = {
      secret: payload.secret,
      qr: payload.qr,
      recoveryCodes: payload.recoveryCodes || payload.recovery_codes || [],
    }
    toast.success('Scan the QR code and confirm to finish enabling 2FA.')
    devLog('TwoFactor setup started')
  } catch (error) {
    toast.error(error.message || 'Unable to start two-factor setup')
    enableSwitch.value = false
  } finally {
    setupLoading.value = false
  }
}

const confirmSetup = async () => {
  if (!otpCode.value) {
    toast.error('Please enter the authentication code first.')
    return
  }
  confirmLoading.value = true
  try {
    await authStore.confirmTwoFactor(otpCode.value)
    toast.success('Two-factor authentication enabled!')
    setupPayload.value = null
    otpCode.value = ''
    status.value = { enabled: true, confirmed_at: new Date().toISOString() }
    enableSwitch.value = true
    await loadStatus()
    devLog('TwoFactor enabled via confirm')
  } catch (error) {
    toast.error(error.message || 'Invalid authentication code')
  } finally {
    confirmLoading.value = false
  }
}

const handleSwitchChange = value => {
  if (value) {
    if (!status.value?.enabled) startSetup()
  } else {
    if (status.value?.enabled) {
      disableDialog.value = true
      enableSwitch.value = true
    }
  }
}

const openRegenerateDialog = () => {
  regenerateDialog.value = true
}

const confirmDisable = async () => {
  disableLoading.value = true
  try {
    await authStore.disableTwoFactor()
    toast.success('Two-factor authentication disabled')
    devLog('TwoFactor disabled successfully')
    disableDialog.value = false
    await loadStatus()
  } catch (error) {
    toast.error(error.message || 'Unable to disable two-factor authentication')
    devLog('TwoFactor disable failed', { message: error?.message })
  } finally {
    disableLoading.value = false
  }
}

const confirmRegenerate = async () => {
  regenerateLoading.value = true
  try {
    const payload = await authStore.regenerateTwoFactor()
    toast.success('Two-factor authentication secret regenerated. Scan the new code and confirm to continue.')
    devLog('TwoFactor regenerated secret')
    setupPayload.value = payload
    status.value = { enabled: false, confirmed_at: null }
    enableSwitch.value = false
    regenerateDialog.value = false
  } catch (error) {
    toast.error(error.message || 'Unable to regenerate secret')
    devLog('TwoFactor regenerate failed', { message: error?.message })
  } finally {
    regenerateLoading.value = false
  }
}

const copyRecoveryCodes = async () => {
  if (!setupPayload.value?.recoveryCodes?.length) return
  try {
    await navigator.clipboard.writeText(setupPayload.value.recoveryCodes.join('\n'))
    toast.success('Recovery codes copied to clipboard')
  } catch (error) {
    toast.error('Unable to copy recovery codes')
  }
}

const downloadRecoveryCodesImage = () => {
  const codes = setupPayload.value?.recoveryCodes
  if (!codes || !codes.length) return
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const width = 400
  const lineHeight = 30
  const height = lineHeight * (codes.length + 3)
  canvas.width = width
  canvas.height = height
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#111827'
  ctx.font = '16px sans-serif'
  ctx.fillText('Recovery Codes', 20, 30)
  codes.forEach((code, index) => {
    ctx.fillText(`${index + 1}. ${code}`, 20, 60 + index * lineHeight)
  })
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = 'recovery-codes.png'
  link.click()
}

watch(status, val => {
  enableSwitch.value = !!val?.enabled
})

onMounted(() => {
  loadStatus()
})
</script>

<template>
  <div class="two-factor-page">
    <VContainer class="pa-6">
    <VBtn
      variant="text"
      class="mb-4"
      prepend-icon="tabler-arrow-left"
      @click="router.back()"
    >
      Back
    </VBtn>

    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <div>
          <div class="text-h5">Two-Factor Authentication</div>
          <div class="text-subtitle-2 text-medium-emphasis">Protect your account with an extra verification step.</div>
        </div>
        <VSwitch
          v-if="status?.enabled"
          v-model="enableSwitch"
          :loading="statusLoading"
          color="primary"
          label="Two-Factor Auth"
          @update:model-value="handleSwitchChange"
        />
      </VCardTitle>

      <VDivider />

      <VCardText>
        <div v-if="status?.enabled && !isSetupVisible" class="text-success text-subtitle-1 mb-4 d-flex flex-wrap align-center gap-4">
          <div>
            <VIcon icon="tabler-shield-check" color="success" class="me-2" />
            Two-factor authentication is currently enabled for this account.
          </div>
          <VBtn
            size="small"
            color="primary"
            variant="text"
            @click="openRegenerateDialog"
          >
            Regenerate QR Code
          </VBtn>
        </div>

        <div v-if="!status?.enabled" class="mb-6">
          <p class="text-body-1 mb-4">Enable two-factor authentication to add an extra layer of security. You will scan a QR code with an authenticator app and confirm using a one-time code.</p>
          <VBtn
            color="primary"
            :disabled="setupLoading || !!setupPayload"
            :loading="setupLoading"
            @click="startSetup"
          >
            {{ setupPayload ? 'QR Generated' : 'Enable 2 factor authentication' }}
          </VBtn>
        </div>

        <VAlert
          type="info"
          variant="tonal"
          class="mb-6"
          v-if="!status?.enabled && !setupPayload"
        >
          You must scan the QR code and confirm with an authenticator app before two-factor authentication becomes active.
        </VAlert>

        <div v-if="isSetupVisible" class="mb-8">
          <VRow>
            <VCol cols="12" md="6">
              <VCard variant="outlined">
                <VCardTitle>Scan this QR Code</VCardTitle>
                <VCardText>
                  <p class="text-body-2 mb-4">Use Google Authenticator, Authy, or a compatible app.</p>
                  <div v-if="setupPayload.qr" class="text-center" v-html="setupPayload.qr" />
                  <div class="mt-4">
                    <p class="text-caption text-medium-emphasis">Manual entry key:</p>
                    <VChip color="primary" variant="tonal">{{ setupPayload.secret }}</VChip>
                  </div>
                </VCardText>
              </VCard>
            </VCol>

            <VCol cols="12" md="6">
              <VCard variant="outlined" class="h-100">
                <VCardTitle class="d-flex align-center justify-space-between">
                  <span>Recovery Codes</span>
                  <div>
                    <VBtn icon="tabler-copy" variant="text" @click="copyRecoveryCodes" />
                    <VBtn icon="tabler-download" variant="text" @click="downloadRecoveryCodesImage" />
                  </div>
                </VCardTitle>
                <VCardText>
                  <p class="text-body-2">Store these codes safely — they will not be shown again once you leave this page.</p>
                  <VList density="compact">
                    <VListItem v-for="(code, index) in setupPayload.recoveryCodes" :key="code">
                      <VListItemTitle>{{ index + 1 }}. {{ code }}</VListItemTitle>
                    </VListItem>
                  </VList>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>

          <VCard variant="outlined" class="mt-6">
            <VCardTitle>Confirm OTP</VCardTitle>
            <VCardText>
              <p class="text-body-2">Enter the 6-digit code from your authenticator app to finish enabling 2FA.</p>
              <VTextField
                v-model="otpCode"
                label="Authentication Code"
                maxlength="6"
                type="text"
                inputmode="numeric"
                class="mb-4"
              />
              <VBtn color="success" :loading="confirmLoading" @click="confirmSetup">
                Confirm & Enable
              </VBtn>
            </VCardText>
          </VCard>
        </div>
      </VCardText>
    </VCard>
    </VContainer>

    <VDialog
      v-model="disableDialog"
      max-width="420"
    >
      <VCard>
        <VCardTitle class="text-h6">Disable Two-Factor Authentication</VCardTitle>
        <VCardText>
          <p class="mb-4">Are you sure you want to disable two-factor authentication?</p>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            color="secondary"
            variant="text"
            @click="disableDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="disableLoading"
            @click="confirmDisable"
          >
            Yes, Disable
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="regenerateDialog"
      max-width="420"
    >
      <VCard>
        <VCardTitle class="text-h6">Regenerate 2FA Secret</VCardTitle>
        <VCardText>
          <p class="mb-4">Are you sure you want to regenerate the QR code? This invalidates your existing setup until you confirm the new one.</p>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            color="secondary"
            variant="text"
            @click="regenerateDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="regenerateLoading"
            @click="confirmRegenerate"
          >
            Regenerate
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
