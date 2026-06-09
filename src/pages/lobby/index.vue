<script setup>
import LobbyMeasures from '@/views/lobby/LobbyMeasures.vue'
import PatientQueTable from '@/views/lobby/PatientQue.vue'
import ScheduleList from '@/views/lobby/ScheduleList.vue'
</script>

<template>
  <VRow class="match-height">
    <VCol
      cols="12"
      lg="4"
      md="4"
      sm="4"
    >
      <LobbyMeasures />
    </VCol>
    
    <VCol
      cols="12"
      lg="8"
      md="8"
      sm="8"
    >
      <PatientQueTable />
    </VCol>

    <VCol
      cols="12"
      lg="12"
      md="12"
      sm="12"
    >
      <ScheduleList />
    </VCol>       
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart.scss";
</style>
