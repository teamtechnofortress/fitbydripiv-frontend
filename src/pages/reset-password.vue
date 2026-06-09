<script setup>
import axios from 'axios'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VForm } from 'vuetify/components'
import { requiredValidator } from '@validators'
import { useToast } from 'vue-toastification'
import { RESET_PASSWORD_URL } from '@/network/const'
import { devLog } from '@/utils/devLogger'

const formRef = ref()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const email = ref('')
const token = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const success = ref(false)
const tokenInvalid = ref(false)
const errorMessage = ref('')
const countdown = ref(3)
let redirectTimer = null
let countdownTimer = null

const clearRedirectTimers = () => {
  if (redirectTimer) {
    clearTimeout(redirectTimer)
    redirectTimer = null
  }
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

const passwordRules = [
  requiredValidator,
  value => (value?.length ?? 0) >= 8 || 'Password must be at least 8 characters long.',
]

const confirmPasswordRules = [
  requiredValidator,
  value => value === password.value || 'Passwords do not match.',
]

const decodeQueryParam = param => {
  const value = route.query[param]
  if (Array.isArray(value)) {
    return value[0] ? String(value[0]) : ''
  }
  
  return value ? String(value) : ''
}

const initializeParams = () => {
  email.value = decodeQueryParam('email')
  token.value = decodeQueryParam('token') || decodeQueryParam('reset_token')

  if (!email.value || !token.value) {
    tokenInvalid.value = true
    errorMessage.value = 'Invalid password reset request. Please request a new reset link.'
  }
}

const onSubmit = () => {
  if (tokenInvalid.value) return
  formRef.value?.validate().then(({ valid }) => {
    if (!valid) return
    resetPassword()
  })
}

const startRedirectCountdown = () => {
  countdown.value = 3
  clearRedirectTimers()
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)

  redirectTimer = setTimeout(() => {
    goToLogin()
  }, 3000)
}

const goToLogin = () => {
  clearRedirectTimers()
  router.push({ name: 'login' }).catch(() => {
    router.push('/login').catch(() => {})
  })
}

const goToForgotPassword = () => {
  router.push({ name: 'forgot-password' })
}

const resetPassword = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    devLog('Reset password request start', { email: email.value })

    const { data } = await axios.post(
      RESET_PASSWORD_URL,
      {
        email: email.value,
        token: token.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      },
      { headers: { Accept: 'application/json' } },
    )

    devLog('Reset password request success', data)
    success.value = true
    toast.success(data?.message || 'Password reset successful.')
    startRedirectCountdown()
  } catch (error) {
    const message = error?.response?.data?.message || 'Unable to reset password.'

    errorMessage.value = message
    toast.error(message)

    const normalized = message.toLowerCase()
    if (normalized.includes('invalid') || normalized.includes('expired')) {
      tokenInvalid.value = true
    }
    devLog('Reset password request failed', { message, response: error?.response })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  initializeParams()
  devLog('Reset password view mounted', { query: route.query })
})

onBeforeUnmount(() => {
  clearRedirectTimers()
})
</script>

<template>
  <div class="reset-password-page">
    <VCard
      class="reset-card"
      elevation="4"
    >
      <VCardText class="text-center">
        <VIcon
          size="48"
          color="primary"
          class="mb-3"
        >
          tabler-key
        </VIcon>
        <h2 class="text-h4 font-weight-semibold mb-2">
          Reset your password
        </h2>
        <p class="text-body-1 mb-6">
          Enter a new password for your account.
        </p>
      </VCardText>

      <VCardText v-if="success">
        <VAlert
          type="success"
          variant="tonal"
          class="mb-4"
        >
          <h4 class="text-h6 mb-2">
            Password reset successful
          </h4>
          <p class="mb-2">
            Your password has been updated successfully. You can now log in using your new password.
          </p>
          <p class="text-body-2 mb-0">
            Redirecting to login in {{ countdown }}s...
          </p>
        </VAlert>
        <VBtn
          color="primary"
          block
          @click="goToLogin"
        >
          Back to login
        </VBtn>
      </VCardText>

      <VCardText v-else-if="tokenInvalid">
        <VAlert
          type="error"
          variant="tonal"
          class="mb-4"
        >
          <h4 class="text-h6 mb-2">
            Reset link expired or invalid
          </h4>
          <p class="mb-2">
            This password reset link is no longer valid. Please request a new password reset email.
          </p>
          <p class="text-body-2 mb-0">
            Invalid password reset request. Please request a new reset link.
          </p>
        </VAlert>
        <VBtn
          color="primary"
          block
          variant="tonal"
          @click="goToForgotPassword"
        >
          Request new reset link
        </VBtn>
      </VCardText>

      <VCardText v-else>
        <VForm
          ref="formRef"
          @submit.prevent="onSubmit"
        >
          <p
            v-if="email"
            class="text-body-2 text-medium-emphasis mb-4"
          >
            Resetting password for <strong>{{ email }}</strong>
          </p>

          <VTextField
            v-model="password"
            label="New password"
            type="password"
            :rules="passwordRules"
            :disabled="loading"
            autocomplete="new-password"
          />

          <VTextField
            v-model="passwordConfirmation"
            label="Confirm new password"
            type="password"
            :rules="confirmPasswordRules"
            :disabled="loading"
            autocomplete="new-password"
          />

          <VAlert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ errorMessage }}
          </VAlert>

          <VBtn
            block
            type="submit"
            class="mt-2"
            :loading="loading"
            :disabled="loading"
          >
            <template #default>
              {{ loading ? 'Resetting password...' : 'Reset password' }}
            </template>
          </VBtn>
        </VForm>

        <RouterLink
          class="text-primary d-block text-center mt-4"
          :to="{ name: 'login' }"
        >
          Back to login
        </RouterLink>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.reset-password-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fb;
  padding: 24px;
}

.reset-card {
  max-width: 480px;
  width: 100%;
  border-radius: 18px;
}
</style>

<route lang="yaml">
meta:
  layout: blank
  action: read
  subject: Auth
  redirectIfLoggedIn: true
  public: true
</route>
