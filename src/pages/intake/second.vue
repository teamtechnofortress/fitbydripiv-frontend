<script setup>
import { initialAbility } from '@/plugins/casl/ability'
import { useAppAbility } from '@/plugins/casl/useAppAbility'
import { isUserLoggedIn } from '@/router/utils'
import { useIntakeDataStore } from '@/store/intakeData'
import { onMounted, watch } from "vue"
import { useToast } from 'vue-toastification'

const router = useRouter()
const ability = useAppAbility()
const patientId = JSON.parse(localStorage.getItem('patientId') || null)
const intake1ID = JSON.parse(localStorage.getItem('intake1ID') || null)
const intakeDataStore = useIntakeDataStore()
const { saveIntakeResult, error, loading } = storeToRefs(intakeDataStore)
const toast = useToast()
const isCongratsDialogVisible = ref(false)

// ###########################################################################
// ############### If user is logged in status, do THE log out ###############
// ###########################################################################
const logout = () => {

  localStorage.removeItem('userData')
  localStorage.removeItem('accessToken')

  router.push('/login').then(() => {
    localStorage.removeItem('userAbilities')
    ability.update(initialAbility)

    // redirect to intake page after loggedout.
    router.push({ name: 'intake-second' })
  })
}

const isLoggedIn = isUserLoggedIn()
if(isLoggedIn){    
  logout()
}

/*
* #################################################################
* ################ Server API connections #################
* #################################################################
*/
const refVForm = ref()
const intake = ref([])

function saveForm(){
  refVForm.value?.validate().then(({ valid: isValid }) => {
    if (isValid){
      
      intakeDataStore.saveIntake2({
        patient_id: patientId,
        intake1_id: intake1ID,
        ...intake.value,
      })
    }else{
      toast.error("Please fill out THE fields!")
    }
  })  
}

/**
 * ###############################################
 *    Watches
 * ###############################################
 */
watch(saveIntakeResult, val => {
  if(val != null){    
    toast.success("Successfully Saved Intake-2 content.")    

    setTimeout(()=>{
      router.push({ name: 'intake-third' })
    }, 500)
  }
})
watch(error, value => {
  if(value){
    toast.error(value.message || 'failed')
  }
})

//########################################
const touchStartX = ref(0)
const touchEndX = ref(0)

function handleTouchStart(e) {
  touchStartX.value = e.changedTouches[0].screenX
}

function handleTouchEnd(e) {
  touchEndX.value = e.changedTouches[0].screenX
  handleSwipe()
}

function handleSwipe() {
  const deltaX = touchEndX.value - touchStartX.value
  if (deltaX < -50) {
    router.push({ name: 'intake-third' }) // Swipe left
  } else if (deltaX > 50) {
    router.push({ name: 'intake' }) // Swipe right
  }
}

function doConfirm(value){
  if(value){
    saveForm()
  }
}

onMounted(() => {
  // page will be scrolled to top when mounted.
  window.scrollTo(0,0)
})
</script>

<template>
  <section
    style="height: 100vh;" 
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <VRow>
      <VCol
        cols="12"
        class="mb-4"
      >
        <VCard>
          <VCardText>
            <h4 class="text-center mb-">
              PATIENT INFORMATION
            </h4>
            <h5 class="text-center mb-4">
              (SELECT if it does NOT apply)
            </h5>
            <VForm
              ref="refVForm"
              @submit.prevent="saveForm"
            >
              <VRow class="mb-4 border">
                <VCol cols="12">
                  <VRow class="px-2">                      
                    <VCol
                      cols="2"
                      class="d-flex align-center"
                    >
                      <label class="me-4">CONSTITUTIONAL</label>
                      <VCheckbox v-model="intake['constitutional']" />
                    </VCol>                      
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: CHILLS, FATIGUE, FEVER, WEAKNESS, WEIGHT GAIN, INSOMNIA NIGHT SWEATS, POORAPPETITE, DEPRESSION, DIABETES, STROKE, HIV, AIDS.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">HEAD</label>
                      <VCheckbox v-model="intake['head']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING:, DIZZINESS, HEAD INJURY, HEADACHES.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">EYES</label>
                      <VCheckbox v-model="intake['eyes']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING:, BLURRY VISION, CATARACTS, DOUBLE VISION GLAUCOMA, CATARACTS, SURGERY.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">NOSE</label>
                      <VCheckbox v-model="intake['nose']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: NASAL OBSTRUCTION, NOSEBLEEDS, SINUSTISUS, SURGERY.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">MOUTH</label>
                      <VCheckbox v-model="intake['mouth']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: DRY MOUTH.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">EARS</label>
                      <VCheckbox v-model="intake['ears']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: HEARING AID, HEARING IMPAIRMENT, EAR RINSING.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">THROAT NECK</label>
                      <VCheckbox v-model="intake['throat_neck']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: SWOLLEN LYMPH NODES, STREP THROAT TONSILLECTOMY, THROAT CANCER, THROAT SURGERY.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">RESPIRATORY</label>
                      <VCheckbox v-model="intake['respiratory']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: ASTHMA, SHORTNESS OF BREATH, LUNG CANCER CHRONIC BRONCHITUS, EMPHYSEMA, PHEUMOTHORAX, INERTITIAL LUNS DISEASE, LUNG CANCER SURGERY, C.O.P.D.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">CARDIOVASCULAR</label>
                      <VCheckbox v-model="intake['cardiovascular']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: CHEST PAIN, HIGH BLOOD Pressure, HISTORY OF HEART ATTACK, SHORTNESS. OF BREATH, IRRES ULAR HEART BEAT, POORCIRCULATION HEART FAILURE, STRESS TEST, CARDIAC CAthertIZATION, HEART TRANSPLANT, VASCULAR SURGERY, CORNOARY ARTERY BYPASS.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">GASTROINTESTINAL</label>
                      <VCheckbox v-model="intake['gastrointestinal']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: ABDOMINAL PAIN, CONSTIPATION, BOWEL INCONTINENCE, CHOLECYSTECTOMY, CHRONS DISEASE, COLONOSCOPY, HEPATITUS C, HEPATITUS B, POLYUPS, GASTRITUS, HEPATITUS A, APPENDECTOMY, DIVERTICULITUS, ENDOSCOPY COLON CANCER, DIVERTICULITUS SURGERY, CIRRHOSIS OF THE LIVER, SPLENECTOMY, ULCERATIVE COLITUS, COLON CANCER, PEPTIC ULCER DISEASE.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">MUSCULOSKELETAL</label>
                      <VCheckbox v-model="intake['musculoskeletal']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: OSTEOARTHRITIS, RHEUMATOID ARTHRITUS, BACK PROBLEMS, SWOLLEN JOINts, KNEE PROBLEMS, BACK SURGERY, SCOLIOSIS, NECK PROBLEMS, HERNIATED DISC, LUPUS, BROKEN BONES, FOOT PROBLEMS, ANKLE PROBLEMS, STIFF JOINTS, ANKYLOSING SPONDY LITITS, SHOULDER PROBLEMS, ELBOW PROBLEMS, WRIST PROBLEMS, HAND PROBLEMS, HIP PROBLEMS, RESTRICTED MOVEMENT.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">SKIN</label>
                      <VCheckbox v-model="intake['skin']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: WEAKNESS, FAINTING, NUMBNESS, UNSTEADY GAIT, SEIZURES, EPILEPSY.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">ENDOCRINE</label>
                      <VCheckbox v-model="intake['endocrine']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: HYPOTHYROIDISM, HYPOTHYROIDISM, CUSHINS SYNDROME, NON INSULIN DEPENDANT DIABETES, INSULIN DIABETES, ADDISON SYNDROME, GRAVES DISEASE, GENITOURINARY.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">URINARY</label>
                      <VCheckbox v-model="intake['urinary']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: KIDNEY INFECTIONS, KIDNEY FAILURE, DISCHARGE BURNING with URINATION, BLADDER CANCER, BLADDER INFECTION, KIDNEY STONES, KIDNEY CANCER, TRANSPLANT.</label>
                  </VRow>
                </VCol>
  
                <VCol cols="12">
                  <VRow class="px-2">
                    <VCol class="d-flex align-center">
                      <label class="me-4">NEUROLOGICAL</label>
                      <VCheckbox v-model="intake['neurological']" />
                    </VCol>
                  </VRow>
                  <VRow class="mb-2 px-2">
                    <label>PATIENT DOES NOT HAVE ANY OF THE FOLLOWING: WEAKNESS, FAINTING, NUMBNESS, UNSTEADY GAIT, SEISURES, EPILEPSY.</label>
                  </VRow> 
                </VCol>  
              </VRow>
              <VRow
                v-if="patientId"
                class="my-2 px-2 justify-center"
              >
                <VBtn
                  v-if="loading == false"
                  size="large"
                  style="width: 15rem;"
                  @click="saveForm"
                >
                  DONE
                </VBtn>
                <VBtn
                  v-else
                  size="large"
                  style="width: 15rem;"
                >
                  <VProgressCircular
                    color="white"
                    indeterminate
                  />
                </VBtn>                      
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