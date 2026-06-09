<script setup>
import * as Network from "@/network"
import * as Const from "@/network/const"
import { requiredValidator } from '@validators'
import { onMounted } from "vue"
import { useToast } from "vue-toastification"

const refVForm = ref()
const toast = useToast()
const complaint = ref([])
const isLoading = ref(false)
const riskText = ref("")

const sorts = ref(['IV Therapy', 'Injectables', 'Weight Loss', 'Other'])

const benefitText = ref('')

const ivBenefit = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of [symptoms]
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. 
Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`)

const wlBenefit = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of obesity, failure, joint pain, and difficulty with exertion. Patient expresses a desire to lose weight in improve overall health and reduce obesity-related comorbidities. Patient reports previous weight loss attempts, including diet, exercise have been ineffective. Patient past medical history was reviewed extensively, including current medications. The patient is motivated to pursue compounded weight loss injections as part of a comprehensive weight management plan, following discussion risks, benefits, and alternatives. Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below. The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`)

const ptBenefit = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of fatigue, reduced energy and desire to improve overall health, patient reports decreased stamina during daily activities and subjective sense of aging, with loss of vitality, energy and increased fatigue.
The patient is motivated to pursue compounded treatments as part of a comprehensive management plan, following discussion of risks, benefits, and alternatives.
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
The patient is motivated to explore peptide therapies to enhance vitality, optimize health, and support anti-aging goals, following discussion of potential benefits, risks, and alternatives. Patient past medical history was reviewed extensively, including current medications.
`)

const rewardText = ref('')

const ivReward = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of [symptoms]
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. 
Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`)

const wlReward = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of obesity, failure, joint pain, and difficulty with exertion. Patient expresses a desire to lose weight in improve overall health and reduce obesity-related comorbidities. Patient reports previous weight loss attempts, including diet, exercise have been ineffective. Patient past medical history was reviewed extensively, including current medications. The patient is motivated to pursue compounded weight loss injections as part of a comprehensive weight management plan, following discussion risks, benefits, and alternatives. Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below. The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`)

const ptReward = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of fatigue, reduced energy and desire to improve overall health, patient reports decreased stamina during daily activities and subjective sense of aging, with loss of vitality, energy and increased fatigue.
The patient is motivated to pursue compounded treatments as part of a comprehensive management plan, following discussion of risks, benefits, and alternatives.
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
The patient is motivated to explore peptide therapies to enhance vitality, optimize health, and support anti-aging goals, following discussion of potential benefits, risks, and alternatives. Patient past medical history was reviewed extensively, including current medications.
`)

const ivContent = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of [symptoms]
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. 
Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`)

const weightLossContent = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of obesity, failure, joint pain, and difficulty with exertion. Patient expresses a desire to lose weight in improve overall health and reduce obesity-related comorbidities. Patient reports previous weight loss attempts, including diet, exercise have been ineffective. Patient past medical history was reviewed extensively, including current medications. The patient is motivated to pursue compounded weight loss injections as part of a comprehensive weight management plan, following discussion risks, benefits, and alternatives. Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below. The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
`)

const peptideContent = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of fatigue, reduced energy and desire to improve overall health, patient reports decreased stamina during daily activities and subjective sense of aging, with loss of vitality, energy and increased fatigue.
The patient is motivated to pursue compounded treatments as part of a comprehensive management plan, following discussion of risks, benefits, and alternatives.
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
The patient is motivated to explore peptide therapies to enhance vitality, optimize health, and support anti-aging goals, following discussion of potential benefits, risks, and alternatives. Patient past medical history was reviewed extensively, including current medications.
`) 

function saveForm(){  
  refVForm.value?.validate().then(({ valid: isValid }) => {    
    if (isValid){
      isLoading.value = true
      Network.postRequest(Const.ADD_ADMIN_RISK_BENEFIT_REWARD, {}, {
        ...complaint.value, risk: riskText.value, benefit: benefitText.value, reward: rewardText.value,
      }, 
      response => {
        isLoading.value = false
        if(response.data.success){
          toast.success("Admin Risk, Befefits, Alternatives Notes saved successfully!")   
          getNotes()                     
        }else{
          console.log(`Error: ${response.data.err_msg}`)
        }
      },
      )
    }else{
      isLoading.value = false
      toast.error("Please fill out the fields!")
    }
  })      
}

function getNotes(){
  isLoading.value = true
  Network.getRequest(Const.GET_ADMIN_NOTES, {}, {}, 
    response => {
      isLoading.value = false
      if(response.data.success){                
        const notesObj = response.data.data.notes
        if(notesObj){
          //risk
          ivContent.value         = notesObj.find(item => item.treatment_type == 'IV Therapy')?.risk  || ivContent.value
          weightLossContent.value = notesObj.find(item => item.treatment_type == 'Weight Loss')?.risk || weightLossContent.value
          peptideContent.value    = notesObj.find(item => item.treatment_type == 'Injectables')?.risk || peptideContent.value
                    
          //benefit                    
          ivBenefit.value   = notesObj.find(item => item.treatment_type == 'IV Therapy')?.benefit  || ivBenefit.value
          wlBenefit.value   = notesObj.find(item => item.treatment_type == 'Weight Loss')?.benefit || wlBenefit.value
          ptBenefit.value   = notesObj.find(item => item.treatment_type == 'Injectables')?.benefit || ptBenefit.value
                    
          //reward
          ivReward.value   = notesObj.find(item => item.treatment_type == 'IV Therapy')?.reward  || ivReward.value
          wlReward.value   = notesObj.find(item => item.treatment_type == 'Weight Loss')?.reward || wlReward.value
          ptReward.value   = notesObj.find(item => item.treatment_type == 'Injectables')?.reward || ptReward.value
        }
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

onMounted(()=>{
  getNotes()
})

function updateType(_type){
  if(_type == 'IV Therapy'){
    riskText.value = ivContent.value
    benefitText.value = ivBenefit.value
    rewardText.value = ivReward.value
  }else if(_type == 'Weight Loss'){
    riskText.value = weightLossContent.value
    benefitText.value = wlBenefit.value
    rewardText.value = wlReward.value
  }else{
    riskText.value = peptideContent.value
    benefitText.value = ptBenefit.value
    rewardText.value = ptReward.value
  }
}
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VForm
          ref="refVForm"
          @submit.prevent="saveForm"
        >
          <VCard>
            <VCardText class="mb-4">
              <!-- -->
              <VRow>
                <VCol
                  cols="8"
                  class="d-flex align-center"
                >
                  <h4>RISK</h4>
                </VCol>                        
                <VCol
                  class="d-flex align-center"
                  cols="4"
                  sm="6"
                  md="4"
                >
                  <label class="mx-4 w-50">Treatment Type:</label>
                  <VSelect
                    v-model="complaint['treatment_type']"
                    :items="sorts"
                    label="Treatment Type"
                    variant="underlined"
                    :rules="[requiredValidator]"
                    class="w-100"
                    @update:modelValue="updateType"
                  />
                </VCol>                    
              </VRow>                    
              <VRow class="mt-2">
                <VCol
                  cols="12"
                  style="min-height: 150px;"
                >
                  <div class="row d-flex align-center">                                    
                    <VTextarea
                      v-model="riskText"
                      rows="10"
                      :rules="[requiredValidator]"
                    />
                  </div>                            
                </VCol>                        
              </VRow>
              <VRow class="mb-4">
                <VCol
                  cols="12"
                  color="warning"
                >
                  <VAlert
                    color="warning"
                    variant="tonal"
                  >
                    *Brackets ( <span color="primary">[patientName]</span>, [age], [gender], [symptoms] ) will be parsed on backend side. Please keep it.
                  </VAlert>
                </VCol>
              </VRow>                    
                    
              <!--  -->
              <VRow class="mt-4">
                <VCol
                  cols="8"
                  class="d-flex align-center"
                >
                  <h4>BENEFITS</h4>
                </VCol>                                           
              </VRow>                    
              <VRow>
                <VCol
                  cols="12"
                  style="min-height: 150px;"
                >
                  <div class="row d-flex align-center">                                    
                    <VTextarea
                      v-model="benefitText"
                      rows="10"
                      :rules="[requiredValidator]"
                    />
                  </div>                            
                </VCol>                        
              </VRow>
              <VRow class="mb-4">
                <VCol
                  cols="12"
                  color="warning"
                >
                  <VAlert
                    color="warning"
                    variant="tonal"
                  >
                    *Brackets ( <span color="primary">[patientName]</span>, [age], [gender], [symptoms] ) will be parsed on backend side. Please keep it.
                  </VAlert>
                </VCol>
              </VRow>

              <!--  -->
              <VRow class="mt-4">
                <VCol
                  cols="8"
                  class="d-flex align-center"
                >
                  <h4>ALTERNATIVES</h4>
                </VCol>                                           
              </VRow>                    
              <VRow>
                <VCol
                  cols="12"
                  style="min-height: 150px;"
                >
                  <div class="row d-flex align-center">                                    
                    <VTextarea
                      v-model="rewardText"
                      rows="10"
                      :rules="[requiredValidator]"
                    />
                  </div>                            
                </VCol>                        
              </VRow>
              <VRow class="mb-4">
                <VCol
                  cols="12"
                  color="warning"
                >
                  <VAlert
                    color="warning"
                    variant="tonal"
                  >
                    *Brackets ( <span color="primary">[patientName]</span>, [age], [gender], [symptoms] ) will be parsed on backend side. Please keep it.
                  </VAlert>
                </VCol>
              </VRow>

              <VRow class="mt-4 pt-4">
                <VBtn
                  v-if="!isLoading"
                  class="d-flex mx-auto"
                  color="primary"
                  type="submit"
                >
                  UDPATE NOTES
                </VBtn>
                <VCol
                  v-else
                  cols="12"
                  class="text-center"
                >
                  <div
                    size="large"
                    class="mx-auto"
                    style="width: 15rem;"
                  >
                    <VProgressCircular
                      color="primary"
                      indeterminate
                    />
                  </div>
                </VCol>
              </VRow>
            </VCardText>            
          </VCard>
        </VForm>        
      </VCol>
    </VRow>
  </section>
</template>