<script setup>
import { emailValidator, requiredValidator } from "@/@core/utils/validators"
import * as Network from "@/network"
import * as Const from "@/network/const"
import { ref } from 'vue'
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


function updateDialog(value) {
  emit('update:modelValue', value)
}

function closeDialog() {
  emit('update:modelValue', false)
}

const loading = ref(false)
const appointment = ref([])

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
    
    return { "range_sdate": appointment.value.range_sdate, "range_edate": appointment.value.range_edate }
  }
}

function saveForm(){ 
  refVForm.value?.validate().then(({ valid: isValid }) => {
    loading.value = true
    if (isValid){   
      
      if(!appointment.value.online && !appointment.value.phoneIn && !appointment.value.walkIn && !appointment.value.noShow){
        loading.value = false
        toast.error("Please select at least one type of appointment!")
        
        return
      }    

      const rangeDate = getRangeDate(appointment.value.frequency)
 
      Network.postRequest(Const.SAVE_APPOINTMENT_REPORT, {}, { ...appointment.value, ...rangeDate }, response=>{        
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
  appointment.value.range_sdate = ref(new Date(new Date().setDate(new Date().getDate() - 10)).toISOString().slice(0, 10))
  appointment.value.range_edate = ref(new Date().toJSON().slice(0, 10))  
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
          Appointment Report
        </VCardTitle>

        <VDivider class="mt-2" />
        <VCardText>
          <VRow>
            <VRadioGroup
              v-model="appointment['frequency']"
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
            <VCheckbox
              v-model="appointment['frequency']"
              label="DATE RANGE"
              value="custom"
            />
          </div>
          <VRow>
            <VCol
              cols="6"
              class="d-flex align-center"
            >
              <label class="me-4">FROM:</label>             
              <input
                v-model="appointment['range_sdate']"
                type="date"
              >
            </VCol> 
            <VCol
              cols="6"
              class="d-flex align-center"
            >
              <label class="me-4">TO:</label> 
              <input
                v-model="appointment['range_edate']"
                type="date"
              >            
            </VCol> 
          </VRow>

          <VDivider class="pt-4" />             
          <VRow>
            <VCol 
              cols="6"
              class="d-flex align-center"
            >            
              <VCheckbox
                v-model="appointment['online']"
                label="ONLINE"
              />
            </VCol>          
            <VCol 
              cols="6"
              class="d-flex align-center"
            >            
              <VCheckbox
                v-model="appointment['phoneIn']"
                label="PHONE IN"
              />
            </VCol>          
          </VRow>


          <VDivider class="pt-4" />             
          <VRow>
            <VCol 
              cols="6"
              class="d-flex align-center"
            >            
              <VCheckbox
                v-model="appointment['walkIn']"
                label="WALK-IN"
              />
            </VCol>          
            <VCol 
              cols="6"
              class="d-flex align-center"
            >            
              <VCheckbox
                v-model="appointment['noShow']"
                label="NO SHOW"
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
                v-model="appointment['email']"
                type="email"
                label="EMAIL"
                :rules="[requiredValidator, emailValidator]"
              />
            </VCol> 
          </VRow>
        </VCardText>

        <VCardActions class="justify-end">        
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