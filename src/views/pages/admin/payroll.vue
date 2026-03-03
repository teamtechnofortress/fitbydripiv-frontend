<script setup>
import { requiredValidator } from "@/@core/utils/validators";
import * as Network from "@/network";
import * as Const from "@/network/const";
import { useStaffDataStore } from "@/store/staffData";
import { useToast } from "vue-toastification";

const staffDataStore = useStaffDataStore();
const { staffList,  error  } = storeToRefs(staffDataStore);
const staff = ref();
const selectedStaff = ref([]);
const refVForm = ref();
const toast = useToast();
const isLoading = ref(false);

const getPayRoll = () => {
    isLoading.value = true;
    Network.getRequest(`${Const.GET_STAFF_PAYROLL}`, {}, {staff_id: selectedStaff.value.id}, 
        (response) => {
            isLoading.value = false;
            if(response.data.success){
                staff.value = response.data.data.staff;
                selectedStaff.value['frequency'] = response.data.data.payroll?.frequency;
                selectedStaff.value['withholding'] = response.data.data.payroll?.withholding;
                selectedStaff.value['payrate'] = response.data.data.payroll?.payrate;
                selectedStaff.value['others'] = response.data.data.payroll?.others;
            }else{
                console.log(`Error: ${response.data.err_msg}`);
            }
        }
    );    
};

function saveForm(){
  refVForm.value?.validate().then(({ valid: isValid }) => {
      if (isValid){
        if(!selectedStaff.value.id){
            toast.error("Please select a staff member!"); return;
        }

        isLoading.value = true;        
        Network.postRequest(`${Const.SAVE_STAFF_PAYROLL}`, {}, {staff_id: selectedStaff.value.id, ...selectedStaff.value}, 
            (response) => {
                isLoading.value = false;
                if(response.data.success){
                    toast.success("Payroll updated successfully!");

                    staff.value = response.data.data.staff;
                    selectedStaff.value['frequency'] = response.data.data.payroll?.frequency;
                    selectedStaff.value['withholding'] = response.data.data.payroll?.withholding;
                    selectedStaff.value['payrate'] = response.data.data.payroll?.payrate;
                    selectedStaff.value['others']  = response.data.data.payroll?.others;
                }else{
                    console.log(`Error: ${response.data.err_msg}`);
                }
            }
        );
    }else{        
        toast.error("Please fill out the fields!");
    }
  });  
}

watch(error, (value) => {
    if(value) toast.error(value.message || 'failed');  
});

onMounted(()=>{    
    staffDataStore.getAllStaff();
});
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard title="STAFFING">
            <VCardText>
                <VRow class="mb-4">
                    <VCol cols="6">
                        <VRow class="mb-4 px-2">
                          <h4>STAFF</h4>
                        </VRow>
                        <VTable class="border">
                            <tbody>
                                <tr v-for="(item, index) in staffList" :key="index" class="cursor-pointer" 
                                    @click="selectedStaff = item; getPayRoll();">
                                    <td :class="[selectedStaff.id == item.id ? 'bg-primary' : '']">{{ index + 1 }}</td>
                                    <td :class="[selectedStaff.id == item.id ? 'bg-primary' : '']">{{ `${item.firstName} ${item.lastName}` }}</td>
                                    <td :class="[selectedStaff.id == item.id ? 'bg-primary' : '']">{{ item.email }}</td>
                                    <td :class="[selectedStaff.id == item.id ? 'bg-primary' : '']">{{ item.ssn }}</td>                        
                                </tr>                                
                            </tbody>
                        </VTable>
                    </VCol>

                    <VCol cols="6"> 
                        <VForm ref="refVForm" @submit.prevent="saveForm">
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">FIRST NAME:</label>
                                    <VTextField class="pb-4" :model-value="staff?.firstName" variant="underlined" readonly></VTextField>
                                </VCol>                                                   
                                <VCol class="d-flex align-center">
                                    <label class="me-4">LAST NAME:</label>
                                    <VTextField class="pb-4" :model-value="staff?.lastName" variant="underlined" readonly></VTextField>
                                </VCol>                           
                            </VRow>
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">DOB:</label>
                                    <VTextField class="pb-4" :model-value="staff?.birthday" variant="underlined" readonly></VTextField>
                                </VCol>                                                   
                                <VCol class="d-flex align-center">
                                    <label class="me-4">SSN:</label>
                                    <VTextField class="pb-4" :model-value="staff?.ssn" variant="underlined" readonly></VTextField>
                                </VCol>                           
                            </VRow>
                            <VRow class="mb-4 px-4"> 
                                <VCol cols="12" class="d-flex align-center">
                                    <label class="me-4">ADDRESS:</label>
                                    <VTextField class="pb-4" :model-value="staff?.address" variant="underlined" readonly></VTextField>
                                </VCol>                           
                            </VRow>
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">CITY:</label>
                                    <VTextField class="pb-4" :model-value="staff?.city" variant="underlined" readonly></VTextField>
                                </VCol>                                                   
                                <VCol class="d-flex align-center">
                                    <label class="me-4">STATE:</label>
                                    <VTextField class="pb-4" :model-value="staff?.state" variant="underlined" readonly></VTextField>
                                </VCol>                           
                                <VCol class="d-flex align-center">
                                    <label class="me-4">ZIP:</label>
                                    <VTextField class="pb-4" :model-value="staff?.zip" variant="underlined" readonly></VTextField>
                                </VCol>                           
                            </VRow>
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">PHONE:</label>
                                    <VTextField class="pb-4" :model-value="staff?.phone" variant="underlined" readonly></VTextField>
                                </VCol>                                                   
                                <VCol class="d-flex align-center">
                                    <label class="me-4">EMAIL:</label>
                                    <VTextField class="pb-4" :model-value="staff?.email" variant="underlined" readonly></VTextField>
                                </VCol>                            
                            </VRow>
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">PAYROLL FREQUENCY #:</label>
                                    <VRadioGroup inline class="ms-4" v-model="selectedStaff['frequency']" required :rules="[requiredValidator]">
                                        <VRadio label="MONTHLY" value="month"/>
                                        <VRadio label="BI-WEEKLY" value="bi-weekly"/>
                                        <VRadio label="WEEKLY" value="weekly"/>
                                    </VRadioGroup>
                                </VCol>                            
                            </VRow>
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4 pt-4">WITHHOLDING DEDUCTIONS:</label>
                                    <VTextField type="number" v-model="selectedStaff['withholding']" variant="underlined" label="Withholding" :rules="[requiredValidator]"></VTextField>
                                </VCol>                                
                            </VRow>
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">PAY RATE:</label>
                                    <VRadioGroup inline class="ms-4" v-model="selectedStaff['payrate']" required :rules="[requiredValidator]">
                                        <VRadio label="HOURLY" value="hourly"/>                                    
                                        <VRadio label="MONTHLY" value="monthly"/>
                                    </VRadioGroup>
                                </VCol>                            
                            </VRow>
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">OTHERS:</label>
                                    <VTextarea v-model="selectedStaff['others']" rows="3"></VTextarea>
                                </VCol>
                            </VRow>

                            <VRow class="mt-4 pt-4 align-center justify-end px-4">
                                <VBtn v-if="!isLoading" class="me-4" color="primary" type="submit">SAVE</VBtn>
                                <VProgressCircular v-else indeterminate />    
                            </VRow>
                        </VForm>                         
                    </VCol>
                </VRow>

            </VCardText>            
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>