<script setup>
import * as Network from "@/network"
import * as Const from "@/network/const"
import { initialAbility } from '@/plugins/casl/ability'
import { useAppAbility } from '@/plugins/casl/useAppAbility'
import ResetPass from '@/views/pages/settings/reset-pass.vue'
import { computed, onMounted, ref, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'

const router = useRouter()
const ability = useAppAbility()
const userData = ref(JSON.parse(localStorage.getItem('userData') || 'null'))
const toast = useToast()
const EMAIL_PROMPT_STORAGE_KEY = 'pendingEmailVerificationPrompt'
const showResetPassDialog = ref(false)
const twoFactorLoading = ref(false)

const twoFactorStatus = ref({
  enabled: !!userData.value?.two_factor_confirmed_at,
  confirmed_at: userData.value?.two_factor_confirmed_at || null,
})

const twoFactorEnabled = computed(() => !!twoFactorStatus.value?.enabled)
const emailLoading = ref(false)

const emailStatus = ref({
  email: userData.value?.email,
  email_verified: !!userData.value?.email_verified_at,
  email_verified_at: userData.value?.email_verified_at || null,
})

const emailVerified = computed(() => !!emailStatus.value?.email_verified)
const profileStep = computed(() => userData.value?.profile_step ?? null)
const profileCompleted = computed(() => !!userData.value?.profile_completed_at)

const profileStepLabel = computed(() => {
  if (profileCompleted.value) return 'Profile complete'
  if (profileStep.value) return `Profile step ${profileStep.value}/5`
  
  return 'Complete profile'
})

const profileStatusChip = computed(() => {
  if (profileCompleted.value) return 'Complete'
  
  return profileStep.value ? `Step ${profileStep.value}` : 'In progress'
})

const showEmailVerifyDialog = ref(false)
const showProfilePromptDialog = ref(false)
const profilePromptTimer = ref(null)
const PROFILE_PROMPT_DELAY = 800

const logout = () => {
  Network.postRequest(Const.LOGOUT_URL, {}, null, response => {
    const res = response.data.success
    if (res) {
      localStorage.removeItem('userData')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('userAbilities')
      ability.update(initialAbility)
      router.push('/login')
      toast.success('Successfully Logged Out !')
    } else {
      toast.error('Error Logging Out !')
    }
  })
}

const fetchTwoFactorStatus = () => {
  twoFactorLoading.value = true
  Network.getRequest(Const.GET_TWO_FACTOR_STATUS_URL, {}, {}, response => {
    twoFactorLoading.value = false

    const payload = response?.data?.data ?? response?.data ?? {}
    if (payload) {
      twoFactorStatus.value = {
        enabled: !!payload.enabled,
        confirmed_at: payload.confirmed_at || null,
      }
    }
  })
}

const fetchEmailStatus = () => {
  emailLoading.value = true
  Network.getRequest(Const.GET_EMAIL_STATUS_URL, {}, {}, response => {
    emailLoading.value = false

    const payload = response?.data?.data ?? response?.data ?? null
    if (payload) {
      emailStatus.value = {
        email: payload.email || userData.value?.email,
        email_verified: !!payload.email_verified,
        email_verified_at: payload.email_verified_at || null,
      }
    }
    maybePromptForEmailVerification()
  })
}

const hasPendingEmailPrompt = () => {
  try {
    return localStorage.getItem(EMAIL_PROMPT_STORAGE_KEY) === 'true'
  } catch (error) {
    return false
  }
}

const clearPendingEmailPrompt = () => {
  try {
    localStorage.removeItem(EMAIL_PROMPT_STORAGE_KEY)
  } catch (error) {
    // ignore storage errors
  }
}

const maybePromptForEmailVerification = () => {
  if (emailVerified.value) {
    clearPendingEmailPrompt()
    showEmailVerifyDialog.value = false
    
    return
  }
  if (hasPendingEmailPrompt()) {
    setTimeout(() => {
      if (!emailVerified.value) {
        showEmailVerifyDialog.value = true
      }
      clearPendingEmailPrompt()
    }, 600)
  }
}

const goToEmailVerificationPage = () => {
  showEmailVerifyDialog.value = false
  router.push({ path: '/email-verification' })
}

const dismissEmailVerificationPrompt = () => {
  showEmailVerifyDialog.value = false
  if (!profileCompleted.value) {
    if (profilePromptTimer.value) clearTimeout(profilePromptTimer.value)
    profilePromptTimer.value = setTimeout(() => {
      showProfilePromptDialog.value = true
      profilePromptTimer.value = null
    }, PROFILE_PROMPT_DELAY)
  }
}

const goToProfileProgress = () => {
  dismissProfilePrompt()
  router.push({ path: '/profile' })
}

const dismissProfilePrompt = () => {
  showProfilePromptDialog.value = false
  if (profilePromptTimer.value) {
    clearTimeout(profilePromptTimer.value)
    profilePromptTimer.value = null
  }
}

onMounted(() => {
  const handler = () => {
    fetchTwoFactorStatus()
  }

  const emailHandler = () => {
    fetchEmailStatus()
  }

  window.addEventListener('two-factor-status-updated', handler)
  window.addEventListener('email-status-updated', emailHandler)
  fetchTwoFactorStatus()
  fetchEmailStatus()
  onUnmounted(() => {
    window.removeEventListener('two-factor-status-updated', handler)
    window.removeEventListener('email-status-updated', emailHandler)
    if (profilePromptTimer.value) {
      clearTimeout(profilePromptTimer.value)
      profilePromptTimer.value = null
    }
  })
})
</script>

<template>
  <VBadge
    dot
    location="bottom right"
    offset-x="3"
    offset-y="3"
    bordered
    color="success"
  >
    <VAvatar
      class="cursor-pointer profile-avatar"
      color="primary"
      variant="tonal"
      size="42"
    >
      <VImg
        v-if="userData && userData.avatar"
        :src="userData.avatar"
      />
      <VIcon
        v-else
        icon="tabler-user"
      />

      <!-- SECTION Premium Menu -->
      <VMenu
        activator="parent"
        width="300"
        location="bottom end"
        offset="14px"
        transition="slide-y-transition"
        :close-on-content-click="false"
      >
        <VCard
          class="profile-menu-card"
          elevation="10"
          rounded="lg"
        >
          <!-- Premium Header with Gradient -->
          <VCardItem class="profile-header pa-4">
            <template #prepend>
              <VAvatar
                size="56"
                color="primary"
                variant="flat"
                class="profile-header-avatar"
              >
                <VImg
                  v-if="userData && userData.avatar"
                  :src="userData.avatar"
                />
                <VIcon
                  v-else
                  icon="tabler-user"
                  size="28"
                />
                <template #badge>
                  <VBadge
                    dot
                    location="bottom right"
                    offset-x="5"
                    offset-y="5"
                    color="success"
                    bordered
                  />
                </template>
              </VAvatar>
            </template>

            <VCardTitle class="font-weight-bold text-h6 pa-0">
              {{ userData?.fullName || 'User Name' }}
            </VCardTitle>
            <VCardSubtitle class="text-caption text-medium-emphasis pa-0 mt-1">
              {{ userData?.email || 'user@example.com' }}
            </VCardSubtitle>
          </VCardItem>

          <VDivider />

          <!-- Menu Items with Modern Design -->
          <VList
            class="py-2"
            density="compact"
          >
            <!-- Password Reset -->
            <VListItem
              class="menu-item"
              active-color="primary"
              rounded="lg"
              @click="showResetPassDialog = true"
            >
              <template #prepend>
                <VIcon
                  icon="tabler-lock"
                  size="20"
                  color="primary"
                  class="menu-icon"
                />
              </template>
              <VListItemTitle class="font-weight-medium">
                Password Reset
              </VListItemTitle>
              <template #append>
                <VIcon
                  icon="tabler-chevron-right"
                  size="18"
                  class="chevron-icon"
                />
              </template>
            </VListItem>

            <!-- Two-Factor Auth with Progress Chip -->
            <VListItem
              class="menu-item"
              :to="{ path: '/two-factor' }"
              rounded="lg"
            >
              <template #prepend>
                <VIcon
                  icon="tabler-shield-lock"
                  size="20"
                  :color="twoFactorEnabled ? 'success' : 'warning'"
                  class="menu-icon"
                />
              </template>
              <div class="d-flex flex-column w-100">
                <div class="d-flex align-center justify-space-between w-100">
                  <span class="font-weight-medium">Two-Factor Auth</span>
                  <VChip
                    :color="twoFactorEnabled ? 'success' : 'warning'"
                    size="x-small"
                    variant="tonal"
                    class="status-chip"
                  >
                    <span class="px-1">{{ twoFactorEnabled ? 'ACTIVE' : 'INACTIVE' }}</span>
                  </VChip>
                </div>
                <span class="text-caption text-medium-emphasis mt-1">
                  {{ twoFactorEnabled ? 'Enhanced security enabled' : 'Add extra security' }}
                </span>
              </div>
            </VListItem>

            <!-- Profile with Progress Bar -->
            <VListItem
              class="menu-item"
              :to="{ path: '/profile' }"
              rounded="lg"
            >
              <template #prepend>
                <VIcon
                  icon="tabler-user-circle"
                  size="20"
                  color="info"
                  class="menu-icon"
                />
              </template>
              <div class="d-flex flex-column w-100">
                <div class="d-flex align-center justify-space-between w-100">
                  <span class="font-weight-medium">Profile</span>
                  <VChip
                    :color="profileCompleted ? 'success' : 'info'"
                    size="x-small"
                    variant="tonal"
                    class="status-chip"
                  >
                    <span class="px-1">{{ profileStatusChip }}</span>
                  </VChip>
                </div>
                <div class="mt-1">
                  <VProgressLinear
                    v-if="!profileCompleted"
                    :model-value="(profileStep || 0) * 20"
                    height="4"
                    color="info"
                    bg-color="info-lighten-4"
                    rounded
                  />
                  <span
                    v-else
                    class="text-caption text-success"
                  >✓ Profile completed</span>
                </div>
              </div>
            </VListItem>

            <!-- Email with Verification Status -->
            <VListItem
              class="menu-item"
              :to="{ path: '/email-verification' }"
              :disabled="emailVerified"
              rounded="lg"
            >
              <template #prepend>
                <VIcon
                  icon="tabler-mail"
                  size="20"
                  :color="emailVerified ? 'success' : 'warning'"
                  class="menu-icon"
                />
              </template>
              <div class="d-flex flex-column w-100">
                <div class="d-flex align-center justify-space-between w-100">
                  <span class="font-weight-medium">Email</span>
                  <VChip
                    :color="emailVerified ? 'success' : 'warning'"
                    size="x-small"
                    variant="tonal"
                    class="status-chip"
                  >
                    <span class="px-1">{{ emailVerified ? 'VERIFIED' : 'UNVERIFIED' }}</span>
                  </VChip>
                </div>
                <span class="text-caption text-medium-emphasis mt-1 text-truncate">
                  {{ emailStatus.email }}
                </span>
              </div>
            </VListItem>
          </VList>

          <VDivider />

          <!-- Logout Section with Danger Style -->
          <VCardActions class="pa-2">
            <VBtn
              block
              variant="text"
              color="error"
              class="logout-btn"
              @click="logout"
            >
              <VIcon
                icon="tabler-logout"
                size="18"
                class="me-2"
              />
              Logout
            </VBtn>
          </VCardActions>
        </VCard>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>

  <ResetPass v-model="showResetPassDialog" />

  <VDialog
    v-model="showEmailVerifyDialog"
    persistent
    max-width="520"
  >
    <VCard class="pa-4">
      <VCardTitle class="text-h5 pb-1">
        Verify your email
      </VCardTitle>
      <VCardText class="pt-0">
        <p class="text-body-1 mb-2">
          We need to confirm your email ({{ emailStatus.email || 'your email' }}) before unlocking every feature.
        </p>
        <p class="text-body-2 mb-0">
          Click below to open the verification page and send yourself a new link. You can continue exploring and verify later if you prefer.
        </p>
      </VCardText>
      <VCardActions class="justify-end gap-2 flex-wrap">
        <VBtn
          variant="text"
          color="secondary"
          @click="dismissEmailVerificationPrompt"
        >
          Remind me later
        </VBtn>
        <VBtn
          color="primary"
          @click="goToEmailVerificationPage"
        >
          Go to Email Verification
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>          

  <VDialog
    v-model="showProfilePromptDialog"
    persistent
    max-width="520"
  >
    <VCard class="pa-4">
      <VCardTitle class="text-h5 pb-1">
        Complete your profile
      </VCardTitle>
      <VCardText class="pt-0">
        <p class="text-body-1 mb-2">
          We still need a few details to finish setting up your account.
        </p>
        <p class="text-body-2 mb-0">
          Completing your profile unlocks scheduling, messaging, and other protected areas of the app.
        </p>
      </VCardText>
      <VCardActions class="justify-end gap-2 flex-wrap">
        <VBtn
          variant="text"
          color="secondary"
          @click="dismissProfilePrompt"
        >
          Remind me later
        </VBtn>
        <VBtn
          color="primary"
          @click="goToProfileProgress"
        >
          Complete profile
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.profile-avatar {
  transition: transform 0.2s ease;
}

.profile-avatar:hover {
  transform: scale(1.05);
}

.profile-menu-card {
  overflow: hidden;
  border: none;
}

.profile-header {
  background: linear-gradient(145deg, rgba(var(--v-theme-primary), 0.05) 0%, rgba(var(--v-theme-primary), 0.02) 100%);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
}

.profile-header-avatar {
  border: 2px solid rgb(var(--v-theme-primary));
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.2);
}

.menu-item {
  margin: 4px 8px;
  transition: all 0.2s ease;
  border-radius: 8px;
}

.menu-item:hover {
  background: rgba(var(--v-theme-primary), 0.06);
  transform: translateX(2px);
}

.menu-icon {
  opacity: 0.9;
  transition: opacity 0.2s ease;
}

.menu-item:hover .menu-icon {
  opacity: 1;
}

.chevron-icon {
  opacity: 0;
  transform: translateX(-5px);
  transition: all 0.2s ease;
}

.menu-item:hover .chevron-icon {
  opacity: 0.5;
  transform: translateX(0);
}

.status-chip {
  font-weight: 600;
  letter-spacing: 0.03em;
  height: 20px;
}

.logout-btn {
  border-radius: 8px;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: rgba(var(--v-theme-error), 0.08) !important;
  transform: scale(0.98);
}

/* Smooth transitions */
.slide-y-transition-enter-active,
.slide-y-transition-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.slide-y-transition-enter-from,
.slide-y-transition-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Progress bar styling */
:deep(.v-progress-linear) {
  border-radius: 4px;
}

/* Chip styling */
:deep(.v-chip) {
  font-size: 0.65rem;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .profile-menu-card {
    width: 280px !important;
  }
}
</style>