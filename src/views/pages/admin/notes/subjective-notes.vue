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
const complaintText = ref('')

const sorts = ref(['IV Therapy', 'Injectables', 'Weight Loss', 'Other'])

const allergiesText = ref("")
const ivAllergies = ref("")
const wlAllergies = ref("")
const ptAllergies = ref("")

const medicationText = ref(``)
const ivMedication = ref(``)
const wlMedication = ref(``)
const ptMedication = ref(``)

const systemReviewText = ref(``)
const ivSystemReview = ref(``)
const wlSystemReview = ref(``)
const ptSystemReview = ref(``)

const conditionsText = ref(``)
const ivConditions = ref(``)
const wlConditions = ref(``)
const ptConditions = ref(``)

const ivContent = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of [symptoms]
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. 
Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
Weight is [weight] kgs. 
BMI is [bmi].
`)

const weightLossContent = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of obesity, failure, joint pain, and difficulty with exertion. Patient expresses a desire to lose weight in improve overall health and reduce obesity-related comorbidities. Patient reports previous weight loss attempts, including diet, exercise have been ineffective. Patient past medical history was reviewed extensively, including current medications. The patient is motivated to pursue compounded weight loss injections as part of a comprehensive weight management plan, following discussion risks, benefits, and alternatives. Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below. The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
Weight is [weight] kgs. 
BMI is [bmi].
`)

const peptideContent = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of fatigue, reduced energy and desire to improve overall health, patient reports decreased stamina during daily activities and subjective sense of aging, with loss of vitality, energy and increased fatigue.
The patient is motivated to pursue compounded treatments as part of a comprehensive management plan, following discussion of risks, benefits, and alternatives.
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
The patient is motivated to explore peptide therapies to enhance vitality, optimize health, and support anti-aging goals, following discussion of potential benefits, risks, and alternatives. Patient past medical history was reviewed extensively, including current medications.
Weight is [weight] kgs. 
BMI is [bmi].
`)

function saveForm(){  
  refVForm.value?.validate().then(({ valid: isValid }) => {    
    if (isValid){
      isLoading.value = true
      Network.postRequest(Const.ADD_ADMIN_SUBJECT_NOTES, {}, {
        ...complaint.value, notes: complaintText.value, allergies: allergiesText.value, medication: medicationText.value, 
        system_review: systemReviewText.value, conditions: conditionsText.value,
      }, 
      response => {
        isLoading.value = false
        if(response.data.success){
          toast.success("Subjective Notes saved successfully!")   
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
          //notes
          ivContent.value         = notesObj.find(item => item.treatment_type == 'IV Therapy')?.notes || ivContent.value
          weightLossContent.value = notesObj.find(item => item.treatment_type == 'Weight Loss')?.notes || weightLossContent.value
          peptideContent.value    = notesObj.find(item => item.treatment_type == 'Injectables')?.notes || peptideContent.value

          //allergies
          ivAllergies.value   = notesObj.find(item => item.treatment_type == 'IV Therapy')?.allergies || ivContent.value
          wlAllergies.value   = notesObj.find(item => item.treatment_type == 'Weight Loss')?.allergies || weightLossContent.value
          ptAllergies.value   = notesObj.find(item => item.treatment_type == 'Injectables')?.allergies || peptideContent.value

          //medication
          ivMedication.value   = notesObj.find(item => item.treatment_type == 'IV Therapy')?.medication || ivContent.value
          wlMedication.value   = notesObj.find(item => item.treatment_type == 'Weight Loss')?.medication || weightLossContent.value
          ptMedication.value   = notesObj.find(item => item.treatment_type == 'Injectables')?.medication || peptideContent.value

          //system review
          ivSystemReview.value = notesObj.find(item => item.treatment_type == 'IV Therapy')?.system_review || ivContent.value
          wlSystemReview.value = notesObj.find(item => item.treatment_type == 'Weight Loss')?.system_review || weightLossContent.value
          ptSystemReview.value = notesObj.find(item => item.treatment_type == 'Injectables')?.system_review || peptideContent.value

          //conditions
          ivConditions.value = notesObj.find(item => item.treatment_type == 'IV Therapy')?.conditions || ivContent.value
          wlConditions.value = notesObj.find(item => item.treatment_type == 'Weight Loss')?.conditions || weightLossContent.value
          ptConditions.value = notesObj.find(item => item.treatment_type == 'Injectables')?.conditions || peptideContent.value

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
    complaintText.value = ivContent.value
    allergiesText.value = ivAllergies.value
    medicationText.value = ivMedication.value
    systemReviewText.value = ivSystemReview.value
    conditionsText.value = ivConditions.value
  }else if(_type == 'Weight Loss'){
    complaintText.value = weightLossContent.value
    allergiesText.value = wlAllergies.value
    medicationText.value = wlMedication.value
    systemReviewText.value = wlSystemReview.value
    conditionsText.value = wlConditions.value
  }else{
    complaintText.value = peptideContent.value
    allergiesText.value = ptAllergies.value
    medicationText.value = ptMedication.value
    systemReviewText.value = ptSystemReview.value
    conditionsText.value = ptConditions.value
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
              <!-- chief -->
              <VRow class="mb-2">
                <VCol
                  cols="8"
                  class="d-flex align-center"
                >
                  <h4>CHIEF COMPLAINT</h4>
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
                      v-model="complaintText"
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
                  <h4>ALLERGIES</h4>
                </VCol>                                           
              </VRow>                    
              <VRow>
                <VCol
                  cols="12"
                  style="min-height: 150px;"
                >
                  <div class="row d-flex align-center">                                    
                    <VTextarea
                      v-model="allergiesText"
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
                  <h4>MEDICATION</h4>
                </VCol>                                           
              </VRow>                    
              <VRow>
                <VCol
                  cols="12"
                  style="min-height: 150px;"
                >
                  <div class="row d-flex align-center">                                    
                    <VTextarea
                      v-model="medicationText"
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
                  <h4>REVIEW OF SYSTEMS</h4>
                </VCol>                                           
              </VRow>                    
              <VRow>
                <VCol
                  cols="12"
                  style="min-height: 150px;"
                >
                  <div class="row d-flex align-center">                                    
                    <VTextarea
                      v-model="systemReviewText"
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
                  <h4>CONDITIONS</h4>
                </VCol>                                           
              </VRow>                    
              <VRow>
                <VCol
                  cols="12"
                  style="min-height: 150px;"
                >
                  <div class="row d-flex align-center">                                    
                    <VTextarea
                      v-model="conditionsText"
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
                  UDPATE COMPLAINT NOTES
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