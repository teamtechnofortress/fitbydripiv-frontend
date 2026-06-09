<script setup>
import AssessmentNotes from './notes/assessment-notes.vue'
import ObjectiveNotes from './notes/objective-notes.vue'
import PlanNotes from './notes/plan-notes.vue'
import ProcedurePlanNotes from './notes/procedure-plan-notes.vue'
import RiskBenefitRewardNotes from './notes/risk-benefit-reward-notes.vue'
import SubjectiveNotes from './notes/subjective-notes.vue'

const currentTab = ref(0)
</script>

<template>
  <VTabs
    v-model="currentTab"
    class="v-tabs-pill"
  >
    <VTab>Subjective Notes</VTab>
    <VTab>OBJECTIVE NOTES</VTab>    
    <VTab>ASSESSMENT NOTES</VTab>    
    <VTab>PLAN NOTES</VTab>    
    <VTab>PROCEDURE PLAN NOTES</VTab>    
    <VTab>RISK, BENEFITS, ALTERNATIVES </VTab>    
  </VTabs>

  <VCard class="mt-5">
    <VCardText>
      <VWindow v-model="currentTab">
        <VWindowItem>
          <SubjectiveNotes />
        </VWindowItem>

        <VWindowItem>
          <ObjectiveNotes />
        </VWindowItem>        

        <VWindowItem>
          <AssessmentNotes />
        </VWindowItem>        

        <VWindowItem>
          <PlanNotes />
        </VWindowItem>

        <VWindowItem>
          <ProcedurePlanNotes />
        </VWindowItem>        

        <VWindowItem>
          <RiskBenefitRewardNotes />
        </VWindowItem>
      </VWindow>
    </VCardText>
  </VCard>
</template>