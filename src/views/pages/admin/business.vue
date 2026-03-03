<script setup>
import BusinessHours from './business/business-hours.vue';
import InstructionManage from './business/instruction-manage.vue';
import LogoManage from './business/logo-manage.vue';
const currentTab = ref(0)
</script>

<template>
  <VTabs
    v-model="currentTab"
    class="v-tabs-pill"
  >
    <VTab>BUSINESS AREA</VTab>
    <VTab>LOGO</VTab>    
    <VTab>INSTRUCTIONS</VTab>
  </VTabs>

  <VCard class="mt-5">
    <VCardText>
      <VWindow v-model="currentTab">
        <VWindowItem>
          <BusinessHours />
        </VWindowItem>

        <VWindowItem>
          <LogoManage />
        </VWindowItem>

        <VWindowItem>
          <InstructionManage />
        </VWindowItem>
      </VWindow>
    </VCardText>
  </VCard>
</template>