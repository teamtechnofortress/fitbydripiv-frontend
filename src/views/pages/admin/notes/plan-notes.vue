<script setup>
import * as Network from "@/network";
import * as Const from "@/network/const";
import { requiredValidator } from '@validators';
import { onMounted } from "vue";
import { useToast } from "vue-toastification";

const refVForm = ref();
const toast = useToast();
const complaint = ref([]);
const isLoading = ref(false);
const planOrderText = ref('');

const sorts = ref(['IV Therapy', 'Injectables', 'Weight Loss', 'Other']);

const carePlanText = ref('');
const ivCarePlan = ref(`[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of [symptoms]
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. 
Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`);
const wlCarePlan = ref(`[patientName] is a [age] year old [gender] who presents today for Weight Loss treatment for [goal].
Patient has complaints of [symptoms]
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. 
Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`);
const ptCarePlan = ref(`[patientName] is a [age] year old [gender] who presents today for Peptide Therapy for [goal].
Patient has complaints of [symptoms]
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. 
Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`);

const instructionText = ref('');
const ivInstruction = ref(`[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of [symptoms]
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. 
Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`);
const wlInstruction = ref(`[patientName] is a [age] year old [gender] who presents today for Weight Loss treatment for [goal].
Patient has complaints of [symptoms]
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. 
Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`);
const ptInstruction = ref(`[patientName] is a [age] year old [gender] who presents today for Peptide Therapy for [goal].
Patient has complaints of [symptoms]
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. 
Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`);

const ivContent = ref(`[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of [symptoms]
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. 
Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
Weight is [weight] kgs. 
BMI is [bmi].
`);
const weightLossContent = ref(`[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of obesity, failure, joint pain, and difficulty with exertion. Patient expresses a desire to lose weight in improve overall health and reduce obesity-related comorbidities. Patient reports previous weight loss attempts, including diet, exercise have been ineffective. Patient past medical history was reviewed extensively, including current medications. The patient is motivated to pursue compounded weight loss injections as part of a comprehensive weight management plan, following discussion risks, benefits, and alternatives. Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below. The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
Weight is [weight] kgs. 
BMI is [bmi].
`);
const peptideContent = ref(`[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of fatigue, reduced energy and desire to improve overall health, patient reports decreased stamina during daily activities and subjective sense of aging, with loss of vitality, energy and increased fatigue.
The patient is motivated to pursue compounded treatments as part of a comprehensive management plan, following discussion of risks, benefits, and alternatives.
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
The patient is motivated to explore peptide therapies to enhance vitality, optimize health, and support anti-aging goals, following discussion of potential benefits, risks, and alternatives. Patient past medical history was reviewed extensively, including current medications.
Weight is [weight] kgs. 
BMI is [bmi].
`);

function saveForm(){  
    refVForm.value?.validate().then(({ valid: isValid }) => {    
        if (isValid){
            isLoading.value = true;
            Network.postRequest(Const.ADD_ADMIN_PLAN_NOTES, {}, {
                ...complaint.value, plan_order: planOrderText.value, plan_care: carePlanText.value, plan_instruction: instructionText.value
            }, 
                (response) => {
                    isLoading.value = false;
                    if(response.data.success){
                        toast.success("Admin Plan Notes saved successfully!");   
                        getNotes();                     
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

function getNotes(){
    isLoading.value = true;
    Network.getRequest(Const.GET_ADMIN_NOTES, {}, {}, 
        (response) => {
            isLoading.value = false;
            if(response.data.success){                
                const notesObj = response.data.data.notes;
                if(notesObj){
                    //plan_order/Dr.Orders
                    ivContent.value         = notesObj.find(item => item.treatment_type == 'IV Therapy')?.plan_order || ivContent.value;
                    weightLossContent.value = notesObj.find(item => item.treatment_type == 'Weight Loss')?.plan_order || weightLossContent.value;
                    peptideContent.value    = notesObj.find(item => item.treatment_type == 'Injectables')?.plan_order || peptideContent.value;

                    //plan_care                    
                    ivCarePlan.value   = notesObj.find(item => item.treatment_type == 'IV Therapy')?.plan_care || ivCarePlan.value;
                    wlCarePlan.value   = notesObj.find(item => item.treatment_type == 'Weight Loss')?.plan_care || wlCarePlan.value;
                    ptCarePlan.value   = notesObj.find(item => item.treatment_type == 'Injectables')?.plan_care || ptCarePlan.value;

                    //plan_instruction
                    ivInstruction.value   = notesObj.find(item => item.treatment_type == 'IV Therapy')?.plan_instruction || ivInstruction.value;
                    wlInstruction.value   = notesObj.find(item => item.treatment_type == 'Weight Loss')?.plan_instruction || wlInstruction.value;
                    ptInstruction.value   = notesObj.find(item => item.treatment_type == 'Injectables')?.plan_instruction || ptInstruction.value;
                }
            }else{
                console.log(`Error: ${response.data.err_msg}`);
            }
        }
    );
}

onMounted(()=>{
    getNotes();
})

function updateType(_type){
    if(_type == 'IV Therapy'){
        planOrderText.value = ivContent.value;
        carePlanText.value = ivCarePlan.value;
        instructionText.value = ivInstruction.value;
    }else if(_type == 'Weight Loss'){
        planOrderText.value = weightLossContent.value;
        carePlanText.value = wlCarePlan.value;
        instructionText.value = wlInstruction.value;
    }else{
        planOrderText.value = peptideContent.value;
        carePlanText.value = ptCarePlan.value;
        instructionText.value = ptInstruction.value;
    }
}
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VForm ref="refVForm" @submit.prevent="saveForm">
            <VCard>
                <VCardText class="mb-4">
                    <!-- -->
                    <VRow class="mb-2">
                        <VCol cols="8" class="d-flex align-center">
                            <h4>Dr. ORDERS</h4>
                        </VCol>                        
                        <VCol class="d-flex align-center" cols="4" sm="6" md="4">
                            <label class="mx-4 w-50">Treatment Type:</label>
                            <VSelect
                                v-model="complaint['treatment_type']"
                                :items="sorts"
                                label="Treatment Type"
                                variant="underlined"
                                :rules="[requiredValidator]"
                                @update:modelValue="updateType"
                                class="w-100"></VSelect>
                        </VCol>                    
                    </VRow>                    
                    <VRow class="mt-2">
                        <VCol cols="12" style="min-height: 150px;">
                            <div class="row d-flex align-center">                                    
                                <VTextarea v-model="planOrderText" rows="10" :rules="[requiredValidator]"></VTextarea>
                            </div>                            
                        </VCol>                        
                    </VRow>  
                    <VRow class="mb-4">
                        <VCol cols="12" color="warning">
                            <VAlert color="warning" variant="tonal">
                            *Brackets ( <span color="primary">[patientName]</span>, [age], [gender], [symptoms] ) will be parsed on backend side. Please keep it.
                            </VAlert>
                        </VCol>
                    </VRow>                  
                    
                    <!--  -->
                    <VRow class="mt-4">
                        <VCol cols="8" class="d-flex align-center">
                            <h4>CARE PLAN</h4>
                        </VCol>                                           
                    </VRow>                    
                    <VRow>
                        <VCol cols="12" style="min-height: 150px;">
                            <div class="row d-flex align-center">                                    
                                <VTextarea v-model="carePlanText" rows="10" :rules="[requiredValidator]"></VTextarea>
                            </div>                            
                        </VCol>                        
                    </VRow>
                    <VRow class="mb-4">
                        <VCol cols="12" color="warning">
                            <VAlert color="warning" variant="tonal">
                            *Brackets ( <span color="primary">[patientName]</span>, [age], [gender], [symptoms] ) will be parsed on backend side. Please keep it.
                            </VAlert>
                        </VCol>
                    </VRow>

                    <!--  -->
                    <VRow class="mt-4">
                        <VCol cols="8" class="d-flex align-center">
                            <h4>INSTRUCTIONS</h4>
                        </VCol>                                           
                    </VRow>                    
                    <VRow>
                        <VCol cols="12" style="min-height: 150px;">
                            <div class="row d-flex align-center">                                    
                                <VTextarea v-model="instructionText" rows="10" :rules="[requiredValidator]"></VTextarea>
                            </div>                            
                        </VCol>                        
                    </VRow>
                    <VRow class="mb-4">
                        <VCol cols="12" color="warning">
                            <VAlert color="warning" variant="tonal">
                            *Brackets ( <span color="primary">[patientName]</span>, [age], [gender], [symptoms] ) will be parsed on backend side. Please keep it.
                            </VAlert>
                        </VCol>
                    </VRow>

                    <VRow class="mt-4 pt-4">
                        <VBtn v-if="!isLoading" class="d-flex mx-auto" color="primary" type="submit">UDPATE PLAN NOTES</VBtn>
                        <VCol v-else cols="12" class="text-center">
                            <div size="large" class="mx-auto" style="width: 15rem;"><VProgressCircular color="primary" indeterminate /></div>
                        </VCol>
                    </VRow>
                </VCardText>            
            </VCard>
        </VForm>        
      </VCol>
    </VRow>
  </section>
</template>