<script setup>
import axios from 'axios'
import { ref } from 'vue'
import { VForm } from 'vuetify/components'
import { emailValidator, requiredValidator } from '@validators'
import { useToast } from 'vue-toastification'
import { FORGOT_PASSWORD_URL } from '@/network/const'
import { devLog } from '@/utils/devLogger'

const formRef = ref()
const email = ref('')
const loading = ref(false)
const requestSent = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const toast = useToast()

const onSubmit = () => {
  formRef.value?.validate().then(({ valid }) => {
    if (!valid) return
    sendResetLink()
  })
}

const sendResetLink = async () => {
  loading.value = true
  errorMessage.value = ''
  requestSent.value = false
  try {
    devLog('Forgot password request start', { email: email.value })

    const { data } = await axios.post(
      FORGOT_PASSWORD_URL,
      { email: email.value },
      { headers: { Accept: 'application/json' } },
    )

    successMessage.value = data?.message || 'Password reset link sent.'
    requestSent.value = true
    devLog('Forgot password request success', data)
  } catch (error) {
    const message = error?.response?.data?.message || 'Unable to send password reset link.'

    errorMessage.value = message
    toast.error(message)
    devLog('Forgot password request failed', { message, response: error?.response })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="forgot-password-page">
    <VCard
      class="forgot-card"
      elevation="4"
    >
      <VCardText class="text-center">
        <VIcon
          size="48"
          color="primary"
          class="mb-3"
        >
          tabler-lock
        </VIcon>
        <h2 class="text-h4 font-weight-semibold mb-2">
          Reset your password
        </h2>
        <p class="text-body-1 mb-6">
          Enter the email address associated with your account and we'll send you a link to reset your password.
        </p>
      </VCardText>

      <VCardText>
        <VForm
          ref="formRef"
          @submit.prevent="onSubmit"
        >
          <VTextField
            v-model="email"
            label="Email address"
            type="email"
            :rules="[requiredValidator, emailValidator]"
            :disabled="loading"
          />

          <VBtn
            block
            type="submit"
            class="mt-4"
            :loading="loading"
            :disabled="loading"
          >
            <template #default>
              {{ loading ? 'Sending reset link...' : 'Send reset link' }}
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

      <VCardText v-if="requestSent">
        <VAlert
          type="success"
          variant="tonal"
          class="mb-3"
        >
          <h4 class="text-h6 mb-2">
            Password reset link sent
          </h4>
          <p class="mb-2">
            {{ successMessage || 'If an account exists for that email, a password reset link has been sent.' }}
            Please check your inbox and follow the instructions to reset your password.
          </p>
          <p class="text-body-2 mb-0">
            Didn't receive the email? Check your spam folder or try again.
          </p>
        </VAlert>
      </VCardText>

      <VCardText v-else-if="errorMessage">
        <VAlert
          type="error"
          variant="tonal"
        >
          {{ errorMessage }}
        </VAlert>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.forgot-password-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fb;
  padding: 24px;
}

.forgot-card {
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
