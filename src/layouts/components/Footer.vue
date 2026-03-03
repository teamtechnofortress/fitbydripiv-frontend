<script setup>
const userData = JSON.parse(localStorage.getItem('userData') || 'null');
</script>
<template>
  <div class="h-100 d-flex align-center justify-space-between">    
    <span class="d-flex align-center">
      &copy; CopyRight {{ new Date().getFullYear() }} All rights reserved worldwide
    </span>
    
    <span v-if="userData?.role" class="d-md-flex gap-x-4 text-primary d-none">
      @ {{ `${userData.role.toUpperCase()} - ${userData.firstName} ${userData.middleName || ''} ${userData.lastName}` }} ( 1.0.0 + 2 )
    </span>
  </div>
</template>
