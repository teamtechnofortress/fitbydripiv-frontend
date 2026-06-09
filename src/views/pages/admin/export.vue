<template>
  <div>
    <!-- Export CSV Dialog -->
    <VCard
      height="300"
      class="justify-center"
    >
      <VCardTitle class="text-center mt-8">
        Export Data to CSV
      </VCardTitle>
      <VCardText class="justify-center mx-8 me-8 mt-4">
        <VTextField
          v-model="filename"
          label="Filename"
          prepend-icon="mdi-file"
          :rules="[v => !!v || 'Filename is required']"
          placeholder="example.csv"
          clearable
        />
      </VCardText>
      <VCardActions class="justify-center mt-8">
        <VBtn
          color="primary"
          variant="flat"
          width="200"
          @click="exportCSV"
        >
          Export
        </VBtn>
      </VCardActions>
    </VCard>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const filename = ref('data.csv')

// Dummy data for export (replace with your actual data)
const csvData = [
  ['Name', 'Email', 'Age'],
  ['Alice', 'alice@example.com', 30],
  ['Bob', 'bob@example.com', 25],
]

const exportCSV = () => {
  if (!filename.value) return

  const csvContent = csvData.map(e => e.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  link.href = URL.createObjectURL(blob)
  link.setAttribute('download', filename.value)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>