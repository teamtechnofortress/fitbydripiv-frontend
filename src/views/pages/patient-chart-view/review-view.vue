<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig";
import * as Network from "@/network";
import * as Const from "@/network/const";
import { getHumanDate } from '@/router/utils';
import { useRoute } from "vue-router";
import VueSelect from "vue-select";
const { theme } = useThemeConfig();
const route = useRoute();
const patient = ref([]);
const options = ref([]);
const intakeRowPerPage = ref(5)
const encounterRowPerPage = ref(5)
const intakeCurrentPage = ref(1)
const currentPage = ref(1)
const intakeTotalPage = ref(1)
const totalPage = ref(1)
const totalIntakeCount = ref(0);
const ptCurrentPage = ref(1)
const ptTotalPage = ref(1)
const totalEncounterCount = ref(0);
const intakeHistoryList = ref([]);
const encounterHistoryList = ref([]);
const patientList = ref([]);
const intakeSelectedRows = ref([]);
const selectedRows = ref([]);


// 👉 Fetch Staff Schedule
watchEffect(() => {  
  totalIntakeCount.value = intakeHistoryList.value.length;
  totalEncounterCount.value = encounterHistoryList.value?.length ?? 0;
})

// 👉 Fetch Staff Schedule
watchEffect(() => {
  if (currentPage.value > totalPage.value) currentPage.value = totalPage.value;

  if (ptCurrentPage.value > ptTotalPage.value) ptCurrentPage.value = ptTotalPage.value;
})

const getPatientDataById = (value) => {
  Network.getRequestNoAuth(Const.GET_PATIENT_AND_HISTORY_BY_ID, {}, {id: value}, 
    (response) => {
      if(response.data.success){        
        patient.value = response.data.message;
        intakeHistoryList.value = patient.value.intake;
        encounterHistoryList.value = patient.value.encounter;
      }else{
        console.log(`Error: ${response.data.err_msg}`);
      }
    }
  );
}

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

const tagSelected = (value) => {  
  patient.value = patientList.value.find( user => user.first_name == value);  
  intakeHistoryList.value = patient.value.intake;
  encounterHistoryList.value = patient.value.encounter;
}

function onSearch(searchTxt){
  if(searchTxt.length >= 3){
    getPatientDataByName(searchTxt);
  }
}

const doGetPatientById = (dom) =>{
  if(dom.target.value != null){
    getPatientDataById(dom.target.value);
  }
}

onMounted(() => {
  if (route.query.pid) {
    getPatientDataById(route.query.pid)
  }
})

//############################################
watchEffect(() => {
  intakeTotalPage.value = Math.ceil((intakeHistoryList.value?.length || 0) / intakeRowPerPage.value) || 1;
  totalPage.value = Math.ceil((encounterHistoryList.value?.length || 0) / encounterRowPerPage.value) || 1;

  // Prevent out-of-bounds page index
  if (intakeCurrentPage.value > intakeTotalPage.value) intakeCurrentPage.value = intakeTotalPage.value;
  if (currentPage.value > totalPage.value) currentPage.value = totalPage.value;
});

const paginatedIntakeHistoryList = computed(() => {
  const start = (intakeCurrentPage.value - 1) * intakeRowPerPage.value;
  const end = start + intakeRowPerPage.value;
  return intakeHistoryList.value.slice(start, end);
});

const paginatedEncounterList = computed(() => {
  const start = (currentPage.value - 1) * encounterRowPerPage.value;
  const end = start + encounterRowPerPage.value;
  return encounterHistoryList.value.slice(start, end);
});

const intakePaginationData = computed(() => {
  const total = totalIntakeCount.value;
  if (!total) return 'No entries';

  const start = (intakeCurrentPage.value - 1) * intakeRowPerPage.value + 1;
  const end = Math.min(start + intakeRowPerPage.value - 1, total);
  return `Showing ${start} to ${end} of ${total} entries`;
});

const encounterPaginationData = computed(() => {
  const total = totalEncounterCount.value;
  if (!total) return 'No entries';

  const start = (currentPage.value - 1) * encounterRowPerPage.value + 1;
  const end = Math.min(start + encounterRowPerPage.value - 1, total);
  return `Showing ${start} to ${end} of ${total} entries`;
});
</script>

<template>
  <VCard v-if="intakeHistoryList" class="mt-4">
    <VRow class="my-4">
      <VCol class="d-flex align-center" cols="4" sm="6" md="4">
        <label class="mx-4 pt-4">First Name:</label>
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
      <VCol class="d-flex align-center" cols="4" sm="6" md="4">
        <VTextField
          class="ms-4"      
          label="Patient Record Number"
          placeholder="Patient Record Number" 
          @change="doGetPatientById"
        />
      </VCol>
    </VRow>

    <VCardItem class="project-header d-flex flex-wrap justify-space-between py-4 gap-4">
      <VCardTitle>INTAKE REVIEW</VCardTitle>      
    </VCardItem>    
    <VTable class="text-no-wrap">
      <thead>
        <tr>
          <th scope="col" class="font-weight-semibold">TYPE</th>
          <th scope="col" class="font-weight-semibold">STATUS</th>
          <th scope="col" class="font-weight-semibold">GOAL</th>
          <th scope="col" class="font-weight-semibold">DATE TIME</th>
          <th scope="col" class="font-weight-semibold">APPROVAL</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in paginatedIntakeHistoryList"
          :key="item.id"
          style="height: 3.5rem;"
        >
          <td class="text-high-emphasis">
            {{ item.headache ? 'HEADACHE' : (item.hydration ? 'HYDRATION' : (item.immunity ? 'IMMUNITY' : 'OTHER')) }}
          </td>
          <td class="text-center">
            <div class="v-avatar-group">
              {{ item.low_energy ? 'LOW ENERGY' : (item.pain ? 'PAIN' : (item.recent_illness ? 'RECENT ILLNESS' : (item.recovery ? 'RECOVERY' : 'OTHER'))) }}
            </div>
          </td>          
          <td class="text-center">
            <div class="v-avatar-group">
              {{ item.goal_iv ? 'IV' : (item.goal_injection ? 'INJECTION' : 'OTHER') }}
            </div>
          </td>          
          <td class="text-center">
            <div class="v-avatar-group">
              {{ getHumanDate(item.created_at) }}
            </div>
          </td>          
          <td class="text-center">
            <div class="v-avatar-group">
              Not Yet
            </div>
          </td>          
        </tr>
      </tbody>

      <tfoot v-show="!intakeHistoryList.length">
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
          v-model="intakeRowPerPage"
          density="compact"
          variant="outlined"
          :items="[10, 20, 30, 50]"
        />
      </div>

      <!-- 👉 Pagination meta -->
      <span class="text-sm text-disabled">{{ intakePaginationData }}</span>

      <!-- 👉 Pagination -->
      <VPagination
        v-model="intakeCurrentPage"
        size="small"
        :total-visible="5"
        :length="intakeTotalPage"
        @next="intakeSelectedRows = []"
        @prev="intakeSelectedRows = []"
      />      
    </VCardText>
  <!-- !SECTION -->
  </VCard>


  <!-- >> -->
  <VCard v-if="encounterHistoryList" class="mt-4">    
    <VCardItem class="project-header d-flex flex-wrap justify-space-between py-4 gap-4">
      <VCardTitle>TREATMENT RECORD REVIEW</VCardTitle>      
    </VCardItem>

    <VDivider />

    <!-- SECTION Table -->
    <VTable class="text-no-wrap">
      <thead>
        <tr>
          <th scope="col" class="font-weight-semibold">NAME</th>
          <th scope="col" class="font-weight-semibold">TYPE</th>
          <th scope="col" class="font-weight-semibold">DOSAGE</th>
          <th scope="col" class="font-weight-semibold">DATE</th>
          <th scope="col" class="font-weight-semibold">INGREDIENTS</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="slot in paginatedEncounterList"
          :key="slot.name"
          style="height: 3.5rem;"          
        >
          <td class="text-high-emphasis">
            {{ slot.name }}
          </td>
          <td class="text-center">
            <div class="v-avatar-group">
              {{ slot.type }}
            </div>
          </td>          
          <td class="text-center">
            <div class="v-avatar-group">
              {{ slot.dosage }}
            </div>
          </td>          
          <td class="text-center">
            <div class="v-avatar-group">
              {{ getHumanDate(slot.created_at) }}
            </div>
          </td>          
          <td class="text-center">
            <div class="v-avatar-group">
              {{ slot.ingredients }}
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
          v-model="encounterRowPerPage"
          density="compact"
          variant="outlined"
          :items="[10, 20, 30, 50]"
        />
      </div>

      <!-- 👉 Pagination meta -->
      <span class="text-sm text-disabled">{{ encounterPaginationData }}</span>

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
</template>

<style lang="scss">
.project-header .v-card-item__append {
  padding-inline-start: 0;
}
</style>
