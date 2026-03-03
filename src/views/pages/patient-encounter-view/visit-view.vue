<script setup>
import { ref } from 'vue';
import Assessment from './today-visit/Assessment.vue';
import Objective from './today-visit/Objective.vue';
import Plan from './today-visit/Plan.vue';
import ProcedureNotes from './today-visit/ProcedureNotes.vue';
import Subjective from './today-visit/Subjective.vue';
const currentTab = ref(0);
const pId = ref(0);

function goToNextTab(value) {  
  pId.value = value;
  if (currentTab.value < 4) currentTab.value += 1;
}
</script>

<template>
  <VTabs
    v-model="currentTab"
    class="v-tabs-pill"
  >
    <VTab>SUBJECTIVE</VTab>
    <VTab>OBJECTIVE</VTab>
    <VTab>ASSESSMENT</VTab>
    <VTab>PLAN</VTab>
    <VTab>PROCEDURE NOTES</VTab>
  </VTabs>

  <VCard class="mt-5">
    <VCardText>
      <VWindow v-model="currentTab">

        <VWindowItem>
          <Subjective @next-tab="goToNextTab"/>
        </VWindowItem>       

        <VWindowItem>
          <Objective @next-tab="goToNextTab" :pid="pId"/>
        </VWindowItem>

        <VWindowItem>
          <Assessment @next-tab="goToNextTab" :pid="pId"/>
        </VWindowItem>
        
        <VWindowItem>
          <Plan @next-tab="goToNextTab" :pid="pId"/>
        </VWindowItem>
        
        <VWindowItem>
          <ProcedureNotes :pid="pId"/>
        </VWindowItem>

      </VWindow>
    </VCardText>
  </VCard>
</template>