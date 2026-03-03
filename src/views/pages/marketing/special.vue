<script setup>
import { useMarketingStore } from '@/store/marketingData'
import {
  requiredValidator,
} from '@validators'
import { useToast } from 'vue-toastification'

const marketingStore = useMarketingStore()
const date = ref('')
const searchQuery = ref('')
const selectedRole = ref()
const selectedPlan = ref()
const selectedStatus = ref()
const rowPerPage = ref(10)
const currentPage = ref(1)
const totalPage = ref(1)
const totalUsers = ref(0)
const users = ref([])

const form = ref({
  discountJoin: 0,
  discountForSilver: 0,
  volumeToSilver: 0,
  discountForBronze: 0,
  volumeToBronze: 0,
  discountForGold: 0,
  volumeToGold: 0,
  promoTitle: '',
})

const promos = ref([])

const refVForm = ref()
const toast = useToast()

function saveForm(){
  refVForm.value?.validate().then(({ valid: isValid }) => {
    if (isValid){
      try {
        
        if(marketingStore.selectedPromoId < 0){
          let params = {
            ...form.value,
          }
          marketingStore.saveSpecialPromo(params)
        }else{
          let params = {
            ...form.value,
            id: marketingStore.specialPromos[marketingStore.selectedPromoId].id,
          }
          marketingStore.updateSpecialPromo(params)
        }
      } catch (error) {
        toast.error('Error Special Promo campaign.')
      }
    }else{
      toast.error("Please fill out the fields!")
    }
  })  
}

const handleItemClick = index => {
  marketingStore.selectedPromoId = index
  if(index !== -1) form.value = marketingStore.specialPromos[marketingStore.selectedPromoId]
  else form.value = {
    discountJoin: 0,
    discountForSilver: 0,
    volumeToSilver: 0,
    discountForBronze: 0,
    volumeToBronze: 0,
    discountForGold: 0,
    volumeToGold: 0,
    promoTitle: '',
  }
}

onMounted(()=>{
  marketingStore.getSpecialPromos()
})

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

//Staff ####################
const isConfirmDialogVisible = ref(false)
const removePromoId = ref(null)

function doConfirm(value){
  if(value){
    marketingStore.removeSpecialPromo(removePromoId.value)
  }
}
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard title="PROMO SPECIALS">
          <VDivider class="mx-4" />
          <VCardText class="mt-2">
            <VRow class="mb-4">
              <VCol
                cols="6"
                class="px-4"
              >
                <VRow class="mb-4 px-4">
                  <h4>TITLE</h4>
                </VRow>
                <!--
                  <VRow class="my-4 px-4">
                  <VTextField
                  label="MILITARY DISCOUNT"
                  class="me-4"
                  variant="underlined"
                  />
                  </VRow>
                  <VRow class="mt-4 px-4">
                  <VTextField
                  label="STUDENT DISCOUNT"
                  class="me-4"
                  variant="underlined"
                  />
                  </VRow>
                
                  <VRow
                  v-for="(item, index) in marketingStore.specialPromos"
                  :key="index"
                  class="mt-4 px-4"
                  >
                  <VTextField
                  v-model="item.promoTitle"
                  class="me-4"
                  variant="underlined"
                  />
                  </VRow>
                -->
                <VRow class="mt-4 px-4">
                  <VList
                    density="compact"
                    class="w-100 mx-4"
                  >
                    <VListItem
                      v-for="(item, index) in marketingStore.specialPromos"
                      :key="index"
                      :value="index"
                      
                      @click="handleItemClick(index)"
                    >
                      <div class="d-flex justify-space-between align-center w-100">
                        <VListItemTitle>
                          {{ item.promoTitle.toUpperCase() }}
                        </VListItemTitle>
                        <VBtn
                          icon
                          variant="text"
                          color="default"
                          size="x-small" 
                          @click="isConfirmDialogVisible = true; removePromoId = item.id;"
                        >
                          <VIcon
                            icon="tabler-trash"
                            :size="22"
                          />
                        </VBtn>
                      </div>
                    </VListItem> 
                    <VDivider class="mx-4" />  
                    <VListItem                      
                      :key="-1"
                      :value="-1"
                      @click="handleItemClick(-1)"
                    >
                      <VBtn>+ ADD NEW PROMO</VBtn>
                    </VListItem>
                  </VList>
                </VRow>
              </VCol>

              <VCol cols="6">
                <VRow class="mb-4 px-4">
                  <h4>REWARD PROGRAM</h4>
                </VRow>
                <VForm
                  ref="refVForm"
                  @submit.prevent="saveForm"
                >
                  <VRow class="mb-4 px-4"> 
                    <VCol
                      cols="10"
                      class="d-flex align-center"
                    >
                      <label class="me-4">DISCOUNT TO JOIN %:</label>
                      <VTextField
                        v-model="form.discountJoin"
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
                      <label class="me-4">DISCOUNT % OFF FOR SILVER:</label>
                      <VTextField
                        v-model="form.discountForSilver"
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
                      <label class="me-4">$ VOLUME TO ACHIEVE SILVER:</label>
                      <VTextField
                        v-model="form.volumeToSilver"
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
                      <label class="me-4">DISCOUNT % OFF FOR BRONZE:</label>
                      <VTextField
                        v-model="form.discountForBronze"
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
                      <label class="me-4">$ VOLUME TO ACHIEVE BRONZE:</label>
                      <VTextField
                        v-model="form.volumeToBronze"
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
                      <label class="me-4">DISCOUNT % OFF FOR GOLD:</label>
                      <VTextField
                        v-model="form.discountForGold"
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
                      <label class="me-4">$ VOLUME TO ACHIEVE GOLD:</label>
                      <VTextField
                        v-model="form.volumeToGold"
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
                      <VTextField
                        v-model="form.promoTitle"
                        :rules="[requiredValidator]"
                        class="default"
                        placeholder="Promo Title"
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
                </VForm>
              </VCol>
            </VRow>
            <ConfirmDialog
              v-model:isDialogVisible="isConfirmDialogVisible"
              confirmation-msg="Are you sure to delete this promo?"
              @confirm="doConfirm"
            />
          </VCardText>            
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>
