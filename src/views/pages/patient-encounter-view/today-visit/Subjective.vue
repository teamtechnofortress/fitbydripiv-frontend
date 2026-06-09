<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig"
import * as Network from "@/network"
import * as Const from "@/network/const"
import { requiredValidator } from '@validators'
import { onMounted, ref } from "vue"
import VueSelect from "vue-select"
import { useToast } from "vue-toastification"

const emit = defineEmits(['next-tab'])
const route = useRoute()
const { theme } = useThemeConfig()
const refVForm = ref()
const toast = useToast()
const options = ref([])
const patient = ref([])
const physicalExam = ref({})
const patientList = ref([])
const patientFullName = ref('')
const compliantDate = ref(new Date().toJSON().slice(0, 10))
const validationError = ref('')
const complaint = ref([])
const allergies = ref([])
const intakeData = ref("")
const isLoading = ref(false)
const isConfirmDialogVisible = ref(false)
const signImg = ref('')

const sorts = ref(['IV Therapy', 'Injectables', 'Weight Loss', 'Other'])


const tagSelected = selectedName => {  
  patient.value = patientList.value.find( user => `${user.first_name} ${user.middle_name || ''} ${user.last_name}` == selectedName)  
  patientFullName.value = `${patient.value.first_name} ${patient.value.middle_name || ''} ${patient.value.last_name}`
  validationError.value = ''  

  //
  debugger
  complaint.value = patient.value.complaint.find( item => item.date == compliantDate.value) || {
    treatment_type: '',
    goal: '',
    symptoms: '',    
  }
}

const getPatientName = value => {
  Network.getRequestNoAuth(Const.GET_PATIENT_BY_NAME, {}, { fname: value }, 
    response => {
      if(response.data.success){
        options.value = response.data.message.map( item => `${item.first_name} ${item.middle_name || ''} ${item.last_name}` )
        patientList.value = response.data.message
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

function onSearch(searchTxt){
  if(searchTxt.length >= 3){
    getPatientName(searchTxt)
  }
}

const getSignature = () => {
  Network.getRequest(Const.GET_SIGNATURE_URL, {}, {},
    response => {
      if(response.data.success){            
        signImg.value = response.data.data.signature
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}


function saveForm(){  
  if(validate()){
    isLoading.value = true
    refVForm.value?.validate().then(({ valid: isValid }) => {    
      if (isValid){
        Network.postRequest(Const.ADD_CHIEF_COMPLIANT_URL, {}, { ...complaint.value, patient_id: patient.value.id, date: compliantDate.value }, 
          response => {
            isLoading.value = false
            if(response.data.success){
              toast.success("Chief Complaint saved successfully!")       
              emit('next-tab', patient.value.id)
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
}

function validate() {  
  if (!patientFullName.value) {
    validationError.value = 'This field is required.'  
    toast.error("Please select a patient!")
    refVForm.value?.resetValidation()  
    
    return 0
  } else {
    validationError.value = ''    
    
    return 1
  }
}

/**
 * ####################################################################
 * ################# notes related work################################
 * ####################################################################
 */
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

const injectableContent = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of fatigue, reduced energy and desire to improve overall health, patient reports decreased stamina during daily activities and subjective sense of aging, with loss of vitality, energy and increased fatigue.
The patient is motivated to pursue compounded treatments as part of a comprehensive management plan, following discussion of risks, benefits, and alternatives.
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
The patient is motivated to explore peptide therapies to enhance vitality, optimize health, and support anti-aging goals, following discussion of potential benefits, risks, and alternatives. Patient past medical history was reviewed extensively, including current medications.
Weight is [weight] kgs. 
BMI is [bmi].
`)

const otherContent = ref(`
[patientName] is a [age] year old [gender] who presents today for IV Therapy for [goal].
Patient has complaints of fatigue, reduced energy and desire to improve overall health, patient reports decreased stamina during daily activities and subjective sense of aging, with loss of vitality, energy and increased fatigue.
The patient is motivated to pursue compounded treatments as part of a comprehensive management plan, following discussion of risks, benefits, and alternatives.
Treatment options were discussed in detail, all risk and benefits and alternatives presented and all the patient’s questions were answered. Details as listed below.
The patient understands the specific procedural risks to include bleeding, infection, nerve injury, paralysis, soreness at the injection site and failure to relieve pain. The patient has no further questions and agrees to proceed.
The patient is motivated to explore peptide therapies to enhance vitality, optimize health, and support anti-aging goals, following discussion of potential benefits, risks, and alternatives. Patient past medical history was reviewed extensively, including current medications.
Weight is [weight] kgs. 
BMI is [bmi].
`)

function calculateBMI(heightInCm=170) {  
  const weightKg = physicalExam.value.WT ?? 80 
  const weightLbs = weightKg * 2.20462 // lbs
  const heightInches = heightInCm / 2.54 // inches

  return ((weightLbs * 730) / (heightInches * heightInches)).toFixed(1)  
}

function doParse(rawText){
  return rawText.replace(/\[([^\]]+)\]/g, (_, key) => {
    if(key=='patientName') {
      return patientFullName.value
    }else if(key=='age'){
      return patient.value.age
    }else if(key=='gender'){
      return patient.value.gender        
    }else if(key=='goal'){            
      return !intakeData.value ? 'goal' : intakeData.value[0].split('_')[1]
    }else if(key=='symptoms'){            
      return !intakeData.value ? 'symptoms' : intakeData.value[1]
    }else if(key=='bmi'){            
      return calculateBMI()
    }else if(key=='weight'){
      return physicalExam.value?.WT ?? 72
    }else if(key=='Staff Name' || key=='Nurse Practitioner'){
      return `${physicalExam.value?.staff?.firstName} ${physicalExam.value?.staff?.lastName}` ?? 'Unknown'
    }else{
      return `[${key}]`
    }
  })
}

function updatedType(_type){
  if(_type == 'IV Therapy'){
    complaint.value.notes = doParse(ivContent.value)
  }else if(_type == 'Weight Loss'){
    complaint.value.notes = doParse(weightLossContent.value)
  }else if(_type == 'Injectables'){
    complaint.value.notes = doParse(injectableContent.value)
  }else{
    complaint.value.notes = doParse(otherContent.value)
  }

  // Append patient information
  complaint.value.notes = complaint.value.notes + 
    `\n Current Allergies: ${patient.value.current_allergies} \n Current Conditions: ${patient.value.current_conditions} \n Current Medications: ${patient.value.current_medications}`
}

function getDefaultNotes(){
  isLoading.value = true
  Network.getRequest(Const.GET_ADMIN_NOTES, {}, {}, 
    response => {
      isLoading.value = false
      if(response.data.success){                
        const notesObj = response.data.data.notes
        if(notesObj){                  
          ivContent.value         = notesObj.find(item => item.treatment_type == 'IV Therapy')?.notes || ivContent.value
          weightLossContent.value = notesObj.find(item => item.treatment_type == 'Weight Loss')?.notes || weightLossContent.value
          injectableContent.value = notesObj.find(item => item.treatment_type == 'Injectables')?.notes || injectableContent.value
          otherContent.value      = notesObj.find(item => item.treatment_type == 'Other')?.notes || otherContent.value
        }
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

function getFieldsWithOne(obj) {
  if(!obj) return null
  
  return Object.entries(obj).filter(([key, value]) => value === 1).map(([key]) => key)
}

const getPatientSubjectById = (pID, date) => {
  Network.getRequest(Const.GET_CHIEF_COMPLIANT_URL, {}, { pid: pID, date: date }, 
    response => {
      if(response.data.success){
        const data = response.data.data

        patient.value = data.complaint.patient        
        physicalExam.value = data.physicalExam || {}        
        patientFullName.value = `${patient.value.first_name} ${patient.value.middle_name || ''} ${patient.value.last_name}`        
        complaint.value = data.complaint || { treatment_type: '', goal: '', symptoms: '', notes: '' }
        intakeData.value = getFieldsWithOne(data.intake1)

        //Set the type
        updatedType(complaint.value.treatment_type)
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

onMounted(()=>{
  getDefaultNotes()
  getSignature()
  if (route.query.pid) {
    getPatientSubjectById(route.query.pid, compliantDate.value)
  }
})

function doConfirm(value){
  if(value){    
    saveForm()
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
              <VRow class="mb-2">                    
                <VCol
                  class="d-flex align-center"
                  cols="4"
                  sm="12"
                  md="4"
                >
                  <label class="me-4">Patient Name:</label>                        
                  <VueSelect                                
                    v-model="patientFullName"                       
                    :class="{'vue-select-custom': theme=='dark', 'is-invalid': validationError }"
                    :options="options" 
                    :rules="[requiredValidator]"
                    style="min-width: 15rem;"
                    @option:selected="tagSelected"
                    @option:deselected="tagSelected"
                    @search="onSearch"
                  /> 
                </VCol>                         
                <VCol
                  class="d-flex align-center"
                  cols="3"
                  sm="12"
                  md="3"
                >
                  <label class="me-4">Date of Birth:</label>                            
                  <div class="border-bottom">
                    {{ patient.birthday }}
                  </div>
                </VCol>                    
                <VCol
                  class="d-flex align-center"
                  cols="5"
                  sm="12"
                  md="5"
                >
                  <label class="mx-4 w-50">Treatment Type:</label>
                  <VSelect
                    v-model="complaint['treatment_type']"
                    :items="sorts"
                    label="Treatment Type"
                    variant="underlined"
                    :rules="[requiredValidator]"
                    class="w-100"
                    @update:modelValue="updatedType"
                  />
                </VCol>                    
              </VRow>
                    
              <!--  -->
              <VCol
                cols="12"
                class="px-0"
              >
                <h4>CHIEF COMPLAINT</h4>
                <VDivider />
                <VRow v-if="patient.first_name && complaint['treatment_type']">
                  <VCol
                    cols="12 mt-1"
                    color="warning"
                  >
                    <VAlert
                      color="warning"
                      variant="tonal"
                    >
                      *You can replace words on Brackets ( [goal], [symptoms] ). Please care of it.
                    </VAlert>
                  </VCol>
                </VRow>
                <VRow v-if="patient.first_name">
                  <VCol
                    v-if="complaint['treatment_type']"
                    cols="12"
                    style="min-height: 150px;"
                  >
                    <VTextarea
                      v-model="complaint['notes']"
                      rows="10"
                      :rules="[requiredValidator]"
                    />                            
                  </VCol>                        
                  <VCol
                    v-else
                    style="min-height: 150px;"
                  /> 
                </VRow>
                <VRow v-else>
                  <VCol style="min-height: 150px;" />
                </VRow>
              </VCol>

              <!--  -->
              <!--
                <VCol cols="12" class="px-0 mt-4">
                <h4>ALLERGIES</h4>
                <VDivider />
                <VRow v-if="patient.first_name && complaint['treatment_type']">
                <VCol cols="12 mt-1" color="warning">
                <VAlert color="warning" variant="tonal">
                *You can replace words on Brackets ( [goal], [symptoms] ). Please care of it.
                </VAlert>
                </VCol>
                </VRow>
                <VRow v-if="patient.first_name">
                <VCol v-if="complaint['treatment_type']" cols="12" style="min-height: 150px;">
                <VTextarea v-model="complaint['notes']" rows="10" :rules="[requiredValidator]"></VTextarea>                            
                </VCol>                        
                <VCol v-else style="min-height: 150px;"></VCol> 
                </VRow>
                <VRow v-else>
                <VCol style="min-height: 150px;"></VCol>
                </VRow> 
                </VCol> 
              -->

              <VRow class="mt-4">
                <VCol cols="12">
                  <VAlert
                    color="warning"
                    variant="tonal"
                  >
                    * By confirming this update you are electronically signing the associated changes and notes.
                  </VAlert>
                </VCol>
              </VRow>

              <VRow>
                <VCol cols="12">                        
                  <label>Signature:</label>
                  <VRow
                    v-if="signImg"
                    class="pt-4"
                  >        
                    <img
                      :src="signImg"
                      alt="Signature Pad"
                      style="width: 150px!important;"
                      class="w-25 ms-4"
                    >
                  </VRow>
                </VCol>
              </VRow>

              <VRow class="mt-4 pt-4">
                <VBtn
                  v-if="!isLoading"
                  class="d-flex mx-auto"
                  color="primary"
                  @click="isConfirmDialogVisible=!isConfirmDialogVisible"
                >
                  UPDATE COMPLAINT NOTES
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
.is-invalid .vs__dropdown-toggle {
  border-bottom: 1px solid red !important;
  border-radius: 4px;
}
</style>
