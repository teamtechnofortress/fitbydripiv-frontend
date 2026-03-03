<script setup>
import { useThemeConfig } from "@/@core/composable/useThemeConfig";
import * as Network from "@/network";
import * as Const from "@/network/const";
import { initialAbility } from '@/plugins/casl/ability';
import { useAppAbility } from '@/plugins/casl/useAppAbility';
import { isUserLoggedIn } from '@/router/utils';
import { useIntakeDataStore } from '@/store/intakeData';
import { emailValidator, requiredValidator } from '@validators';
import { watch } from 'vue';
import VueSelect from "vue-select";
import { useToast } from 'vue-toastification';

const router = useRouter();
const ability = useAppAbility();
const intakeDataStore = useIntakeDataStore();
const { saveIntakeResult, intake1IDNumber, error, loading } = storeToRefs(intakeDataStore);
const toast = useToast();
const options = ref([]);
const patient = ref([]);
const patientList = ref([]);
const goal = ref('');
const { theme } = useThemeConfig();

const energy = ref(false);  const recovery = ref(false);       const pain = ref(false); const supplements = ref(false);
const fatigue = ref(false); const headache = ref(false);       const soreness = ref(false);    const current_illness = ref(false); const beauty = ref(false);
const recent_illness = ref(false); const hangover = ref(false);const low_energy = ref(false);  const immunity = ref(false); const hydration = ref(false);

// ###########################################################################
// ############### If user is logged in status, do the log out ###############
// ###########################################################################
const logout = () => {

  localStorage.removeItem('userData')
  localStorage.removeItem('accessToken');

  router.push({name: 'login'}).then(() => {
    localStorage.removeItem('userAbilities');
    ability.update(initialAbility);

    // redirect to intake page after loggedout.
    router.push({name: 'intake'});
  })
}

const isLoggedIn = isUserLoggedIn();

if(isLoggedIn){
  logout();
}
/*
* #################################################################
* ################ Server API connections #################
* #################################################################
*/
const patientInformationRegType = ref('new')
const items = ref(['Man', 'Woman']);
const isCongratsDialogVisible = ref(false);

const refVForm = ref();

function saveForm(){
  refVForm.value?.validate().then(({ valid: isValid }) => {
    localStorage.removeItem('patientId');
    localStorage.removeItem('intake1ID');

    if (isValid){
      intakeDataStore.saveIntake1({
        ...patient.value,
        goal_iv:        goal.value == 'goal_iv' ? 1 : 0,
        goal_injection: goal.value == 'goal_injection' ? 1 : 0,
        goal_other:     goal.value == 'goal_other' ? 1 : 0,
        weight_loss:    goal.value == 'weight_loss' ? 1 : 0,
        hydration: hydration.value,
        energy: energy.value,
        recovery: recovery.value,
        pain: pain.value,
        supplements: supplements.value,
        fatigue: fatigue.value,
        headache: headache.value,
        soreness: soreness.value,
        current_illness: current_illness.value,
        recent_illness: recent_illness.value,
        hangover: hangover.value,
        low_energy: low_energy.value,
        immunity: immunity.value,
        beauty: beauty.value,
        type: patientInformationRegType.value,
      });
    }else{
      toast.error("Please fill out the fields!");
    }
  });  
}

function doConfirm(value){
  if(value){
    saveForm();
  }
}

const tagSelected = (value) => {  
  patient.value = patientList.value.find( user => user.first_name == value);  
}

const getPatientName = (value) => {
  Network.getRequestNoAuth(Const.GET_PATIENT_BY_NAME, {}, {fname: value}, 
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
    getPatientName(searchTxt);
  }
}

function calculateAge(bVal) {
  if (!bVal) return ''
  const birthDate = new Date(bVal)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  patient.value.age = age;
}

/**
 * ###############################################
 *    Watches
 * ###############################################
 */
watch(saveIntakeResult, (val) => {
  if(val != null){
    toast.success("Successfully Saved Intake-1 content.");
    localStorage.setItem('patientId', val);//patient id
    
    setTimeout(()=>{
      if(patientInformationRegType.value == 'existing'){
        router.push({path: '/'});
      }else{
        router.push({name: 'intake-second'});
      }
    }, 500);
  }
});

watch(intake1IDNumber, (value) => {
  if(value){
    localStorage.setItem('intake1ID', value);
  }
});

watch(error, (value) => {
  if(value){
    toast.error(value.message || 'failed');
  }
});
watch(patientInformationRegType, (value) => {
  if(value == 'new'){
    patient.value = [];
  }
});

//#################################################
//########### iPad swipe ################
//#################################################
const touchStartX = ref(0);
const touchEndX = ref(0);

function handleTouchStart(e) {
  touchStartX.value = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
  touchEndX.value = e.changedTouches[0].screenX;
  handleSwipe();
}

function handleSwipe() {
  const deltaX = touchEndX.value - touchStartX.value;
  if (deltaX < -50) {
    router.push({name: 'intake-second'}); // Swipe left
  }
}

function processDone(){
  if(patientInformationRegType.value == 'existing'){
    isCongratsDialogVisible.value = true;
  }else{
    saveForm();
  }
}
</script>

<template>
  <section
    @touchstart="handleTouchStart" 
    @touchend="handleTouchEnd"
    style="height: 100vh;"
  >
    <VRow>
      <VCol cols="12" class="mb-4">
        <VCard>
            <VCardText>
              <h4 class="text-center my-4 pb-4">WHAT BRINGS YOU HERE TODAY ?</h4>
              <VForm
                ref="refVForm"
                @submit.prevent="saveForm"
              >
                <VRow class="mb-4">
                  <VCol cols="12" class="mb-2">                    
                    <VRow class="mt-2 px-2 bg-primary">
                      <VCol cols="2" class="d-flex align-center text-">GOAL:</VCol>
                      <VRadioGroup
                        class="col-10"
                        v-model="goal"
                        inline
                        :rules="[requiredValidator]"
                      >
                        <VCol cols="2" class="d-flex align-center">
                          <VRadio
                            label="IV"
                            value="goal_iv"
                          />
                        </VCol>
                        <VCol cols="2" class="d-flex align-center">
                          <VRadio
                            label="INJECTION"
                            value="goal_injection"
                          />
                        </VCol>
                        <VCol cols="2" class="d-flex align-center">
                          <VRadio
                            label="WEIGHT LOSS"
                            value="weight_loss"
                          />
                        </VCol>
                        <VCol cols="2" class="d-flex align-center">
                          <VRadio
                            label="OTHER"
                            value="goal_other"
                          />
                        </VCol>
                      </VRadioGroup>
                    </VRow>                    
                  </VCol>
                  <VCol cols="12" class="border">                    
                    <VRow class="my-2 px-2">
                      <VCol class="d-flex align-center">
                        <label class="me-4">HYDRATION</label>
                        <VCheckbox v-model="hydration"></VCheckbox>
                      </VCol>
                      <VCol class="d-flex align-center">
                        <label class="me-4">ENERGY</label>
                        <VCheckbox v-model="energy"></VCheckbox>
                      </VCol>
                      <VCol class="d-flex align-center">
                        <label class="me-4">RECOVERY</label>
                        <VCheckbox v-model="recovery"></VCheckbox>
                      </VCol>
                      <VCol class="d-flex align-center">
                        <label class="me-4">PAIN</label>
                        <VCheckbox v-model="pain"></VCheckbox>
                      </VCol>
                    </VRow>

                    <VRow class="my-2 px-2">
                      <VCol class="d-flex align-center">
                        <label class="me-4">SUPPLEMENTS</label>
                        <VCheckbox v-model="supplements"></VCheckbox>
                      </VCol>
                      <VCol class="d-flex align-center">
                        <label class="me-4">FATIGUE</label>
                        <VCheckbox v-model="fatigue"></VCheckbox>
                      </VCol>
                      <VCol class="d-flex align-center">
                        <label class="me-4">HEADACHE</label>
                        <VCheckbox v-model="headache"></VCheckbox>
                      </VCol>
                      <VCol class="d-flex align-center">
                        <label class="me-4">SORENESS</label>
                        <VCheckbox v-model="soreness"></VCheckbox>
                      </VCol>
                    </VRow>

                    <VRow class="my-2 px-2">
                      <VCol class="d-flex align-center">
                        <label class="me-4">CURRENT ILLNESS</label>
                        <VCheckbox v-model="current_illness"></VCheckbox>
                      </VCol>
                      <VCol class="d-flex align-center">
                        <label class="me-4">RECENT ILLNESS</label>
                        <VCheckbox v-model="recent_illness"></VCheckbox>
                      </VCol>
                      <VCol class="d-flex align-center">
                        <label class="me-4">HANGOVER</label>
                        <VCheckbox v-model="hangover"></VCheckbox>
                      </VCol>                    
                    </VRow>

                    <VRow class="my-2 px-2">
                      <VCol class="d-flex align-center">
                        <label class="me-4">LOW ENERGY</label>
                        <VCheckbox v-model="low_energy"></VCheckbox>
                      </VCol>
                      <VCol class="d-flex align-center">
                        <label class="me-4">IMMUNITY</label>
                        <VCheckbox v-model="immunity"></VCheckbox>
                      </VCol>                      
                      <VCol class="d-flex align-center">
                        <label class="me-4">BEAUTY</label>
                        <VCheckbox v-model="beauty"></VCheckbox>
                      </VCol>                      
                    </VRow>

                    <VRow class="my-2 px-2 justify-center">
                      <VCol cols="auto" class="d-flex align-center">
                        <h4 class="me-4">PATIENT INFORMATION:</h4>
                        <VRadioGroup inline v-model="patientInformationRegType">
                          <VRadio label="NEW" value="new" />
                          <VRadio label="EXISTING" value="existing" />
                        </VRadioGroup>
                      </VCol>
                    </VRow>

                    <div v-if="patientInformationRegType == 'new'">
                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center" cols="4">
                          <label class="me-4 pt-2">FIRST NAME</label>
                          <VTextField v-model="patient['first_name']" label="First Name" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center" cols="4">
                          <label class="me-4 pt-2">Middle Name</label>
                          <VTextField v-model="patient['middle_name']" label="Middle Name" variant="underlined"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center" cols="4">
                          <label class="me-4 pt-2">LAST NAME</label>
                          <VTextField v-model="patient['last_name']" label="Last Name" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>                      
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center" cols="6">
                          <label class="me-4 pt-2">ADDRESS:</label>
                          <VTextField v-model="patient['address']" label="Address" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center" cols="6">
                          <label class="me-4 pt-2">CITY:</label>
                          <VTextField v-model="patient['city']" label="City" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>                      
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">STATE</label>
                          <VTextField v-model="patient['state']" label="State" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">ZIP CODE</label>
                          <VTextField v-model="patient['zip']" label="Zip Code" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">EMAIL</label>
                          <VTextField v-model="patient['email']" label="Email" variant="underlined" :rules="[requiredValidator, emailValidator]"></VTextField>
                        </VCol>
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">                              
                          <label class="me-4 pt-2">DATE OF BIRTH</label>
                          <AppDateTimePicker 
                              @input="calculateAge(patient['birthday'])"
                              v-model="patient['birthday']"
                              label="Date of Birth" 
                              :model-value="patient['birthday'] || (new Date().toJSON().slice(0, 10))" 
                              variant="underlined" />
                        </VCol>                      
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">CELL#</label>
                          <VTextField v-model="patient['cell']" label="Cell" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">Home#</label>
                          <VTextField v-model="patient['home']" label="Home" variant="underlined"></VTextField>
                        </VCol>
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">EMERGENCY #</label>
                          <VTextField v-model="patient['emergency']" label="Emergency" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">CONTACT</label>
                          <VTextField v-model="patient['contact']" label="Contact" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol> 
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">PHONE #</label>
                          <VTextField v-model="patient['phone']" label="Phone" variant="underlined"></VTextField>
                        </VCol>                      
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">AGE</label>
                          <VTextField v-model="patient['age']" label="Age" type="number" variant="underlined" readonly></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">GENDER #</label>
                          <VSelect
                              :items="items"     
                              v-model="patient['gender']"
                              label="Gender"
                              name="select"
                              variant="underlined"
                              :rules="[requiredValidator]"
                              require
                          />
                        </VCol> 
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">Ethnicity</label>
                          <VTextField v-model="patient['ethnicity']" label="Ethnicity" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>                     
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">CURRENT CONDITIONS :</label>
                          <VTextField v-model="patient['current_conditions']" label="Type None if no exist" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">CURRENT ALLERGIES :</label>
                          <VTextField v-model="patient['current_allergies']" label="Type None if no exist" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">ALLERGY REACTIONS :</label>
                          <VTextField v-model="patient['allergy_reactions']" label="Type None if no exist" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">CURRENT MEDICATIONS :</label>
                          <VTextField v-model="patient['current_medications']" label="Type None if no exist" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center" cols="2">
                          <label class="me-4 pt-2">PREGNANT:</label>
                          <VCheckbox v-model="patient['pregnant']"></VCheckbox>
                        </VCol>
                        <VCol class="d-flex align-center" cols="2">
                          <label class="me-4 pt-2">TOBACCO:</label>
                          <VCheckbox v-model="patient['tobacco']"></VCheckbox>
                        </VCol>
                        <VCol class="d-flex align-center" cols="2">
                          <label class="me-4 pt-2">DRUG USE:</label>
                          <VCheckbox v-model="patient['drug_use']"></VCheckbox>
                        </VCol>
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center" cols="2">
                          <label class="me-4 pt-2">ALCOHOL:</label>
                          <VCheckbox></VCheckbox>
                        </VCol>
                        <VCol class="d-flex align-center">
                          <VRadioGroup inline v-model="patient['alcohol']">
                            <VRadio label="DAILY" value="daily"/>
                            <VRadio label="WEEKLY" value="weekly"/>
                          </VRadioGroup>  
                        </VCol>                      
                      </VRow>
                    </div>

                    <div v-if="patientInformationRegType == 'existing'">
                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center" cols="4">        
                          <label class="me-4 pt-2">FIRST NAME</label>
                          <vue-select                          
                              v-model="patient['first_name']"
                              :class="{'vue-select-custom': theme=='dark'}"
                              :options="options"                                            
                              @option:selected="tagSelected"
                              @option:deselected="tagSelected"
                              @search="onSearch"
                              style="min-width: 15rem;"
                              ></vue-select>                              
                        </VCol>
                        <VCol class="d-flex align-center" cols="4">
                          <label class="me-4 pt-2">Middle Name</label>
                          <VTextField v-model="patient['middle_name']" label="Middle Name" variant="underlined"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center" cols="4">
                          <label class="me-4 pt-2">LAST NAME</label>
                          <VTextField v-model="patient['last_name']" label="Last Name" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>                      
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center" cols="6">
                          <label class="me-4 pt-2">ADDRESS:</label>
                          <VTextField v-model="patient['address']" label="Address" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center" cols="6">
                          <label class="me-4 pt-2">CITY:</label>
                          <VTextField v-model="patient['city']" label="City" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>                      
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">STATE</label>
                          <VTextField v-model="patient['state']" label="State" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">ZIP CODE</label>
                          <VTextField v-model="patient['zip']" label="Zip Code" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">EMAIL</label>
                          <VTextField v-model="patient['email']" label="Email" variant="underlined" :rules="[requiredValidator, emailValidator]"></VTextField>
                        </VCol>
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">                          
                          <label class="me-4 pt-2">DATE OF BIRTH</label>
                          <AppDateTimePicker 
                             @input="calculateAge(patient['birthday'])"
                              v-model="patient['birthday']"
                              label="Date of Birth"                               
                              :model-value="patient['birthday'] || (new Date().toJSON().slice(0, 10))" 
                              variant="underlined" />
                        </VCol>                      
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">CELL#</label>
                          <VTextField v-model="patient['cell']" label="Cell" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">Home#</label>
                          <VTextField v-model="patient['home']" label="Home" variant="underlined"></VTextField>
                        </VCol>
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">EMERGENCY #</label>
                          <VTextField v-model="patient['emergency']" label="Emergency" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">CONTACT</label>
                          <VTextField v-model="patient['contact']" label="Contact" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol> 
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">PHONE #</label>
                          <VTextField v-model="patient['phone']" label="Phone" variant="underlined"></VTextField>
                        </VCol>                      
                      </VRow>                      

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">AGE</label>
                          <VTextField v-model="patient['age']" label="Age" type="number" variant="underlined" readonly></VTextField>
                        </VCol>
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">GENDER #</label>
                          <VSelect
                              :items="items"     
                              v-model="patient['gender']"
                              label="Gender"
                              name="select"
                              variant="underlined"
                              :rules="[requiredValidator]"
                              require
                          />
                        </VCol> 
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">Ethnicity</label>
                          <VTextField v-model="patient['ethnicity']" label="Ethnicity" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>                     
                      </VRow>

                      <VRow class="mt-2 px-2">
                        <VCol class="text-center">
                          <label class="text-center">I certify that nothing in my health condition has changed from my initial intake acceptance.</label>
                        </VCol>
                      </VRow>

                      <VRow class="mb-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">SIGNATURE :</label>
                          <VTextField v-model="patient['signature']" label="Signature" variant="underlined" :rules="[requiredValidator]"></VTextField>
                        </VCol>
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <label class="me-4 pt-2">DATE :</label>                          
                          <AppDateTimePicker label="DATE" :model-value="new Date().toJSON().slice(0, 10)" variant="underlined" />
                        </VCol>
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <VCheckbox v-model="patient['agreed']" :rules="[requiredValidator]"></VCheckbox>
                          <label class="me-4">I have read and unilaterally agree to the risks and benefits of my chosen goal.</label>
                        </VCol>                        
                      </VRow>

                      <VRow class="my-2 px-2">
                        <VCol class="d-flex align-center">
                          <VCheckbox v-model="patient['emailNotify']"></VCheckbox>
                          <label class="me-4">I would like to request a email copy of risk benefits.</label>
                        </VCol>                        
                      </VRow>                      
                    </div>

                    <VRow class="my-2 px-2 justify-center">                      
                      <!-- <VBtn v-if="loading == false" size="large" @click="isCongratsDialogVisible = true;" style="width: 15rem;">Done</VBtn>  -->
                      <VBtn v-if="loading == false" size="large" @click="processDone()" style="width: 15rem;">Done</VBtn> 
                      <VBtn v-else size="large" style="width: 15rem;"><VProgressCircular color="white" indeterminate /></VBtn>
                    </VRow>
                  </VCol>                  
                </VRow>
              </VForm>
              <CongratulationDialog
                  v-model:isDialogVisible="isCongratsDialogVisible"
                  confirmation-msg="Thank you, our staff will be with you shortly!"
                  @confirm="doConfirm"
              />
            </VCardText>            
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>
<style>
.v-select .vs__dropdown-toggle {
  border-top: none !important;
  border-left: none !important;
  border-right: none !important;
}
</style>