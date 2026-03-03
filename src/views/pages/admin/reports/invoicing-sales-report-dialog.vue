<script setup>
import { emailValidator, requiredValidator } from "@/@core/utils/validators";
import * as Network from "@/network";
import * as Const from "@/network/const";
import { ref } from 'vue';
import { useToast } from "vue-toastification";

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },  
});
const emit = defineEmits(['update:modelValue', 'refresh']);

const refVForm = ref();
const toast = useToast();


function updateDialog(value) {
  emit('update:modelValue', value)
}

function closeDialog() {
  emit('update:modelValue', false)
}

const loading = ref(false);
const invoicing = ref([]);

const getRangeDate = (type) => {
  if(type == 'daily'){
    
    const sDate = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10);
    return {"range_sdate": sDate, "range_edate": new Date().toJSON().slice(0, 10)};
  }else if(type == 'weekly'){
    
    const sDate = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10);
    return {"range_sdate": sDate, "range_edate": new Date().toJSON().slice(0, 10)};
  }else if(type == 'monthly'){
    
    const sDate = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 10);
    return {"range_sdate": sDate, "range_edate": new Date().toJSON().slice(0, 10)};
  }else if(type == 'quarterly'){

    const sDate = new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().slice(0, 10);
    return {"range_sdate": sDate, "range_edate": new Date().toJSON().slice(0, 10)};
  }else if(type == 'custom'){
    
    return {"range_sdate": invoicing.value.range_sdate, "range_edate": invoicing.value.range_edate};
  }
}

function saveForm(){ 
  refVForm.value?.validate().then(({ valid: isValid }) => {
    loading.value = true;
    if (isValid){     
      const rangeDate = getRangeDate(invoicing.value.frequency);     
      Network.postRequest(Const.SAVE_INVOICING_SALES_REPORT, {}, {...invoicing.value, ...rangeDate}, (response)=>{        
        loading.value = false;
        if(response.data.success){
          toast.success(response.data.message);
          setTimeout(()=>{
            closeDialog();
            emit('refresh', true);
          }, 500);
          //
        }else{
          toast.error(response.data.err_msg);
        }
      })
    }else{
      loading.value = false;
      toast.error("Please fill out the fields!");
    }
  });    
}

onMounted(()=>{
  invoicing.value.range_sdate = ref(new Date(new Date().setDate(new Date().getDate() - 10)).toISOString().slice(0, 10));
  invoicing.value.range_edate = ref(new Date().toJSON().slice(0, 10));  
});
</script>

<template>
<VDialog  
    max-width="840"
    :model-value="modelValue"
    @update:model-value="updateDialog"
  >
  <VForm ref="refVForm" @submit.prevent="saveForm">
    <VCard>
      <VCardTitle class="text-h6 mt-4 text-center">
        Invoicing Sales Report
      </VCardTitle>

      <VDivider class="mt-2" />
      <VCardText>
        <VRow>
          <VRadioGroup
              class="col-12"
              v-model="invoicing['frequency']"
              inline   
              :rules="[requiredValidator]"           
            >
            <VCol cols="3">
              <VCheckbox
                label="DAILY"
                value="daily"
              />
            </VCol>
            <VCol cols="3">
              <VCheckbox
                label="WEEKLY"
                value="weekly"
              />
            </VCol>
            <VCol cols="3">
              <VCheckbox
                label="MONTHLY"
                value="monthly"
              />
            </VCol>
            <VCol cols="3">
              <VCheckbox
                label="QUARTERLY"
                value="quarterly"
              />
            </VCol>
          </VRadioGroup>
        </VRow>

        <VDivider class="mt-2" />  
        <div class="text-subtitle-1 mt-2 mb-2">
          <VCheckbox
            v-model="invoicing['frequency']"
            label="DATE RANGE"
            value="custom"
          />
        </div>
        <VRow>
          <VCol
            cols="6"
            class="d-flex align-center"
          >
            <label class="me-4">FROM:</label>             
            <input type="date" v-model="invoicing['range_sdate']"/>
          </VCol> 
          <VCol
            cols="6"
            class="d-flex align-center"
          >
            <label class="me-4">TO:</label> 
            <input type="date" v-model="invoicing['range_edate']"/>            
          </VCol> 
        </VRow>

        <VDivider class="pt-4"/>             
        <VRow>
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['credit_card']"
              label="CREDIT CARD"
            />
          </VCol>                 
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['cash']"
              label="CASH"
            />
          </VCol>                 
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['transfer']"
              label="TRANSFER"
            />
          </VCol>  
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['sales_tax']"
              label="TAX COLLECTED"
            />
          </VCol>               
        </VRow>        

        <VDivider class="pt-4"/>             
        <VRow>
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['paypal']"
              label="PAYPAL"
            />
          </VCol>                 
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['venmo']"
              label="VENMO"
            />
          </VCol>                 
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['cashapp']"
              label="CASHAPP"
            />
          </VCol>                 
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['crypto']"
              label="CRYPTO"
            />
          </VCol>
        </VRow>

        <VDivider class="pt-4"/>             
        <VRow>
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['sales_totals']"
              label="SALES TOTALS"
            />
          </VCol>                 
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['sales_detail']"
              label="SALES DETAIL"
            />
          </VCol>
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['profit']"
              label="PROFIT"
            />
          </VCol>                 
          <VCol 
            cols="3"
            class="d-flex align-center"
            >            
            <VCheckbox
              v-model="invoicing['margin']"
              label="MARGIN"
            />
          </VCol>           
        </VRow>                

        <VDivider class="mt-2" />
        <VRow class="mt-2">
          <VCol cols="4" class="d-flex align-center">
            <VTextField v-model="invoicing['email']" type="email" label="EMAIL" :rules="[requiredValidator, emailValidator]"></VTextField>
          </VCol> 
        </VRow>

      </VCardText>

      <VCardActions class="justify-end">        
        <VBtn v-if="!loading" variant="flat" color="primary" type="submit" class="me-4">Save</VBtn>
        <VProgressCircular v-else class="me-4" indeterminate/> 
        <VBtn variant="text" @click="closeDialog">Cancel</VBtn>
      </VCardActions>
    </VCard>
  </VForm>
</VDialog>  
</template>