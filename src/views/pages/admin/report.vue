<script setup>
import AppointmentReport from "@/views/pages/admin/reports/appointment-report.vue"
import ChartHistory from "@/views/pages/admin/reports/chart-history.vue"
import CustomerService from "@/views/pages/admin/reports/customer-service.vue"
import EmailTextRewardReport from "@/views/pages/admin/reports/email-text-reward-report.vue"
import InvoicingSalesReport from "@/views/pages/admin/reports/invoicing-sales-report.vue"
import MedRxReport from "@/views/pages/admin/reports/medrx-report.vue"
import PatientMetrics from "@/views/pages/admin/reports/patient-metrics.vue"
import PayrollReport from "@/views/pages/admin/reports/payroll-report.vue"
import ProductMetrics from "@/views/pages/admin/reports/product-metrics.vue"
import RewardReport from "@/views/pages/admin/reports/reward-report.vue"
import StaffReport from "@/views/pages/admin/reports/staff-report.vue"

//
const currentTab = ref(0)
</script>

<template>
  <section>
    <VTabs
      v-model="currentTab"
      class="v-tabs-pill"
    >
      <VTab>CHART HISTORY</VTab>
      <VTab>CUSTOMER SERVICE</VTab>
      <VTab>PATIENT METRICS</VTab>
      <VTab>PRODUCT METRICS</VTab>
      <VTab>APPOINTMENT REPORT</VTab>
      <VTab>REWARD REPORT</VTab>
      <VTab>EMAIL/TEXT REWARD REPORT</VTab>
      <VTab>INVOICING SALES REPORT</VTab>
      <VTab>STAFF REPORT</VTab>
      <VTab>PAYROLL REPORT</VTab>
      <VTab>MED/RX REPORT</VTab>
    </VTabs>
    <VCard class="mt-5">
      <VCardText>
        <VWindow v-model="currentTab">
          <VWindowItem>                    
            <ChartHistory />
          </VWindowItem>
          <VWindowItem>
            <CustomerService />
          </VWindowItem>
          <VWindowItem>
            <PatientMetrics />
          </VWindowItem>
          <VWindowItem>
            <ProductMetrics />
          </VWindowItem>
          <VWindowItem>
            <AppointmentReport />
          </VWindowItem>
          <VWindowItem>
            <RewardReport />
          </VWindowItem>
          <VWindowItem>
            <EmailTextRewardReport />
          </VWindowItem>
          <VWindowItem>
            <InvoicingSalesReport />
          </VWindowItem>
          <VWindowItem>
            <StaffReport />
          </VWindowItem>
          <VWindowItem>
            <PayrollReport />
          </VWindowItem>
          <VWindowItem>
            <MedRxReport />
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>
  </section>
</template>