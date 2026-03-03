<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig";
import * as Network from "@/network";
import * as Const from "@/network/const";
import router from "@/router";
import { usePatientDataStore } from "@/store/patientData.js";
import { useSettingsStore } from "@/store/settingsData";
import { formatDate } from '@core/utils/formatters';
import { requiredValidator } from '@validators';
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import VueSelect from "vue-select";
import { useToast } from "vue-toastification";
import PaymentConfirmDialog from "./payment-confirm-dialog.vue";

const { theme } = useThemeConfig();
const date = ref('');
const rowPerPage = ref(10)
const totalPage = ref(1)
const totalUsers = ref(0)
const users = ref([]);
const refVForm = ref();
const toast = useToast();
const options = ref([]);
const patient = ref([]);
const selectedPatients = ref([]);
const route = useRoute();
const sorts = ref(['IV Therapy', 'Injectables', 'Weight Loss', 'Other']);
const patientDataStore = usePatientDataStore();
const settingDataStore = useSettingsStore();
const { bankingData } = storeToRefs(settingDataStore);
const { isSavedInvoice, error, loading, patientList } = storeToRefs(patientDataStore);
const encounterList = ref([]);
const tax = ref(0.00);
const tip = ref(0.00);
const totalPrice = ref(0);
const isEmailing = ref(false);
const isSendInstructions = ref(false);
const signImg = ref('');
const paymentType = ref('cash');
const isSending = ref(false);
const showConfirmDlg = ref(false);
const isConfirmed = ref(false);
const isConfirmDialogVisible = ref(false);
const rmRecordId = ref(null);

//###########################################
const currentPage = ref(1)
const pageSize = ref(5)

const totalPages = computed(() =>
  Math.ceil(patient.value?.invoice?.length / pageSize.value)
)

const paginatedAppointments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return patient.value?.invoice?.slice(start, end)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
//###########################################

function doConfirm(value){
  if(value){
    Network.getRequest(`${Const.DELETE_ENCOUNTER_URL}/${rmRecordId.value}`, {}, {}, 
      (response) => {
        if(response.data.success){
          toast.success("Successfully Deleted Encounter Record.");
          getPatientDataById(patient.value.id);
        }else{
          console.log(`Error: ${response.data.err_msg}`);
          toast.error(response.data.err_msg || "Failed to load.");
        }
      }
    );
  }
}

const tagSelected = (value) => {  
  patient.value = selectedPatients.value.find( user => `${user.first_name} ${user.middle_name || ''} ${user.last_name}` == value);  
}

const getPatientName = (value) => {
  Network.getRequestNoAuth(Const.GET_PATIENT_BY_NAME, {}, {fname: value}, 
    (response) => {
      if(response.data.success){
        options.value = response.data.message.map( item => `${item.first_name} ${item.middle_name || ''} ${item.last_name}` );
        selectedPatients.value = response.data.message;
      }else{
        console.log(`Error: ${response.data.err_msg}`);
      }
    }
  );
}

function onSearch(searchTxt){
  if(searchTxt.length >= 3){
    getPatientName(searchTxt);
  }
}

const getPatientDataById = (value) => {
  Network.getRequestNoAuth(Const.GET_PATIENT_AND_ENCOUNTER_BY_ID, {}, {id: value}, 
    (response) => {
      if(response.data.success){        
        patient.value = response.data.message;     
        
        // Do GroupBy
        encounterList.value = patient.value.encounter.reduce((acc, cur)=>{
            if(!acc[cur.type]){
                acc[cur.type] = [];
            }
            acc[cur.type].push(cur);
            return acc;
        }, {});
      }else{
        toast.error(`Invalid patient Number: ${response.data.err_msg}`);
        console.log(`Error: ${response.data.err_msg}`);
        patient.value = [];
      }
    }
  );
}

const getSignature = () => {
  Network.getRequest(Const.GET_SIGNATURE_URL, {}, {},
      (response) => {
          if(response.data.success){            
            signImg.value = response.data.data.signature;
          }else{
              console.log(`Error: ${response.data.err_msg}`);
          }
      }
  );
}

const doSendEmail = (invoice) => {
  isSending.value = true;
  Network.getRequest(Const.INVOICE_SEND_URL, {}, {invoice_id: invoice.id}, 
    (response) => {
      isSending.value = false;
      if(response.data.success){            
        toast.success("Successfully sent the invoice to that user!");
      }else{
        toast.error(`Error: ${response.data.err_msg}`);
        console.log(`Error: ${response.data.err_msg}`);
      }
    }
  );
}

onMounted(() => {
  if (route.query.pid) {
    getPatientDataById(route.query.pid)
  }

  getSignature();
  patientDataStore.getAllPatient();
  //get the taxRate value
  settingDataStore.getBankingData();
});

const getRealValue = (price, discount) => {
    if(!price) return 0.00;    
    const subPrice = price * (1-(discount ?? 0)/100);        
    return Math.ceil( subPrice*100 )/100 ;
}

const getTotalPrice = () => {
  let sum = 0;
  const keys = Object.keys(encounterList.value);
  for (let i = 0; i < keys.length; i++) {
    const type = keys[i];
    encounterList.value[type].forEach(encounter => {
      const price = encounter?.inventory?.price*1 || 0;
      const discount = encounter.discount || 0;
      const subPrice = price * (1 - discount / 100);
      sum += subPrice;
    });
  }
  return Math.ceil( ( sum*1 + tip.value*1 + sum*(tax.value/100) )*100 )/100;
};

const getSubTotalPrice = () => {
  let sum = 0;
  const keys = Object.keys(encounterList.value);
  for (let i = 0; i < keys.length; i++) {
    const type = keys[i];
    encounterList.value[type].forEach(encounter => {
      const price = encounter?.inventory?.price*1 || 0;
      const discount = encounter.discount || 0;
      const subPrice = price * (1 - discount / 100);
      sum += subPrice;
    });
  }
  return Math.ceil( sum*100 )/100;
};

function saveForm(){  
  refVForm.value?.validate().then(({ valid: isValid }) => {
    if (isValid) {
      patientDataStore.saveInvoice({
        patient_id: patient.value.id,
        data: encounterList.value,
        tip: tip.value,
        tax: tax.value,
        totalPrice: totalPrice.value,
        isEmailing: isEmailing.value,
        isSendInstructions: isSendInstructions.value,
        paymentType: paymentType.value,
      });
    } else {
      toast.error("Please fill out the fields!");
    }
  });  
}

/**
* ################################################################
* ################################################################
*/
watch(encounterList, (value) => {
    totalPrice.value = getTotalPrice();
}, {deep: true});

watch(tip, () => {
    totalPrice.value = getTotalPrice();
});

watch(tax, () => {
    totalPrice.value = getTotalPrice();
});

watch(isSavedInvoice, (value) => {
    if(value){
      toast.success('Successfully Saved Invoice!');
      setTimeout(()=>{    
        router.push({name: 'patient-encounter-tab', params: {tab: 'appointment'}});
      }, 700);
    }
});

watch(error, (value) => {
  if(value){
    toast.error(value.message || 'failed');
  }
});

// 👉 watching current page
watchEffect(() => {
  if (currentPage.value > totalPage.value)
    currentPage.value = totalPage.value
})

// 👉 watching current page
watchEffect(() => {
  if (currentPage.value > totalPage.value)
    currentPage.value = totalPage.value
});

watch(bankingData, (value) => {
  if(value){
    tax.value = value.sales_tax_rate || 0;
  }
});

// 👉 Computing pagination data
const paginationData = computed(() => {
  const firstIndex = users.value.length ? (currentPage.value - 1) * rowPerPage.value + 1 : 0
  const lastIndex = users.value.length + (currentPage.value - 1) * rowPerPage.value
  
  return `Showing ${ firstIndex } to ${ lastIndex } of ${ totalUsers.value } entries`
});

const patientIds = () => {
  return patientList.value.map(pt => pt.id ).join(', ');
}

watch(isConfirmed, (value)=>{
  if(value){
    isConfirmed.value = false;
    saveForm();
  }
});
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard>
          <VForm
              ref="refVForm"
              @submit.prevent="saveForm"
            >
              <VCardText class="my-4">
                  <VRow class="mb-4">                        
                      <VCol>
                        <VTextField
                          @input="getPatientDataById(patient['id'])"
                          v-model="patient['id']"
                          label="PATIENT NUMBER"
                          style="width: 12.5rem;"
                          :readonly="!!route.query.pid"
                        />
                        <p class="ms-1 mt-1 mb-0 text-warning" style="font-size: 10pt;">(* Valid Numbers: {{ patientIds() }} )</p>
                      </VCol>

                      <VCol v-if="!loading">
                          <VBtn v-if="totalPrice > 0" @click="showConfirmDlg = true;" class="d-flex mx-auto" color="primary">Process Now</VBtn> 
                          <VBtn v-else class="d-flex mx-auto" color="secondary">Process Now</VBtn>
                      </VCol>
                      <VCol v-else>
                          <div size="large" class="d-flex mx-auto" style="width: 15rem;"><VProgressCircular color="white" indeterminate /></div>
                      </VCol>
                  </VRow>
                  <VRow>
                      <VCol v-if="route.query.pid" class="d-flex align-center" cols="3" sm="6" md="3">                          
                        <VTextField v-model="patient['first_name']"
                            label="First Name"
                            placeholder="First Name"
                            variant='underlined'
                            :rules=[requiredValidator]
                        />                          
                      </VCol>
                      <VCol v-else class="d-flex align-center" cols="3" sm="6" md="3">
                        <label class="mt-2" style="font-size: 10pt;">First Name</label>
                        <vue-select
                            :class="{'vue-select-custom': theme=='dark'}"
                            v-model="patient['first_name']"
                            :options="options" 
                            @option:selected="tagSelected"
                            @option:deselected="tagSelected"
                            @search="onSearch"
                            style="min-width: 15rem;">
                        </vue-select> 
                      </VCol>
                      <VCol cols="3" sm="6" md="3">
                          <VTextField
                              v-model="patient['last_name']"
                              label="Last Name"
                              placeholder="Last Name"
                              variant='underlined'
                              :rules=[requiredValidator]
                          />
                      </VCol>

                      <VCol class="d-flex align-center" cols="3" sm="6" md="3">                          
                          <label class="me-4">DOB</label>
                          <AppDateTimePicker 
                              v-model="patient['birthday']"
                              label="Date of Birth" 
                              :model-value="patient['birthday'] || (new Date().toJSON().slice(0, 10))" 
                              variant="underlined" />
                      </VCol> 

                      <VCol cols="3" sm="6" md="3">
                          <VTextField
                              v-model="patient['address']"
                              label="Address"
                              placeholder="Address"
                              variant="underlined"
                              :rules=[requiredValidator]
                          />
                      </VCol>
                      <VCol cols="3" sm="6" md="3">
                          <VTextField
                              v-model="patient['city']"
                              label="City"
                              placeholder="City"
                              variant="underlined"
                              :rules=[requiredValidator]
                          />
                      </VCol>
                      <VCol cols="3" sm="6" md="3">
                          <VTextField
                              v-model="patient['state']"
                              label="State"
                              placeholder="State"
                              variant="underlined"
                              :rules=[requiredValidator]
                          />
                      </VCol>
                      <VCol cols="3" sm="6" md="3">
                          <VTextField
                              v-model="patient['zip']"
                              label="Zip"
                              placeholder="ZIP"
                              variant="underlined"
                              :rules=[requiredValidator]
                          />
                      </VCol>
                      <VCol cols="3" sm="6" md="3">
                          <VTextField
                              v-model="patient['email']"
                              type="email"
                              label="Billing Address"
                              placeholder="Billing Address"
                              variant="underlined"
                              :rules=[requiredValidator]
                          />
                      </VCol>                    
                  </VRow>                    
                  <VRow class="mt-4">
                      <VCol v-for="(row, index) in Object.keys(encounterList)" :key="index" cols="12" class="border mb-4">
                          <VRow>
                              <VCol cols="3">
                                  <VTextField :model-value="row" label="Service Type" variant="underlined" density="default" style="width: 10rem;" readonly></VTextField>
                              </VCol>                            
                          </VRow>                        
                          <VRow v-for="(encounter, index) in encounterList[row]" :key="index">    
                              <VCol cols="1">                                  
                                <VChip v-if="encounter['is_add_on']" label color="warning" class="mt-5">Add On</VChip>
                              </VCol>
                              <VCol cols="3">
                                  <VTextField :model-value="encounter['name']" label="Name" variant="underlined" density="default" style="width: 15rem;" readonly></VTextField>
                              </VCol>
                              <VCol cols="3">
                                  <VTextField v-if="row == 'IV'" :model-value="encounter['ingredients']" label="Ingredients" variant="underlined" density="default" readonly></VTextField>
                                  <VTextField v-else :model-value="encounter['dosage']" label="Dosage" variant="underlined" density="default"  readonly></VTextField>
                              </VCol>
                              <VCol cols="1">
                                  <VTextField v-if="row == 'IV'" :model-value="encounter['dosage']" label="Name" variant="underlined" density="default" readonly></VTextField>
                                  <VTextField v-else :model-value="encounter['quantity']" label="Quantity" variant="underlined" density="default"  readonly></VTextField>
                              </VCol>

                              <VCol cols="1">
                                  <VTextField :model-value="encounter?.inventory?.price" label="$ Price" variant="underlined" density="default" type="number" readonly></VTextField>
                              </VCol>
                              <VCol cols="1">
                                <VTextField v-model="encounter['discount']" label="% Discount" variant="underlined" density="default" type="number"></VTextField>
                              </VCol>
                              <VCol cols="1">
                                <VTextField :model-value="getRealValue((encounter?.inventory?.price || 0), encounter['discount'])" label="NET" variant="underlined" density="default" type="number"></VTextField>
                              </VCol>
                              <VCol cols="1" class="text-center d-flex align-end justify-center">
                                <VBtn icon variant="text" color="default" size="x-small" @click="isConfirmDialogVisible = true; rmRecordId = encounter['id'];">
                                  <VIcon icon="tabler-trash" :size="22" color="primary"/>
                                </VBtn>
                              </VCol>                                
                          </VRow>
                      </VCol>
                  </VRow>

                  <VDivider class="my-2"/>

                  <VRow class="mx-2 offset-10 text-right">
                    <VCol class="d-flex align-end offset-10" cols="2">
                      <VCol>Sub Total : {{ getSubTotalPrice() }}</VCol>
                    </VCol>
                  </VRow>
                  <VRow class="mx-2 offset-10 text-right">
                    <VCol class="d-flex align-end offset-10" cols="2">
                        <label class="me-4">TIP:</label> 
                        <VTextField v-model="tip" label="USD" variant="underlined" density="default" type="number"></VTextField>
                    </VCol>
                  </VRow>
                  <VRow class="mx-2 offset-10 text-right">                    
                    <VCol class="d-flex align-end offset-10" cols="2">
                        <label class="me-4">TAX:</label>                         
                        <VTextField :model-value="Math.ceil(getSubTotalPrice()*tax)/100" label="USD" variant="underlined" density="default" type="number" readonly></VTextField>
                    </VCol>
                  </VRow>
                  <VRow class="mx-2 offset-10 text-right">
                    <VCol>Total (US$): {{ totalPrice }}</VCol>
                  </VRow>
                  
                  <VRow class="mt-4" align="center">
                    <VCol cols="2">
                      <label class="me-4" style="font-size: 10pt;">Administrated By</label>
                      <VRow v-if="signImg" class="pt-4">        
                        <img
                          :src="signImg"
                          alt="Signature Pad"
                          class="w-75" />
                      </VRow>
                    </VCol>
                    <VCol cols="1">
                      <VCheckbox label="Email" v-model="isEmailing" class="mt-4 pt-4" style="font-size: 8pt;"/>
                    </VCol>
                    <VCol cols="2">
                      <VCheckbox label="Sending Instructions" v-model="isSendInstructions" class="mt-4 pt-4" style="font-size: 8pt;"/>
                    </VCol>
                    <VCol cols="2">
                      <VSelect 
                        class="mt-4 pt-4"                       
                        label="Therapy Type"
                        :items="sorts"
                        style="font-size: 10pt!important;"
                      />
                    </VCol>
                    <VCol cols="5">
                      <VRow>
                        <VRadioGroup
                          class="row pt-4"
                          v-model="paymentType"
                          inline
                          :rules="[requiredValidator]"
                          label="Payment Type"
                        >
                          <VCol cols="3" class="d-flex align-center">
                            <VRadio
                              label="Cash"
                              value="cash"
                            />
                          </VCol>
                          <VCol cols="3" class="d-flex align-center">
                            <VRadio
                              label="Credit Card"
                              value="creditCard"
                            />
                          </VCol>
                          <VCol cols="3" class="d-flex align-center">
                            <VRadio
                              label="Electronic"
                              value="electronic"
                            />
                          </VCol>
                          <VCol cols="3" class="d-flex align-center">
                            <VRadio
                              label="Crypto"
                              value="crypto"
                            />
                          </VCol>                          
                        </VRadioGroup>
                      </VRow>
                    </VCol>                      
                  </VRow>
              </VCardText>
          </VForm>
          <ConfirmDialog
            v-model:isDialogVisible="isConfirmDialogVisible"
            confirmation-msg="Are you sure to delete this?"
            @confirm="doConfirm"
          />
        </VCard>
        <VRow class="mt-4">
          <VCol cols="12" class="pb-0">
            <label class="text-h6 pb-0"><span class="text-capitalize">Invoice History</span></label>
          </VCol>
          <VCol cols="12">
            <VTable class="text-no-wrap border rounded mb-4">
              <thead>
                <tr>
                  <th scope="col">
                    <h2 class="text-primary">No</h2>
                  </th>
                  <th scope="col">
                    <h2 class="text-primary text-center">Contents</h2>
                  </th>
                  <th scope="col">
                    <h2 class="text-primary">Tip</h2>
                  </th>
                  <th scope="col">
                    <h2 class="text-primary">Tax</h2>
                  </th>              
                  <th scope="col">
                    <h2 class="text-primary">Total Price</h2>
                  </th>
                  <th scope="col">
                    <h2 class="text-primary">Date</h2>
                  </th>
                  <th scope="col">
                    <h2 class="text-primary text-end">Action</h2>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(invoice, index) in patient?.invoice" :key="index">
                  <td>{{ index+1 }}</td>
                  <td>                    
                    <table class="border w-100 pa-4">
                      <thead>
                        <tr class="text-primary">                          
                          <th scope="col">Type</th>
                          <th scope="col">Name</th>
                          <th scope="col">Ingredients</th>
                          <th scope="col">Is Add On</th>
                          <th scope="col">Qty</th>
                        </tr>                        
                      </thead>
                      <tbody>
                        <tr v-for="(item, index) in [].concat(...(Object.values(JSON.parse(invoice.data))))" :key="index">
                          <td class="text-left">{{ item.type }}</td>                          
                          <td class="text-center">{{ item.name }}</td>                          
                          <td class="text-center">{{ item.ingredients }}</td>                          
                          <td class="text-center">{{ item.is_add_on ? 'Add On' : '' }}</td>                          
                          <td class="text-center">{{ item.quantity }}</td>                          
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td>{{ invoice.tip }}</td>
                  <td>{{ invoice.tax }} %</td>
                  <td>{{ invoice.totalPrice }}</td>
                  <td>{{ formatDate(invoice.created_at) }}</td>
                  <td class="text-end">
                    <VBtn v-if="!isSending" class="ms-4" size="x-small" @click="doSendEmail(invoice)">Send Email</VBtn>
                    <VBtn v-else size="small"><VProgressCircular color="white" size="x-small" indeterminate /></VBtn>
                  </td>
                </tr>            
              </tbody>
            </VTable>
            <!-- Pagination Controls -->
            <v-row class="mt-4" justify="end" align="center">
              <v-col class="d-flex justify-end align-center" cols="auto">
                <v-btn
                  variant="outlined"
                  size="small"
                  :disabled="currentPage === 1"
                  @click="prevPage"
                  class="me-2"
                >
                  Previous
                </v-btn>
                <span class="me-3">Page {{ currentPage }} of {{ totalPages }}</span>

                <v-btn
                  variant="outlined"
                  size="small"
                  :disabled="(currentPage === totalPages) || currentPage === 0 || totalPages === 0"
                  @click="nextPage"
                >
                  Next
                </v-btn>
              </v-col>
            </v-row>
          </VCol>
        </VRow>
      </VCol>
    </VRow>
    <PaymentConfirmDialog v-model="showConfirmDlg" v-model:isConfirmed="isConfirmed"/>
  </section>
</template>