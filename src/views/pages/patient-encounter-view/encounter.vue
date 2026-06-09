<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig"
import * as Network from "@/network"
import * as Const from "@/network/const"
import router from "@/router"
import { getHumanDate } from '@/router/utils'
import { usePatientDataStore } from '@/store/patientData'
import { useStaffDataStore } from "@/store/staffData"
import { requiredValidator } from '@validators'
import { onMounted, watch } from 'vue'
import VueSelect from "vue-select"
import { useToast } from 'vue-toastification'

const route = useRoute()
const staffDataStore = useStaffDataStore()
const patientDataStore = usePatientDataStore()
const { error, loading, isSavedEncounter } = storeToRefs(patientDataStore)
const { inventoryList } = storeToRefs(staffDataStore)
const { theme } = useThemeConfig()
const therapyTypes = ref(['IV Therapy', 'Injectables', 'Weight Loss', 'Other'])
const encounterList = ref([{ name: "", dosage: "", quantity: null }])
const encounterType = ref(null)
const refVForm = ref()
const toast = useToast()
const options = ref([])
const patientFullName = ref('')
const patient = ref(null)
const patientList = ref([])
const names = ref([])
const encounterHistoryList = ref([])
const rowPerPage = ref(5)
const currentPage = ref(1)
const totalPage = ref(1)
const isConfirmDialogVisible = ref(false)
const removeEncounterId = ref(null)
const units = ref(['MG', 'ML', 'UNIT'])

function doConfirm(value){
  if(value){
    Network.getRequest(`${Const.DELETE_ENCOUNTER_URL}/${removeEncounterId.value}`, {}, {}, 
      response => {
        if(response.data.success){
          toast.success("Successfully Deleted Encounter History.")              
          getPatientName(patient.value.first_name, true)   
        }else{
          console.log(`Error: ${response.data.err_msg}`)
          toast.error(response.data.err_msg || "Failed to load schedule.")
        }
      },
    )

  }
}

function saveForm(){  
  refVForm.value?.validate().then(({ valid: isValid }) => {    
    if (isValid){
      patientDataStore.saveEncounter({        
        patient_id: patient.value.id,
        type: encounterType.value,
        list: encounterList.value,
      })
    }else{
      toast.error("Please fill out the fields!")
    }
  })  
}
function addItems(){
  if(encounterType == 'Injectables'){
    encounterList.value.push({ name: "", dosage: "", quantity: null, inventory_id: null })
  }else{
    encounterList.value.push({ name: "", ingredients: "", dosage: null, inventory_id: null })
  }
}
function removeItems(){
  encounterList.value.pop()
}

const tagSelected = value => {    
  patient.value = patientList.value.find( user => `${user.first_name} ${user.middle_name || ''} ${user.last_name}` == value)  
  encounterHistoryList.value = patient.value.encounter_all || patient.value.encounter
}

const getPatientName = (value, isUpdated = false) => {
  Network.getRequestNoAuth(Const.GET_PATIENT_BY_NAME, {}, { fname: value }, 
    response => {
      if(response.data.success){
        options.value = response.data.message.map( item => `${item.first_name} ${item.middle_name || ''} ${item.last_name}` )
        patientList.value = response.data.message
        if(isUpdated){
          encounterHistoryList.value = patientList.value[0].encounter_all
        }
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
  Network.getRequestNoAuth(Const.GET_PATIENT_AND_HISTORY_BY_ID, {}, { id: value }, 
    response => {
      if(response.data.success){        
        patient.value = response.data.message
        patientFullName.value = `${patient.value.first_name} ${patient.value.middle_name || ''} ${patient.value.last_name}`
        encounterHistoryList.value = patient.value.encounter_all
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

/**
 * ###############################################
 *    Watches
 * ###############################################
*/
watch(isSavedEncounter, val => {
  if(val != null){    
    toast.success("Successfully Saved!")
    setTimeout(()=>{    
      router.push({ name: 'patient-encounter-tab', params: { tab: 'visit' }, query: { pid: patient.value.id } })
    }, 700)
  }
})
watch(error, value => {
  if(value){
    toast.error(value.message || 'failed')
  }
})
watch(inventoryList, value => {
  if(value){    
    names.value = value.map( item => ({ name: item.name, type: item.type, subitem: item?.subitem ? JSON.parse(item.subitem) : "" }))
  }
}, { immediate: true })

onMounted(()=>{
  staffDataStore.getAllInventory()

  if (route.query.pid) {
    getPatientDataById(route.query.pid)
  }
  if (route.query.type) {
    encounterType.value = route.query.type    
  }
})

// 👉 Computing pagination data
const paginationData = computed(() => {  
  const totalItems = encounterHistoryList.value.length
  const firstIndex = totalItems ? (currentPage.value - 1) * rowPerPage.value + 1 : 0
  const lastIndex = Math.min(currentPage.value * rowPerPage.value, totalItems)

  return `Showing ${ firstIndex } to ${ lastIndex } of ${ totalItems } entries`
})

const paginatedEncounterList = computed(() => {
  if (!encounterHistoryList.value?.length) return []
  const start = (currentPage.value - 1) * rowPerPage.value
  const end = start + rowPerPage.value
  
  return encounterHistoryList.value.slice(start, end)
})

watch([encounterHistoryList, rowPerPage], () => {
  totalPage.value = Math.ceil((encounterHistoryList.value?.length || 0) / rowPerPage.value) || 1
})

const today = new Date(); const oneMonthAgo = new Date(today)

oneMonthAgo.setMonth(today.getMonth() - 1)

const historySDate = ref(oneMonthAgo.toJSON().slice(0, 10))
const historyEDate = ref(today.toJSON().slice(0, 10))

const sortByDate = val => {  
  if(!encounterHistoryList.value.length) return
  
  encounterHistoryList.value = patient.value.encounter_all.filter(item => {
    const createAt = new Date(item.created_at.slice(0, 10)).getTime()
    
    return (createAt >= new Date(historySDate.value).getTime()) && (createAt <= new Date(historyEDate.value).getTime())
  })  
  
}

const doCopyEncounter = target => {    
  encounterType.value = target.type
  encounterList.value[0] = target
  encounterList.value[0]['subitems'] = target?.inventory?.subitem ? JSON.parse(target.inventory.subitem) : ""
}

const selectedItem = (selected, index) => {
  if (!selected) return
  encounterList.value[index]['dosage'] = selected.iv_dosage
  encounterList.value[index]['ingredients'] = selected.ingredients
  encounterList.value[index]['inventory_id'] = selected.id
  encounterList.value[index]['subitems'] = selected.subitem ? JSON.parse(selected.subitem) : null
  encounterList.value[index]['unit'] = units.value[0]
}
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard>            
          <VCardText class="mb-2">              
            <VForm
              ref="refVForm"
              @submit.prevent="saveForm"
            >
              <VRow class="mb-4">
                <VCol
                  class="d-flex align-center"
                  cols="4"
                >                    
                  <label class="me-4">Therapy Type:</label>
                  <template v-if="!route.query.type">
                    <VSelect
                      v-model="encounterType"     
                      :items="therapyTypes"
                      label="Therapy"                      
                      variant="underlined"
                      :rules="[requiredValidator]"
                      required                          
                      @update:modelValue="(val) => { encounterList = [{name: '', dosage: '', quantity: null}] }"
                    />
                  </template>
                  <template v-else>
                    <label>{{ encounterType }}</label>
                  </template>
                </VCol>
                <VCol cols="4" />
                <VCol
                  class="d-flex align-center"
                  cols="4"
                >                       
                  <label class="me-4">Patient Name:</label>
                  <VueSelect   
                    v-model="patientFullName"
                    :class="{'vue-select-custom': theme=='dark'}"                       
                    :options="options"                                            
                    style="min-width: 15rem;"
                    placeholder="Please type the name"
                    @option:selected="tagSelected"
                    @option:deselected="tagSelected"
                    @search="onSearch"
                  />                              
                </VCol>
              </VRow>

              <div v-if="encounterType == 'Injectables'">
                <VRow
                  v-for="(item, index) in encounterList"
                  :key="index"
                  class="d-flex align-center justify-space-between"
                >
                  <VCol>                      
                    <VSelect
                      v-model="encounterList[index]['name']"
                      label="Name"
                      :items="names.filter(item => item.type == 'Injectables').map(item => item.name)"
                      item-title="text"
                      item-value="value"
                      density="compact"
                      class="me-3 mt-2"
                      variant="underlined"
                      style="min-width: 15rem;"
                      @update:modelValue="(val) => {
                        const selected = inventoryList.find(item => item.name === val);
                        if (selected) {                            
                          selectedItem(selected, index);
                        }
                      }"
                    />
                  </VCol>
                  <VCol>                        
                    <VTextField
                      v-model="encounterList[index]['quantity']"
                      label="Quantity"
                      type="number"
                      variant="underlined"
                      :rules="[requiredValidator]"
                      density="default"
                      style="width: 10rem;"
                    />                  
                  </VCol>
                  <VCol class="d-flex align-center">
                    <VTextField
                      v-model="encounterList[index]['dosage']"
                      label="Dosage"
                      type="number"
                      variant="underlined"
                      density="default"
                      :rules="[requiredValidator]"
                      style="width: 5rem;"
                    />                  
                    <VSelect
                      v-model="encounterList[index]['unit']"
                      label="Unit"
                      :items="units"
                      :rules="[requiredValidator]"
                      density="compact"
                      variant="underlined"
                      class="mt-3 ms-2"
                      style="width: 1.5rem;"
                    />                      
                  </VCol>
                  <VCol>
                    <VCheckbox
                      v-model="encounterList[index]['is_add_on']"
                      label="Add On"
                      class="pt-4"
                    />                      
                  </VCol>
                </VRow>
              </div>
              <div v-else-if="encounterType == 'IV Therapy'">
                <VRow
                  v-for="(item, index) in encounterList"
                  :key="index"
                  class="d-flex align-center justify-space-between"
                >   
                  <VCol cols="12">
                    <VRow>
                      <VCol>         
                        <VSelect
                          v-model="encounterList[index]['name']"
                          label="Name"
                          :items="names.filter(item => item.type == 'IV Therapy').map(item => item.name)"
                          item-title="text"
                          item-value="value"
                          density="compact"
                          variant="underlined"
                          class="me-3 mt-2"
                          style="min-width: 15rem;"
                          @update:modelValue="(val) => {
                            const selected = inventoryList.find(item => item.name === val);
                            if (selected) { 
                              selectedItem(selected, index);                            
                            }
                          }"
                        />
                      </VCol>
                      <VCol>
                        <VTextField
                          v-model="encounterList[index]['ingredients']"
                          label="Ingredients"
                          variant="underlined"
                          :rules="[requiredValidator]"
                          density="default"
                          style="width: 10rem;"
                        />                          
                      </VCol>                        
                      <VCol>                        
                        <VTextField
                          v-model="encounterList[index]['quantity']"
                          label="Quantity"
                          variant="underlined"
                          type="number"
                          density="default"
                          :rules="[requiredValidator]"
                          style="width: 10rem;"
                        />                  
                      </VCol>
                      <VCol class="d-flex align-center">
                        <VTextField
                          v-model="encounterList[index]['dosage']"
                          label="Dosage"
                          type="number"
                          variant="underlined"
                          density="default"
                          :rules="[requiredValidator]"
                          style="width: 5rem;"
                        />                  
                        <VSelect
                          v-model="encounterList[index]['unit']"
                          label="Unit"
                          :items="units"
                          :rules="[requiredValidator]"
                          density="compact"
                          variant="underlined"
                          class="mt-3 ms-2"
                          style="width: 1.5rem;"
                        />                      
                      </VCol>
                      <VCol>
                        <VCheckbox
                          v-model="encounterList[index]['is_add_on']"
                          label="Add On"
                          class="pt-4"
                        />
                      </VCol>                        
                    </VRow>

                    <VRow class="d-flex mt-2">
                      <div style="min-width: 18rem;" />
                      <div class="w-75">
                        <VTable class="text-no-wrap border rounded mb-4">
                          <thead>
                            <tr>
                              <th scope="col">
                                Sub Item Name
                              </th>
                              <th scope="col">
                                Sub Item Ingredients
                              </th>
                              <th scope="col">
                                Dosage
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="(row, key) in item.subitems"
                              :key="key"
                            >
                              <td>{{ row.sub_name }}</td>
                              <td>{{ row.sub_ingredient }}</td>
                              <td>{{ row.sub_dosage }}</td>
                            </tr>
                          </tbody>
                        </VTable>
                      </div> 
                    </VRow>
                  </VCol>                    
                </VRow>
              </div>
              <div v-else>
                <VRow
                  v-for="(item, index) in encounterList"
                  :key="index"
                  class="d-flex align-center justify-space-between"
                >                    
                  <VCol>
                    <VSelect
                      v-model="encounterList[index]['name']"
                      label="Name"
                      :items="names.filter(item => item.type == encounterType).map(item => item.name)"
                      item-title="text"
                      item-value="value"
                      density="compact"
                      variant="underlined"
                      class="me-3 mt-2"
                      style="min-width: 15rem;"
                      @update:modelValue="(val) => {
                        const selected = inventoryList.find(item => item.name === val);
                        if (selected) {                            
                          selectedItem(selected, index);
                        }
                      }"
                    />
                  </VCol>
                  <VCol>
                    <VTextField
                      v-model="encounterList[index]['ingredients']"
                      label="Ingredients"
                      variant="underlined"
                      :rules="[requiredValidator]"
                      density="default"
                      style="width: 10rem;"
                    />                  
                  </VCol>                    
                  <VCol>                        
                    <VTextField
                      v-model="encounterList[index]['quantity']"
                      label="Quantity"
                      variant="underlined"
                      type="number"
                      density="default"
                      :rules="[requiredValidator]"
                      style="width: 10rem;"
                    />                  
                  </VCol>
                  <VCol class="d-flex align-center">
                    <VTextField
                      v-model="encounterList[index]['dosage']"
                      label="Dosage"
                      type="number"
                      variant="underlined"
                      density="default"
                      :rules="[requiredValidator]"
                      style="width: 5rem;"
                    />                  
                    <VSelect
                      v-model="encounterList[index]['unit']"
                      label="Unit"
                      :items="units"
                      :rules="[requiredValidator]"
                      density="compact"
                      variant="underlined"
                      class="mt-3 ms-2"
                      style="width: 1.5rem;"
                    />                      
                  </VCol>
                  <VCol>
                    <VCheckbox
                      v-model="encounterList[index]['is_add_on']"
                      label="Add On"
                      class="pt-4"
                    />
                  </VCol>                    
                </VRow>
              </div>

              <VRow class="justify-end mt-4">
                <VCol
                  class="d-flex"
                  cols="2"
                >
                  <VBtn
                    class="me-4"
                    @click="addItems"
                  >
                    <VIcon
                      color="white"
                      icon="tabler-plus"
                    />
                  </VBtn>
                  <VBtn @click="removeItems">
                    <VIcon
                      color="white"
                      icon="tabler-trash"
                    />
                  </VBtn>
                </VCol>
              </VRow>

              <VCol
                v-if="patient?.id && encounterList.length && !loading"
                class="mt-4"
              >
                <VBtn
                  class="d-flex mx-auto"
                  type="submit"
                >
                  Process Order <VIcon
                    end
                    icon="tabler-checkbox"
                  />
                </VBtn>
              </VCol>
              <VCol
                v-if="loading"
                class="mt-4"
              >
                <VBtn
                  class="d-flex mx-auto"
                  size="large"
                  style="width: 10rem;"
                >
                  <VProgressCircular
                    color="white"
                    indeterminate
                  />
                </VBtn>
              </VCol>                
            </VForm>
          </VCardText>          
        </VCard>
      </VCol>
    </VRow>
    
    <VRow>
      <VCol>
        <VCard class="mt-4">
          <VRow class="py-4">
            <VCol cols="6">
              <VCardTitle>HISTORY</VCardTitle>
            </VCol>
            <VCol cols="2">        
              <AppDateTimePicker               
                v-model="historySDate" 
                label="START DATE" 
              />
            </VCol>
            <VCol cols="2">
              <AppDateTimePicker               
                v-model="historyEDate" 
                label="END DATE" 
              />
            </VCol>

            <VCol cols="1">
              <VBtn
                color="primary"
                @click="sortByDate"
              >
                Filter
              </VBtn>
            </VCol>
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
                  NAME
                </th>
                <th
                  scope="col"
                  class="font-weight-semibold"
                >
                  DATE
                </th>
                <th
                  scope="col"
                  class="font-weight-semibold"
                >
                  TREATMENT
                </th>
                <th
                  scope="col"
                  class="font-weight-semibold"
                >
                  INGREDIENTS
                </th>
                <th
                  scope="col"
                  class="font-weight-semibold"
                >
                  DOSAGE
                </th>
                <th
                  scope="col"
                  class="font-weight-semibold"
                >
                  Qty
                </th>
                <th
                  scope="col"
                  class="font-weight-semibold text-center"
                >
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(item, index) in paginatedEncounterList"
                :key="index"
                style="height: 3.5rem;"          
              >
                <td class="text-high-emphasis">
                  {{ item.name }}
                </td>
                <td class="text-center">
                  <div class="v-avatar-group">
                    {{ getHumanDate(item.created_at) }}
                  </div>
                </td>          
                <td class="text-center">
                  <div class="v-avatar-group">
                    {{ item.type }}
                  </div>
                </td>          
                <td class="text-center">
                  <div class="v-avatar-group">
                    {{ item.ingredients ?? '--' }}
                  </div>
                </td>          
                <td class="text-center">
                  <div class="v-avatar-group">
                    {{ item.dosage }} {{ item.unit }}
                  </div>
                </td>          
                <td class="text-center">
                  <div class="v-avatar-group">
                    {{ item.quantity ?? '--' }}
                  </div>
                </td> 
                <td class="text-center">                  
                  <VBtn
                    icon
                    variant="text"
                    color="default"
                    size="x-small"
                    @click="doCopyEncounter(item)"
                  >
                    <VIcon
                      icon="tabler-copy"
                      :size="22"
                      color="primary"
                    />
                  </VBtn>
                  <VBtn
                    icon
                    variant="text"
                    color="default"
                    size="x-small"
                    @click="isConfirmDialogVisible = true; removeEncounterId = item.id;"
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

            <tfoot v-show="!encounterHistoryList.length">
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
  </section>
</template>