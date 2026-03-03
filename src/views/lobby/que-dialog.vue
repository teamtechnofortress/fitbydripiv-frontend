<script setup>
import { requiredValidator } from "@/@core/utils/validators";
import * as Network from "@/network";
import * as Const from "@/network/const";
import { ref } from 'vue';
import { useToast } from "vue-toastification";

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },  
  physicalExamData: {},
  complaintData: {},
  patientName: ""
});
const emit = defineEmits(['update:modelValue', 'refresh']);

const refVForm = ref();
const toast = useToast();

function updateDialog(value) {
  emit('update:modelValue', value)
}

function closeDialog() {
  emit('update:modelValue', false)
}

const loading = ref(false);


function saveForm(){ 
  refVForm.value?.validate().then(({ valid: isValid }) => {
    loading.value = true;
    if (isValid){         
      Network.postRequest(`${Const.UPDATE_PHYSICAL_EXAM_URL}/${props.physicalExamData.id}`, {}, 
        { ...props.physicalExamData, ...{complaint_id: props.complaintData.id, treatment_type: props.complaintData.treatment_type} }, 
      (response)=>{        
        loading.value = false;
        if(response.data.success){
          toast.success(response.data.message);
          setTimeout(()=>{
            closeDialog();
            emit('refresh', true);
          }, 500);
          //
        }else{
          toast.error(response.data.err_msg);
        }
      })
    }else{
      loading.value = false;
      toast.error("Please fill out the fields!");
    }
  });    
}

onMounted(()=>{  
});
</script>

<template>
<VDialog  
    max-width="640"
    :model-value="modelValue"
    @update:model-value="updateDialog"
  >
  <VForm ref="refVForm" @submit.prevent="saveForm">
    <VCard>
      <VCardTitle class="text-h6 mt-4 text-center">
        Edit Patient Vitals ( {{ patientName }} )
      </VCardTitle>      
      <VDivider class="mt-2" />
      <VCardText>
        <VRow class="mt-2">
          <VCol class="d-flex align-center" cols="6">              
            <VSelect
                v-model="complaintData['treatment_type']"
                :items="['IV Therapy', 'Injectables', 'Weight Loss', 'Other']"
                label="Treatment Type"
                variant="underlined"
                :rules=[requiredValidator]                  
                class="w-100"></VSelect>
          </VCol>  
          <VCol cols="6">
              <VTextField
                  v-model="physicalExamData['BP']"
                  label="BP"
                  variant="underlined"
                  :rules=[requiredValidator]
                  class="w-100"></VTextField>
          </VCol>
          <VCol cols="6">
              <VTextField
                  v-model="physicalExamData['HR']"
                  label="HR"
                  variant="underlined"
                  :rules=[requiredValidator]
                  class="w-100"></VTextField>
          </VCol>
          <VCol cols="6">
              <VTextField
                  v-model="physicalExamData['Temp']"
                  label="Temp"
                  variant="underlined"
                  :rules=[requiredValidator]
                  class="w-100"></VTextField>
          </VCol>          
        </VRow>       

      </VCardText>

      <VCardActions class="justify-center mt-4">        
        <VBtn v-if="!loading" variant="flat" color="primary" type="submit" class="me-4">Save</VBtn>
        <VProgressCircular v-else class="me-4" indeterminate/> 
        <VBtn variant="text" @click="closeDialog">Cancel</VBtn>
      </VCardActions>
    </VCard>
  </VForm>
</VDialog>  
</template>