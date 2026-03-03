<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig"
import * as Network from "@/network"
import * as Const from "@/network/const"
import { useStaffDataStore } from "@/store/staffData"
import {
  requiredValidator,
} from '@validators'
import VueSelect from "vue-select"
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VForm } from 'vuetify/components'
import { useCalendarStore } from './useCalendarStore'

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

const store = useCalendarStore()
const refForm = ref()
const isAdmin = computed(() => store.isAdmin)
const options = ref([])
const patient = ref(null)
const patientList = ref([])
const validationError = ref('')
const { theme } = useThemeConfig()
const therapyTypes = ref(['IV Therapy', 'Injectables', 'Weight Loss', 'Other']);
const staffDataStore = useStaffDataStore();
const { inventoryList } = storeToRefs(staffDataStore);
const treatmentDuration = ref(0)

// 👉 Event
const event = ref(JSON.parse(JSON.stringify(props.event)))

const resetEvent = () => {
  validationError.value = ''
  event.value = JSON.parse(JSON.stringify(props.event))
  //tagSelected(event.value.title)
  
  nextTick(() => {
    refForm.value?.resetValidation()
  })
}

onMounted(()=>{
  staffDataStore.getAllInventory();
});

watch(() => props.isDrawerOpen, resetEvent)

watch (() => event.value.extendedProps.treatment, 
  (treatment) => {
    event.value.end = event.value.end ?? new Date(new Date(event.value.start).getTime() + 60 * 1000 * 1);    
  } 
)

watch(
  () => event.value.start,
  (newStart) => {
    if(newStart){
      event.value.end = event.value.end ?? new Date(new Date(event.value.start).getTime() + 60 * 1000 * 1);
    }
  }
)

const removeEvent = () => {
  emit('removeEvent', event.value.id)

  // Close drawer
  emit('update:isDrawerOpen', false)
}

const handleSubmit = () => {
  if(validate()){
    refForm.value?.validate().then(({ valid }) => {
      if (valid) {

        // If id exist on id => Update event
        if ('id' in event.value)
        {
          if(event.value.start) {
            event.value.start = new Date(event.value.start).toISOString()
            event.value.end = new Date(event.value.end).toISOString()
          }
          emit('updateEvent', event.value)
        }
          

        // Else => add new event
        else
        {
          if(event.value.start) {
            event.value.start = new Date(event.value.start).toISOString()
            event.value.end = new Date(event.value.end).toISOString()
          }
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
  const config = {
    enableTime: true,
    dateFormat: 'Y-m-d h:i K',
    time_24hr: false,
  }
  
  return config
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

const getPatientDataById = (value) => {
  Network.getRequestNoAuth(Const.GET_PATIENT_AND_HISTORY_BY_ID, {}, {id: value}, 
    (response) => {
      if(response.data.success){
        if(response.data.message.intake?.[0]?.goal_iv) event.value.extendedProps.goal = 'IV'
        if(response.data.message.intake?.[0]?.goal_injection) event.value.extendedProps.goal = 'INJECTABLES'
        if(response.data.message.intake?.[0]?.goal_other) event.value.extendedProps.goal = 'OTHER'
      }else{
        console.log(`Error: ${response.data.err_msg}`);
      }
    }
  );
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

function onGoalChange(newGoal) {
  event.value.extendedProps.treatment = null; // or '' if that's your default
}
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
        {{ event.id ? 'Update' : 'Add' }} Event
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
              <!-- 👉 Calendar -->
              <VCol
                cols="12"
              >
                <VSelect
                  v-if="isAdmin"
                  v-model="event.extendedProps.staff_id"
                  label="Staff"
                  :rules="[requiredValidator]"
                  :items="store.staffList"
                  :item-title="item => item.fullName"
                  :item-value="item => item.id"
                >
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
                </VSelect>
              </VCol>

              <VCol
                class="d-flex align-center"
                cols="12"
              >         
                <label class="me-4">Patient Name</label>              
                <vue-select   
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
                cols="12"
              >
                <VSelect
                    :items="therapyTypes"     
                    v-model="event.extendedProps.goal"
                    label="Goal"                      
                    :rules="[requiredValidator]"
                    required
                    @update:modelValue="onGoalChange"
                >
                </VSelect>
              </VCol>
              <VCol
                cols="12"
              >
                <VSelect
                  :items="inventoryList.filter(item => item.type == event.extendedProps.goal).map(item => item.name)"
                  v-model="event.extendedProps.treatment"
                  label="Treatment"
                  :rules="[requiredValidator]"
                />
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

              <!-- 👉 Description -->
              <!-- <VCol cols="12">
                <VTextarea
                  v-model="event.extendedProps.description"
                  :rules="[requiredValidator]"
                  label="Description"
                />
              </VCol> -->

              <!-- 👉 Form buttons -->
              <VCol
                cols="12"
                class="d-flex justify-end"
              >
                <VBtn
                  type="submit"
                  class="me-3"
                >
                  Book
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
