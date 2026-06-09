<script setup>
import * as Network from "@/network"
import * as Const from "@/network/const"
import { formDate } from '@/router/utils'
import { usePatientDataStore } from '@/store/patientData'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useToast } from 'vue-toastification'

const rowPerPage = ref(10)
const currentPage = ref(1)
const totalPage = ref(1)
const patientDataStore = usePatientDataStore()
const { patientList, loading, error } = storeToRefs(patientDataStore)
const toast = useToast()

const searchId = ref(null)
const searchName = ref('')
const searchCell = ref('')
const searchBOD = ref('')
const searchEmail = ref('')
const searchZip = ref('')
const searchAddress = ref('')
const searchVisitDate = ref('')
const isAscending = ref(false)
const isConfirmDialogVisible = ref(false)


const resolveUserStatusVariant = stat => {
  if (stat === 'pending')
    return 'warning'
  if (stat === 'active')
    return 'success'
  if (stat === 'inactive')
    return 'secondary'
  
  return 'primary'
}

patientDataStore.getAllPatient()

const toggleSort = () => {
  isAscending.value = !isAscending.value
}

/**
 * #################################################
 * ###############👉 watching current page ########
 * #################################################
 */
watchEffect(() => {
  if (currentPage.value > totalPage.value)
    currentPage.value = totalPage.value
})
watchEffect(() => {
  if (currentPage.value > totalPage.value)
    currentPage.value = totalPage.value
})
watch(error, value => {
  if(value){
    toast.error(value.message || 'failed')
  }
})

// 👉 Computing pagination data
const paginationData = computed(() => {
  const firstIndex = patients.value.length ? (currentPage.value - 1) * rowPerPage.value + 1 : 0
  const lastIndex = patients.value.length + (currentPage.value - 1) * rowPerPage.value
  
  return `Showing ${ firstIndex } to ${ lastIndex } of ${ patients.value.length } entries`
})

const patients = computed(() => {
  const filtered = patientList.value.filter(item => {
    return (item.first_name+item.middle_name+item.last_name).toLowerCase().includes(searchName.value.toLowerCase()) && 
           (!searchId.value ? true : item.id == searchId.value) &&
           item.cell?.toLowerCase().includes(searchCell.value.toLowerCase())    &&
           item.birthday?.toLowerCase().includes(searchBOD.value.toLowerCase()) && 
           item.email?.toLowerCase().includes(searchEmail.value.toLowerCase())  &&
           item.zip.toLowerCase().includes(searchZip.value.toLowerCase())      &&
           item.address.toLowerCase().includes(searchAddress.value.toLowerCase()) &&
           item.updated_at.toLowerCase().includes(searchVisitDate.value.toLowerCase())
  })

  //sort
  if(isAscending.value == false){
    return filtered
  }else{
    return [...filtered].sort((a, b) => {
      const nameA = a.first_name
      const nameB = b.first_name
      
      return nameA.localeCompare(nameB)
    })
  }
})

const removeUserId = ref(null)

/*####################################
// Remove confirmation
###################################*/
function doConfirm(value){
  if(value){
    Network.postRequest(`${Const.DELETE_PATIENT_URL}/${removeUserId.value}`, {}, {}, 
      response => {
        if(response.data.success){
          toast.success(response.data.message)
          patientDataStore.getAllPatient()
        }else{
          console.log(`Error: ${response.data.err_msg}`)
        }
      },
    )
  }
}
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard title="Patient List">
          <!-- 👉 Filters -->
          <VCardText>
            <VRow>
              <!-- 👉 FirstName, LastName -->
              <VCol
                cols="3"
                style="width: 15rem;"
              >
                <VTextField
                  v-model="searchName"
                  placeholder="First, Last Name"
                  class="search-header-input mx-auto my-3"
                  density="compact"
                >
                  <template #append-inner>
                    <VIcon
                      icon="tabler-search"
                      size="25"
                    />
                  </template>
                </VTextField>                  
              </VCol>

              <!-- 👉 Patient Record -->
              <VCol
                cols="3"
                style="width: 15rem;"
              >                                
                <VTextField
                  v-model="searchId"
                  placeholder="PATIENT RECORD NUMBER"
                  class="search-header-input mx-auto my-3"
                  density="compact"
                >
                  <template #append-inner>
                    <VIcon
                      icon="tabler-search"
                      size="25"
                    />
                  </template>
                </VTextField>
              </VCol>

              <!-- 👉 Phone -->
              <VCol
                cols="3"
                style="width: 15rem;"
              >                  
                <VTextField
                  v-model="searchCell"
                  placeholder="Phone Number"
                  class="search-header-input mx-auto my-3"
                  density="compact"
                >
                  <template #append-inner>
                    <VIcon
                      icon="tabler-search"
                      size="25"
                    />
                  </template>
                </VTextField>                  
              </VCol>

              <!-- 👉 DOB -->
              <VCol
                cols="3"
                style="width: 15rem;"
              >                
                <AppDateTimePicker
                  v-model="searchBOD"
                  class="my-3"
                  label="DATE OF BIRTH"
                />
              </VCol>

              <!-- 👉 Email -->
              <VCol
                cols="3"
                style="width: 15rem;"
              >                  
                <VTextField
                  v-model="searchEmail"
                  placeholder="EMAIL"
                  class="search-header-input mx-auto my-3"
                  density="compact"
                >
                  <template #append-inner>
                    <VIcon
                      icon="tabler-search"
                      size="25"
                    />
                  </template>
                </VTextField>                  
              </VCol>

              <!-- 👉 Zipcode -->
              <VCol
                cols="3"
                style="width: 15rem;"
              >                  
                <VTextField
                  v-model="searchZip"
                  placeholder="ZIP CODE"
                  class="search-header-input mx-auto my-3"
                  density="compact"
                >
                  <template #append-inner>
                    <VIcon
                      icon="tabler-search"
                      size="25"
                    />
                  </template>
                </VTextField>                  
              </VCol>

              <!-- 👉 Address -->
              <VCol
                cols="3"
                style="width: 15rem;"
              >                  
                <VTextField
                  v-model="searchAddress"
                  placeholder="Address"
                  class="search-header-input mx-auto my-3"
                  density="compact"
                >
                  <template #append-inner>
                    <VIcon
                      icon="tabler-search"
                      size="25"
                    />
                  </template>
                </VTextField>                  
              </VCol>                

              <!-- 👉 Date of Last Visit -->
              <VCol
                cols="3"
                style="width: 15rem;"
              >                
                <AppDateTimePicker
                  v-model="searchVisitDate"
                  class="my-3"
                  label="DATE OF LAST VISIT"
                />
              </VCol>                              

              <!-- 👉 Export button -->
              <!--
                <VCol cols="3">
                <VBtn 
                class="d-flex mx-auto mt-2"
                variant="tonal"
                color="primary"
                prepend-icon="tabler-screen-share"
                >
                Export
                </VBtn>  
                </VCol> 
              -->
            </VRow>
          </VCardText>

          <VDivider />

          <VTable class="text-no-wrap">
            <!-- 👉 table head -->
            <thead>
              <tr>
                <th scope="col">
                  P-NUMBER
                </th>
                <th
                  scope="col"
                  class="cursor-pointer"
                  @click="toggleSort"
                >
                  PATIENT ({{ isAscending ? 'A-Z' : 'Z-A' }})
                </th>
                <th scope="col">
                  PHONE
                </th>
                <th scope="col">
                  EMAIL
                </th>
                <th scope="col">
                  DOB
                </th>                
                <th scope="col">
                  ZIPCODE
                </th>
                <th scope="col">
                  ADDRESS
                </th>
                <th scope="col">
                  LAST VISIT DATE
                </th>
                <th scope="col">
                  ACTION
                </th>
              </tr>
            </thead>
            <!-- 👉 table body -->
            <tbody v-if="loading">
              <tr>
                <td colspan="8">
                  <div class="d-flex align-center justify-center">
                    <VProgressCircular
                      color="primary"
                      indeterminate
                    />
                  </div>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr
                v-for="patient in patients"
                :key="patient.id"
                style="height: 3.75rem;"
              >
                <!-- Patient Number -->
                <td>
                  <RouterLink :to="{name: 'patient-chart-tab', params:{tab: 'chart'}, query: {pid: patient.id}}">
                    <div class="d-flex align-center">
                      {{ `#00${patient.id}` }}
                    </div>
                  </RouterLink>
                </td>

                <!-- Full Name -->
                <td>
                  <RouterLink :to="{name: 'patient-chart-tab', params:{tab: 'chart'}, query: {pid: patient.id}}">                    
                    <div class="d-flex align-center">
                      {{ `${patient.first_name} ${patient.middle_name || ''} ${patient.last_name}` }}
                    </div>
                  </RouterLink>
                </td>

                <!-- 👉 phone -->
                <td>                  
                  <span class="text-capitalize text-base">{{ patient.cell }}</span>
                </td>

                <!-- 👉 email -->
                <td>                  
                  <span class="text-capitalize text-base">{{ patient.email }}</span>
                </td>

                <!-- 👉 DOB -->
                <td>
                  <span class="text-capitalize text-base font-weight-semibold">{{ patient.birthday }}</span>
                </td>

                <!-- 👉 Zip -->
                <td>
                  <span class="text-base">{{ patient.zip }}</span>
                </td>

                <!-- 👉 Address -->
                <td>
                  <VChip
                    label
                    :color="`${resolveUserStatusVariant(patient.address)}`"
                    size="small"
                    class="text-capitalize"
                  >
                    {{ patient.address }}
                  </VChip>
                </td>
                
                <!-- 👉 Visit Date -->
                <td>
                  <span class="text-base">{{ formDate(patient.updated_at) }}</span>
                </td>

                <td style="width: 8rem;">
                  <VBtn
                    icon
                    variant="text"
                    color="default"
                    size="x-small"
                    @click="isConfirmDialogVisible = true; removeUserId = patient.id;"
                  >
                    <VIcon
                      icon="tabler-trash"
                      :size="22"
                    />
                  </VBtn>
                </td>
              </tr>
            </tbody>

            <!-- 👉 table footer  -->
            <tfoot v-show="!patients.length">
              <tr>
                <td
                  colspan="8"
                  class="text-center"
                >
                  No data available
                </td>
              </tr>
            </tfoot>
          </VTable>

          <VDivider />

          <!-- 👉 Confirm Dialog -->
          <ConfirmDialog
            v-model:isDialogVisible="isConfirmDialogVisible"
            confirmation-msg="Are you sure to delete this patient?"
            @confirm="doConfirm"
          />

          <VCardText class="d-flex align-center flex-wrap justify-space-between gap-4 py-3 px-5">
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

            <span class="text-sm text-disabled">
              {{ paginationData }}
            </span>

            <VPagination
              v-model="currentPage"
              size="small"
              :total-visible="5"
              :length="totalPage"
            />
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
</style>
