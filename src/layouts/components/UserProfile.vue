<script setup>
import * as Network from "@/network";
import * as Const from "@/network/const";
import { initialAbility } from '@/plugins/casl/ability';
import { useAppAbility } from '@/plugins/casl/useAppAbility';
import ResetPass from '@/views/pages/settings/reset-pass.vue';
import { computed, onMounted, ref, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification';

const router = useRouter()
const ability = useAppAbility()
const userData = ref(JSON.parse(localStorage.getItem('userData') || 'null'))
const toast = useToast()
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
  })
}

onMounted(() => {
  fetchTwoFactorStatus()
})

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
      class="cursor-pointer"
      color="primary"
      variant="tonal"
    >
      <VImg
        v-if="userData && userData.avatar"
        :src="userData.avatar"
      />
      <VIcon
        v-else
        icon="tabler-user"
      />

      <!-- SECTION Menu -->
      <VMenu
        activator="parent"
        width="230"
        location="bottom end"
        offset="14px"
      >
        <VList>
          <!-- 👉 User Avatar & Name -->
          <VListItem>
            <template #prepend>
              <VListItemAction start>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                >
                  <VAvatar
                    color="primary"
                    variant="tonal"
                  >
                    <VImg
                      v-if="userData && userData.avatar"
                      :src="userData.avatar"
                    />
                    <VIcon
                      v-else
                      icon="tabler-user"
                    />
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold">
              {{ userData?.fullName || 'User' }}
            </VListItemTitle>
            <VListItemSubtitle>{{ `${userData?.firstName || ''} ${userData?.middleName || ''} ${userData?.lastName || ''}`.trim() }}</VListItemSubtitle>
          </VListItem>

          <VDivider class="my-2" />

          <!-- 👉 Profile -->
          <VListItem>
            <template #prepend>
              <VIcon
                class="me-2"
                icon="tabler-key"
                size="22"
              />
            </template>

            <VListItemTitle @click="showResetPassDialog = true" class="cursor-pointer">Password Reset</VListItemTitle>
          </VListItem>

          <VListItem>
            <template #prepend>
              <VIcon
                class="me-2"
                icon="tabler-shield"
                size="22"
              />
            </template>

            <div class="d-flex flex-column w-100">
              <div class="profile-status-header">
                <span class="font-weight-medium">Two-Factor Auth</span>
                <span
                  :class="[
                    'status-pill',
                    twoFactorEnabled ? 'status-pill--success' : 'status-pill--warning',
                  ]"
                >
                  {{ twoFactorEnabled ? 'Active' : 'Not Active' }}
                </span>
              </div>
              <VBtn
                class="profile-menu-action mt-2"
                color="primary"
                variant="text"
                size="x-small"
                density="comfortable"
                :loading="twoFactorLoading"
                :to="{ path: '/two-factor' }"
              >
                Configure 2FA
              </VBtn>
            </div>
          </VListItem>

          <VListItem>
            <template #prepend>
              <VIcon
                class="me-2"
                icon="tabler-mail"
                size="22"
              />
            </template>

            <div class="d-flex flex-column w-100">
              <div class="profile-status-header">
                <span class="font-weight-medium">Email Verification</span>
                <span
                  :class="[
                    'status-pill',
                    emailVerified ? 'status-pill--success' : 'status-pill--warning',
                  ]"
                >
                  {{ emailVerified ? 'Verified' : 'Not Verified' }}
                </span>
              </div>
              <small class="text-medium-emphasis">{{ emailStatus.email }}</small>
              <VBtn
                v-if="!emailVerified"
                class="profile-menu-action mt-2"
                color="primary"
                variant="text"
                size="x-small"
                density="comfortable"
                :loading="emailLoading"
                :to="{ path: '/email-verification' }"
              >
                Verify Email
              </VBtn>
            </div>
          </VListItem>

          <!-- Divider -->
          <VDivider class="my-2" />

          <!-- 👉 Logout -->
          <VListItem
            link
            @click="logout"
          >
            <template #prepend>
              <VIcon
                class="me-2"
                icon="tabler-logout"
                size="22"
              />
            </template>

            <VListItemTitle>Logout</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
<ResetPass v-model="showResetPassDialog" />          
</template>

<style scoped>
.profile-menu-action {
  align-self: flex-start;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  min-width: auto;
  padding-inline: 8px;
  line-height: 1.2;
}

.profile-status-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  width: fit-content;
}

.status-pill--success {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.status-pill--warning {
  background: rgba(251, 191, 36, 0.2);
  color: #b45309;
}
</style>
