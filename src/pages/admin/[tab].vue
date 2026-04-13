<script setup>

import Banking from '@/views/pages/admin/banking.vue';
import Business from '@/views/pages/admin/business.vue';
import CmsCategories from '@/views/pages/admin/cms/categories.vue';
import CmsProducts from '@/views/pages/admin/cms/products.vue';
import Export from '@/views/pages/admin/export.vue';
import Inventory from '@/views/pages/admin/inventory.vue';
import Notes from '@/views/pages/admin/notes.vue';
import Signature from '@/views/pages/admin/notes/signature.vue';
import Payments from '@/views/pages/admin/payments.vue';
import Payroll from '@/views/pages/admin/payroll.vue';
import Report from '@/views/pages/admin/report.vue';
import Schedule from '@/views/pages/admin/schedule.vue';
import Staffing from '@/views/pages/admin/staffing.vue';
import { useRoute } from 'vue-router';

const route = useRoute()
const activeTab = ref(route.params.tab)

// tabs
const tabs = [
  {
    title: 'STAFFING',
    icon: 'tabler-vip',
    tab: 'staffing',
  },
  {
    title: 'STAFF SCHEDULE',
    icon: 'tabler-stack-back',
    tab: 'schedule',
  },  
  {
    title: 'PAYROLL',
    icon: 'tabler-map-dollar',
    tab: 'payroll',
  },    
  {
    title: 'PAYMENTS / SUBSCRIPTIONS',
    icon: 'tabler-credit-card',
    tab: 'payments',
  },
  {
    title: 'INVENTORY',
    icon: 'tabler-basket',
    tab: 'inventory',
  },    
  {
    title: 'REPORT',
    icon: 'tabler-report',
    tab: 'report',
  },
  {
    title: 'NOTES',
    icon: 'tabler-accessible',
    tab: 'notes',
  },
  {
    title: 'BANKING',
    icon: 'tabler-moneybag',
    tab: 'banking',
  },
  {
    title: 'BUSINESS',
    icon: 'tabler-clock',
    tab: 'business',
  },
  {
    title: 'CMS CATEGORIES',
    icon: 'tabler-category',
    tab: 'cms-categories',
  },
  {
    title: 'CMS PRODUCTS',
    icon: 'tabler-pill',
    tab: 'cms-products',
  },
  {
    title: 'EXPORT',
    icon: 'tabler-file-export',
    tab: 'export',
  },
  {
    title: 'SIGNATURE',
    icon: 'tabler-writing',
    tab: 'signature',
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
        :to="{ name: 'admin-tab', params: { tab: item.tab } }"
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
      <!-- staffing -->
      <VWindowItem value="staffing">
        <Staffing />
      </VWindowItem>

      <!-- schedule -->
      <VWindowItem value="schedule">
        <Schedule />
      </VWindowItem>      

      <!-- payroll -->
      <VWindowItem value="payroll">
        <Payroll />
      </VWindowItem>      

      <!-- payments -->
      <VWindowItem value="payments">
        <Payments />
      </VWindowItem>      

      <!-- inventory -->
      <VWindowItem value="inventory">
        <Inventory />
      </VWindowItem>      

      <!-- report -->
      <VWindowItem value="report">
        <Report />
      </VWindowItem>      
            <!-- notes -->
      <VWindowItem value="notes">
        <Notes />
      </VWindowItem>    
      <!-- banking -->
      <VWindowItem value="banking">
        <Banking />
      </VWindowItem>   
      
      <!-- Business -->
      <VWindowItem value="business">
        <Business />
      </VWindowItem>   
      <!-- CMS Categories -->
      <VWindowItem value="cms-categories">
        <CmsCategories />
      </VWindowItem>
      <!-- CMS Products -->
      <VWindowItem value="cms-products">
        <CmsProducts />
      </VWindowItem>
      <!-- report -->
      <VWindowItem value="export">
        <Export />
      </VWindowItem>   

      <!-- Signature -->
      <VWindowItem value="signature">
        <Signature />
      </VWindowItem>   
    </VWindow>
  </div>
</template>

<route lang="yaml">
meta: 
navActiveLink: admin-tab
</route>
