<script setup>
import * as Network from "@/network"
import * as Const from "@/network/const"
import { useStaffDataStore } from "@/store/staffData"
import { computed, ref, watch } from 'vue'
import { useToast } from "vue-toastification"

const staffDataStore = useStaffDataStore()
const { staffList, error, loading } = storeToRefs(staffDataStore)
const timeSlots = ref([])
const schedule = ref({}) // Tracks which employee is assigned to each time slot
const colors = ['bg-primary', 'bg-success', 'bg-warning', 'bg-info', 'bg-secondary']
const history = ref([]) 
const draggedColor = ref('')
const selectedSlot = ref(null) // Tracks the clicked slot
const fSelectedSlot = ref(null)
const selectedEmployee = ref(null) // Tracks the clicked employee
const showPopup = ref(false) // Controls the visibility of the popup
const toast = useToast()
const isLoading = ref(false)
const scheduleDate = ref(new Date().toJSON().slice(0, 10))

const employees = computed(() => {
  return staffList.value.map(item => `${item.firstName} ${item.lastName}`)
})

// Split timeSlots into three 8-hour segments
const firstShift = computed(() => timeSlots.value.slice(0, 8))
const secondShift = computed(() => timeSlots.value.slice(8, 16))
const thirdShift = computed(() => timeSlots.value.slice(16, 24))

// Handle drag events
const onDragStart = (event, employee) => {
  event.dataTransfer.setData('employee', employee)

  const index = employees.value.indexOf(employee)

  draggedColor.value = colors[index % colors.length]
}

const onDrop = (event, slot) => {
  const employee = event.dataTransfer.getData('employee')

  history.value.push({ ...schedule.value })
  schedule.value[slot] = employee
  draggedColor.value = ''
}

const allowDrop = event => {
  event.preventDefault() // Allow dropping
}

// Handle slot click to show popup
const onSlotClick = slot => {
  selectedSlot.value = slot
  fSelectedSlot.value = slot
  selectedEmployee.value = schedule.value[slot]
  showPopup.value = true
}

// Assign end time slot and autofill
const assignEndTimeSlot = endSlot => {
  const startIndex = timeSlots.value.indexOf(fSelectedSlot.value)
  const endIndex = timeSlots.value.indexOf(endSlot)
  const employee = selectedEmployee.value
  const color = colors[employees.value.indexOf(employee) % colors.length]

  for (let i = startIndex; i <= endIndex; i++) {
    const slot = timeSlots.value[i]

    schedule.value[slot] = employee
  }
  showPopup.value = false // Close the popup
  schedule.value = doSortSchedule(schedule.value)
}

function doSortSchedule(_schedule) {    
  const res = Object.keys(_schedule).sort((a, b) => {
    return timeSlots.value.indexOf(a) - timeSlots.value.indexOf(b)
  }).map(key=>{
    return { [key]: _schedule[key] }
  })

  
  return Object.assign({}, ...res)
}

const undoLastAction = () => {
  if (history.value.length > 0) {
    schedule.value = history.value.pop()
  }
}

watch(scheduleDate, newDate => {
  getStaffSchedule(newDate)
})

/*
*######################################
*/
const getStaffSchedule = _date => {  
  isLoading.value = true
  Network.getRequest(Const.GET_STAFF_SCHEDULE, {}, { date: _date }, 
    response => {      
      isLoading.value = false
      if(response.data.success){
        const responseData = response.data.data

        schedule.value = JSON.parse(responseData.schedule?.schedule || "{}")
        history.value = []
      }else{
        console.log(`Error: ${response.data.err_msg}`)
        toast.error(response.data.err_msg || "Failed to load schedule.")
      }
    },
  )
}

function doSave(){  
  if(!Object.keys(schedule.value).length){
    toast.error("Please assign at least one staff to a time slot.") 

    return
  }

  isLoading.value = true
  Network.postRequest(Const.SAVE_STAFF_SCHEDULE, {}, { date: scheduleDate.value, schedule: JSON.stringify(schedule.value) }, 
    response => {
      isLoading.value = false
      if(response.data.success){        
        const responseData = response.data.data

        scheduleDate.value = new Date(responseData.schedule.date)
        schedule.value = JSON.parse(responseData.schedule.schedule || "{}")
        history.value = []
        
        toast.success("Schedule saved successfully.")        
      }else{
        console.log(`Error: ${response.data.err_msg}`)
        toast.error(response.data.err_msg || "Failed to save schedule.")
      }
    },
  )

}

onMounted(()=>{
  for(let i = 0; i <= 24; i ++){
    if( i < 12 ){
      timeSlots.value.push(i > 9 ? `${i}:00 AM` : `0${i}:00 AM`)
    }else if(i == 12){
      timeSlots.value.push(`${i}:00 PM`)
    }else if(i == 24){
      timeSlots.value.push(`00:00 AM`)
    }else{
      const pm = i - 12

      timeSlots.value.push(pm > 9 ? `${pm}:00 PM` : `0${pm}:00 PM`)
    }
  }

  //Get staff data
  staffDataStore.getAllStaff()

  //
  getStaffSchedule(scheduleDate.value)  
})
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard title="STAFF SCHEDULE">
          <VCardText class="mb-4">
            <VRow class="mb-2">
              <VCol
                cols="3"
                class="d-flex align-center"
              >
                <label class="me-4">DATE:</label>
                <AppDateTimePicker
                  v-model="scheduleDate"
                  label="DATE"
                  :model-value="scheduleDate"
                  class="calendar-date-picker"
                />
              </VCol>
              <VCol
                cols="9"
                class="text-end"
              >
                <VBtn
                  v-if="!isLoading"
                  @click="doSave"
                >
                  Save
                </VBtn>
                <VProgressCircular
                  v-else
                  indeterminate
                />
              </VCol>
            </VRow>
              
            <VDivider />                

            <!-- First Shift Table -->
            <h4 class="mt-2">
              [12:00 AM - 8:00 AM]
            </h4>
            <VTable class="text-no-wrap pb-4">
              <thead>
                <tr>
                  <th
                    v-for="(slot, index) in firstShift"
                    :key="index"
                    class="border"
                  >
                    {{ slot }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    v-for="(slot, key) in firstShift"
                    :key="key"
                    class="border cursor-pointer"
                    :class="[colors[employees.indexOf(schedule[slot]) % colors.length] || '']"
                    @dragover="allowDrop"
                    @drop="onDrop($event, slot)"
                    @click="schedule[slot] && onSlotClick(slot)"
                  >
                    <span class="font-weight-medium">{{ schedule[slot] || '' }}</span>                        
                  </td>
                </tr>
              </tbody>
            </VTable>

            <!-- Second Shift Table -->
            <h4>[8:00 AM - 4:00 PM]</h4>
            <VTable class="text-no-wrap pb-4">
              <thead>
                <tr>
                  <th
                    v-for="(slot, index) in secondShift"
                    :key="index"
                    class="border"
                  >
                    {{ slot }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>                    
                  <td
                    v-for="(slot, key) in secondShift"
                    :key="key"
                    class="border cursor-pointer"
                    :class="[colors[employees.indexOf(schedule[slot]) % colors.length] || '']"
                    @dragover="allowDrop"
                    @drop="onDrop($event, slot)"
                    @click="schedule[slot] && onSlotClick(slot)"
                  >
                    <span class="font-weight-medium">{{ schedule[slot] || '' }}</span>                        
                  </td>
                </tr>
              </tbody>
            </VTable>

            <!-- Third Shift Table -->
            <h4>[4:00 PM - 12:00 AM]</h4>
            <VTable class="text-no-wrap pb-4">
              <thead>
                <tr>
                  <th
                    v-for="(slot, index) in thirdShift"
                    :key="index"
                    class="border"
                  >
                    {{ slot }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    v-for="(slot, key) in thirdShift"
                    :key="key"
                    class="border cursor-pointer"
                    :class="[colors[employees.indexOf(schedule[slot]) % colors.length] || '']"
                    @dragover="allowDrop"
                    @drop="onDrop($event, slot)"
                    @click="schedule[slot] && onSlotClick(slot)"
                  >
                    <span class="font-weight-medium">{{ schedule[slot] || '' }}</span>                        
                  </td>
                </tr>
              </tbody>
            </VTable>

            <!-- Popup -->
            <VDialog
              v-model="showPopup"
              max-width="400"
            >
              <VCard>
                <VCardTitle>Select End Time Slot</VCardTitle>
                <VCardText>
                  <VSelect
                    v-model="selectedSlot"
                    :items="timeSlots"
                    label="End Time Slot"
                  />
                </VCardText>
                <VCardActions>
                  <VBtn
                    color="primary"
                    @click="assignEndTimeSlot(selectedSlot)"
                  >
                    Assign
                  </VBtn>
                  <VBtn
                    text
                    @click="showPopup = false"
                  >
                    Cancel
                  </VBtn>
                </VCardActions>
              </VCard>
            </VDialog>

            <!-- Undo Button -->
            <VRow class=" text-end">
              <VCol v-if="history.length > 0">
                <VBtn
                  size="small"
                  class="bg-primary"
                  @click="undoLastAction"
                >
                  <VIcon start>
                    mdi-undo
                  </VIcon> Undo
                </VBtn>
              </VCol>                  
            </VRow>

            <h4 class="mt-4">
              EMPLOYEES:
            </h4>
            <VTable class="text-no-wrap border">                    
              <tbody>                      
                <tr>
                  <td
                    v-for="(employee, index) in employees"
                    :key="employee"
                    class="cursor-pointer border"
                    :class="[colors[index % colors.length]]"                        
                    draggable="true"
                    @dragstart="onDragStart($event, employee)"
                  >
                    <span class="font-weight-medium">{{ employee }}</span>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCardText>          
        </VCard>
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

.user-list-name:not(:hover) {
  color: rgba(var(--v-theme-on-background), var(--v-high-emphasis-opacity));
}
</style>
