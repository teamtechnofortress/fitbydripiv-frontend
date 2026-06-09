<script setup lang='ts'>
import * as Network from "@/network"
import * as Const from "@/network/const"
import { VueSignaturePad } from '@selemondev/vue3-signature-pad'
import { onMounted, ref } from 'vue'
import { useToast } from "vue-toastification"

const toast = useToast()

const options = ref({
  penColor: 'rgb(0,0,0)',
  backgroundColor: 'rgb(255, 255, 255)',
  maxWidth: 1,
  minWidth: 1,
})

const signature = ref()
const isLoading = ref(false)
const signImg = ref('')

function handleUndo(){
  return signature.value?.undo()
}

function handleClearCanvas() {
  return signature.value?.clearCanvas()
}

const getSignature = () => {
  Network.getRequest(Const.GET_SIGNATURE_URL, {}, {},
    response => {
      if(response.data.success){            
        signImg.value = response.data.data.signature
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

function handleSaveSignature() {
  isLoading.value = true
  Network.postRequest(Const.SAVE_SIGNATURE_URL, {}, { signature: signature.value?.saveSignature() }, 
    response => {
      isLoading.value = false
      if(response.data.success){
        toast.success("Signature saved successfully!")   
        signature.value?.clearCanvas()
        getSignature()
      }else{
        console.log(`Error: ${response.data.err_msg}`)
      }
    },
  )
}

onMounted(() => {
  getSignature()
})
</script>

<template>   
  <VRow>
    <VCol class="d-flex align-center justify-center mb-4">
      <VueSignaturePad
        ref="signature"
        height="150px"   
        width="650px"              
        :max-width="options.maxWidth"
        :min-width="options.minWidth"
        :options="{
          penColor: options.penColor,
          backgroundColor: options.backgroundColor,
        }"
      />        
    </VCol>
  </VRow> 
  <VRow class="d-flex align-center justify-center">
    <VCol
      cols="6"
      class="d-flex justify-space-between"
    >
      <VBtn
        class="mr-2"
        color="info"
        @click="handleUndo"
      >
        <VIcon
          :size="22"
          icon="tabler-arrow-back-up"
        />            
      </VBtn>
      <VBtn
        class="mr-2"
        color="info"
        @click="handleClearCanvas"
      >
        <VIcon
          :size="22"
          icon="tabler-trash"
        />            
      </VBtn>
      <VBtn
        class="mr-2"
        color="info"
        @click="handleSaveSignature"
      >
        <VIcon
          :size="22"
          icon="tabler-device-floppy"
        />
      </VBtn>
    </VCol>
  </VRow>
  <VRow>
    <VCol
      cols="6"
      class="d-flex mx-auto align-center justify-center"
    >
      <VRow>
        <VCol cols="8">
          <VSlider
            v-model="options.maxWidth"
            :min="0"
            :max="10"
            label="Pen thickness"
            class="mt-2"
            step="1"
          />     
        </VCol>
        <VCol
          cols="4"
          class="text-center mt-2 px-2"
        >
          <p class="text-center">
            {{ options.maxWidth }}
          </p>
        </VCol>
      </VRow>
    </VCol>
  </VRow>

  <VRow class="mb-4">
    <VCol cols="12">
      <VAlert
        class="mt-4"
        type="info"
        variant="tonal"
      >
        <p class="text-caption pt-1 mb-0">
          Use the buttons above to undo, clear, or save your signature.
          Adjust the pen thickness using the slider below.
        </p>
      </VAlert>
    </VCol>
  </VRow>  

  <VRow class="mb-4">
    <VCol
      cols="6"
      class="d-flex mx-auto align-center justify-center"
    >      
      <VRow v-if="signImg">        
        <img
          :src="signImg"
          alt="Signature Pad"
          class="w-100"
        >
      </VRow>
    </VCol>
  </VRow>  
</template>