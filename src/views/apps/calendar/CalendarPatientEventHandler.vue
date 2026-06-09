<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig"
import * as Network from "@/network"
import * as Const from "@/network/const"
import { useStaffDataStore } from "@/store/staffData"
import { requiredValidator } from '@validators'
import VueSelect from "vue-select"
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VForm } from 'vuetify/components'
import { useCalendarPatientStore } from './useCalendarPatientStore'
import { watch , computed } from "vue"


const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    required: true,
  },
  event: {
    type: null,
    required: true,
  },
})

const emit = defineEmits([
  'update:isDrawerOpen',
  'addEvent',
  'updateEvent',
  'removeEvent',
])

const { theme } = useThemeConfig()
const store = useCalendarPatientStore()
const refForm = ref()
const options = ref([])
const phoneOptions = ref([])
const patient = ref(null)
const patientList = ref([])
const validationError = ref('')
const therapyTypes = ref(['IV Therapy', 'Injectables', 'Weight Loss', 'Other'])
const appointmentTypes = ref(['Online', 'Walk-In', 'Phone In'])
const staffDataStore = useStaffDataStore()
const { inventoryList } = storeToRefs(staffDataStore)

// 👉 Event
const event = ref(JSON.parse(JSON.stringify(props.event)))

const resetEvent = () => {
  validationError.value = ''
  event.value = JSON.parse(JSON.stringify(props.event))  
  nextTick(() => {
    refForm.value?.resetValidation()
  })
}

watch(() => props.isDrawerOpen, resetEvent)

const removeEvent = () => {
  emit('removeEvent', event.value.id)

  // Close drawer
  emit('update:isDrawerOpen', false)
}

watch (() => event.value.extendedProps.therapy, 
  therapy => {    
    if(therapy){      
      event.value.end = event.value.end ?? new Date(new Date(event.value.start).getTime() + 60 * 1000 * 1)     
      event.value.extendedProps.inventory_id = inventoryList.value.find( inv => inv.name == therapy )?.id
    }
  }, 
)

watch(
  () => event.value.start,
  newStart => {
    if(newStart){
      event.value.end = event.value.end ?? new Date(new Date(event.value.start).getTime() + 60 * 1000 * 1)
    }
  },
)

const handleSubmit = () => {

  if(validate()){
    refForm.value?.validate().then(({ valid }) => {
      if (valid) {        
        // If id exist on id => Update event
        if ('id' in event.value){
          if(event.value.start) {
            event.value.start = new Date(event.value.start).toISOString()
            event.value.end = new Date(event.value.end).toISOString()
          }
          emit('updateEvent', event.value)
        }
        

        // Else => add new event
        else{
          if(event.value.start) {
            event.value.start = new Date(event.value.start).toISOString()
            event.value.end = new Date(event.value.end).toISOString()
          }
          event.value.extendedProps.patient_id = patient.value.id          
          emit('addEvent', event.value)
        }

        // Close drawer
        emit('update:isDrawerOpen', false)
      }
    })
  }
}

// 👉 Form
const onCancel = () => {
  // Close drawer
  emit('update:isDrawerOpen', false)
  nextTick(() => {
    refForm.value?.reset()
    resetEvent()
    refForm.value?.resetValidation()
  })
}

const startDateTimePickerConfig = computed(() => {
  // if (event.value.end)
  //   config.maxDate = event.value.end
  // config.minDate = event.value.start
  return {
    enableTime: true,
    dateFormat: 'Y-m-d h:i K',
    time_24hr: false,
  }
})

const endDateTimePickerConfig = computed(() => {
  const config = {
    enableTime: true,
    dateFormat: 'Y-m-d h:i K',
    time_24hr: false,
  }

  if (event.value.start)
    config.minDate = event.value.start
  
  return config
})

const dialogModelValueUpdate = val => {
  emit('update:isDrawerOpen', val)
}

const tagSelected = value => {    
  patient.value = patientList.value.find( user => `${user.first_name} ${user.middle_name || ''} ${user.last_name}` == value)   
  if(patient?.value?.id) getPatientDataById(patient.value.id)
  validationError.value = ''
}

const phoneTagSelected = value => {  
  patient.value = patientList.value.find( user => user.phone == value)  
  event.value.title = `${patient.value?.first_name} ${patient.value?.middle_name || ''} ${patient.value?.last_name}`
  if(patient?.value?.id) getPatientDataById(patient.value.id)
  validationError.value = ''
}

const getPatientName = value => {
  Network.getRequestNoAuth(Const.GET_PATIENT_BY_NAME, {}, { fname: value }, 
    response => {
      if(response.data.success){
        options.value = response.data.message.map( item => `${item.first_name} ${item.middle_name || ''} ${item.last_name}` )
        phoneOptions.value = response.data.message.map( item => item.phone)
        patientList.value = response.data.message
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

const getPatientsByPhone = value => {
  Network.getRequestNoAuth(Const.GET_PATIENT_BY_PHONE, {}, { fstr: value }, 
    response => {
      if(response.data.success){
        options.value = response.data.message.map( item => `${item.first_name} ${item.middle_name || ''} ${item.last_name}` )
        phoneOptions.value = response.data.message.map( item => item.phone)
        patientList.value = response.data.message
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

const getPatientDataById = value => {
  Network.getRequestNoAuth(Const.GET_PATIENT_AND_HISTORY_BY_ID, {}, { id: value }, 
    response => {
      if(response.data.success){
        if(response.data.message.intake?.[0]?.goal_iv) event.value.extendedProps.goal = 'IV'
        if(response.data.message.intake?.[0]?.goal_injection) event.value.extendedProps.goal = 'INJECTABLES'
        if(response.data.message.intake?.[0]?.goal_other) event.value.extendedProps.goal = 'OTHER'
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

function onSearch(searchTxt){
  if(searchTxt.length >= 3){
    // const startsWithLetter = /^[a-zA-Z]/.test(searchTerm);
    // if(startsWithLetter) 
    getPatientName(searchTxt)
  }
}

function onSearchByPhone(searchTxt){
  if(searchTxt.length >= 3){
    // const startsWithLetter = /^[a-zA-Z]/.test(searchTerm);
    // if(startsWithLetter) 
    getPatientsByPhone(searchTxt)
  }
}

function validate() {
  console.log("validation", event.value.title)
  if (!event.value.title) {
    validationError.value = 'This field is required.'
    
    return 0
  } else {
    validationError.value = ''
    
    return 1
  }
}

onMounted(()=>{
  staffDataStore.getAllInventory()
})

function onGoalChange(newGoal) {
  event.value.extendedProps.therapy = null // or '' if that's your default
}
function onAppointedTypeChange() {
  // event.value.extendedProps.appointed_type = appointmentTypes.value[0];
}

const getPatientPhoneNumber = computed({
  get() {    
    const patientId = event.value.extendedProps?.patient_id || patient.value?.id
    if (!patientId) return ''

    const patientData = store.patientList.find(pt => pt.id === patientId)
    
    return patientData ? patientData.phone : ''
  },
  set(newPhone) {    
    const patientData = store.patientList.find(pt => pt.phone === newPhone)
    if (patientData) {
      patient.value = patientData
      event.value.title = `${patientData.first_name} ${patientData.middle_name || ''} ${patientData.last_name}`
      event.value.extendedProps.patient_id = patientData.id
    }
  },
})
</script>

<template>
  <VNavigationDrawer
    temporary
    location="end"
    :model-value="props.isDrawerOpen"
    width="420"
    class="scrollable-content"
    @update:model-value="dialogModelValueUpdate"
  >
    <!-- 👉 Header -->
    <div class="d-flex align-center pa-6 pb-1">
      <h6 class="text-h6">
        {{ event.id ? 'Update' : 'Add to' }} Schedule
      </h6>

      <VSpacer />

      <VBtn
        v-show="event.id"
        icon
        variant="tonal"
        size="32"
        class="rounded me-3"
        color="default"
        @click="removeEvent"
      >
        <VIcon
          size="18"
          icon="tabler-trash"
        />
      </VBtn>

      <VBtn
        variant="tonal"
        color="default"
        icon
        size="32"
        class="rounded"
        @click="$emit('update:isDrawerOpen', false)"
      >
        <VIcon
          size="18"
          icon="tabler-x"
        />
      </VBtn>
    </div>

    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCard flat>
        <VCardText>
          <!-- SECTION Form -->
          <VForm
            ref="refForm"
            @submit.prevent="handleSubmit"
          >
            <VRow>
              <VCol
                class="d-flex align-center"
                cols="12"
              >         
                <label class="me-4">Patient Name</label>                    
                <VueSelect  
                  v-model="event.title"
                  :class="{'vue-select-custom': theme=='dark', 'is-invalid': validationError }"                       
                  :options="options"                                            
                  style="min-width: 15rem;"
                  @option:selected="tagSelected"
                  @option:deselected="tagSelected"
                  @search="onSearch"
                />
              </VCol>

              <span
                v-if="validationError"
                class="text-error text-sm mx-4"
              >{{ validationError }}</span>
              
              <VCol
                class="d-flex align-center"
                cols="12"
              >         
                <label class="me-4">Patient Phone</label>                    
                <VueSelect
                  v-model="getPatientPhoneNumber"
                  :class="{'vue-select-custom': theme=='dark', 'is-invalid': validationError }"                       
                  :options="phoneOptions"                                            
                  style="min-width: 15rem;"
                  @option:selected="phoneTagSelected"
                  @option:deselected="phoneTagSelected"
                  @search="onSearchByPhone"
                />
              </VCol>

              <span
                v-if="validationError"
                class="text-error text-sm mx-4"
              >{{ validationError }}</span>
              
              <!-- 👉 Goal -->
              <VCol cols="12">
                <VSelect
                  v-model="event.extendedProps.goal"  
                  :items="therapyTypes"
                  :rules="[requiredValidator]"
                  label="Goal"
                  required
                  @update:modelValue="onGoalChange"
                />
              </VCol>

              <VCol cols="12">                
                <VSelect
                  v-model="event.extendedProps.therapy"
                  :items="inventoryList.filter(item => item.type == event.extendedProps.goal).map(item => item.name)"
                  label="Therapy"                      
                  :rules="[requiredValidator]"
                  required
                >
                  <!--
                    <template #selection="{ item }">
                    <div
                    v-show="event.extendedProps.staff_id"
                    class="align-center"
                    :class="event.extendedProps.staff_id ? 'd-flex' : ''"
                    >
                    <VBadge
                    :color="store.availableColors[item.raw.id % 7]"
                    inline
                    dot
                    class="pa-1"
                    />
                    <span>{{ item.raw.fullName }}</span>
                    </div>
                    </template> 
                  -->
                </VSelect>
              </VCol>    

              <!-- 👉 Start date -->
              <VCol cols="12">
                <AppDateTimePicker
                  :key="JSON.stringify(startDateTimePickerConfig)"
                  v-model="event.start"
                  :rules="[requiredValidator]"
                  label="Appointment Start"
                  :config="startDateTimePickerConfig"
                />
              </VCol>

              <!-- 👉 End date -->              
              <VCol cols="12">                
                <AppDateTimePicker
                  :key="JSON.stringify(endDateTimePickerConfig)"
                  v-model="event.end"
                  :rules="[requiredValidator]"
                  label="Appointment Finish"
                  :config="endDateTimePickerConfig"
                />
              </VCol>

              <!-- 👉 Appointment type -->
              <VCol cols="12">                
                <VSelect
                  v-model="event.extendedProps.appointed_type"  
                  :items="appointmentTypes"
                  :rules="[requiredValidator]"
                  label="Appoint Type"
                  required
                  @update:modelValue="onAppointedTypeChange"
                />
              </VCol>
             

              <!-- 👉 Form buttons -->
              <VCol
                cols="12"
                class="d-flex justify-end"
              >
                <VBtn
                  type="submit"
                  class="me-3"
                >
                  Submit
                </VBtn>
                <VBtn
                  variant="tonal"
                  color="secondary"
                  @click="onCancel"
                >
                  Cancel
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        <!-- !SECTION -->
        </VCardText>
      </VCard>
    </PerfectScrollbar>
  </VNavigationDrawer>
</template>

<style scoped>
.is-invalid .vs__dropdown-toggle {
  border: 1px solid red !important;
  border-radius: 4px;
}
</style>
