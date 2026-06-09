<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig"
import { emailValidator, requiredValidator } from "@/@core/utils/validators"
import * as Network from "@/network"
import * as Const from "@/network/const"
import { ref } from 'vue'
import VueSelect from "vue-select"
import { useToast } from "vue-toastification"

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },  
})

const emit = defineEmits(['update:modelValue', 'refresh'])

const refVForm = ref()
const toast = useToast()
const { theme } = useThemeConfig()
const options = ref([])
const patient = ref([])
const patientList = ref([])
const patientFullName = ref("")


const tagSelected = value => {  
  patient.value = patientList.value.find( user => `${user.first_name} ${user.middle_name || ''} ${user.last_name}` == value)  
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

const getPatientDataById = value => {
  Network.getRequestNoAuth(Const.GET_PATIENT_AND_ENCOUNTER_BY_ID, {}, { id: value }, 
    response => {
      if(response.data.success){        
        patient.value = response.data.message    
        patientFullName.value = `${patient.value.first_name} ${patient.value?.middle_name || ''} ${patient.value.last_name}`        
        
      }else{
        toast.error(`Invalid patient Number: ${response.data.err_msg}`)
        console.log(`Error: ${response.data.err_msg}`)
        patient.value = []
      }
    },
  )
}

function updateDialog(value) {
  emit('update:modelValue', value)
}

function closeDialog() {
  emit('update:modelValue', false)
}

const loading = ref(false)
const chartHistory = ref([])

const getRangeDate = type => {
  if(type == 'daily'){
    
    const sDate = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10)
    
    return { "range_sdate": sDate, "range_edate": new Date().toJSON().slice(0, 10) }
  }else if(type == 'weekly'){
    
    const sDate = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10)
    
    return { "range_sdate": sDate, "range_edate": new Date().toJSON().slice(0, 10) }
  }else if(type == 'monthly'){
    
    const sDate = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10)
    
    return { "range_sdate": sDate, "range_edate": new Date().toJSON().slice(0, 10) }
  }else if(type == 'quarterly'){

    const sDate = new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().slice(0, 10)
    
    return { "range_sdate": sDate, "range_edate": new Date().toJSON().slice(0, 10) }
  }else if(type == 'custom'){
    
    return { "range_sdate": chartHistory.value.range_sdate, "range_edate": chartHistory.value.range_edate }
  }
}

function saveForm(){ 
  refVForm.value?.validate().then(({ valid: isValid }) => {
    loading.value = true
    if (isValid){      
      const rangeDate = getRangeDate(chartHistory.value.frequency)
      
      Network.postRequest(Const.SAVE_CHART_HISTORY, {}, { ...chartHistory.value, ...rangeDate, patient_id: patient.value.id }, response=>{        
        loading.value = false
        if(response.data.success){
          toast.success(response.data.message)
          setTimeout(()=>{
            closeDialog()
            emit('refresh', true)
          }, 500)

          //
        }else{
          toast.error(response.data.err_msg)
        }
      })
    }else{
      loading.value = false
      toast.error("Please fill out the fields!")
    }
  })    
}

onMounted(()=>{
  chartHistory.value.range_sdate = ref(new Date(new Date().setDate(new Date().getDate() - 10)).toISOString().slice(0, 10))
  chartHistory.value.range_edate = ref(new Date().toJSON().slice(0, 10))  
})
</script>

<template>
  <VDialog  
    max-width="840"
    :model-value="modelValue"
    @update:model-value="updateDialog"
  >
    <VForm
      ref="refVForm"
      @submit.prevent="saveForm"
    >
      <VCard>
        <VCardTitle class="text-h6 mt-4 text-center">
          CHART HISTORY
        </VCardTitle>

        <div class="text-subtitle-1 mt-2 mx-4">
          <VTextField
            v-model="patient['id']"
            label="PATIENT NUMBER"
            :rules="[requiredValidator]"
            style="width: 15rem;"
            @input="getPatientDataById(patient['id'])"
          />
        </div>
        <VRow class="mx-4 mt-2">
          <VCol
            class="d-flex align-center"
            cols="8"
          >
            <label class="me-4">PATIENT NAME</label>
            <VueSelect
              v-model="patientFullName"
              :class="{'vue-select-custom': theme=='dark'}"
              :options="options" 
              style="min-width: 15rem;"
              @option:selected="tagSelected"
              @option:deselected="tagSelected"
              @search="onSearch"
            /> 
          </VCol>        
        </VRow>
        <VCardText>
          <VRow>
            <VRadioGroup
              v-model="chartHistory['frequency']"
              class="col-12"
              inline   
              :rules="[requiredValidator]"                 
            >
              <VCol cols="3">
                <VCheckbox
                  label="DAILY"
                  value="daily"
                />
              </VCol>
              <VCol cols="3">
                <VCheckbox
                  label="WEEKLY"
                  value="weekly"
                />
              </VCol>
              <VCol cols="3">
                <VCheckbox
                  label="MONTHLY"
                  value="monthly"
                />
              </VCol>
              <VCol cols="3">
                <VCheckbox
                  label="QUARTERLY"
                  value="quarterly"
                />
              </VCol>
            </VRadioGroup>
          </VRow>

          <VDivider class="mt-2" />  

          <div class="text-subtitle-1 mt-2 mb-2">
            <!--  -->
            <VCheckbox
              v-model="chartHistory['frequency']"
              label="DATE RANGE"
              value="custom"
            />
          </div>
          <VRow>
            <VCol
              cols="6"
              class="d-flex align-center"
            >
              <label class="me-4">START DATE:</label>             
              <input
                v-model="chartHistory['range_sdate']"
                type="date"
              >
            </VCol> 
            <VCol
              cols="6"
              class="d-flex align-center"
            >
              <label class="me-4">END DATE:</label> 
              <input
                v-model="chartHistory['range_edate']"
                type="date"
              >            
            </VCol> 
          </VRow>        

          <VDivider class="mt-2" />          
          <VRow class="mt-2">
            <VCol cols="6">
              <VCheckbox
                v-model="chartHistory['isEncounters']"
                label="ENCOUNTERS"
              />
            </VCol>
            <VCol cols="6">
              <VCheckbox
                v-model="chartHistory['isProducts']"
                label="PRODUCTS"
              />
            </VCol>
          </VRow>

          <VDivider class="mt-2" />          
                
          <VRow class="mt-2">
            <VCol 
              cols="6"
              class="d-flex align-center"
            >            
              <VCheckbox
                v-model="chartHistory['hasNotes']"
                label="NOTES FROM ENCOUNTER"
              />
            </VCol>          
          </VRow>

          <VDivider class="mt-2" />
          <VRow class="mt-2">
            <VCol
              cols="4"
              class="d-flex align-center"
            >
              <VTextField
                v-model="chartHistory['email']"
                type="email"
                label="EMAIL"
                :rules="[requiredValidator, emailValidator]"
              />
            </VCol> 
          </VRow>
        </VCardText>

        <VCardActions class="justify-end">
          <!-- @click="genChartHistory" -->
          <VBtn
            v-if="!loading"
            variant="flat"
            color="primary"
            type="submit"
            class="me-4"
          >
            Save
          </VBtn>
          <VProgressCircular
            v-else
            class="me-4"
            indeterminate
          /> 
          <VBtn
            variant="text"
            @click="closeDialog"
          >
            Cancel
          </VBtn>
        </VCardActions>
      </VCard>
    </VForm>
  </VDialog>  
</template>