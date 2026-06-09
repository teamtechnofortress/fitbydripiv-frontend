<script setup>
import axios from 'axios'
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { GET_EMAIL_STATUS_URL, SEND_EMAIL_VERIFICATION_URL } from '@/network/const'
import { devLog } from '@/utils/devLogger'

const toast = useToast()
const status = ref({ email: '', email_verified: false, email_verified_at: null })
const loading = ref(false)
const sending = ref(false)

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken')
  
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const loadStatus = async () => {
  loading.value = true
  try {
    const { data } = await axios.get(GET_EMAIL_STATUS_URL, { headers: getAuthHeaders() })
    const payload = data?.data ?? data ?? {}

    status.value = {
      email: payload.email,
      email_verified: !!payload.email_verified,
      email_verified_at: payload.email_verified_at || null,
    }
    devLog('Email verification status', status.value)
    window.dispatchEvent(new CustomEvent('email-status-updated', { detail: status.value }))
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Unable to load email status')
  } finally {
    loading.value = false
  }
}

const sendVerification = async () => {
  sending.value = true
  try {
    await axios.post(SEND_EMAIL_VERIFICATION_URL, {}, { headers: getAuthHeaders() })
    toast.success('Verification email sent. Please check your inbox.')
    devLog('Email verification link requested', status.value)
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Unable to send verification email')
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  loadStatus()
})
</script>

<template>
  <VContainer class="pa-6 email-verification-page">
    <VBtn
      variant="text"
      class="mb-4"
      prepend-icon="tabler-arrow-left"
      @click="$router.back()"
    >
      Back
    </VBtn>

    <VCard>
      <VCardTitle>Email Verification</VCardTitle>
      <VDivider />
      <VCardText>
        <p class="text-body-1">
          Manage your email verification status.
        </p>
        <VAlert
          :type="status.email_verified ? 'success' : 'warning'"
          variant="tonal"
          class="my-4"
        >
          <strong>{{ status.email || 'Your email' }}</strong>
          <template v-if="status.email_verified">
            is verified. You can continue using all features.
          </template>
          <template v-else>
            is not verified yet. Please verify to unlock all features.
          </template>
        </VAlert>

        <VRow>
          <VCol
            cols="12"
            md="6"
          >
            <VCard variant="outlined">
              <VCardTitle>Status Details</VCardTitle>
              <VCardText>
                <p>Email: <strong>{{ status.email || 'N/A' }}</strong></p>
                <p>Status: <strong>{{ status.email_verified ? 'Verified' : 'Pending Verification' }}</strong></p>
                <p v-if="status.email_verified_at">
                  Verified At: {{ status.email_verified_at }}
                </p>
              </VCardText>
            </VCard>
          </VCol>
          <VCol
            cols="12"
            md="6"
          >
            <VCard
              variant="outlined"
              class="h-100"
            >
              <VCardTitle>Actions</VCardTitle>
              <VCardText>
                <p v-if="status.email_verified">
                  Your email is already verified.
                </p>
                <template v-else>
                  <p>Click the button below to receive a fresh verification link.</p>
                  <VBtn
                    color="primary"
                    :loading="sending"
                    @click="sendVerification"
                  >
                    Send Verification Email
                  </VBtn>
                </template>
                <VBtn
                  variant="text"
                  class="mt-4"
                  :loading="loading"
                  @click="loadStatus"
                >
                  Refresh Status
                </VBtn>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </VContainer>
</template>
