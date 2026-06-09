<script setup>
import { requiredValidator } from '@/@core/utils/validators'
import * as Network from "@/network"
import * as Const from "@/network/const"
import { useToast } from "vue-toastification"

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  isConfirmed:{
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'update:isConfirmed'])

const refVForm = ref()
const isPasswordVisible = ref(false)
const password = ref()
const confirmPassword = ref()
const toast = useToast()

const errors = ref({
  password: undefined,
  confirmPassword: undefined,
})


function updateDialog(value) {
  emit('update:modelValue', value)
}

const initErrorMsg = () => {
  setTimeout(()=>{
    errors.value.password = undefined
    errors.value.confirmPassword = undefined
  }, 2000)
}

function saveForm() {
    
  Network.postRequest(Const.CONFIRM_PASSWORD_URL, {}, { password: password.value }, 
    response=>{
      if(response.data.data){
        toast.success(`Successfully Confirmed Password.`)
        emit('update:isConfirmed', true)
      }else{
        toast.error(`Password is incorrect. Please try again.`)
        emit('update:isConfirmed', false)
      }            
      closeDialog()
    },
  )
  
}

function closeDialog() {
  emit('update:modelValue', false)
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="480"
    @update:model-value="updateDialog"
  >
    <VCard>
      <VCardTitle class="text-h6 mt-4 text-center">
        Digital Signature
      </VCardTitle>
      
      <!-- SECTION Theming -->
      <VForm
        ref="refVForm"
        @submit.prevent="saveForm"
      >
        <VCardText>
          <label class="pa-2">Please Confirm your password</label>                   
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
          </VCol>                        
        </VCardText> 
            
        <VCardActions class="justify-end">
          <VBtn
            variant="flat"
            color="primary"
            type="submit"
          >
            Confirm
          </VBtn>
          <VBtn
            variant="text"
            @click="closeDialog"
          >
            Exit
          </VBtn>
        </VCardActions>
      </VForm>
      <!-- !SECTION -->        
    </VCard>
  </VDialog>
</template>

