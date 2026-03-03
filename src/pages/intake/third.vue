<script setup>
import { requiredValidator } from '@/@core/utils/validators';
import { initialAbility } from '@/plugins/casl/ability';
import { useAppAbility } from '@/plugins/casl/useAppAbility';
import { isUserLoggedIn } from '@/router/utils';
import { useIntakeDataStore } from '@/store/intakeData';
import { onMounted } from 'vue';
import { useToast } from 'vue-toastification';

const router = useRouter();
const ability = useAppAbility();
const patientId = JSON.parse(localStorage.getItem('patientId') || null);
const intake1ID = JSON.parse(localStorage.getItem('intake1ID') || null);
const intakeDataStore = useIntakeDataStore();
const { saveIntakeResult, error, loading } = storeToRefs(intakeDataStore);
const toast = useToast();
const isCongratsDialogVisible = ref(false);

// ###########################################################################
// ############### If user is logged in status, do the log out ###############
// ###########################################################################
const logout = () => {
  localStorage.removeItem('userData')
  localStorage.removeItem('accessToken');

  router.push('/login').then(() => {
    localStorage.removeItem('userAbilities');
    ability.update(initialAbility);

    // redirect to intake page after loggedout.
    router.push({name: 'intake-fourth'});
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
const refVForm = ref();
const intake = ref([]);

function saveForm(){
  refVForm.value?.validate().then(({ valid: isValid }) => {
    if (isValid){
      
      intakeDataStore.saveIntake3({
        patient_id: patientId,
        intake1_id: intake1ID,
        ...intake.value,
      });
    }else{
      toast.error("Please fill out the fields!");
    }
  });  
}

/**
 * ###############################################
 *    Watches
 * ###############################################
 */
 watch(saveIntakeResult, (val) => {
  if(val != null){    
    toast.success("Successfully Saved Intake-3 content.");   
    localStorage.removeItem('patientId');
    localStorage.removeItem('intake1ID');

    setTimeout(()=>{
      router.push({name: 'intake'});
    }, 500);
  }
});
watch(error, (value) => {
  if(value){
    toast.error(value.message || 'failed');
  }
});

//########################################
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
    // router.push({name: 'intake-fourth'}); // Swipe left
  } else if (deltaX > 50) {
    router.push({name: 'intake-second'}); // Swipe right
  }
}

function doConfirm(value){
  if(value){
    saveForm();
  }
}

onMounted(() => {
  // page will be scrolled to top when mounted.
  window.scrollTo(0,0);
});

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
                <h4 class="text-center mb-4">CONSENT & AUTHORIZATION</h4>  
                <VForm
                    ref="refVForm"
                    @submit.prevent="saveForm"
                  >
                  <VRow class="mb-4">
                      <VCol cols="12" class="border">
                          <VRow class="mb-2 px-2">                      
                              <VCol cols="12" class="d-flex align-center">
                                  <p class="me-4">I CERTIFY THAT ALL THE INFORMATION PROVIDED ABOVE IS TRUE AND COMPLETE TO THE BEST OF MY KNOWLEDGE. I UNDERSTAND THAT IV THERAPY AND INJECTIONS ARE  A MEDICAL TREATMENT AND THAT THE STAFF WILL USE THE CERTIFIED INFORMATION I PROVIDED TO DETERMINE MY SUITABILITY FOR TREATMENT. I AUTHORIZE FITBYDRIP TO ADMINISTER IV AND OTHER THERAPIES INCLUDING INJECTIONS AS DEEMED APPROPRIATE BASED ON MY HEALTH INFORMATION.</p>
                              </VCol>                      
                          </VRow>
  
                          <VRow class="px-2">
                              <VCol class="d-flex align-center" cols="6">
                                <label class="me-4">AGREED TO UNCONDITIONALLY</label>
                                <VTextField v-model="intake['agreedTxt']" label="AGREED TO UNCONDITIONALLY" variant="underlined" :rules="[requiredValidator]"></VTextField>
                              </VCol>
                          </VRow>
                          <VRow v-if="patientId" class="my-4 px-2 justify-center pt-4">
                            <VBtn v-if="loading == false" size="large" @click="isCongratsDialogVisible = true;" style="width: 15rem;">Finish</VBtn>
                            <VBtn v-else size="large" style="width: 15rem;"><VProgressCircular color="white" indeterminate /></VBtn>                      
                          </VRow>
                      </VCol>                  
                  </VRow>                
                </VForm>              
            </VCardText> 
            <CongratulationDialog
                v-model:isDialogVisible="isCongratsDialogVisible"
                confirmation-msg="Thank you, our staff will be with you shortly!"
                @confirm="doConfirm"
            />           
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>