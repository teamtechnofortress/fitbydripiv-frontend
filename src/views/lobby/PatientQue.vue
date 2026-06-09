<script setup>
import * as Network from "@/network"
import * as Const from "@/network/const"
import { getHumanDate } from '@/router/utils'
import QueDialog from "./que-dialog.vue"

const searchQuery = ref('')
const rowPerPage = ref(5)
const currentPage = ref(1)
const totalPage = ref(1)
const totalProjects = ref(0)
const patientQueList = ref([])
const isEditQueDialogOpen = ref(false)
const sltPhysicalExam = ref()
const sltComplaint = ref()
const patientFullName = ref("")

const getPatientQue = value => {
  Network.getRequest(Const.GET_PATIENT_QUE, {}, {}, 
    response => {
      if(response.data.success){        
        patientQueList.value = response.data.data.que
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

// 👉 Computing pagination data
const paginationData = computed(() => {
  const firstIndex = patientQueList.value.length ? (currentPage.value - 1) * rowPerPage.value + 1 : 0
  const lastIndex = patientQueList.value.length + (currentPage.value - 1) * rowPerPage.value
  
  return `Showing ${ firstIndex } to ${ lastIndex } of ${ patientsQue.value.length } entries`
})

const patientsQue = computed(()=>{
  return patientQueList.value.filter(item => {
    return (item.patient.first_name+item.patient.middle_name+item.patient.last_name).toLowerCase().includes(searchQuery.value.toLowerCase())
  })
})

onMounted(()=>{
  getPatientQue()
})
</script>

<template>
  <VCard v-if="patientQueList">
    <VCardItem class="project-header d-flex flex-wrap justify-space-between py-4 gap-4">
      <VCardTitle>PATIENT QUE</VCardTitle>

      <template #append>
        <div
          class="d-flex align-center gap-2"
          style="width: 272px;"
        >
          <VLabel>Search:</VLabel>
          <VTextField
            v-model="searchQuery"
            placeholder="Search"
          />
        </div>
      </template>
    </VCardItem>

    <VDivider />

    <!-- SECTION Table -->
    <VTable class="text-no-wrap">
      <!-- 👉 Table head -->
      <thead>
        <tr>
          <th
            scope="col"
            class="font-weight-semibold"
          >
            NAME
          </th>
          <th
            scope="col"
            class="font-weight-semibold"
          >
            ARRIVAL TIME
          </th>
          <th
            scope="col"
            class="font-weight-semibold"
          >
            SERVICE
          </th>
          <th
            scope="col"
            class="font-weight-semibold"
          >
            TEMP
          </th>
          <th
            scope="col"
            class="font-weight-semibold"
          >
            BP
          </th>
          <th
            scope="col"
            class="font-weight-semibold"
          >
            HEART RATE
          </th>          
          <th
            scope="col"
            class="font-weight-semibold"
          >
            Action
          </th>          
        </tr>
      </thead>

      <!-- 👉 Table Body -->
      <tbody>
        <tr
          v-for="item in patientsQue"
          :key="item.id"
          style="height: 3.5rem;"
        >
          <!-- 👉 Name -->
          <td>
            <div class="d-flex align-center gap-3">              
              <div>
                <RouterLink
                  :to="{name: 'patient-chart-tab', params:{tab: 'chart'}, query: {pid: item.patient.id, type: item?.patient?.complaint?.treatment_type}}"
                  class="font-weight-semibold"
                >                  
                  {{ `${item.patient.first_name} ${item.patient.middle_name || ''} ${item.patient.last_name}` }}
                </RouterLink>
              </div>
            </div>
          </td>

          <td class="text-medium-emphasis">
            {{ getHumanDate(item.created_at) }}
          </td>

          <td class="text-center">
            <div class="v-avatar-group">
              {{ item?.patient?.complaint?.treatment_type || '--' }}
            </div>
          </td>

          <td class="text-xcenter">
            {{ item?.patient?.physicalExam?.Temp || '--' }}
          </td>

          <td class="text-xcenter">
            {{ item?.patient?.physicalExam?.BP || '--' }}
          </td>

          <td class="text-center">
            {{ item?.patient?.physicalExam?.HR || '--' }}
          </td>
          <td class="text-center">
            <VIcon
              v-if="item?.patient.physicalExam"
              size="18"
              icon="tabler-edit"
              color="primary"
              @click="isEditQueDialogOpen = true; 
                      sltPhysicalExam = item?.patient.physicalExam; 
                      sltComplaint = item?.patient.complaint;
                      patientFullName = `${item.patient.first_name} ${item.patient.middle_name || ''} ${item.patient.last_name}`;"
            />
          </td>
        </tr>
      </tbody>

      <!-- 👉 table footer  -->
      <tfoot v-show="!patientsQue.length">
        <tr>
          <td
            colspan="8"
            class="text-center text-body-1"
          >
            No data available
          </td>
        </tr>
      </tfoot>
    </VTable>
    <!-- !SECTION -->

    <VDivider />

    <!-- SECTION Pagination -->
    <VCardText class="d-flex align-center flex-wrap justify-space-between gap-4 py-3">
      <!-- 👉 Pagination meta -->
      <span class="text-sm text-disabled">{{ paginationData }}</span>

      <!-- 👉 Pagination -->
      <VPagination
        v-model="currentPage"
        size="small"
        :total-visible="2"
        :length="totalPage"
      />
    </VCardText>
  <!-- !SECTION -->
  </VCard>
  <QueDialog
    v-model="isEditQueDialogOpen"
    :physical-exam-data="sltPhysicalExam"
    :complaint-data="sltComplaint"
    :patient-name="patientFullName"
  />
</template>

<style lang="scss">
.project-header .v-card-item__append {
  padding-inline-start: 0;
}
</style>
