<script setup>
import * as Network from "@/network";
import * as Const from "@/network/const";
import axios from '@axios';
import { onMounted } from 'vue';
import { useToast } from 'vue-toastification';

const toast = useToast()

const form = ref({});

const refInputEl = ref();
const isConfirmDialogVisible = ref(false);


const changeInstruction = async event => {
  const file = event.target.files[0]
  if (!file) return

  // Preview the image locally
  const reader = new FileReader()

  reader.onload = () => {
    // form.value.pdfUrl = reader.result
  }
  reader.readAsDataURL(file)

  // Upload to server
  try {
    const formData = new FormData()

    formData.append('file', file)
    const response = await axios.post(Const.INSTRUCTION_UPLOAD_URL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });  


    // Optionally update avatar with the final uploaded path
    if (response.data.url) {
      // form.value.attachments = response.data.url
      // form.value.pdfUrl = URL.createObjectURL(file)
    }
    
  } catch (err) {
    toast.error(`Upload failed: ${err.response?.data?.message || 'Unknown error'}`)
  }
}

const doConfirm = (value) => {
    if (!value) {
        isConfirmDialogVisible.value = false;
        return;
    }
    isConfirmDialogVisible.value = false;
    refInputEl.value.click();  
}

const getInstruction = () => {
    Network.getRequestNoAuth(Const.GET_INSTRUCTION_URL, {}, {}, (response) => {
      if(response.data.success){  
        form.value.pdfUrl = `${response.data.data.instruction}?${new Date().getTime()}`;
      }else{
        console.log(`Error: ${response.data.err_msg}`);
        // toast.error(response.data.err_msg || "Failed to load schedule.");
      }
    });
}

const doOpenPdf = () => {
    if(form.value.pdfUrl){
      window.open(form.value.pdfUrl, '_blank'); 
    }
}

onMounted(async () => {
    getInstruction();
});
</script>

<template>
  <section>
    <VRow>
        <VCol cols="12">
            <VCard>
                <VCardTitle class="text-h6 mt-4 mb-4 text-center">
                  Patient Instruction ( PDF )
                </VCardTitle>
                
                <VCardText>
                  <VRow class="my-4 mx-2">
                      <VCol cols="4"></VCol>
                      <VCol cols="6">
                          <div class="d-flex flex-column justify-center gap-4">
                            <div class="d-flex flex-wrap gap-2">
                                <VBtn color="primary" @click="isConfirmDialogVisible=true;">
                                    <VIcon icon="tabler-cloud-upload" class="me-4"/>
                                    <span class="d-none d-sm-block">Upload Instruction</span>
                                </VBtn>
        
                                <input
                                    ref="refInputEl"
                                    type="file"
                                    name="file"
                                    accept=".pdf"
                                    hidden
                                    @input="changeInstruction"
                                />                                    
                            </div>        
                            <p class="text-body-1 mb-0">Allowed PDF. Max size of 2MB</p>
                          </div>
                          <div class="d-flex flex-column justify-center mt-4 pt-4">
                            <label class="mb-2 text-white">View Patient Instruction</label>
                            <VBtn @click="doOpenPdf()" style="width: 50px; height: 50px;">
                              <VIcon icon="tabler-file" size="x-large"/>
                            </VBtn>
                          </div>
                      </VCol>
                  </VRow>
                </VCardText>

                <!-- 👉 Confirm Dialog -->
                <ConfirmDialog
                    v-model:isDialogVisible="isConfirmDialogVisible"
                    confirmation-msg="Are you sure to upload new instruction?"
                    @confirm="doConfirm"
                />
            </VCard>
        </VCol>
    </VRow>
  </section>
</template>