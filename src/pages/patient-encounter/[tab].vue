<script setup>
import Appointment from '@/views/pages/patient-encounter-view/appointment.vue';
import Encounter from '@/views/pages/patient-encounter-view/encounter.vue';
import Payment from '@/views/pages/patient-encounter-view/payment.vue';
import VisitView from '@/views/pages/patient-encounter-view/visit-view.vue';
import { useRoute } from 'vue-router';

const route = useRoute()
const activeTab = ref(route.params.tab)

// tabs
const tabs = [
  {
    title: 'ENCOUNTER',
    icon: 'tabler-contract',
    tab: 'encounter',
  },
  {
    title: 'TODAYS VISIT',
    icon: 'tabler-user-cog',
    tab: 'visit',
  }, 
  {
    title: 'PAYMENT',
    icon: 'tabler-receipt-dollar', 
    tab: 'payment',
  },
  {
    title: 'APPOINTMENT',
    icon: 'tabler-calendar-check',
    tab: 'appointment',
  },  
   
]
</script>

<template>
  <div>
    <VTabs
      v-model="activeTab"
      class="v-tabs-pill"
    >
      <VTab
        v-for="item in tabs"
        :key="item.icon"
        :value="item.tab"
        :to="{ name: 'patient-encounter-tab', params: { tab: item.tab } }"
      >
        <VIcon size="20" start :icon="item.icon"/>
        {{ item.title }}
      </VTab>
    </VTabs>

    <VWindow
      v-model="activeTab"
      class="mt-6 disable-tab-transition"
      :touch="false"
    >
      <!-- encounter -->
      <VWindowItem value="encounter">
        <Encounter />
      </VWindowItem>

      <!-- todays visit -->
      <VWindowItem value="visit">
        <VisitView />
      </VWindowItem>

      <!-- payment -->
      <VWindowItem value="payment">
        <Payment />
      </VWindowItem>

      <!-- appointment -->
      <VWindowItem value="appointment">
        <Appointment />
      </VWindowItem>
    </VWindow>
  </div>
</template>

<route lang="yaml">
meta: 
navActiveLink: patient-encounter-tab
</route>
