<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig"
import * as Network from "@/network"
import * as Const from "@/network/const"
import { requiredValidator } from '@validators'
import { onMounted } from "vue"
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
const examDate = ref(new Date().toJSON().slice(0, 10))
const validationError = ref('')
const physicalExam = ref([])
const chiefComplaintData = ref({})
const isLoading = ref(false)
const isConfirmDialogVisible = ref(false)
const signImg = ref('')

const tagSelected = value => {  
  patient.value = patientList.value.find( user => `${user.first_name} ${user.middle_name || ''} ${user.last_name}` == value)  
  patientFullName.value = `${patient.value.first_name} ${patient.value.middle_name || ''} ${patient.value.last_name}`
  validationError.value = ''

  //
  physicalExam.value = patient.value.physical_exam.find( item => item.date == examDate.value) || {}
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
        Network.postRequest(Const.ADD_PATIENT_PHYSICAL_EXAM, {}, { ...physicalExam.value, patient_id: patient.value.id, date: (examDate.value || new Date().toJSON().slice(0, 10)) }, 
          response => {
            isLoading.value = false
            if(response.data.success){
              toast.success("Physical Exam Data saved successfully!")  
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

function doConfirm(value){
  if(value){    
    saveForm()
  }
}

const getPatientObjectiveById = (pID, date) => {
  Network.getRequest(Const.GET_PATIENT_PHYSICAL_EXAM, {}, { pid: pID, date: date }, 
    response => {
      if(response.data.success){
        const data = response.data.data.exam

        chiefComplaintData.value = data.chiefComplaint
        patient.value = data.patient
        patientFullName.value = `${patient.value.first_name} ${patient.value.middle_name || ''} ${patient.value.last_name}`
        examDate.value = data.date
        physicalExam.value = { notes: data.notes || '', BP: data.BP, HR: data.HR, Temp: data.Temp, WT: data.WT }
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

onMounted(()=>{  
  const patientId = route.query.pid ?? props.pid
  if(patientId) {
    getPatientObjectiveById(patientId, examDate.value)  
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
                  <div>{{ patient.birthday }}</div>                                
                </VCol>                            
                <VCol
                  class="d-flex align-center"
                  cols="5"
                  sm="12"
                  md="5"
                >
                  <label class="me-4">Treatment Type:</label>
                  <div>{{ chiefComplaintData.treatment_type }}</div>                                
                </VCol>                            
              </VRow>
                        
              <VRow class="my-4">
                <h4>Physical Exam Notes</h4>
                <VDivider />
                <VTextarea
                  v-model="physicalExam['notes']"
                  rows="10"
                />                            
              </VRow>

              <h4 class="mt-4 pt-4">
                VITALS
              </h4>
              <VDivider />
              <VRow class="mt-2">
                <VCol cols="3">
                  <VTextField
                    v-model="physicalExam['BP']"
                    label="BP"
                    variant="underlined"
                    :rules="[requiredValidator]"
                    class="w-100"
                  />
                </VCol>
                <VCol cols="3">
                  <VTextField
                    v-model="physicalExam['HR']"
                    label="HR"
                    variant="underlined"
                    :rules="[requiredValidator]"
                    class="w-100"
                  />
                </VCol>
                <VCol cols="3">
                  <VTextField
                    v-model="physicalExam['Temp']"
                    label="Temp"
                    variant="underlined"
                    :rules="[requiredValidator]"
                    class="w-100"
                  />
                </VCol>
                <VCol cols="3">
                  <VTextField
                    v-model="physicalExam['WT']"
                    label="WT"
                    variant="underlined"
                    :rules="[requiredValidator]"
                    class="w-100"
                  />
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
                  UPDATE NOTES
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