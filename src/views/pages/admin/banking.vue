<script setup>
import { useSettingsStore } from '@/store/settingsData'
import {
  requiredValidator,
} from '@validators'
import { onMounted } from 'vue'
import { useToast } from 'vue-toastification'

const store = useSettingsStore()
const toast = useToast()

const form = ref({
  institution: '',
  account: '',
  routing: '',
  taxRate: '',
})

const refForm = ref()

async function saveSettings() {
  refForm.value?.validate().then(({ valid }) => {
    if (valid) { 
        try {
            //await axios.post('/api/text-campaigns', form.value) 
            let params = {
            ...form.value,
            sales_tax_rate: form.value.taxRate
            }
            store.saveBankingData(params)
            toast.success('Banking info saved successfully!')
        } catch (error) {
            toast.error('Error saving Bank Data.')
        }
    }
    })
}

onMounted(async () => {
  await store.getBankingData()
  const data = store.bankingData
  if (data) {
    form.value = {
      institution: data.institution || '',
      account: data.account || '',
      routing: data.routing || '',
      taxRate: data.sales_tax_rate || '',
    }
  }
});
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard>
          <VCardTitle class="text-h6 mt-4 text-center">
              BANKING INFORMATION
          </VCardTitle>
            
          <VCardText>  
            <VRow class="mt-4">
              <VCol cols="3"></VCol>
              <VCol cols="6">
                <VForm
                  ref="refForm"
                  @submit.prevent="saveSettings"
                >
                  <VRow class="d-flex align-center mb-4">
                    <VCol cols="3">
                      <label>Bank Institution:</label>
                    </VCol>
                    <VCol class="ps-0">
                      <VTextField
                          v-model="form.institution"
                          :rules="[requiredValidator]"
                          class="mx-4"
                          variant="underlined"
                      />
                    </VCol>
                  </VRow>
                  <VRow class="d-flex align-center mb-4">
                    <VCol cols="3">
                      <label>Account:</label>
                    </VCol>
                    <VCol class="ps-0">
                      <VTextField
                          v-model="form.account"
                          :rules="[requiredValidator]"
                          class="mx-4"
                          variant="underlined"
                      />
                    </VCol>
                  </VRow>
                  <VRow class="d-flex align-center mb-4">
                    <VCol cols="3">
                      <label>Routing:</label>
                    </VCol>
                    <VCol class="ps-0">
                      <VTextField
                          v-model="form.routing"
                          :rules="[requiredValidator]"
                          class="mx-4"
                          variant="underlined"
                      />
                    </VCol>
                  </VRow>
                  <VRow class="d-flex align-center mb-4">
                    <VCol cols="3">
                      <label class="mt-4">Sales Tax Rate (%):</label>                    
                    </VCol>
                    <VCol class="ps-0">
                      <VTextField
                        v-model="form.taxRate"
                        :rules="[requiredValidator]"
                        class="mx-4"
                        type="number"
                        variant="underlined"
                        row="8"
                      />                
                    </VCol>
                  </VRow>
                  <VRow class="mt-4 pt-4 align-center justify-center">
                    <VBtn variant="flat" color="primary" type="submit" width="100">Save</VBtn>
                  </VRow>                
                </VForm> 
              </VCol>
            </VRow>                 
          </VCardText>

          <VCardActions class="justify-center me-4 mb-4">
              
          </VCardActions>
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>