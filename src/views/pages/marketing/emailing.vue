<script setup>
//##############################################################################
import { UPLOAD_ENDPOINT_URL } from '@/network/const'
import { convertUTCDate, formDate } from '@/router/utils'
import { useMarketingStore } from '@/store/marketingData'
import avatar1 from '@images/logos/gumroad.png'
import { requiredValidator, } from '@validators'
import axios from 'axios'
import { watch } from 'vue'
import { useToast } from 'vue-toastification'
const { error } = storeToRefs(useMarketingStore());

const toast = useToast()
const marketingStore = useMarketingStore()

const accountData = {
  avatarImg: avatar1,
  firstName: 'john',
  lastName: 'Doe',
  email: 'johnDoe@example.com',
  org: 'Pixinvent',
  phone: '+1 (917) 543-9876',
  address: '123 Main St, New York, NY 10001',
  state: 'New York',
  zip: '10001',
  country: 'USA',
  language: 'English',
  timezone: '(GMT-11:00) International Date Line West',
  currency: 'USD',
}

const refInputEl = ref()
const accountDataLocal = ref(structuredClone(accountData))
const currentPage = ref(1)
const pageSize = ref(5)

const resetForm = () => {
  accountDataLocal.value = structuredClone(accountData)
}
const refForm = ref();
const now = new Date();
const defaultTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')

const form = ref({
  title: '',
  content: '',
  toBeArchived: true,
  send_date: now,
  send_time: defaultTime,
  texts_per_send: 10,
  patient_start: 1,
  patient_end: 100,
  attachments: '',
  company_signature: 'FITBYDRIP\n12345 MEDICAL DRIVE\nSAN ANTONIO, TEXAS, 78257\n\nfitbydrip@gmail.com\n800-555-1212, 888-555-1212',
  contact: 'FITBYDRIP\n12345 MEDICAL DRIVE\nSAN ANTONIO, TEXAS, 78257\n\nfitbydrip@gmail.com\n800-555-1212, 888-555-1212',
})

// Computed property for the "Archive/Delete" checkbox
const toBeDeleted = computed({
  get() {
    return !form.value.toBeArchived
  },
  set(value) {
    form.value.toBeArchived = !value
  },
})

const totalPages = computed(() =>
  Math.ceil(marketingStore.emailCampaigns.length / pageSize.value)
)

const paginatedCampaigns = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return marketingStore.emailCampaigns?.slice(start, end)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

onMounted(()=>{
  marketingStore.getEmailCampaigns()
})

//Campaign ####################
const isConfirmDialogVisible = ref(false)
const removeCampaignId = ref(null)

function doConfirm(value){
  if(value){
    marketingStore.removeEmailCampaign(removeCampaignId.value)
  }
}

const handleItemClick = index => {
  marketingStore.selectedEmailCampaign = index
  if(index !== -1) form.value = marketingStore.emailCampaigns[marketingStore.selectedEmailCampaign]
  else form.value = {
  }
}

const changeAvatar = async event => {
  const file = event.target.files[0]
  if (!file) return

  // Preview the image locally
  const reader = new FileReader()

  reader.onload = () => {
    accountDataLocal.value.avatarImg = reader.result
  }
  reader.readAsDataURL(file)

  // Upload to server
  try {
    const formData = new FormData()

    formData.append('file', file)

    const response = await axios.post(UPLOAD_ENDPOINT_URL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })


    // Optionally update avatar with the final uploaded path
    if (response.data.url) {
      form.value.attachments = response.data.url
      accountDataLocal.value.avatarImg = URL.createObjectURL(file)
    }
  } catch (err) {
    toast.error('Upload failed:', err)
  }
}

// reset avatar image
const resetAvatar = () => {
  accountDataLocal.value.avatarImg = accountData.avatarImg
  form.value.attachments = ''
}

async function saveForm() {
 refForm.value?.validate().then(({ valid }) => {
    if (valid) {   
      try {        
        //convert from localtime to UTC time
        const getYMD = formDate(form.value.send_date).split(' ')[0];
        const utcDateTimeStr = convertUTCDate(getYMD, form.value.send_time);

        let params = {
          ...form.value,
          send_date: utcDateTimeStr.split(' ')[0],
          send_time: utcDateTimeStr.split(' ')[1],
          staff_id: JSON.parse(localStorage.getItem('userData')).id,
          archive_after_send: form.value.toBeArchived,
        }
        marketingStore.saveEmailCampaign(params);        
      } catch (error) {
        toast.error('Error scheduling Email campaign.')
      }
    }
  });
}

watch(error, msg => {
  if(msg){   
    toast.error(msg.message || 'Operation Failed.')
  }
})
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard title="EMAIL CAMPAIGN">
          <VCardText>
            <VForm
              ref="refForm"
              @submit.prevent="saveForm"
            >            
              <VRow>
                <VCol cols="6">
                  <VRow class="mb-4 px-4">
                    <VTextField 
                      v-model="form.title"
                      variant="underlined" 
                      :rules="[requiredValidator]"
                      placeholder="Enter Title Of Campaign..."
                    />
                  </VRow>
                  <VRow>
                    <VCol cols="12">
                      <VTextarea
                        v-model="form.content"
                        label="Email Campaign Content"
                        :rules="[requiredValidator]"
                        rows="9"
                        outlined
                      />
                    </VCol>
                  </VRow>
                  <!-- 👉 Avatar -->
                  <VCardText class="d-flex">
                    <VAvatar
                      rounded
                      size="100"
                      class="me-6"
                      :image="accountDataLocal.avatarImg"
                    />

                    <div class="d-flex flex-column justify-center gap-4">
                      <div class="d-flex flex-wrap gap-2">
                        <VBtn
                          color="primary"
                          @click="refInputEl?.click()"
                        >
                          <VIcon
                            icon="tabler-cloud-upload"
                            class="d-sm-none"
                          />
                          <span class="d-none d-sm-block">Upload New Logo</span>
                        </VBtn>

                        <input
                          ref="refInputEl"
                          type="file"
                          name="file"
                          accept=".jpeg,.png,.jpg,.GIF"
                          hidden
                          @input="changeAvatar"
                        >

                        <VBtn
                          type="reset"
                          color="secondary"
                          variant="tonal"
                          @click="resetAvatar"
                        >
                          <span class="d-none d-sm-block">Reset</span>
                          <VIcon
                            icon="tabler-refresh"
                            class="d-sm-none"
                          />
                        </VBtn>
                      </div>

                      <p class="text-body-1 mb-0">
                        Allowed JPG, GIF or PNG. Max size of 800K
                      </p>
                    </div>
                  </VCardText>
                  
                  <VDivider />
                  <VRow class="mt-4">
                    <VCol cols="12">
                      <VTextarea
                        v-model="form.company_signature"                        
                        label="COMPANY SIGNATURE"
                        rows="8"
                      />
                    </VCol>
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
                      <label class="me-4">DELETE AFTER SENDING #:</label>
                      <VCheckbox
                        v-model="toBeDeleted"
                        class="me-4"
                      />                          
                    </VCol>                           
                  </VRow>
                  <VRow class="mb-4 px-4"> 
                    <VCol
                      cols="10"
                      class="d-flex align-center"
                    >
                      <label class="me-4">ARCHIVE AFTER SENDING #:</label>
                      <VCheckbox
                        v-model="form.toBeArchived"
                        class="me-4"
                      />                          
                    </VCol>
                  </VRow>
                  <VRow class="mt-4 pt-4 align-center justify-center">
                    <VBtn
                      class="me-4"
                      color="primary"
                      type="submit"
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
                <label class="text-h6"><span class="text-capitalize">EmailCampaign List</span></label>
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
                    <tr class="cursor-pointer" v-for="(campaign, index) in paginatedCampaigns" :key="campaign.id" @click="handleItemClick(index + (currentPage - 1) * pageSize)">
                      <td class="text-primary">{{ campaign.title }}</td>
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
