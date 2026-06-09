<script setup>
import '@fullcalendar/core/vdom'

//use local import
import { getRequest } from "@/network"
import * as Const from "@/network/const"
import CalendarPatientEventHandler from '@/views/apps/calendar/CalendarPatientEventHandler.vue'
import { blankEvent, useCalendarPatient } from '@/views/apps/calendar/useCalendarPatient'
import { useCalendarPatientStore } from '@/views/apps/calendar/useCalendarPatientStore'
import { useResponsiveLeftSidebar } from '@core/composable/useResponsiveSidebar'
import { formatDate } from '@core/utils/formatters'
import FullCalendar from '@fullcalendar/vue3'
import { onMounted, watch } from "vue"

const store = useCalendarPatientStore()

// 👉 Event
const event = ref(structuredClone(blankEvent))
const isEventHandlerSidebarActive = ref(false)
const appointmentList = ref([])

const currentPage = ref(1)
const pageSize = ref(5)
const visible = ref(false)

const totalPages = computed(() =>
  Math.ceil(appointmentList.value.length / pageSize.value),
)

const paginatedAppointments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  
  return appointmentList.value?.slice(start, end)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

watch(isEventHandlerSidebarActive, val => {
  if (!val)
    event.value = structuredClone(blankEvent)
})

async function loadData(){
  try {
    const appointmentRes = await new Promise((resolve, reject) => {
      getRequest(Const.GET_ALL_PATIENT_APPOINTMENTS_URL, {}, {}, res => {
        if (res.data.success) resolve(res)
        else reject(res)
      })
    })

    appointmentList.value = appointmentRes.data.data.appointments

    const response = await new Promise((resolve, reject) => {
      getRequest(Const.GET_ALL_PATIENT, {}, {}, res => {
        if (res.data.success) resolve(res)
        else reject(res)
      })
    })

    const data = response.data.data

    store.patientList = data.patients.map(s => ({
      ...s,
      fullName: `${s.first_name} ${s.middle_name} ${s.last_name}`,
    }))
    visible.value = true
  } catch (err) {
    console.log("loading patient list failed", err)
  }
}

onMounted(()=>{
  if(JSON.parse(localStorage.getItem('userData')).role == 'admin') store.isAdmin = true
  else{
    store.isAdmin = false
  }

  loadData()
})

const { isLeftSidebarOpen } = useResponsiveLeftSidebar()
const { refCalendar, calendarOptions, addEvent, updateEvent, removeEvent, jumpToDate } = useCalendarPatient(event, isEventHandlerSidebarActive, isLeftSidebarOpen)

// 👉 Check all
const checkAll = computed({
  get: () => store.selectedPatients.length === store.patientList.length,
  set: val => {
    if (val)
      store.selectedPatients = store.patientList.map(i => i.id)
    else if (store.selectedPatients.length === store.patientList.length)
      store.selectedPatients = []
  },
})
</script>

<template>
  <div>
    <VCard v-if="visible">      
      <VLayout style="z-index: 0;">        
        <VNavigationDrawer
          v-model="isLeftSidebarOpen"
          width="292"
          absolute
          touchless
          location="start"
          class="calendar-add-event-drawer"
          :temporary="$vuetify.display.mdAndDown"
        >
          <div style="margin: 1.4rem;">
            <VBtn
              block
              prepend-icon="tabler-plus"
              @click="isEventHandlerSidebarActive = true"
            >
              Add to Schedule
            </VBtn>
          </div>

          <VDivider />

          <div class="d-flex align-center justify-center pa-2 mb-3">
            <AppDateTimePicker
              :model-value="new Date().toJSON().slice(0, 10)"
              label="Inline"
              :config="{ inline: true }"
              class="calendar-date-picker"
              @input="jumpToDate($event.target.value)"
            />
          </div>

          <VDivider />
        </VNavigationDrawer>

        <VMain>
          <VCard flat>
            <FullCalendar
              ref="refCalendar"
              :options="calendarOptions"
            />
          </VCard>
        </VMain>
      </VLayout>
      <VDivider />
      <VRow class="pa-4">
        <VCol cols="12">
          <label class="text-h6"><span class="text-capitalize">Appointment List</span></label>
        </VCol>
        <VCol cols="12">
          <VTable class="text-no-wrap border rounded mb-4">
            <thead>
              <tr>
                <th scope="col">
                  <h2 class="text-primary">
                    Patient Name
                  </h2>
                </th>
                <th scope="col">
                  <h2 class="text-primary">
                    Appointment Date
                  </h2>
                </th>              
                <th scope="col">
                  <h2 class="text-primary">
                    Goal
                  </h2>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="appointment in paginatedAppointments"
                :key="appointment.id"
              >
                <td>{{ appointment.name }}</td>
                <td>{{ formatDate(appointment.start) }}</td>
                <td>{{ appointment.goal }}</td>
              </tr>            
            </tbody>
          </VTable>
          <!-- Pagination Controls -->
          <VRow
            class="mt-4"
            justify="end"
            align="center"
          >
            <VCol
              class="d-flex justify-end align-center"
              cols="auto"
            >
              <VBtn
                variant="outlined"
                size="small"
                :disabled="currentPage === 1"
                class="me-2"
                @click="prevPage"
              >
                Previous
              </VBtn>
              <span class="me-3">Page {{ currentPage }} of {{ totalPages }}</span>

              <VBtn
                variant="outlined"
                size="small"
                :disabled="currentPage === totalPages"
                @click="nextPage"
              >
                Next
              </VBtn>
            </VCol>
          </VRow>
        </VCol>
      </VRow>
    </VCard>
    <CalendarPatientEventHandler
      v-model:isDrawerOpen="isEventHandlerSidebarActive"
      :event="event"
      @add-event="addEvent"
      @update-event="updateEvent"
      @remove-event="removeEvent"
    />
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/libs/full-calendar";

.calendars-checkbox {
  .v-label {
    color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
    opacity: var(--v-high-emphasis-opacity);
  }
}

.calendar-add-event-drawer {
  &.v-navigation-drawer {
    border-end-start-radius: 0.375rem;
    border-start-start-radius: 0.375rem;
  }
}

.calendar-date-picker {
  display: none;

  +.flatpickr-input {
    +.flatpickr-calendar.inline {
      border: none;
      box-shadow: none;

      .flatpickr-months {
        border-block-end: none;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.v-layout {
  overflow: visible !important;

  .v-card {
    overflow: visible;
  }
}
</style>
