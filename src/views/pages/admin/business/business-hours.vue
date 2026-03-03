<script setup>
import * as Network from "@/network";
import * as Const from "@/network/const";
import { useSettingsStore } from '@/store/settingsData';
import { requiredValidator } from '@validators';
import { onMounted } from 'vue';
import { useToast } from 'vue-toastification';

const store = useSettingsStore()
const toast = useToast()
const isLoading = ref(false);
const form = ref({
  start_time: '',
  end_time: '',
  company_name: 'FitByDrip',
  invoice_intro_text: ''
});

const refForm = ref();

async function saveForm() {
  refForm.value?.validate().then(({ valid }) => {
    if (valid) {         
        isLoading.value = true;
        Network.postRequest(Const.SAVE_BUSINESS_HOURS_URL, {}, {...form.value}, 
          (response) => {
            isLoading.value = false;
            if(response.data.success){
              toast.success(response.data.message);              
            }else{
              toast.error(response.data.err_msg);              
            }
          }
        );
    }
  });
}

onMounted(async () => {
  await store.getBusinessHours()
  const data = store.businessHours
  if (data) {
    form.value = {
      start_time: data.start_time || '',
      end_time: data.end_time || '',
      twillio_sid: data.twillio_sid || '',
      twillio_auth_token: data.twillio_auth_token || '',
      twillio_phone_number: data.twillio_phone_number || '',
      company_name: data.company_name || 'FitByDrip',
      invoice_intro_text: data.invoice_intro_text || ''
    }
  }
});
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard>
            <VCardTitle class="text-h6 mt-4 mb-4 text-center">
              BUSINESS SETTING
            </VCardTitle>
            
            <VCardText>    
            <VForm
              ref="refForm"
              @submit.prevent="saveForm"
            >
                <VRow class="my-4 mx-2">
                  <VCol cols="2">
                    <label class="text-h6 mt-4">Company Name : </label>
                  </VCol>
                  <VCol cols="4">
                    <VTextField
                      v-model="form.company_name"
                      :rules="[requiredValidator]"
                      label="Company Name"
                      variant="outlined"
                      color="primary"
                    />
                  </VCol>                  
                </VRow>

                <VRow class="my-4 mx-2">
                  <VCol cols="2">
                    <label class="text-h6 mt-4">Business Hours : </label>
                  </VCol>
                  <VCol cols="4">
                    <AppDateTimePicker
                        v-model="form.start_time"
                        :rules="[requiredValidator]"
                        label="Start Time"
                        :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
                      />
                  </VCol>
                  <VCol cols="4">
                    <AppDateTimePicker
                      v-model="form.end_time"
                      :rules="[requiredValidator]"
                      label="End Time"
                      :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
                    />
                  </VCol>
                </VRow>

                <VRow class="my-4 mx-2">
                  <VCol cols="2">
                    <label class="text-h6 mt-4">Twillio API Key: </label>
                  </VCol>
                  <VCol cols="4">
                    <VTextField
                      v-model="form.twillio_sid"
                      :rules="[requiredValidator]"
                      label="Twillio SID"
                      variant="outlined"
                      color="primary"
                    />
                  </VCol>
                  <VCol cols="4">
                    <VTextField
                      v-model="form.twillio_auth_token"
                      :rules="[requiredValidator]"
                      label="Twillio Auth Token"
                      variant="outlined"
                      color="primary"
                    />
                  </VCol>
                  <VCol cols="2">
                    <VTextField
                      v-model="form.twillio_phone_number"
                      :rules="[requiredValidator]"
                      label="Twillio Phone Number"
                      variant="outlined"
                      color="primary"
                    />
                  </VCol>
                </VRow>

                <VRow class="my-4 mx-2">
                  <VCol cols="2">
                    <label class="text-h6 mt-4">Invoice Intro Text: </label>
                  </VCol>
                  <VCol cols="10">
                    <VTextarea
                      v-model="form.invoice_intro_text"
                      :rules="[requiredValidator]"
                      label="INVOICE INTRO TEXT"
                      variant="outlined"
                      color="primary"
                      rows="2"
                    />
                  </VCol>                  
                </VRow>
               
                <VRow class="mt-4 pt-4 align-center justify-center">
                  <VBtn v-if="!isLoading" variant="flat" color="primary" type="submit" width="100">Save</VBtn>
                  <VProgressCircular v-else indeterminate />
                </VRow>
                
                </VForm>    
            </VCardText>            
          </VCard>
      </VCol>
    </VRow>
  </section>
</template>