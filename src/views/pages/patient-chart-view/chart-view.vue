<script setup>
import ShowDialog from "@/@core/components/ShowDialog.vue";
import { useThemeConfig } from "@/@core/composable/useThemeConfig";
import * as Network from "@/network";
import * as Const from "@/network/const";
import { getHumanDate } from '@/router/utils';
import { usePatientDataStore } from "@/store/patientData.js";
import { requiredValidator } from '@validators';
import { watch } from "vue";
import { useRoute } from "vue-router";
import VueSelect from "vue-select";
import { useToast } from 'vue-toastification';

const router = useRouter()
const rowPerPage = ref(5)
const currentPage = ref(1)
const totalPage = ref(1)
const route = useRoute();
const items = ref(['Man', 'Woman', 'Other']);
const options = ref([]);
const patient = ref([]);
const patientList = ref([]);
const toast = useToast();
const patientDataStore = usePatientDataStore();
const refVForm = ref();
const intakeHistoryList = ref([]);
const encounterHistoryList = ref([]);
const isLoading = ref(false)
const { updatedPatient, error, loading } = storeToRefs(patientDataStore);
const { theme } = useThemeConfig();
const selectedRows = ref([]);

const today = new Date(); const oneMonthAgo = new Date(today); oneMonthAgo.setMonth(today.getMonth() - 1);
const historySDate = ref(oneMonthAgo.toJSON().slice(0, 10));
const historyEDate = ref(today.toJSON().slice(0, 10));

function saveForm(){  
  refVForm.value?.validate().then(({ valid: isValid }) => {
    localStorage.removeItem('patientId');
    if (isValid){
      patientDataStore.savePatient({
        ...patient.value,        
      });
    }else{
      toast.error("Please fill out the fields!");
    }
  });  
}

const tagSelected = (value) => {  
  patient.value = patientList.value.find( user => user.first_name == value);  
  intakeHistoryList.value = patient.value.intake;
  encounterHistoryList.value = patient.value.encounter_all;
}

const getPatientDataById = (value) => {
  Network.getRequestNoAuth(Const.GET_PATIENT_AND_HISTORY_BY_ID, {}, {id: value}, 
    (response) => {
      if(response.data.success){
        patient.value = response.data.message;
        intakeHistoryList.value = patient.value.intake;
        encounterHistoryList.value = patient.value.encounter_all;
      }else{
        console.log(`Error: ${response.data.err_msg}`);
      }
    }
  );
}

onMounted(() => {
  if (route.query.pid) {
    getPatientDataById(route.query.pid)
  }
})

//########################################################################################
const getPatientDataByName = (value) => {
  Network.getRequestNoAuth(Const.GET_PATIENT_AND_HISTORY_BY_NAME, {}, {fname: value}, 
    (response) => {
      if(response.data.success){
        options.value = response.data.message.map( item => item.first_name );
        patientList.value = response.data.message;
      }else{
        console.log(`Error: ${response.data.err_msg}`);
      }
    }
  );
}

function onSearch(searchTxt){
  if(searchTxt.length >= 3){
    getPatientDataByName(searchTxt);
  }
}

/**
* ###############################################
*    Watches
* ###############################################
*/
watch(updatedPatient, (val) => {
  if(val != null){    
    toast.success("Successfully Saved Patient Chart Data.");  
        
    let treatmentType = "";
    if(route.query.type){
      treatmentType = route.query.type;
    }else{
      treatmentType = patient.value.complaint?.reverse()[0]?.treatment_type || 'IV Therapy';
    }
    
    setTimeout(() => {
      router.push({ name: 'patient-encounter-tab', params: { tab: 'encounter' }, query: { pid: patient.value.id, type: treatmentType } });
    }, 700);
  }
});
watch(error, (value) => {
  if(value){
    toast.error(value.message || 'failed');
  }
});

// 👉 Computing pagination data
const paginationData = computed(() => {
  const firstIndex = encounterHistoryList.value.length ? (currentPage.value - 1) * rowPerPage.value + 1 : 0
  const lastIndex  = encounterHistoryList.value.length + (currentPage.value - 1) * rowPerPage.value
  
  return `Showing ${ firstIndex } to ${ lastIndex } of ${ encounterHistoryList.value.length } entries`
});

const paginatedEncounterList = computed(() => {
  const start = (currentPage.value - 1) * rowPerPage.value;
  const end = start + rowPerPage.value;
  return encounterHistoryList.value.slice(start, end);
});

watch([encounterHistoryList, rowPerPage], () => {
  totalPage.value = Math.ceil((encounterHistoryList.value?.length || 0) / rowPerPage.value) || 1;
});

const doGetPatientById = (dom) =>{
  if(dom.target.value != null){
    getPatientDataById(dom.target.value);
  }
}

//############################################
//########### Encouter history ###############
//############################################
const isConfirmDialogVisible = ref(false);
const removeEncounterId = ref(null);
const isViewNotes = ref(false);
const noteContent = ref("");

const removeEncounterById = (_id) => {  
  isLoading.value = true;
  Network.getRequest(`${Const.DELETE_ENCOUNTER_URL}/${_id}`, {}, {}, 
    (response) => {
      isLoading.value = false;
      if(response.data.success){
        toast.success("Successfully Deleted Encounter History.");    
        getPatientDataById(patient.value.id);    
      }else{
        console.log(`Error: ${response.data.err_msg}`);
        toast.error(response.data.err_msg || "Failed to load schedule.");
      }
    }
  );
}

function doConfirm(value){
  if(value){      
    removeEncounterById(removeEncounterId.value);
  }
}

const sortByDate = () => {
  encounterHistoryList.value = patient.value.encounter_all.filter(item => {      
    const createAt = new Date(item.created_at.slice(0, 10)).getTime();      
    return (createAt >= new Date(historySDate.value).getTime()) && (createAt <= new Date(historyEDate.value).getTime());
  });
}
</script>

<template>
  <VCard class="pa-4">
    <VForm ref="refVForm" @submit.prevent="saveForm">      
      <VRow class="mt-4">
        <VCol
          cols="12"
          md="4"
          class="d-flex gap-8 mx-auto align-center justify-space-between"
        >
          <VBtn v-if="loading==false" type="submit" color="primary">DONE</VBtn>
          <VProgressCircular v-else indeterminate />    
                
          <VTextField      
            v-model="patient['id']"
            label="Patient Record Number"
            placeholder="Patient Record Number" 
            @change="doGetPatientById"
          />          
        </VCol>
      </VRow>
      <VRow>        
        <VCol v-if="route.query.pid" class="d-flex align-center" cols="3" sm="6" md="3">
          <VTextField 
            v-model="patient['first_name']"
            label="First Name"
            placeholder="First Name"
            variant='underlined'
            :rules=[requiredValidator]
          />
        </VCol>

        <VCol v-else class="d-flex align-center" cols="3" sm="6" md="3">
          <label class="me-4">First Name</label>
          <vue-select 
            :class="{'vue-select-custom': theme=='dark'}"
            v-model="patient['first_name']"
            :options="options"                                            
            @option:selected="tagSelected"
            @option:deselected="tagSelected"
            @search="onSearch"
            style="min-width: 13rem;">
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
          <VSelect
            v-model="patient['gender']"
            :items="items"            
            label="Gender"
            name="gender"
            variant="underlined"
            :rules=[requiredValidator]
          />
        </VCol>

        <VCol cols="3" sm="6" md="3">
          <VTextField
            v-model="patient['email']"
            type="email"
            label="Email"
            placeholder="Email"
            variant="underlined"
            :rules=[requiredValidator]
          />
        </VCol>
        <VCol cols="3" sm="6" md="3">
          <VTextField
            v-model="patient['phone']"
            type="phone"
            label="Phone"
            placeholder="Phone"
            variant="underlined"
            :rules=[requiredValidator]
          />
        </VCol>
        <VCol cols="3" sm="6" md="3">
          <VTextField
            type="phone"
            v-model="patient['emergency']"
            label="Emergency Phone"
            placeholder="Emergency Phone"
            variant="underlined"
            :rules=[requiredValidator]
          />
        </VCol>
        <VCol cols="3" sm="6" md="3">
          <VTextField
            v-model="patient['contact']"
            label="Contact"
            placeholder="Contact"
            variant="underlined"
            :rules=[requiredValidator]
          />
        </VCol>

        <VCol cols="6" sm="6" md="6">
          <VTextField
            v-model="patient['current_conditions']"
            label="Current Conditions"
            placeholder="Current Conditions"
            variant="underlined"
            :rules=[requiredValidator]
          />
        </VCol>
        <VCol cols="6" sm="6" md="6">
          <VTextField
            v-model="patient['current_allergies']"
            label="Current Allergies"
            placeholder="Current Allergies"
            variant="underlined"
            :rules=[requiredValidator]
          />
        </VCol>
        <VCol cols="6" sm="6" md="6">
          <VTextField
            v-model="patient['allergy_reactions']"
            label="Allergy Reactions"
            placeholder="Allergy Reactions"
            variant="underlined"
            :rules=[requiredValidator]
          />
        </VCol>
        <VCol cols="3" sm="3" md="3" class="mb-4">
          <VTextField
            v-model="patient['current_medications']"
            label="Current Medications"
            placeholder="Current Medications"
            variant="underlined"
            :rules=[requiredValidator]
          />
        </VCol>        
        <VCol cols="3" sm="3" md="3" class="mb-4">
          <VTextField            
            v-model="patient['reward_level']"          
            :label="`Reward Level ($ ${patient['reward']} )`"
            placeholder="Reward Level"
            variant="underlined"  
            readonly          
          />
        </VCol>        
      </VRow>
    </VForm>
  </VCard>

  <VCard v-if="encounterHistoryList" class="mt-4">
    <VRow class="py-4">
      <VCol cols="6">
        <VCardTitle>HISTORY</VCardTitle>
      </VCol>
      <VCol cols="2">        
        <AppDateTimePicker               
          label="START DATE" 
          v-model="historySDate" 
        />
      </VCol>
      <VCol cols="2">
        <AppDateTimePicker               
          label="END DATE" 
          v-model="historyEDate" 
        />
      </VCol>
      <VCol cols="1">
        <VBtn @click="sortByDate()" color="primary">Filter</VBtn>
      </VCol>
    </VRow>

    <VDivider />

    <!-- SECTION Table -->
    <VTable class="text-no-wrap">
      <thead>
        <tr>
          <th scope="col" class="font-weight-semibold">NAME</th>
          <th scope="col" class="font-weight-semibold">DATE</th>
          <th scope="col" class="font-weight-semibold">TREATMENT</th>
          <th scope="col" class="font-weight-semibold">INGREDIENTS</th>
          <th scope="col" class="font-weight-semibold">DOSAGE</th>
          <th scope="col" class="font-weight-semibold">Qty</th>
          <th scope="col" class="font-weight-semibold">Notes</th>
          <th scope="col" class="font-weight-semibold">Action</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(item, key) in paginatedEncounterList"
          :key="key"
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
              {{ item.dosage }}
            </div>
          </td>          
          <td class="text-center">
            <div class="v-avatar-group">
              {{ item.quantity ?? '--' }}
            </div>
          </td>    
          <td>
            <div class="v-avatar-group">
              <VIcon @click="isViewNotes = true; noteContent = item.notes;" color="primary" icon="tabler-eye"></VIcon>
            </div>
          </td>              
          <td class="text-center">
            <div class="v-avatar-group">              
              <VIcon v-if="!isLoading" @click="isConfirmDialogVisible = true; removeEncounterId = item.id;" color="primary" icon="tabler-trash"></VIcon>
              <VProgressCircular v-else indeterminate />
            </div>
          </td>          
        </tr>
      </tbody>

      <tfoot v-show="!encounterHistoryList.length">
        <tr>
          <td colspan="8" class="text-center text-body-1">No data available</td>
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

    <ConfirmDialog
      v-model:isDialogVisible="isConfirmDialogVisible"
      confirmation-msg="Are you sure to delete this encounter history?"
      @confirm="doConfirm"
    />
    <ShowDialog
      v-model:isDialogVisible="isViewNotes"
      :messageContent="noteContent || {}"
    />
  </VCard>
</template>
<style>
.v-select .vs__dropdown-toggle {
  border-top: none !important;
  border-left: none !important;
  border-right: none !important;
}
</style>
