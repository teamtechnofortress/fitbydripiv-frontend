<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig"
import * as Network from "@/network"
import * as Const from "@/network/const"
import { requiredValidator } from '@validators'
import VueSelect from "vue-select"
import { useToast } from "vue-toastification"

const props = defineProps({
  pid: {
    type: Number,
    required: true, 
  },
})

const emit = defineEmits(['next-tab'])
const { theme } = useThemeConfig()
const route = useRoute()
const refVForm = ref()
const toast = useToast()
const options = ref([])
const patient = ref([])
const patientList = ref([])
const patientFullName = ref('')
const assessmentDate = ref(new Date().toJSON().slice(0, 10))
const validationError = ref('')
const assessment = ref([])
const isLoading = ref(false)
const isConfirmDialogVisible = ref(false)
const signImg = ref('')
const intakeData = ref("")
const chiefComplaintData = ref({})

const tagSelected = value => {  
  patient.value = patientList.value.find( user => `${user.first_name} ${user.middle_name || ''} ${user.last_name}` == value)  
  patientFullName.value = `${patient.value.first_name} ${patient.value.middle_name || ''} ${patient.value.last_name}`
  validationError.value = ''

  //
  assessment.value = patient.value?.assessment?.find( item => item.date == assessmentDate.value) || {
    diag_description: 'N/A',
    diag_problem: 'N/A',
    diag_comment: 'N/A',
    notes: 'N/A',
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


function saveForm(){  
  if(validate()){
    isLoading.value = true
    refVForm.value?.validate().then(({ valid: isValid }) => {    
      if (isValid){
        Network.postRequest(Const.ADD_ASSESSMENT_URL, {}, 
          { ...assessment.value, patient_id: patient.value.id, 
            date: assessmentDate.value || (new Date().toJSON().slice(0, 10)), 
            treatment_type: chiefComplaintData?.value.treatment_type,
          }, 
          response => {
            isLoading.value = false
            if(response.data.success){
              toast.success("Assessment saved successfully!") 
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
    }else{
      return `[${key}]`
    }
  })
}

function getFieldsWithOne(obj) {  
  if(!obj) return null
  
  return Object.entries(obj).filter(([key, value]) => value === 1).map(([key]) => key)
}


const getPatientAssessmentById = (pID, date) => {
  Network.getRequest(Const.GET_ASSESSMENT_BY_DATE_URL, {}, { pid: pID, date: date }, 
    response => {
      if(response.data.success){
        const data = response.data.data.assessment

        chiefComplaintData.value = data.chiefComplaint
        patient.value = data.patient
        patientFullName.value = `${patient.value.first_name} ${patient.value.middle_name || ''} ${patient.value.last_name}`
        assessmentDate.value = data.date
        intakeData.value = getFieldsWithOne(response.data.data.intake1)
        
        assessment.value = patient.value?.assessment?.find( item => item.date == assessmentDate.value) || {
          diag_description: 'N/A',
          diag_problem: 'N/A',
          diag_comment: 'N/A',
        }
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
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

onMounted(()=>{        
  const patientId = route.query.pid ?? props.pid
  if(patientId) {
    getPatientAssessmentById(patientId, assessmentDate.value)
  }
  getSignature()
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
          <VCard title="ASSESSMENT">
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
                  <div>{{ patient?.birthday }}</div>                            
                </VCol>
                <VCol
                  class="d-flex align-center"
                  cols="5"
                  sm="12"
                  md="5"
                >
                  <label class="ms-4 ">Treatment Type:</label>
                  <div class="ms-4">
                    {{ chiefComplaintData?.treatment_type }}
                  </div>                            
                </VCol>                    
              </VRow>
                    
              <h4 class="mb-3">
                DIAGNOSIS
              </h4> 
              <VRow class="mb-4">
                <VTextarea 
                  v-model="assessment['diag_description']"                           
                  rows="5"
                  class="mx-4"
                  label="Diagnosis:"   
                  :rules="[requiredValidator]"                         
                />
              </VRow>

              <h4 class="mb-3">
                PROBLEM
              </h4> 
              <VRow class="mb-4">
                <VTextarea  
                  v-model="assessment['diag_problem']"                          
                  class="mx-4"
                  rows="5"
                  label="Problem:"          
                  :rules="[requiredValidator]"                  
                />
              </VRow>

              <h4 class="mb-3">
                COMMENT
              </h4> 
              <VRow class="mb-4">
                <VTextarea
                  v-model="assessment['diag_comment']"
                  rows="5"
                  class="mx-4"
                  label="Comment:"          
                  :rules="[requiredValidator]"                  
                />
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
                      class="w-25 ms-2"
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
                  UDPATE ASSESSMENT NOTES
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
          confirmation-msg="We will record this change by you. Are you sure to save this?"
          @confirm="doConfirm"
        />           
      </VCol>
    </VRow>
  </section>
</template>