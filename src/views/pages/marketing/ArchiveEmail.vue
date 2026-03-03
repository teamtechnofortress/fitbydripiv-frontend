<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: Boolean,
})

const emit = defineEmits(['update:show', 'load-campaign'])
const showInternal = ref(props.show)
const campaigns = ref([])

watch(() => props.show, val => {
  showInternal.value = val
  if (val) {
    campaigns.value = JSON.parse(localStorage.getItem('emailArchive') || '[]')
  }
})

watch(showInternal, val => {
  emit('update:show', val)
})

function selectCampaign(campaign) {
  emit('load-campaign', campaign)
  emit('update:show', false)
}

function close() {
  showInternal.value = false
}
</script>

<template>
  <VDialog
    v-model="showInternal"
    max-width="600"
  >
    <VCard>
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h6">Archived Campaigns</span>
        <VBtn
          icon
          @click="close"
        >
          <VIcon>mdi-close</VIcon>
        </VBtn>
      </VCardTitle>

      <VCardText>
        <VList>
          <VListItem
            v-for="(campaign, index) in campaigns"
            :key="index"
            class="hover:bg-grey-lighten-3"
            @click="selectCampaign(campaign)"
          >
            <VListItemTitle>
              {{ new Date(campaign.date).toLocaleString() }}
            </VListItemTitle>
            <VListItemSubtitle>
              {{ campaign.content.slice(0, 60) }}...
            </VListItemSubtitle>
          </VListItem>
        </VList>
      </VCardText>
    </VCard>
  </VDialog>
</template>
