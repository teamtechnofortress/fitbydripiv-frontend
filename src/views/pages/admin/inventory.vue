<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig"
import { requiredValidator } from "@/@core/utils/validators"
import * as Network from "@/network"
import * as Const from "@/network/const"
import { useStaffDataStore } from "@/store/staffData"
import { onMounted, watch } from "vue"
import VueSelect from "vue-select"
import { useToast } from "vue-toastification"

const staffDataStore = useStaffDataStore()
const isConfirmDialogVisible = ref(false)
const { inventoryList, error, loaidng } = storeToRefs(staffDataStore)
const sorts = ref(['IV Therapy', 'Injectables', 'Weight Loss', 'Other'])
const refVForm = ref()
const toast = useToast()
const isLoading = ref(false)
const inventory = ref([])
const removeUserId = ref(null)
const { theme } = useThemeConfig()

const subitems = ref([])
const sub_name = ref('')
const sub_dosage = ref('')
const options = ref([])

function addSubItems(){    
  subitems.value.push({
    sub_name: sub_name.value.label,
    sub_dosage: sub_dosage.value,
    sub_ingredient: sub_name.value.ingredients,
    sub_price: sub_name.value.price,
  })
}

function removeSubItem(item){
  subitems.value = subitems.value.filter(xx => xx.sub_name != item.sub_name)
}

function doConfirm(value){
  if(value){
    Network.postRequest(`${Const.DELETE_INVENTORY_URL}/${removeUserId.value}`, {}, {}, 
      response => {
        if(response.data.success){
          toast.success(response.data.message)
          staffDataStore.getAllInventory()
          inventory.value = []
        }else{
          console.log(`Error: ${response.data.err_msg}`)
        }
      },
    )
  }
}

const assignInv = item => {
  inventory.value = item    
  subitems.value = item.subitem ? JSON.parse(item.subitem) : []
}

function saveForm(){
  refVForm.value?.validate().then(({ valid: isValid }) => {
    if (isValid){        
      isLoading.value = true    
      inventory.value['subitem'] = inventory.value['type'] == 'IV Therapy' ? JSON.stringify(subitems.value) : ""
      if(inventory.value.id){// Update
        Network.postRequest(`${Const.UPDATE_INVENTORY_URL}/${inventory.value.id}`, {}, { ...inventory.value }, 
          response => {
            isLoading.value = false
            if(response.data.success){
              toast.success(response.data.message)
              staffDataStore.getAllInventory()
            }else{
              toast.error(`Error: ${response.data.err_msg}`)
              console.log(`Error: ${response.data.err_msg}`)
            }
          },
        )
      }else{//Add New
        Network.postRequest(`${Const.ADD_INVENTORY_URL}`, {}, { ...inventory.value }, 
          response => {
            isLoading.value = false
            if(response.data.success){
              toast.success(response.data.message)
              staffDataStore.getAllInventory()
            }else{
              toast.error(`Error: ${response.data.err_msg}`)
              console.log(`Error: ${response.data.err_msg}`)
            }
          },
        )
      }        
    }else{        
      toast.error("Please fill out the fields!")
    }
  })  
}

const tagSelected = value => {      
  sub_name.value = value
}

function onSearch(searchTxt){    
  options.value = options.value.filter(item => {
    return item.name.toLowerCase().includes(searchTxt.toLowerCase()) || item.first_name.toLowerCase().includes(searchTxt.toLowerCase())
  })
}

watch(() => staffDataStore.inventoryList.filter(item => item.type.toLowerCase() != 'iv therapy'), newVal => {
  if(newVal && newVal.length > 0){
    options.value = newVal.map(item => {
      return {
        id: item.id,
        label: item.name,
        iv_dosage: item.iv_dosage,
        ingredients: item.ingredients,
        price: item.price,
      }
    })
  }
}, { immediate: true })

const getInventoryByType = type => {
  return inventoryList.value.filter(item => item.type.toLowerCase() == type.toLowerCase())
}

onMounted(() => {
  staffDataStore.getAllInventory()
})
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard>
          <VCardText>
            <VRow class="mb-4">
              <VCol cols="6">
                <VRow
                  v-for="(row, key) in sorts"
                  :key="key"
                  class="mb-4 px-2"
                >
                  <VCol>
                    <h4>{{ row }}</h4>
                    <VTable class="border">
                      <tbody>
                        <tr
                          v-for="(item, index) in getInventoryByType(row)"
                          :key="index"
                          class="cursor-pointer"
                          @click="assignInv(item);"
                        >
                          <template v-if="item.type == 'Injectables'">
                            <td :class="[inventory.id == item.id ? 'bg-primary' : '']">
                              {{ index + 1 }}
                            </td>
                            <td :class="[inventory.id == item.id ? 'bg-primary' : '']">
                              {{ item.name }}
                            </td>
                            <td :class="[inventory.id == item.id ? 'bg-primary' : '']">
                              {{ item.vial_conc_mg }} mg/ml
                            </td>
                            <td
                              class="text-right"
                              :class="[inventory.id == item.id ? 'bg-primary' : '']"
                              style="width: 8rem;"
                            >
                              <VBtn
                                icon
                                variant="text"
                                color="default"
                                size="x-small"
                                @click="isConfirmDialogVisible = true; removeUserId = item.id;"
                              >
                                <VIcon
                                  icon="tabler-trash"
                                  :size="22"
                                />
                              </VBtn>
                            </td>
                          </template>
                          <template v-else-if="item.type == 'IV Therapy'">
                            <td :class="[inventory.id == item.id ? 'bg-primary' : '']">
                              {{ index + 1 }}
                            </td>
                            <td :class="[inventory.id == item.id ? 'bg-primary' : '']">
                              {{ item.name }}
                            </td>
                            <td :class="[inventory.id == item.id ? 'bg-primary' : '']">                                                    
                              <table class="w-100 py-4">
                                <thead>
                                  <th class="text-left border-bottom">
                                    Name
                                  </th>
                                  <th class="text-left border-bottom">
                                    Size
                                  </th>
                                  <th class="text-center border-bottom">
                                    Dosage
                                  </th>                                                            
                                </thead>
                                <tbody>
                                  <tr
                                    v-for="(subitem, subindex) in JSON.parse(item.subitem)"
                                    :key="subindex"
                                  >
                                    <td class="text-left">
                                      {{ subitem?.sub_name }}
                                    </td>
                                    <td class="text-left">
                                      {{ subitem?.sub_size_mg }} mg/ml
                                    </td>
                                    <td class="text-center">
                                      {{ subitem?.sub_dosage }}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                            <td
                              class="text-right"
                              :class="[inventory.id == item.id ? 'bg-primary' : '']"
                              style="width: 8rem;"
                            >
                              <VBtn
                                icon
                                variant="text"
                                color="default"
                                size="x-small"
                                @click="isConfirmDialogVisible = true; removeUserId = item.id;"
                              >
                                <VIcon
                                  icon="tabler-trash"
                                  :size="22"
                                />
                              </VBtn>
                            </td>
                          </template>
                          <template v-else>
                            <td :class="[inventory.id == item.id ? 'bg-primary' : '']">
                              {{ index + 1 }}
                            </td>
                            <td :class="[inventory.id == item.id ? 'bg-primary' : '']">
                              {{ item.name }}
                            </td>
                            <td :class="[inventory.id == item.id ? 'bg-primary' : '']">
                              {{ item.vial_conc_mg }} mg/ml
                            </td>
                            <td
                              class="text-right"
                              :class="[inventory.id == item.id ? 'bg-primary' : '']"
                              style="width: 8rem;"
                            >
                              <VBtn
                                icon
                                variant="text"
                                color="default"
                                size="x-small"
                                @click="isConfirmDialogVisible = true; removeUserId = item.id;"
                              >
                                <VIcon
                                  icon="tabler-trash"
                                  :size="22"
                                />
                              </VBtn>
                            </td>
                          </template>
                        </tr>
                      </tbody>
                    </VTable>                                
                    <VRow class="mt-2 align-center justify-end">
                      <VBtn
                        class="me-4"
                        color="primary"
                        @click="inventory = []; inventory['type'] = row; subitems = []"
                      >
                        +
                      </VBtn>
                    </VRow>
                  </VCol>
                </VRow>                        
              </VCol>

              <VCol cols="6">
                <h4 class="ps-2">
                  INVENTORY ITEM
                </h4>
                <VForm
                  ref="refVForm"
                  @submit.prevent="saveForm"
                >
                  <VRow class="mb-4 px-2">
                    <VCol>
                      <VRow class="align-center my-4">                                    
                        <VCol cols="6">
                          <VSelect 
                            v-model="inventory['type']"
                            class="col-4"
                            :items="sorts"            
                            label="INVENTORY TYPE"                                            
                            required
                            :readonly="inventory.id ? true : false"
                            :rules="[requiredValidator]"
                            @update:modelValue="subitems=[]"
                          />
                        </VCol>
                      </VRow> 
                      <VRow>
                        <VCol
                          class="mt-2"
                          cols="12"
                        >
                          <VTextField
                            v-model="inventory['name']"
                            label="NAME"
                            required
                            :rules="[requiredValidator]"
                          />
                        </VCol>
                      </VRow>                                
                    </VCol>
                  </VRow>    
                            
                  <template v-if="inventory['type'] != 'IV Therapy'">
                    <VRow class="mb-4 px-4 d-flex"> 
                      <VCol class="d-flex align-center">
                        <label class="me-4 pt-2">VIAL CONCENTRATION:</label>
                        <VTextField
                          v-model="inventory['vial_conc_mg']"
                          type="number"
                          variant="underlined"
                          style="width: 5rem;"
                        />      
                        <label class="me-4 pt-4">mG</label>
                        <VTextField
                          v-model="inventory['vial_conc_ml']"
                          type="number"
                          variant="underlined"
                          style="width: 5rem;"
                        />
                        <label class="me-4 pt-4">mL</label>
                      </VCol>                           
                    </VRow>
                    <VRow class="mb-4 px-4 d-flex"> 
                      <VCol class="d-flex align-center">
                        <label class="me-4 pt-4">INJECTION DOSAGE:</label>
                        <VTextField
                          v-model="inventory['inject_dosage']"
                          type="number"
                          variant="underlined"
                          style="width: 5rem;"
                        />                                                                    
                        <label class="me-4 pt-4">mG</label>  

                        <label class="me-4 pt-4">IV DOSAGE:</label>                          
                        <VTextField
                          v-model="inventory['iv_dosage']"
                          type="number"
                          variant="underlined"
                          style="width: 5rem;"
                        />
                        <label class="me-4 pt-4">mG</label>
                      </VCol>                           
                    </VRow>
                    <VRow class="mb-4 px-4 d-flex"> 
                      <VCol class="d-flex align-center">
                        <label class="me-4 pt-4">INJECTION DURATION:</label>
                        <VTextField
                          v-model="inventory['inject_duration']"
                          class="mr-4"
                          variant="underlined"
                          type="number"
                          style="width: 5rem;"
                        />                                
                                        
                        <label class="me-4 pt-4">IV DURATION:</label>
                        <VTextField
                          v-model="inventory['iv_duration']"
                          variant="underlined"
                          type="number"
                          style="width: 5rem;"
                        />
                        <label class="me-4 pt-4">(minutes)</label>
                      </VCol>                           
                    </VRow>
                    <VRow class="mb-4 px-4 d-flex"> 
                      <VCol
                        class="d-flex align-center"
                        cols="6"
                      >
                        <label class="me-1 pt-4">VIALS ON HAND:</label>
                        <VTextField
                          v-model="inventory['total_count']"
                          type="number"
                          variant="underlined"
                          required
                          :rules="[requiredValidator]"
                          style="width: 5rem;"
                        />                                
                      </VCol>
                      <VCol
                        class="d-flex align-center"
                        cols="6"
                      >
                        <label class="me-1 pt-4">PRICE PER VIAL:</label>
                        <VTextField
                          v-model="inventory['price']"
                          type="number"
                          variant="underlined"
                          required
                          :rules="[requiredValidator]"
                          style="width: 5rem;"
                        />                                
                      </VCol>
                    </VRow>
                    <VRow class="mb-4 px-4 d-flex"> 
                      <VCol class="d-flex align-center">
                        <label class="me-4 pt-4">SALES DOSAGE GOALS:</label>
                        <VTextField
                          v-model="inventory['sales_daily']"
                          type="number"
                          variant="underlined"
                          style="width: 5rem;"
                        />                                
                        <label class="me-4 pt-4 small-text">DAILY</label>

                        <VTextField
                          v-model="inventory['sales_weekly']"
                          type="number"
                          variant="underlined"
                          style="width: 5rem;"
                        />
                        <label class="me-4 pt-4 small-text">WEEKLY</label>

                        <VTextField
                          v-model="inventory['sales_monthly']"
                          type="number"
                          variant="underlined"
                          style="width: 5rem;"
                        />
                        <label class="pt-4 small-text">MONTHLY</label>
                      </VCol>                           
                    </VRow>

                    <VRow class="mb-4 px-4 d-flex"> 
                      <VCol class="d-flex align-center">
                        <label class="me-4 pt-4">INVENTORY LEVEL:</label>
                        <VTextField
                          v-model="inventory['level_min']"
                          type="number"
                          variant="underlined"
                          style="width: 5rem;"
                        />
                        <label class="me-4 pt-4 small-text">MIN</label>
                                        
                        <VTextField
                          v-model="inventory['level_max']"
                          type="number"
                          variant="underlined"
                          style="width: 5rem;"
                        />
                        <label class="me-4 pt-4 small-text">MAX</label>
                      </VCol>                           
                    </VRow>                            
                    <VRow class="mb-4 px-4 d-flex"> 
                      <VCol class="d-flex align-center">
                        <label class="me-4 pt-4">INGREDIENTS:</label>
                        <VTextField
                          v-model="inventory['ingredients']"
                          variant="underlined"
                          style="width: 10rem;"
                        />                                
                      </VCol>                           
                    </VRow>
                    <VRow class="mb-4 px-4 d-flex"> 
                      <VCol>
                        <VCheckbox
                          v-model="inventory['peptide']"
                          label="PEPTIDE"
                        />
                      </VCol>                                
                    </VRow>
                  </template>
                            
                  <template v-if="inventory['type'] == 'IV Therapy'">
                    <VRow class="mb-4 px-4 d-flex"> 
                      <VCol class="d-flex align-center">
                        <label class="me-4 pt-4">BAG SIZE:</label>
                        <VTextField
                          v-model="inventory['bag_size_ml']"
                          type="number"
                          variant="underlined"
                          style="width: 5rem;"
                        />
                        <label class="me-4 pt-4">mL</label>
                                        
                        <label class="me-4 pt-4">FLUID TYPE:</label>
                        <VTextField
                          v-model="inventory['fluid_type']"
                          variant="underlined"
                          style="width: 5rem;"
                        />
                      </VCol>
                    </VRow>   
                    <VRow class="mx-2 border">
                      <VCol
                        class="d-flex align-center pb-0"
                        cols="12"
                      >
                        <label class="me-1 text-primary">SUB ITEMS:</label>
                      </VCol>
                      <VCol cols="12">                                        
                        <VRow>
                          <VCol
                            class="d-flex align-center"
                            cols="12"
                          >
                            <VRow class="d-flex align-center">
                              <VCol>
                                <VueSelect   
                                  v-model="sub_name"
                                  :class="{'vue-select-custom': theme=='dark'}"                       
                                  :options="options"                                            
                                  placeholder="Name"
                                  @option:selected="tagSelected"
                                  @option:deselected="tagSelected"                                                            
                                  @search="onSearch"
                                /> 
                              </VCol>
                              <VCol>
                                <VRow class="d-flex align-center">
                                  <label class="mx-4 pt-2">IV DOSAGE:</label>
                                  <VTextField
                                    v-model="sub_dosage"
                                    type="number"
                                    variant="underlined"
                                    style="width: 5rem;"
                                  />
                                  <label class="me-4 pt-4">(mg)</label>
                                </VRow>
                              </VCol>
                            </VRow>
                          </VCol>                                            
                          <VCol cols="12">
                            <VRow class="d-flex align-center justify-end">
                              <VBtn
                                class="me-2"
                                color="primary"
                                size="small"
                                @click="addSubItems"
                              >
                                + Add Item to IV Therapy
                              </VBtn>
                            </VRow>
                          </VCol>
                        </VRow>
                      </VCol>
                      <VCol cols="12">
                        <VTable class="text-no-wrap border rounded mb-4">
                          <thead>
                            <tr>
                              <th scope="col">
                                Name
                              </th>
                              <th scope="col">
                                Dosage
                              </th>
                              <th scope="col">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="(item, key) in subitems"
                              :key="key"
                            >
                              <td>{{ item.sub_name }}</td>
                              <td>{{ item.sub_dosage }}</td>
                              <td>
                                <VBtn
                                  icon
                                  variant="text"
                                  color="default"
                                  size="x-small"
                                  @click="removeSubItem(item)"
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
                        </VTable>                                        
                      </VCol>
                    </VRow>

                    <VRow class="mb-4 px-4 d-flex"> 
                      <VCol class="d-flex align-center">
                        <label class="me-4 pt-4">TREATMENT DURATION:</label>
                        <VTextField
                          v-model="inventory['inject_duration']"
                          variant="underlined"
                          type="number"
                          style="width: 5rem;"
                        />                                
                        <label class="me-4 pt-4">(minutes)</label>
                                        
                        <label class="me-4 pt-4">SALES GOAL DAILY:</label>
                        <VTextField
                          v-model="inventory['sales_daily']"
                          variant="underlined"
                          type="number"
                          style="width: 5rem;"
                        />
                      </VCol>                           
                    </VRow>
                    <VRow class="mb-4 px-4 d-flex"> 
                      <VCol
                        class="d-flex align-center"
                        cols="6"
                      >
                        <label class="me-4 pt-4">SALES GOAL DAILY ($):</label>
                        <VTextField
                          v-model="inventory['price']"
                          variant="underlined"
                          type="number"
                          style="width: 5rem;"
                        />
                      </VCol>                                
                    </VRow>
                  </template>

                  <VRow
                    v-if="!isLoading"
                    class="mt-4 pt-4 align-center justify-center px-4"
                  >
                    <VBtn
                      class="me-4"
                      color="secondary"
                      @click="inventory = []"
                    >
                      CANCEL
                    </VBtn>
                    <VBtn
                      class="ms-4"
                      color="primary"
                      type="submit"
                    >
                      {{ !inventory.id ? `SAVE` : `UPDATE` }}
                    </VBtn>
                  </VRow>
                  <VRow
                    v-else
                    class="mt-4 pt-4 align-center justify-center px-4"
                  > 
                    <VProgressCircular indeterminate />    
                  </VRow>
                </VForm>                        
              </VCol>
            </VRow>
            <!-- 👉 Confirm Dialog -->
            <ConfirmDialog
              v-model:isDialogVisible="isConfirmDialogVisible"
              confirmation-msg="Are you sure to delete this patient?"
              @confirm="doConfirm"
            />
          </VCardText>            
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>

<style>
.border-bottom {
  border-bottom: 1px solid grey !important;
}
.small-text{
    font-size: 9pt;
}
</style>