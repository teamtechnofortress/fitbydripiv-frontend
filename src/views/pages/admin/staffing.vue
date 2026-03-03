<script setup>
import { useStaffDataStore } from "@/store/staffData";
import { emailValidator, requiredValidator } from '@validators';
import { onMounted, watch } from "vue";
import { useToast } from 'vue-toastification';

const staffDataStore = useStaffDataStore();
const { staffList, isAddedNewStaff, isDeletedStaff, error, loading } = storeToRefs(staffDataStore);
const rowPerPage = ref(10)
const currentPage = ref(1)
const totalPage = ref(1)
const totalUsers = ref(0)
const staff = ref([]);
const items = ref(['Man', 'Woman', 'Other']);
const staffTypeItems = ref(['Nurse', 'Nurse Practioner(NP)', 'admin']);
const refVForm = ref();
const toast = useToast();
const router = useRouter();
const selectedStaffId = ref(null);
const paymentMethods = [
  'Cash',
  'Credit Card',
  'Bank Transfer',
  'PayPal',
  'Check',
]

// 👉 watching current page
watchEffect(() => {
  if (currentPage.value > totalPage.value)
    currentPage.value = totalPage.value
})

// 👉 watching current page
watchEffect(() => {
  if (currentPage.value > totalPage.value)
    currentPage.value = totalPage.value
})

// 👉 Computing pagination data
const paginationData = computed(() => {
  const firstIndex = staffList.value.length ? (currentPage.value - 1) * rowPerPage.value + 1 : 0
  const lastIndex = staffList.value.length + (currentPage.value - 1) * rowPerPage.value
  
  return `Showing ${ firstIndex } to ${ lastIndex } of ${ totalUsers.value } entries`
});

function saveForm(){
  refVForm.value?.validate().then(({ valid: isValid }) => {
    loading.value = true;
    if (isValid){
        if(selectedStaffId.value){
            staff.value['id'] = selectedStaffId.value;
            staffDataStore.updateStaff({...staff.value})?.then(() => {
                loading.value = false;
                toast.success("Successfully updated staff.");
                staffDataStore.getAllStaff();
                setTimeout(() => {            
                    router.push({ name: 'admin-tab', params: { tab: "payroll" } });
                }, 700);
            }).catch(() => {
                loading.value = false;
                toast.error("Failed to update staff.");
            });
            return;

        }else{
            staffDataStore.addNewStaff({...staff.value});
        }
    }else{
        loading.value = false;
        toast.error("Please fill out the fields!");
    }
  });  
}

const minValueValidator = value => value > 0 || 'Minimum value is greater than 0';
const maxValueValidator = value => value <= 25 || 'Maximum value is $25.00';


//Staff ####################
const isConfirmDialogVisible = ref(false);
const removeStaffId = ref(null);

function doConfirm(value){
    if(value){
        staffDataStore.removeStaff({id: removeStaffId.value});
    }
}
const getStaffInfo = (id) => {
    const selectedStaff = staffList.value.find(item => item.id === id);    
    if(selectedStaff){
        selectedStaffId.value = id;
        staff.value = {
            ...selectedStaff, 
            "require_signature": selectedStaff.require_signature == 1 ? true : false,
            "password_reset": selectedStaff.password_reset == 1 ? true : false,
        };
    }else{
        toast.error("Failed to get staff info.");
    }    
}

watch(isDeletedStaff, (val) => {
    if(val){
        toast.success("Successfully removed staff.");
        staffDataStore.getAllStaff();
    }
});

watch(isAddedNewStaff, (val) => {
    if(val){
        staff.value = [];
        toast.success("Successfully Added New Staff.");
        staffDataStore.getAllStaff();

        setTimeout(() => {            
            router.push({ name: 'admin-tab', params: { tab: "payroll" } });
        }, 700);
    } 
        
});
watch(error, (value) => {    
    if(value) toast.error(value.message || 'failed');  
});

const resetStaff = ()=>{
    selectedStaffId.value = null;
    staff.value = {
        firstName: '',
        lastName: '',
        birthday: new Date().toJSON().slice(0, 10),
        ssn: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        email: '',
        emergency: '',
        contact: '',
    }
}
onMounted(()=>{
    staff.value['birthday'] = new Date().toJSON().slice(0, 10);
    staff.value['hiring_date'] = new Date().toJSON().slice(0, 10);
    staffDataStore.getAllStaff();
});
</script>

<template>
  <section>
    <VRow>
    <VCol cols="12">
        <VCard title="STAFFING">
            <VCardText>
                <VRow class="align-center justify-end px-4">
                    <VBtn v-if="!loading" class="me-4" color="primary" size="small" @click="resetStaff()">Add New +</VBtn>
                </VRow>
                <VRow class="mb-4">
                    <VCol cols="6">
                        <VRow class="mb-4 px-2">
                            <h4>STAFF</h4>
                        </VRow>
                        <VTable class="border">
                            <tbody>
                                <tr v-for="(item, index) in staffList" :key="index">
                                    <td>{{ index + 1 }}</td>
                                    <td class="cursor-pointer text-primary" @click="getStaffInfo(item.id)">{{ `${item.firstName} ${item.lastName}` }}</td>
                                    <td>{{ item.email }}</td>
                                    <td>{{ item.ssn }}</td>
                                    <td style="width: 8rem;">
                                    <VBtn icon variant="text" color="default" size="x-small" 
                                        @click="isConfirmDialogVisible = true; removeStaffId = item.id;">
                                        <VIcon icon="tabler-trash" :size="22"/>
                                    </VBtn>
                                    </td>
                                </tr>                                
                            </tbody>
                        </VTable>
                        <VRow class="mt-6 px-4 pt-6">
                            <VCol cols="12" class="d-flex flex-column align-center">
                                <h5>Signature Preview</h5>
                                <div v-if="staff['signature']">
                                <img 
                                    :src="`${staff['signature']}`" 
                                    alt="Staff Signature" 
                                    style="max-width:200px; border:1px solid #ccc; padding:4px;" 
                                />
                                </div>
                                <div v-else>
                                    <em>No signature available</em>
                                </div>
                            </VCol>
                        </VRow>
                    </VCol>

                    <VCol cols="6">                        
                        <VForm ref="refVForm" @submit.prevent="saveForm">
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">FIRST NAME:</label>
                                    <VTextField v-model="staff['firstName']" variant="underlined" :rules="[requiredValidator]"></VTextField>
                                </VCol>                                                   
                                <VCol class="d-flex align-center">
                                    <label class="me-4">LAST NAME:</label>                                    
                                    <VTextField v-model="staff['lastName']" variant="underlined" :rules="[requiredValidator]"></VTextField>
                                </VCol>                           
                            </VRow>
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">DOB:</label>                                    
                                    <AppDateTimePicker 
                                        v-model="staff['birthday']"
                                        label="Date of Birth" 
                                        :model-value="staff['birthday'] || (new Date().toJSON().slice(0, 10))" 
                                        variant="underlined" :rules="[requiredValidator]" />
                                </VCol>                                                   
                                <VCol class="d-flex align-center">
                                    <label class="me-4">SSN:</label>
                                    <VTextField v-model="staff['ssn']" variant="underlined" :rules="[requiredValidator]"></VTextField>
                                </VCol>                           
                            </VRow>
                            <VRow class="mb-4 px-4"> 
                                <VCol cols="12" class="d-flex align-center">
                                    <label class="me-4">ADDRESS:</label>
                                    <VTextField v-model="staff['address']" variant="underlined" :rules="[requiredValidator]"></VTextField>
                                </VCol>                           
                            </VRow>
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">CITY:</label>
                                    <VTextField v-model="staff['city']" variant="underlined" :rules="[requiredValidator]"></VTextField>
                                </VCol>                                                   
                                <VCol class="d-flex align-center">
                                    <label class="me-4">STATE:</label>
                                    <VTextField v-model="staff['state']" variant="underlined" :rules="[requiredValidator]"></VTextField>
                                </VCol>                           
                                <VCol class="d-flex align-center">
                                    <label class="me-4">ZIP:</label>
                                    <VTextField v-model="staff['zip']" variant="underlined" :rules="[requiredValidator]"></VTextField>
                                </VCol>                           
                            </VRow>
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">PHONE:</label>
                                    <VTextField v-model="staff['phone']" variant="underlined" :rules="[requiredValidator]"></VTextField>
                                </VCol>                                                   
                                <VCol class="d-flex align-center">
                                    <label class="me-4">EMAIL:</label>
                                    <VTextField type="email" v-model="staff['email']" variant="underlined" :rules="[requiredValidator, emailValidator]"></VTextField>
                                </VCol>                            
                            </VRow>
                            <VRow class="mb-4 px-4 d-flex"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">EMERGENCY #:</label>
                                    <VTextField v-model="staff['emergency']" variant="underlined" :rules="[requiredValidator]"></VTextField>
                                </VCol>                                                   
                                <VCol class="d-flex align-center">
                                    <label class="me-4">CONTACT:</label>
                                    <VTextField v-model="staff['contact']" variant="underlined" :rules="[requiredValidator]"></VTextField>
                                </VCol>                            
                            </VRow>

                            <VRow class="mb-4 px-4"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">GENDER:</label>
                                    <VSelect
                                        v-model="staff['gender']"
                                        :items="items"            
                                        label="Gender"
                                        name="select"
                                        variant="underlined"
                                        :rules="[requiredValidator]"
                                        require
                                    />
                                </VCol>  
                                <VCol class="d-flex align-center">
                                    <label class="me-4">TITLE:</label>
                                    <VTextField v-model="staff['title']" variant="underlined" :rules="[requiredValidator]"></VTextField>
                                </VCol>                         
                            </VRow>
                            <VRow class="mb-4 px-4"> 
                                <VCol class="d-flex align-center">
                                    <label class="me-4">HOURLY RATE:</label>
                                    <VTextField prefix="$" v-model="staff['hourly_rate']" type="number" variant="underlined" :rules="[requiredValidator, minValueValidator, maxValueValidator]" :input-attrs="{ min: 0, max: 25 }"></VTextField>
                                </VCol>
                                <VCol class="d-flex align-center">
                                    <label class="me-4">HIRING DATE:</label>
                                    <AppDateTimePicker 
                                        v-model="staff['hiring_date']" 
                                        label="Hiring Date" 
                                        :model-value="staff['hiring_date'] || (new Date().toJSON().slice(0, 10))" 
                                        variant="underlined" 
                                        :rules="[requiredValidator]"
                                        />
                                </VCol>
                            </VRow>                            
                            <VRow class="mb-4 px-4">                                 
                                <VCol cols="10" class="d-flex align-center">
                                    <label class="me-4">PAYMENT METHODS:</label>                                    
                                    <VSelect
                                        v-model="staff['payment_method']"
                                        :items="paymentMethods"
                                        variant="underlined"
                                        :rules="[requiredValidator]"
                                        label="Select Payment Method"
                                        class="flex-grow-1"
                                    />
                                </VCol>                                 
                            </VRow>
                            <VRow class="mb-4 px-4">
                                <VCol cols="8" class="d-flex align-center">
                                    <label class="me-4">STAFF TYPE:</label>
                                    <VSelect
                                        v-model="staff['role']"
                                        :items="staffTypeItems"            
                                        label="Select the Staff Type"                                        
                                        variant="underlined"
                                        :rules="[requiredValidator]"
                                        require
                                    />
                                </VCol>
                                <VCol cols="4" class="d-flex align-center mt-2">
                                    <label class="me-4">REQUIRE SIGNATURE</label>
                                    <VCheckbox v-model="staff['require_signature']" />
                                </VCol> 
                            </VRow>
                            <VRow class="mb-4 px-4"> 
                                <VCol cols="10" class="d-flex align-center">
                                    <label class="me-4">BANK ACCOUNT #:</label>
                                    <VTextField v-model="staff['bank']" variant="underlined"></VTextField>
                                </VCol>                                                           
                            </VRow>
                            <VRow class="mb-4 px-4"> 
                                <VCol cols="8" class="d-flex align-center">
                                    <label class="me-4">ROUTING #</label>
                                    <VTextField v-model="staff['routing']" variant="underlined"></VTextField>
                                </VCol>                           
                                <VCol cols="4" class="d-flex align-center mt-2">
                                    <label class="me-4">PASSWORD RESET</label>
                                    <VCheckbox v-model="staff['password_reset']" />
                                </VCol>                           
                            </VRow>                        
                            <VRow class="mt-4 pt-4 align-center justify-center px-4">
                                <VBtn v-if="!loading" class="me-4" color="primary" type="submit">{{selectedStaffId ? 'Update' : 'Add +'}}</VBtn>
                                <VProgressCircular v-else indeterminate /> 
                            </VRow>
                        </VForm>                        
                    </VCol>
                </VRow>
                <!-- 👉 Confirm Dialog -->
                <ConfirmDialog
                    v-model:isDialogVisible="isConfirmDialogVisible"
                    confirmation-msg="Are you sure to delete this staff?"
                    @confirm="doConfirm"
                />

            </VCardText>            
        </VCard>
    </VCol>
    </VRow>
  </section>
</template>