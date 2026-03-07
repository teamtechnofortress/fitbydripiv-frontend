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
import { themeConfig } from '@themeConfig'
import { emailValidator, requiredValidator } from '@validators'
import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import { useToast } from 'vue-toastification'
import { VForm } from 'vuetify/components'
import { devLog } from '@/utils/devLogger'

const authThemeImg = useGenerateImageVariant(authV2LoginIllustrationLight, authV2LoginIllustrationDark, authV2LoginIllustrationBorderedLight, authV2LoginIllustrationBorderedDark, true)
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)
const isPasswordVisible = ref(false)
const route = useRoute()
const router = useRouter()
const ability = useAppAbility()
const toast = useToast()
const authDataStore = useAuthDataStore()
const { loggedInUser, userAbility, error } = storeToRefs(authDataStore)

const errors = ref({
  email: undefined,
  password: undefined,
})

const refVForm = ref()
const email = ref('admin@gmail.com')
const password = ref('12345678')
const rememberMe = ref(false)

const onSubmit = () => {
  refVForm.value?.validate().then(({ valid: isValid }) => {
    if (!isValid) return
    handleLogin()
  })
}

const handleLogin = async () => {
  try {
    devLog('Auth submitting login form', { email: email.value })
    const result = await authDataStore.login({
      email: email.value,
      password: password.value,
    })
    devLog('Auth login result', result)
    if (result?.requiresTwoFactor) {
      devLog('Auth redirecting to OTP challenge')
      router.push('/otp')
      return
    }
    // If backend already returned a session, lobby watcher will fire
  } catch (error) {
    devLog('Auth login handler error', { message: error?.message })
    // Errors surface via the auth store watcher/toast
  }
}

/**
* watchs ######################################
*/
watch(loggedInUser, val => {  
  if(val && val.id){   
    if(val.password_reset){      
      window.location.href="/forgot-password";
    }else{
      toast.success("Successfully Logged In !");
  
      setTimeout(() => {    
        router.push({ name: 'lobby' });
      }, 500);
    }
  }
})
watch(userAbility, val => {
  if(val){
    ability.update(val)
  }
})
watch(error, value => {
  if(value){
    toast.error(value.message || 'Login Failed.')
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
            Welcome to {{ themeConfig.app.title }}! 👋🏻
          </h5>
          <p class="mb-0">
            Please sign-in to your account and start the adventure
          </p>
        </VCardText>
        <VCardText>
          <VAlert
            color="primary"
            variant="tonal"
          >
            <p class="text-caption mb-2">
              Admin Email: <strong>admin@demo.com</strong> / Pass: <strong>admin</strong>
            </p>            
          </VAlert>
        </VCardText>
        <VCardText>
          <VForm
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <!-- email -->
              <VCol cols="12">
                <VTextField
                  v-model="email"
                  label="Email"
                  type="email"
                  :rules="[requiredValidator, emailValidator]"
                  :error-messages="errors.email"
                />
              </VCol>

              <!-- password -->
              <VCol cols="12">
                <VTextField
                  v-model="password"
                  label="Password"
                  :rules="[requiredValidator]"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  :error-messages="errors.password"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <div class="d-flex align-center flex-wrap justify-space-between mt-2 mb-4">
                  <VCheckbox
                    v-model="rememberMe"
                    label="Remember me"
                  />                  
                  <RouterLink
                    class="text-primary ms-2 mb-1"
                    :to="{ name: 'forgot-password' }"
                  >
                    Forgot Password?
                  </RouterLink>
                </div>

                <VBtn
                  block
                  type="submit"
                >
                  Login
                </VBtn>
              </VCol>

              <VCol
                cols="12"
                class="text-center"
              >
                <!-- <RouterLink
                  class="text-primary ms-2"
                  :to="{ name: 'register' }"
                >
                  Register
                </RouterLink>  -->

                <RouterLink
                  class="text-primary ms-2"
                  :to="{ name: 'intake' }"
                >
                  INTAKE
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
</route>
