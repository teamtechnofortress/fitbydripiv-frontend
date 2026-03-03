<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig";
import * as Network from "@/network";
import * as Const from "@/network/const";
import { requiredValidator } from '@validators';
import VueSelect from "vue-select";
import { useToast } from "vue-toastification";

const { theme } = useThemeConfig();
const route = useRoute();
const refVForm = ref();
const toast = useToast();
const options = ref([]);
const patient = ref([]);
const patientList = ref([]);
const patientFullName = ref('');
const planDate = ref(new Date().toJSON().slice(0, 10));
const validationError = ref('');
const patientPlan = ref([]);
const isLoading = ref(false);
const isConfirmDialogVisible = ref(false);
const emit = defineEmits(['next-tab']);
const chiefComplaintData = ref({});
const signImg = ref('');
const intakeData = ref("");
const props = defineProps({
  pid: {
    type: Number,
    required: true 
  }
});


const tagSelected = (value) => {  
  patient.value = patientList.value.find( user => `${user.first_name} ${user.middle_name || ''} ${user.last_name}` == value);  
  patientFullName.value = `${patient.value.first_name} ${patient.value.middle_name || ''} ${patient.value.last_name}`;
  validationError.value = '';
  //
  patientPlan.value = patient.value.patient_plan?.find( item => item.date == planDate.value) || {};
}

const getPatientName = (value) => {
  Network.getRequestNoAuth(Const.GET_PATIENT_BY_NAME, {}, {fname: value}, 
    (response) => {
      if(response.data.success){
        options.value = response.data.message.map( item => `${item.first_name} ${item.middle_name || ''} ${item.last_name}` );
        patientList.value = response.data.message;
      }else{
        console.log(`Error: ${response.data.err_msg}`);
      }
    }
  );
}

function onSearch(searchTxt){
  if(searchTxt.length >= 3){
    getPatientName(searchTxt);
  }
}


function saveForm(){  
  if(validate()){
      isLoading.value = true;
      refVForm.value?.validate().then(({ valid: isValid }) => {    
          if (isValid){
              Network.postRequest(Const.ADD_PATIENT_PLAN, {}, 
                  {...patientPlan.value, 
                    patient_id: patient.value.id, 
                    date: (planDate.value || (new Date().toJSON().slice(0, 10))),
                    treatment_type: chiefComplaintData?.value?.treatment_type,
                  }, 
                  (response) => {
                      isLoading.value = false;
                      if(response.data.success){
                          toast.success("Patient Plan saved successfully!");    
                          emit('next-tab', patient.value.id);
                      }else{
                          console.log(`Error: ${response.data.err_msg}`);
                      }
                  }
              );
          }else{
              isLoading.value = false;
              toast.error("Please fill out the fields!");
          }
      });  
  }
}

function validate() {  
  if (!patientFullName.value) {
    validationError.value = 'This field is required.'  
    toast.error("Please select a patient!");
    refVForm.value?.resetValidation();  
    return 0
  } else {
    validationError.value = ''    
    return 1
  }
}

function doConfirm(value){
  if(value){    
    saveForm();
  }
}

function doParse(rawText){
    return rawText.replace(/\[([^\]]+)\]/g, (_, key) => {
        if(key=='patientName') {
            return patientFullName.value;
        }else if(key=='age'){
            return patient.value.age;
        }else if(key=='gender'){
            return patient.value.gender;        
        }else if(key=='goal'){            
            return !intakeData.value ? 'goal' : intakeData.value[0].split('_')[1];
        }else if(key=='symptoms'){            
            return !intakeData.value ? 'symptoms' : intakeData.value[1];
        }else{
            return `[${key}]`;
        }
    });
}

function getFieldsWithOne(obj) {
  if(!obj) return null;
  return Object.entries(obj).filter(([key, value]) => value === 1).map(([key]) => key);
}

const getPatientPlanById = (pID, date) => {
  Network.getRequest(Const.GET_PATIENT_PLAN, {}, {pid: pID, date: date}, 
    (response) => {
      if(response.data.success){
        const data = response.data.data.plan;
        patient.value = data.patient;
        patientFullName.value = `${patient.value.first_name} ${patient.value.middle_name || ''} ${patient.value.last_name}`;
        planDate.value = data.date;
        patientPlan.value = data;
        chiefComplaintData.value = data.chiefComplaint;
        intakeData.value = getFieldsWithOne(response.data.data.intake1);        
        //
        patientPlan.value.plan = doParse(patientPlan.value.plan);
      }else{
        console.log(`Error: ${response.data.err_msg}`);
      }
    }
  );
}

const getSignature = () => {
  Network.getRequest(Const.GET_SIGNATURE_URL, {}, {},
      (response) => {
          if(response.data.success){            
            signImg.value = response.data.data.signature;
          }else{
              console.log(`Error: ${response.data.err_msg}`);
          }
      }
  );
}

onMounted(()=>{      
  const patientId = route.query.pid ?? props.pid;
  if(patientId) {
    getPatientPlanById(patientId, planDate.value);
  }
  getSignature();
});
</script>

<template>
<section>
<VRow>
    <VCol cols="12">
    <VForm ref="refVForm" @submit.prevent="saveForm">
        <VCard>
            <VCardText class="mb-4">
                <VRow class="mb-2">                    
                  <VCol class="d-flex align-center" cols="4" sm="12" md="4">
                      <label class="me-4">Patient Name:</label>                        
                      <vue-select
                          :class="{'vue-select-custom': theme=='dark', 'is-invalid': validationError }"                       
                          v-model="patientFullName"
                          :options="options" 
                          @option:selected="tagSelected"
                          @option:deselected="tagSelected"
                          @search="onSearch"
                          :rules=[requiredValidator]
                          style="min-width: 15rem;">                                
                      </vue-select> 
                  </VCol>
                  <VCol class="d-flex align-center" cols="3" sm="12" md="3">
                      <label class="me-4">Date of Birth:</label>
                      <div>{{ patient?.birthday }}</div>                            
                  </VCol>
                  <VCol class="d-flex align-center" cols="5" sm="12" md="5">
                      <label class="ms-4 ">Treatment Type:</label>
                      <div class="ms-4">{{ chiefComplaintData?.treatment_type }}</div>                            
                  </VCol>                     
                </VRow>
                
                <h4 class="mb-3">PATIENT PLAN</h4>                
                <VRow class="mb-4">
                    <VTextarea v-model="patientPlan['plan']" rows="10" :rules="[requiredValidator]"></VTextarea>                            
                </VRow>
                
                <VRow>
                  <VCol cols="12">                        
                    <label>Signature:</label>
                    <VRow v-if="signImg" class="pt-4">        
                      <img
                        :src="signImg"
                        alt="Signature Pad"
                        style="width: 150px!important;"
                        class="w-25 ms-2" />
                    </VRow>
                  </VCol>
                </VRow>

                <VRow class="mt-4 pt-4">
                    <VBtn v-if="!isLoading" class="d-flex mx-auto" color="primary" @click="isConfirmDialogVisible=!isConfirmDialogVisible">UPDATE PATIENT PLAN</VBtn>
                    <VCol v-else cols="12" class="text-center">
                        <div size="large" class="mx-auto" style="width: 15rem;"><VProgressCircular color="primary" indeterminate /></div>
                    </VCol>
                </VRow>
            </VCardText>            
        </VCard>
    </VForm>  
    <!-- 👉 Confirm Dialog -->
    <ConfirmDialog
        v-model:isDialogVisible="isConfirmDialogVisible"
        confirmation-msg="We will save this change by you. Are you sure to update this?"
        @confirm="doConfirm"
    />   
    </VCol>
</VRow>
</section>
</template>

<style lang="scss">
.app-user-search-filter {
  inline-size: 31.6rem;
}
.text-capitalize {
  text-transform: capitalize;
}
</style>
