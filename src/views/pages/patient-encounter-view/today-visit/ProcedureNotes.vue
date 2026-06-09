<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig"
import * as Network from "@/network"
import * as Const from "@/network/const"
import router from "@/router"
import { requiredValidator } from '@validators'
import VueSelect from "vue-select"
import { useToast } from "vue-toastification"

const props = defineProps({
  pid: {
    type: Number,
    required: true, 
  },
})

const { theme } = useThemeConfig()
const route = useRoute()
const refVForm = ref()
const toast = useToast()
const options = ref([])
const patient = ref([])
const patientList = ref([])
const patientFullName = ref('')
const procedureDate = ref(new Date().toJSON().slice(0, 10))
const validationError = ref('')
const patientProcedure = ref([])
const isLoading = ref(false)
const isConfirmDialogVisible = ref(false)
const chiefComplaintData = ref({})
const signImg = ref('')
const intakeData = ref("")
const staffData = ref("")
function calculateBMI(heightInCm=170) {  
  const weightKg = patient.value?.physicalExam.WT ?? 80 
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
      return patient.value?.physicalExam?.WT ?? 72
    }else if(key=='Staff Name' || key=='Nurse Practitioner'){            
      return !staffData.value ? 'Unknown' : `${staffData.value.firstName} ${staffData.value.lastName}`
    }else if(key=='dosage'){
      return key
    }else{
      return `[${key}]`
    }
  })
}

function getFieldsWithOne(obj) {
  if(!obj) return null
  
  return Object.entries(obj).filter(([key, value]) => value === 1).map(([key]) => key)
}

const tagSelected = value => {  
  patient.value = patientList.value.find( user => `${user.first_name} ${user.middle_name || ''} ${user.last_name}` == value)  
  patientFullName.value = `${patient.value.first_name} ${patient.value.middle_name || ''} ${patient.value.last_name}`
  validationError.value = ''

  //
  patientProcedure.value = patient.value.patient_procedure?.find( item => item.date == procedureDate.value) || {}
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
      if (isValid) {
        Network.postRequest(Const.ADD_PATIENT_PROCEDURE, {},
          { ...patientProcedure.value,
            patient_id: patient.value.id,
            date: (procedureDate.value || (new Date().toJSON().slice(0, 10))),
            treatment_type: chiefComplaintData?.value.treatment_type,
          }, 
          response => {
            isLoading.value = false
            if(response.data.success){
              toast.success("Paitent Procedure saved successfully!")   
                        
              setTimeout(()=>{    
                router.push({ name: 'patient-encounter-tab', params: { tab: 'payment' }, query: { pid: patient.value.id } })
              }, 700)                     
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

function doConfirm(value){
  if(value){    
    saveForm()
  }
}

const getPatientProcedureById = (pID, date) => {
  Network.getRequest(Const.GET_PATIENT_PROCEDURE, {}, { pid: pID, date: date }, 
    response => {
      if(response.data.success){
        const data = response.data.data.procedure

        chiefComplaintData.value = data.chiefComplaint
        staffData.value = data.chiefComplaint?.staff
        patient.value = data.patient
        patientFullName.value = `${patient.value.first_name} ${patient.value.middle_name || ''} ${patient.value.last_name}`
        procedureDate.value = data.date
        patientProcedure.value = data        
        intakeData.value = getFieldsWithOne(response.data.data.intake1)
        patientProcedure.value['risk'] = doParse(data.risk)
        patientProcedure.value['benefits'] = doParse(data.benefits)
        patientProcedure.value['alternatives'] = doParse(data.alternatives)
        patientProcedure.value['notes'] = doParse(data.notes) 
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
    getPatientProcedureById(patientId, procedureDate.value)
  }
  getSignature()
})
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

              <VRow class="m">
                <VCol cols>
                  <label class="text-warning me-2 italic">Current Conditions:</label>
                  <p class="text-danger">
                    {{ patient.current_conditions }}
                  </p>
                </VCol>
                <VCol cols>
                  <label class="text-warning me-2 italic">Current Allergies:</label>
                  <p class="text-danger">
                    {{ patient.current_allergies }}
                  </p>
                </VCol>

                <VCol cols>
                  <label class="text-warning me-2 italic">Allergy Reactions:</label>
                  <p class="text-danger">
                    {{ patient.allergy_reactions }}
                  </p>
                </VCol>
                <VCol cols>
                  <label class="text-warning me-2 italic">Current Medication:</label>
                  <p class="text-danger">
                    {{ patient.current_medications }}
                  </p>
                </VCol>
              </VRow>                
              <h4 class="my-4">
                PROCEDURE NOTES:
              </h4>
              <VRow class="mb-4">
                <VTextarea 
                  v-model="patientProcedure['notes']"
                  rows="10"
                  label="Notes:"               
                  :rules="[requiredValidator]"             
                />                        
              </VRow>

              <h4 class="mb-3">
                PROCEDURE RISK
              </h4>
              <VRow class="mb-4">
                <VTextarea
                  v-model="patientProcedure['risk']"
                  label="Risk:"
                  rows="10"
                  :rules="[requiredValidator]"
                />                            
              </VRow>

              <h4 class="mb-3">
                PROCEDURE BENEFITS
              </h4>
              <VRow class="mb-4">
                <VTextarea
                  v-model="patientProcedure['benefits']"
                  label="Benefits:"
                  rows="10"
                  :rules="[requiredValidator]"
                />                            
              </VRow>

              <h4 class="mb-3">
                ALTERNATIVES
              </h4>
              <VRow class="mb-4">
                <VTextarea
                  v-model="patientProcedure['alternatives']"
                  label="Alternatives:"
                  rows="10"
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
                  UPDATE PROCEDURE PLAN
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
.app-user-search-filter {
  inline-size: 31.6rem;
}
.text-capitalize {
  text-transform: capitalize;
}
.italic {
  font-style: italic;
}
</style>
