<script setup>
import { computed, ref, watch } from 'vue'
import { VForm } from 'vuetify/components'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useToast } from 'vue-toastification'
import { useAppAbility } from '@/plugins/casl/useAppAbility'
import { useAuthDataStore } from '@/store/authData'
import { emailValidator, requiredValidator } from '@validators'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import authV2LoginIllustrationBorderedDark from '@images/pages/auth-v2-login-illustration-bordered-dark.png'
import authV2LoginIllustrationBorderedLight from '@images/pages/auth-v2-login-illustration-bordered-light.png'
import authV2LoginIllustrationDark from '@images/pages/auth-v2-login-illustration-dark.png'
import authV2LoginIllustrationLight from '@images/pages/auth-v2-login-illustration-light.png'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import { themeConfig } from '@themeConfig'

const authThemeImg = useGenerateImageVariant(
  authV2LoginIllustrationLight,
  authV2LoginIllustrationDark,
  authV2LoginIllustrationBorderedLight,
  authV2LoginIllustrationBorderedDark,
  true,
)

const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

const router = useRouter()
const route = useRoute()
const toast = useToast()
const ability = useAppAbility()
const authDataStore = useAuthDataStore()
const { loggedInUser, userAbility, error, loading } = storeToRefs(authDataStore)

const refVForm = ref()
const isPasswordVisible = ref(false)
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const pendingRedirect = computed(() => (route.query.to ? String(route.query.to) : null))
const EMAIL_PROMPT_STORAGE_KEY = 'pendingEmailVerificationPrompt'

const authErrorMessage = computed(() => error.value?.message ?? '')

const submitForm = () => {
  refVForm.value?.validate().then(({ valid }) => {
    if (!valid)
      return

    authDataStore.simpleRegister({
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: email.value.trim(),
      password: password.value,
    })
  })
}

watch(loggedInUser, val => {
  if (val && val.id) {
    toast.success('User registered successfully.')
    try {
      localStorage.setItem(EMAIL_PROMPT_STORAGE_KEY, 'true')
    } catch (error) {
      // localStorage might be unavailable; ignore
    }
    const redirectTo = pendingRedirect.value

    const navigate = () => {
      if (redirectTo)
        router.replace(redirectTo)
      else
        router.push({ name: 'lobby' })
    }

    setTimeout(navigate, 600)
  }
})

watch(userAbility, val => {
  if (val)
    ability.update(val)
})

watch(error, value => {
  if (value?.message)
    toast.error(value.message)
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
            Create your {{ themeConfig.app.title }} account
          </h5>
          <p class="mb-0">
            Register with minimal details and access the dashboard instantly.
          </p>
        </VCardText>

        <VCardText v-if="authErrorMessage">
          <VAlert
            color="error"
            variant="tonal"
          >
            {{ authErrorMessage }}
          </VAlert>
        </VCardText>

        <VCardText>
          <VForm
            ref="refVForm"
            @submit.prevent="submitForm"
          >
            <VRow>
              <VCol cols="12">
                <VTextField
                  v-model="firstName"
                  label="First Name"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol cols="12">
                <VTextField
                  v-model="lastName"
                  label="Last Name"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol cols="12">
                <VTextField
                  v-model="email"
                  label="Email"
                  type="email"
                  :rules="[requiredValidator, emailValidator]"
                />
              </VCol>

              <VCol cols="12">
                <VTextField
                  v-model="password"
                  label="Password"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  :rules="[requiredValidator]"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />
              </VCol>

              <VCol cols="12">
                <VBtn
                  block
                  type="submit"
                  :loading="loading"
                  :disabled="loading"
                >
                  Register
                </VBtn>
              </VCol>

              <VCol
                cols="12"
                class="text-center"
              >
                <span>Already have an account?</span>
                <RouterLink
                  class="text-primary ms-2"
                  :to="{ name: 'login' }"
                >
                  Back to login
                </RouterLink>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth.scss";
</style>

<route lang="yaml">
meta:
  layout: blank
  action: read
  subject: Auth
  redirectIfLoggedIn: true
  public: true
</route>
