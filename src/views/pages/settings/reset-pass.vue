<script setup>
import { requiredValidator } from '@/@core/utils/validators';
import * as Network from "@/network";
import * as Const from "@/network/const";
import { useToast } from "vue-toastification";

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue'])

const refVForm = ref();
const isPasswordVisible = ref(false);
const password = ref();
const confirmPassword = ref();
const toast = useToast();
const errors = ref({
  password: undefined,
  confirmPassword: undefined,
})


function updateDialog(value) {
  emit('update:modelValue', value)
}

const initErrorMsg = () => {
    setTimeout(()=>{
        errors.value.password = undefined;
        errors.value.confirmPassword = undefined;
    }, 2000);
}

function saveForm() {
    refVForm.value?.validate().then(({ valid: isValid }) => {
        if (isValid) {
            if(password.value.length < 8){
                errors.value.password = "Password length should be at least 8!";
                initErrorMsg(); return;
            }

            if(password.value != confirmPassword.value){
                errors.value.confirmPassword = "Please confirm your password!";
                initErrorMsg(); return;
            }

            //submit
            Network.postRequest(Const.CHANGE_PASSWORD_URL, {}, {newPassword: password.value}, 
                (response)=>{
                    if(response.data.success){
                        toast.success(`Successfully Resettled Password.`);
                    }else{
                        toast.error(`Error: ${response.data.err_msg}`);
                    }            
                    closeDialog();
                }
            );
        }
    });
  
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
        Reset Password
        </VCardTitle>
      
        <!-- SECTION Theming -->
         <VForm ref="refVForm" @submit.prevent="saveForm">
            <VCardText>
                <VCol cols="12">                    
                    <VTextField
                        v-model="password"
                        label="New Password"
                        :rules="[requiredValidator]"
                        :type="isPasswordVisible ? 'text' : 'password'"
                        :error-messages="errors.password"
                        :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                        @click:append-inner="isPasswordVisible = !isPasswordVisible"
                    />
                </VCol>
                <VCol cols="12">                    
                    <VTextField
                        v-model="confirmPassword"
                        label="Confirm Password"
                        :rules="[requiredValidator]"
                        :type="isPasswordVisible ? 'text' : 'password'"
                        :error-messages="errors.confirmPassword"
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
                    Update
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

