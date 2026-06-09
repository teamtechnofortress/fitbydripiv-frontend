<script setup>
import * as Network from "@/network"
import * as Const from "@/network/const"
import { onMounted, ref, watch } from 'vue'
import { useToast } from "vue-toastification"
import { devLog } from '@/utils/devLogger'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])
const toast = useToast()
const loading = ref(false)
const memberList = ref([])
const userData = JSON.parse(localStorage.getItem('userData') || 'null')

function updateDialog(value) {
  devLog('Security dialog update', { open: value })
  emit('update:modelValue', value)
}

function saveForm() {      
  devLog('Security dialog save triggered', { count: memberList.value.length })
  loading.value = true
  Network.postRequest(Const.SECURITY_SAVE_URL, {}, { userList: [...memberList.value] }, 
    response=>{
      loading.value = false
      if(response.data.success){
        devLog('Security dialog save success')
        toast.success(`Successfully Saved Security Settings.`)          
      }else{
        devLog('Security dialog save failed', { error: response.data.err_msg })
        toast.error(`Password is incorrect. Please try again.`)          
      }
      setTimeout(() => {
        closeDialog()
      }, 1000)
    },
  )  
}

function closeDialog() {
  devLog('Security dialog closed')
  emit('update:modelValue', false)
}

const hasAccessToken = () => {
  try {
    return !!localStorage.getItem('accessToken')
  } catch (error) {
    return false
  }
}

const getAllMembers = () => {
  if (!hasAccessToken()) {
    devLog('Security dialog skipped getAllMembers: missing token')
    
    return
  }
  devLog('Security dialog fetching members')
  loading.value = true
  Network.getRequest(`${Const.GET_ALL_MEMBERS}`, {}, {}, 
    response => {
      loading.value = false
      if(response.data.success){        
        const data = response.data.data

        memberList.value = data.membersList.map(user => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status == 1,
        })) || []
        devLog('Security dialog members fetched', { count: memberList.value.length })
      }else{
        devLog('Security dialog members fetch failed', { error: response.data.err_msg })
        toast.error(response.data.err_msg || "Failed to load members.")
      }
    },
  )
}

watch(() => props.modelValue, value => {
  if (value) {
    getAllMembers()
  }
})

onMounted(() => {
  if (props.modelValue) {
    getAllMembers()
  }
})
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="840"
    @update:model-value="updateDialog"
  >
    <VCard>
      <VCardTitle class="text-h6 mt-2 text-center">
        SECURITY
      </VCardTitle>
      <div class="text-subtitle-1 mt-2 mx-4">
        PASSWORDS : 
      </div>
      <VCardText>
        <div class="text-subtitle-1 mb-2">
          EMPLOYEE
        </div>
        
        <VRow>
          <VCol
            v-if="!loading"
            cols="12"
          >
            <VTable class="border">
              <tbody>
                <tr
                  v-for="(item, index) in memberList?.filter(user => user.role === 'staff')"
                  :key="index"
                >
                  <td>{{ index + 1 }}</td>
                  <td class="text-primary">
                    {{ `${item.firstName} ${item.lastName}` }}
                  </td>
                  <td>{{ item.email }}</td>                    
                  <td style="width: 8rem;">                        
                    <VCheckbox
                      v-model="item.status"
                      :label="item.status ? 'ENABLED' : 'DISABLED'"
                      :color="item.status ? 'primary' : 'danger'"
                    />
                  </td>
                </tr>                                
              </tbody>
            </VTable>
          </VCol>
          <VCol
            v-else
            cols="12"
            class="text-center"
          >
            <VProgressCircular
              color="white"
              indeterminate
            />
          </VCol>      
        </VRow>

        <template v-if="userData?.role === 'admin'">
          <VDivider class="mt-4" />  
          <div class="text-subtitle-1 mt-4 mb-2">
            ADMINISTRATOR
          </div>
          <VRow>
            <VCol cols="12">
              <VTable class="border">
                <tbody>
                  <tr
                    v-for="(item, index) in memberList?.filter(user => user.role === 'admin')"
                    :key="index"
                  >
                    <td>{{ index + 1 }}</td>
                    <td class="text-primary">
                      {{ `${item.firstName} ${item.lastName}` }}
                    </td>
                    <td>{{ item.email }}</td>                    
                    <td style="width: 8rem;">
                      <VCheckbox
                        v-model="item.status"
                        :label="item.status ? 'ENABLED' : 'DISABLED'"
                        :color="item.status ? 'primary' : 'danger'"
                      />
                    </td>
                  </tr>                                
                </tbody>
              </VTable>
            </VCol>
          </VRow>
        </template>


        <VDivider class="mt-2" />
      </VCardText>

      <VCardActions class="justify-center mb-4 mt-2">
        <VBtn
          variant="flat"
          color="primary"
          @click="saveForm"
        >
          Save
        </VBtn>
        <VBtn
          variant="text"
          @click="closeDialog"
        >
          Cancel
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

