<script setup>
import {
  requiredValidator,
} from '@validators'

import { convertUTCDate, formDate } from '@/router/utils'
import { useMarketingStore } from '@/store/marketingData'
import { useToast } from 'vue-toastification'

const toast = useToast()
const marketingStore = useMarketingStore()
const now = new Date()
const defaultTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
const currentPage = ref(1)
const pageSize = ref(5)

const form = ref({
  title: '',
  message: '',
  include_signature: true,
  send_date: now,
  send_time: defaultTime,
  texts_per_send: 10,
  patient_start: 1,
  patient_end: 100,
  company_signature: 'FITBYDRIP\n12345 MEDICAL DRIVE\nSAN ANTONIO, TEXAS, 78257\n\nfitbydrip@gmail.com\n800-555-1212, 888-555-1212',
})

// Computed property for the "NO" checkbox
const reversedSignature = computed({
  get() {
    return !form.value.include_signature
  },
  set(value) {
    form.value.include_signature = !value
  },
})

const totalPages = computed(() =>
  Math.ceil(marketingStore.textCampaigns.length / pageSize.value)
)

const paginatedCampaigns = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return marketingStore.textCampaigns?.slice(start, end)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

onMounted(()=>{
  marketingStore.getTextCampaigns()
})

//Campaign ####################
const isConfirmDialogVisible = ref(false)
const removeCampaignId = ref(null)

function doConfirm(value){
  if(value){
    marketingStore.removeTextCampaign(removeCampaignId.value)
  }
}

const refForm = ref()

const handleItemClick = index => {
  marketingStore.selectedTextCampaign = index
  if(index !== -1) form.value = marketingStore.textCampaigns[marketingStore.selectedTextCampaign]
  else form.value = {
  }
}

async function saveForm() {
  refForm.value?.validate().then(({ valid: isValid }) => {
    if (isValid){   
      try {        
        //convert from localtime to UTC time
        const getYMD = formDate(form.value.send_date).split(' ')[0];
        const utcDateTimeStr = convertUTCDate(getYMD, form.value.send_time);

        let params = {
          ...form.value,
          send_date: utcDateTimeStr.split(' ')[0],
          send_time: utcDateTimeStr.split(' ')[1],
          staff_id: JSON.parse(localStorage.getItem('userData')).id,
        }
        marketingStore.saveTextCampaign(params)
        toast.success('Texting Campaign scheduled successfully!')
      } catch (error) {
        toast.error('Error scheduling texting campaign.')
      }
    }
  })
}
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard title="TEXT CAMPAIGN">
          <VCardText>
            <VForm
              ref="refForm"
              @submit.prevent="saveForm"
            >
              <VRow class="mb-4">
                <VCol cols="6">
                  <VRow class="mb-4 px-2">
                    <VTextField 
                      v-model="form.title"
                      variant="underlined" 
                      :rules="[requiredValidator]"
                      placeholder="Enter Title Of Campaign..."
                    />
                  </VRow>
                  <VRow class="my-4">
                    <VTextarea
                      v-model="form.message"
                      :rules="[requiredValidator]"
                      label="MESSAGE"
                      rows="10"
                      maxlength="250"
                      placeholder="Enter message..."
                    >
                      <template #append-inner>
                        <span class="text-xs mt-auto">* 250 Chars MAX</span>
                      </template>
                    </VTextarea>
                  </VRow>
                  <VRow class="mt-4">
                    <VTextarea
                      v-model="form.company_signature"                      
                      label="COMPANY SIGNATURE"
                      rows="10"
                    />
                  </VRow>
                </VCol>

                <VCol cols="6">
                  <VRow class="mb-4 px-4"> 
                    <VCol
                      cols="8"
                      class="d-flex align-center"
                    >
                      <label class="me-4">DATE TO SEND:</label>
                      <AppDateTimePicker   
                        v-model="form.send_date"
                        :rules="[requiredValidator]"
                        label="DATE"                                
                      />
                    </VCol>                           
                  </VRow>
                  <VRow class="mb-4 px-4"> 
                    <VCol
                      cols="8"
                      class="d-flex align-center"
                    >
                      <label class="me-4">TIME TO SEND:</label>
                      <AppDateTimePicker
                        v-model="form.send_time"
                        :rules="[requiredValidator]"
                        label="Time picker"
                        :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
                      />
                    </VCol>                           
                  </VRow>
                  <VRow class="mb-4 px-4"> 
                    <VCol
                      cols="10"
                      class="d-flex align-center"
                    >
                      <label class="me-4"># OF TEXT PER SEND:</label>
                      <VTextField
                        v-model="form.texts_per_send"
                        :rules="[requiredValidator]"
                        variant="underlined"
                        type="number"
                      />
                    </VCol>                           
                  </VRow>
                  <VRow class="mb-4 px-4"> 
                    <VCol
                      cols="10"
                      class="d-flex align-center"
                    >
                      <label class="me-4">PATIENT STARTING #:</label>
                      <VTextField
                        v-model="form.patient_start"
                        :rules="[requiredValidator]"
                        variant="underlined"
                        type="number"
                      />
                    </VCol>                           
                  </VRow>
                  <VRow class="mb-4 px-4"> 
                    <VCol
                      cols="10"
                      class="d-flex align-center"
                    >
                      <label class="me-4">PATIENT ENDING #:</label>
                      <VTextField
                        v-model="form.patient_end"
                        :rules="[requiredValidator]"
                        variant="underlined"
                        type="number"
                      />
                    </VCol>                           
                  </VRow>
                  <VRow class="mb-4 px-4"> 
                    <VCol
                      cols="10"
                      class="d-flex align-center"
                    >
                      <label class="me-4">ADD COMPANY SIGNATURE:</label>
                      <VCheckbox
                        v-model="form.include_signature"
                        label="YES"
                        class="me-4"
                      />
                      <VCheckbox
                        v-model="reversedSignature"
                        label="NO"
                      />
                    </VCol>                           
                  </VRow>
                  <VRow class="mb-4 px-4"> 
                    <VCol
                      cols="10"
                      class="d-flex align-center"
                    >
                      <label class="me-4">SEND TO BIRTHDAYS:</label>
                      <VCheckbox
                        v-model="form.is_send_birthday"
                        label="YES"
                        class="me-4"
                      />                      
                    </VCol>                           
                  </VRow>
                  <VRow class="mt-4 pt-4 align-center justify-center">
                    <VBtn
                      class="me-4"
                      type="submit"
                      color="primary"
                    >
                      SAVE
                    </VBtn>
                    <VBtn color="secondary">
                      CANCEL
                    </VBtn>
                  </VRow>
                </VCol>
              </VRow>
            </VForm>
            <VDivider />
            <VRow class="pa-4">
              <VCol cols="12">
                <label class="text-h6"><span class="text-capitalize">TextCampaign List</span></label>
              </VCol>
              <VCol cols="12">
                <VTable class="text-no-wrap border rounded mb-4">
                  <thead>
                    <tr>
                      <th scope="col">
                        <h2 class="text-primary">Title</h2>
                      </th>
                      <th scope="col">
                        <h2 class="text-primary">Created Date</h2>
                      </th>              
                      <th scope="col">
                        <h2 class="text-primary">Action</h2>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(campaign, index) in paginatedCampaigns" :key="campaign.id" @click="handleItemClick(index + (currentPage - 1) * pageSize)">
                      <td>{{ campaign.title }}</td>
                      <td>{{ new Date(campaign.created_at).toLocaleDateString() }}</td>
                      <td>
                        <VBtn
                          icon
                          variant="text"
                          color="default"
                          size="x-small" 
                          @click="isConfirmDialogVisible = true; removeCampaignId = campaign.id;"
                        >
                          <VIcon
                            icon="tabler-trash"
                            :size="22"
                          />
                        </VBtn>
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
                      :disabled="currentPage === totalPages"
                      @click="nextPage"
                    >
                      Next
                    </v-btn>
                  </v-col>
                </v-row>
              </VCol>
            </VRow>
            <ConfirmDialog
              v-model:isDialogVisible="isConfirmDialogVisible"
              confirmation-msg="Are you sure to delete this campaign?"
              @confirm="doConfirm"
            />            
          </VCardText>            
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>
