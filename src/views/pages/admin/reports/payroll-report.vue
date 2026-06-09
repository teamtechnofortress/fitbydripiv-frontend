<script setup>
import * as Network from "@/network"
import * as Const from "@/network/const"
import { getHumanDate } from "@/router/utils"
import { onMounted, ref } from "vue"
import { useToast } from "vue-toastification"
import PayrollReportDialog from "./payroll-report-dialog.vue"

const showChartHistoryDialog = ref(false)
const toast = useToast()

const getAllPayrollReports = () => {
  Network.getRequest(Const.ALL_PAYROLL_REPORT, {}, {}, response=>{
    if(response.data.success){      
      historyList.value = response.data.data.reports
    }else{
      console.error(`Error: ${response.data.err_msg}`)
    }
  })
}

/**
 * #########################################
 */
const isConfirmDialogVisible = ref(false)
const historyList = ref([])
const rowPerPage = ref(5)
const currentPage = ref(1)
const totalPage = ref(1)
const rmRecordId = ref(null)

function doConfirm(value){
  if(value){
    Network.getRequest(`${Const.DELETE_PAYROLL_REPORT}/${rmRecordId.value}`, {}, {}, 
      response => {
        if(response.data.success){
          toast.success("Successfully Deleted Payroll Report.")              
          getAllPayrollReports()
        }else{
          console.log(`Error: ${response.data.err_msg}`)
          toast.error(response.data.err_msg || "Failed to load.")
        }
      },
    )
  }
}

// 👉 Computing pagination data
const paginationData = computed(() => {  
  const totalItems = historyList.value.length
  const firstIndex = totalItems ? (currentPage.value - 1) * rowPerPage.value + 1 : 0
  const lastIndex = Math.min(currentPage.value * rowPerPage.value, totalItems)

  return `Showing ${ firstIndex } to ${ lastIndex } of ${ totalItems } entries`
})

const productMetricsReportList = computed(() => {
  const start = (currentPage.value - 1) * rowPerPage.value
  const end = start + rowPerPage.value
  
  return historyList.value.slice(start, end)
})

watch([historyList, rowPerPage], () => {
  totalPage.value = Math.ceil((historyList.value?.length || 0) / rowPerPage.value) || 1
})

onMounted(()=>{
  getAllPayrollReports()
})
</script>

<template>
  <section>
    <VRow>
      <VCol>        
        <VCard class="px-1">
          <VRow class="my-4 mx-1">
            <VBtn
              color="primary"
              @click="showChartHistoryDialog = true"
            >
              <VIcon
                size="24"
                icon="tabler-plus"
                class="me-2"
              /> 
              Add New
            </VBtn>                    
          </VRow>   
          <VDivider />
  
          <!-- SECTION Table -->
          <VTable class="text-no-wrap">
            <thead>
              <tr>
                <th
                  scope="col"
                  class="font-weight-semibold"
                >
                  Frequency
                </th>
                <th
                  scope="col"
                  class="font-weight-semibold"
                >
                  Range Date
                </th>                
                <th
                  scope="col"
                  class="font-weight-semibold"
                >
                  Receiver Email
                </th>
                <th
                  scope="col"
                  class="font-weight-semibold"
                >
                  Last Reported Date
                </th>
                <th
                  scope="col"
                  class="font-weight-semibold"
                >
                  Created At
                </th>
                <th
                  scope="col"
                  class="font-weight-semibold"
                >
                  Action
                </th>
              </tr>
            </thead>
  
            <tbody>
              <tr
                v-for="(item, index) in productMetricsReportList"
                :key="index"
                style="height: 3.5rem;"          
              >
                <td class="text-high-emphasis">
                  {{ item.frequency.toUpperCase() }}
                </td>
                <td class="text-center">
                  <div class="v-avatar-group">
                    {{ item.range_sdate }} ~ {{ item.range_edate }}
                  </div>
                </td>                             
                <td class="text-center">
                  <div class="v-avatar-group">
                    {{ item.email }}
                  </div>
                </td> 
                <td class="text-center">
                  <div class="v-avatar-group">
                    {{ getHumanDate(item.reported_date) }}
                  </div>
                </td> 
                <td class="text-center">
                  <div class="v-avatar-group">
                    {{ getHumanDate(item.created_at) }}
                  </div>
                </td>                
                <td>
                  <VBtn
                    icon
                    variant="text"
                    color="default"
                    size="x-small"
                    @click="isConfirmDialogVisible = true; rmRecordId = item.id;"
                  >
                    <VIcon
                      icon="tabler-trash"
                      :size="22"
                      color="primary"
                    />
                  </VBtn>
                </td>                       
              </tr>
            </tbody>
  
            <tfoot v-show="!historyList.length">
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
            <div
              class="me-3"
              style="width: 80px;"
            >
              <VSelect
                v-model="rowPerPage"
                density="compact"
                variant="outlined"
                :items="[10, 20, 30, 50]"
              />
            </div>
  
            <!-- 👉 Pagination meta -->
            <span class="text-sm text-disabled">{{ paginationData }}</span>
  
            <!-- 👉 Pagination -->
            <VPagination
              v-model="currentPage"
              size="small"
              :total-visible="5"
              :length="totalPage"
              @next="selectedRows = []"
              @prev="selectedRows = []"
            />      
          </VCardText>
          <!-- !SECTION -->          
        </VCard>
        <!-- 👉 Confirm Dialog -->
        <ConfirmDialog
          v-model:isDialogVisible="isConfirmDialogVisible"
          confirmation-msg="Are you sure to delete this?"
          @confirm="doConfirm"
        />
      </VCol>
    </VRow>
    <PayrollReportDialog
      v-model="showChartHistoryDialog"
      @refresh="getAllPayrollReports"
    />
  </section>  
</template>

