<script setup>
import Emailing from '@/views/pages/marketing/emailing.vue'
import Special from '@/views/pages/marketing/special.vue'
import Texting from '@/views/pages/marketing/texting.vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeTab = ref(route.params.tab)

// tabs
const tabs = [
  {
    title: 'TEXTING CAMPAIGN',
    icon: 'tabler-ad',
    tab: 'texting',
  },
  {
    title: 'EMAIL CAMPAIGN',
    icon: 'tabler-mail',
    tab: 'emailing',
  },
  {
    title: 'SPECIAL PROMO',
    icon: 'tabler-pencil-star',
    tab: 'special',
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
        :to="{ name: 'marketing-tab', params: { tab: item.tab } }"
      >
        <VIcon
          size="20"
          start
          :icon="item.icon"
        />
        {{ item.title }}
      </VTab>
    </VTabs>

    <VWindow
      v-model="activeTab"
      class="mt-6 disable-tab-transition"
      :touch="false"
    >
      <!-- texting -->
      <VWindowItem value="texting">
        <Texting />
      </VWindowItem>

      <!-- emailing -->
      <VWindowItem value="emailing">
        <Emailing />
      </VWindowItem>

      <!-- special -->
      <VWindowItem value="special">
        <Special />
      </VWindowItem>
    </VWindow>
  </div>
</template>

<route lang="yaml">
meta: 
navActiveLink: marketing-tab
</route>
