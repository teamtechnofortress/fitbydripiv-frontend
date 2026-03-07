<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { verifyEmailRequest } from '@/network/verification'
import { devLog } from '@/utils/devLogger'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const success = ref(false)
const statusMessage = ref('')
const errorMessage = ref('')

const getSignedUrlFromQuery = () => {
  const queryValue = route.query.verify_url || route.query.verifyUrl
  if (Array.isArray(queryValue)) {
    return queryValue[0]
  }
  return queryValue || ''
}

const runVerification = async () => {
  const signedUrl = getSignedUrlFromQuery()
  devLog('Email verification extracted signed URL', { signedUrl, query: route.query })

  if (!signedUrl) {
    errorMessage.value = 'An error occurred while verifying your email. Please try again later.'
    success.value = false
    loading.value = false
    devLog('Email verification missing signed URL', { query: route.query })
    return
  }

  try {
    devLog('Email verification request start', { signedUrl })
    const response = await verifyEmailRequest(signedUrl)
    devLog('Email verification request success', { response })
    success.value = true
    statusMessage.value = response?.message || 'Verification complete. You can now log in.'
    errorMessage.value = ''
  } catch (error) {
    devLog('Email verification request failed', {
      message: error?.message,
      response: error?.response,
      data: error?.data,
    })
    console.error('Email verification failed', error)
    success.value = false
    errorMessage.value = 'An error occurred while verifying your email. Please try again later.'
  } finally {
    loading.value = false
    }
}

const goToLogin = () => {
  router.push({ name: 'login' }).catch(() => {
    router.push('/login').catch(() => {})
  })
}

onMounted(() => {
  devLog('Email verification view mounted', { query: route.query, fullUrl: window.location?.href })
  runVerification()
})
</script>

<template>
  <div class="verify-container">
    <div v-if="loading" class="card loading">
      <div class="spinner" />
      <p class="title loading-title">Verifying your email...</p>
      <p class="loading-text">Please wait while we confirm your request.</p>
    </div>

    <div v-else-if="success" class="card success">
      <div class="status-icon">✓</div>
      <p class="title">Verification complete</p>
      <p class="status-message success-text">{{ statusMessage }}</p>
      <button class="primary" @click="goToLogin">
        Go to login
      </button>
    </div>

    <div v-else class="card error">
      <div class="status-icon">!</div>
      <p class="title">Verification failed</p>
      <p class="status-message error-text">{{ errorMessage }}</p>
      <p class="small-text">Please try again later.</p>
    </div>
  </div>
</template>

<style scoped>
.verify-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fb;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
  z-index: 1000;
}

.card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 32px 28px;
  text-align: center;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(231, 235, 247, 0.9);
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.status-message {
  font-size: 1rem;
  margin-bottom: 12px;
}

.success-text {
  color: #16a34a;
}

.error-text {
  color: #dc2626;
}

.spinner {
  margin: 0 auto 18px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 4px solid #e0e7ff;
  border-top: 4px solid #6366f1;
  animation: spin 1s linear infinite;
}

.status-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.12);
  color: #4a4ff1;
}

.card.success .status-icon {
  background: rgba(34, 197, 94, 0.12);
  color: #14b86a;
}

.card.error .status-icon {
  background: rgba(248, 113, 113, 0.12);
  color: #dc2626;
}

.card.loading {
  background: #eef2ff;
  border-color: rgba(99, 102, 241, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
}

.loading-title {
  color: #312e81;
  margin-bottom: 6px;
}

.loading-text {
  color: #3730a3;
  margin-bottom: 0;
}

.card.success {
  background: #f0fdf4;
  border-color: rgba(34, 197, 94, 0.35);
}

.card.error {
  background: #fef2f2;
  border-color: rgba(248, 113, 113, 0.35);
}

.card.success .title,
.card.success .status-message,
.card.success p {
  color: #15803d;
}

.card.error .title,
.card.error .status-message,
.card.error p {
  color: #b91c1c;
}

.primary {
  border: none;
  border-radius: 999px;
  padding: 10px 20px;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  background: linear-gradient(120deg, #6366f1, #8b5cf6);
  color: #fff;
  box-shadow: 0 10px 20px rgba(99, 102, 241, 0.35);
}

.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 24px rgba(99, 102, 241, 0.35);
}

.small-text {
  font-size: 0.85rem;
  color: #6b7280;
  word-break: break-word;
  margin-top: 12px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

</style>
