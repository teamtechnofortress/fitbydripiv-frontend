<script setup>
import * as Network from "@/network";
import * as Const from "@/network/const";
import { initialAbility } from '@/plugins/casl/ability';
import { useAppAbility } from '@/plugins/casl/useAppAbility';
import ResetPass from '@/views/pages/settings/reset-pass.vue';
import { useToast } from 'vue-toastification';

const router = useRouter()
const ability = useAppAbility()
const userData = JSON.parse(localStorage.getItem('userData') || 'null');
const toast = useToast();

const logout = () => { 
  // Call signout action
  Network.postRequest(Const.LOGOUT_URL, {}, null, response => {
    let res = response.data.success;    
    if (res) {
      // Remove "userData" from localStorage
      localStorage.removeItem('userData');
      // Remove "accessToken" from localStorage
      localStorage.removeItem('accessToken');
      
      // Remove "userAbilities" from localStorage
      localStorage.removeItem('userAbilities');

      // Reset ability to initial ability
      ability.update(initialAbility);

      router.push('/login');

      toast.success("Successfully Logged Out !");
    } else {
      toast.error("Error Logging Out !");
    } 
  });  
}

const showResetPassDialog = ref(false)
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
              {{ userData.fullName }}
            </VListItemTitle>            
            <VListItemSubtitle>{{ `${userData.firstName} ${userData.middleName || ''} ${userData.lastName}` }}</VListItemSubtitle>
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

            <VListItemTitle @click="showResetPassDialog = true;" class="cursor-pointer">Password Reset</VListItemTitle>
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
