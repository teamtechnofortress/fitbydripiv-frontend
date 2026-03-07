<script setup>
import { useAppAbility } from '@/plugins/casl/useAppAbility'
import { useAuthDataStore } from '@/store/authData'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import authV2LoginIllustrationBorderedDark from '@images/pages/auth-v2-login-illustration-bordered-dark.png'
import authV2LoginIllustrationBorderedLight from '@images/pages/auth-v2-login-illustration-bordered-light.png'
import authV2LoginIllustrationDark from '@images/pages/auth-v2-login-illustration-dark.png'
import authV2LoginIllustrationLight from '@images/pages/auth-v2-login-illustration-light.png'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import { requiredValidator } from '@validators'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { VForm } from 'vuetify/components'
import { devLog } from '@/utils/devLogger'

const authThemeImg = useGenerateImageVariant(authV2LoginIllustrationLight, authV2LoginIllustrationDark, authV2LoginIllustrationBorderedLight, authV2LoginIllustrationBorderedDark, true)
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)
const router = useRouter()
const ability = useAppAbility()
const toast = useToast()
const authDataStore = useAuthDataStore()
const { loggedInUser, userAbility, error, loading, twoFactorEmail } = storeToRefs(authDataStore)

devLog('OTP view init', {
  requiresTwoFactor: authDataStore.twoFactorRequired,
  email: authDataStore.twoFactorEmail,
})

if (!authDataStore.twoFactorRequired || !authDataStore.twoFactorEmail) {
  devLog('OTP view missing challenge, redirecting to login')
  router.replace({ name: 'login' })
}

const refVForm = ref()
const code = ref('')
const isCodeVisible = ref(false)

const onSubmit = () => {
  refVForm.value?.validate().then(({ valid }) => {
    if (!valid) return
    verify()
  })
}

const verify = async () => {
  try {
    devLog('Auth submitting two-factor code', { email: twoFactorEmail.value, code: code.value })
    await authDataStore.verifyTwoFactorCode(code.value)
    toast.success('Verification successful')
    devLog('Auth two-factor verification complete', { email: twoFactorEmail.value })
  } catch (err) {
    devLog('Auth two-factor verification error', { message: err?.message })
    // handled by store watcher/toast
  }
}

watch(loggedInUser, val => {
  if (val && val.id) {
    if (val.password_reset) {
      window.location.href = '/forgot-password'
    } else {
      devLog('OTP view detected login success', { id: val.id })
      toast.success('Successfully Logged In !')
      setTimeout(() => {
        router.push({ name: 'lobby' })
      }, 500)
    }
  }
})

watch(userAbility, val => {
  if (val) {
    ability.update(val)
  }
})

watch(error, value => {
  if (value) {
    devLog('OTP view error watcher', value)
    toast.error(value.message || 'Verification Failed.')
  }
})
</script>

<template>
  <VRow
    no-gutters
    class="auth-wrapper"
  >
    <VCol
      lg="8"
      class="d-none d-lg-flex"
    >
      <div class="position-relative auth-bg rounded-lg w-100 ma-8 me-0">
        <div class="d-flex align-center justify-center w-100 h-100">
          <VImg
            max-width="505"
            :src="authThemeImg"
            class="auth-illustration mt-16 mb-2"
          />
        </div>

        <VImg
          :src="authThemeMask"
          class="auth-footer-mask"
        />
      </div>
    </VCol>

    <VCol
      cols="12"
      lg="4"
      class="d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-4"
      >
        <VCardText>
          <h5 class="text-h5 font-weight-semibold mb-2">
            Two-Factor Authentication
          </h5>
          <p class="mb-0">
            Enter the verification code from your authenticator app to continue signing in.
          </p>
        </VCardText>

        <VCardText>
          <VAlert
            color="primary"
            variant="tonal"
            class="mb-4"
          >
            <p class="text-caption mb-0">
              Code requested for <strong>{{ twoFactorEmail }}</strong>
            </p>
          </VAlert>

          <VForm
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <VTextField
              v-model="code"
              variant="solo"
              class="text-h4 py-6 otp-input"
              hide-details
              label="Authentication Code"
              :type="isCodeVisible ? 'text' : 'password'"
              :rules="[requiredValidator]"
              :append-inner-icon="isCodeVisible ? 'tabler-eye-off' : 'tabler-eye'"
              autocomplete="one-time-code"
              inputmode="text"
              maxlength="64"
              @click:append-inner="isCodeVisible = !isCodeVisible"
            />

            <VBtn
              block
              type="submit"
              class="mt-4"
              :loading="loading"
            >
              Verify Code
            </VBtn>

            <VBtn
              block
              class="mt-3"
              variant="text"
              color="primary"
              @click="router.replace({ name: 'login' })"
            >
              Back to Login
            </VBtn>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style scoped>
.otp-input :deep(.v-field__input) {
  letter-spacing: 0.35rem;
  text-align: center;
  font-size: 1.75rem;
}
</style>

<route lang="yaml">
meta:
  public: true
</route>
