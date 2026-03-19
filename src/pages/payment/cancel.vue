<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
  window.scrollTo(0, 0)
}
</script>

<template>
  <div class="payment-page">
    <div class="card">
      <div class="icon cancel">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </div>
      <h1>Payment Canceled</h1>
      <p>
        Your payment session was canceled before completion. You can restart the checkout process at any time.
      </p>
      <button class="secondary" @click="goHome">
        Back to Home
      </button>
    </div>
  </div>
</template>

<style scoped>
.payment-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: #f1f5f9;
}

.card {
  width: 100%;
  max-width: 480px;
  text-align: center;
  background: white;
  border-radius: 1.25rem;
  padding: 2.5rem 2rem;
  box-shadow: 0 25px 65px rgba(15, 23, 42, 0.07);
}

.icon {
  width: 68px;
  height: 68px;
  border-radius: 999px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.icon.cancel {
  background: linear-gradient(135deg, #f97316, #ef4444);
}

h1 {
  font-size: 1.65rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.75rem;
}

p {
  color: #475569;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.secondary {
  width: 100%;
  border: 1px solid #cbd5f5;
  border-radius: 999px;
  padding: 0.85rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  background: white;
  transition: border-color 0.2s, color 0.2s;
}

.secondary:hover {
  border-color: #6366f1;
  color: #6366f1;
}
</style>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
