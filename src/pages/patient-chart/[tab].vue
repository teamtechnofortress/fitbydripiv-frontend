<script setup>
import ChartView from '@/views/pages/patient-chart-view/chart-view.vue';
import LocatePatient from '@/views/pages/patient-chart-view/locate-patient.vue';
import ReviewView from '@/views/pages/patient-chart-view/review-view.vue';
import { useRoute } from 'vue-router';

const route = useRoute()
const activeTab = ref(route.params.tab)

// tabs
const tabs = [  
  {
    title: 'CHART',
    icon: 'tabler-chart-pie',
    tab: 'chart',
  },
  {
    title: 'REVIEW',
    icon: 'tabler-eye-check',
    tab: 'review',
  },  
  {
    title: 'LOCATE PATIENT',
    icon: 'tabler-map-pin',
    tab: 'locate',
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
        :to="{ name: 'patient-chart-tab', params: { tab: item.tab } }"
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
      <!-- LOCATE -->
      <VWindowItem value="locate">
        <LocatePatient />
      </VWindowItem>

      <!-- Chart -->
      <VWindowItem value="chart">
        <ChartView />
      </VWindowItem>

      <!-- Review -->
      <VWindowItem value="review">
        <ReviewView />
      </VWindowItem>      
    </VWindow>
  </div>
</template>

<route lang="yaml">
meta:
  navActiveLink: patient-chart-tab
</route>
