<script setup>
import admin from '@/navigation/horizontal/admin'
import appointments from '@/navigation/horizontal/appointments'
import lobby from '@/navigation/horizontal/lobby'
import marketing from '@/navigation/horizontal/marketing'
import patientChart from '@/navigation/horizontal/patient-chart'
import patientEncounter from '@/navigation/horizontal/patient-encounter'
import navItems from '@/navigation/vertical'
import { useThemeConfig } from '@core/composable/useThemeConfig'
import { themeConfig } from '@themeConfig'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import { isUserLoggedIn } from '@/router/utils'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'

// @layouts plugin
import { VerticalNavLayout } from '@layouts'

const { appRouteTransition, isLessThanOverlayNavBreakpoint } = useThemeConfig()
const { width: windowWidth } = useWindowSize()

// Create a ref to store the current time
const currentTime = ref('')

let intervalId
const navDrawItems = ref(navItems)

// Format function: hh:mm (24-hour)
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${hours}:${minutes}`
}


// Update the time every second
const updateTime = () => {
  currentTime.value = formatTime(new Date())
}

const cleanNavs = () => {
  const UserData = JSON.parse(localStorage.getItem('userData') || '{}');
  if(UserData?.role != 'admin'){    
    navDrawItems.value = [...lobby, ...patientChart, ...patientEncounter, ...appointments, ...marketing];
  }else{
    navDrawItems.value = [...lobby, ...patientChart, ...patientEncounter, ...appointments, ...marketing, ...admin];
  }  
}

onMounted(() => {
  updateTime()
  intervalId = setInterval(updateTime, 1000);

  setTimeout(() => {
    cleanNavs();
  }, 500);
})

onUnmounted(() => {
  clearInterval(intervalId)
})
</script>

<template>
  <VerticalNavLayout
    :nav-items="navDrawItems"
  >
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <VBtn
          v-if="isLessThanOverlayNavBreakpoint(windowWidth)"
          icon
          variant="text"
          color="default"
          class="ms-n3"
          size="small"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon
            icon="tabler-menu-2"
            size="24"
          />
        </VBtn>
        
        <VSpacer />

        <RouterLink
          to="/"
          class="app-logo d-flex align-center gap-x-3 navbar-brand-center"
        >
          <VNodeRenderer :nodes="themeConfig.app.logo" />

          <h1 class="app-title font-weight-bold leading-normal text-xl">
            {{ themeConfig.app.title }}
          </h1>
        </RouterLink>

        <VSpacer />

        <!-- ############################ Logged In ################################################### -->
        <label
          v-if="isUserLoggedIn()"
          class="me-4"
        >{{ currentTime }}</label>      
        
        <NavbarThemeSwitcher
          v-if="isUserLoggedIn()"
          class="me-4"
        />
        
        <UserProfile v-if="isUserLoggedIn()" />

        <!-- ############################ Intake ################################################### --> 
        <div
          v-if="$route.name.includes('intake')"
          class="flex-grow-1 d-flex justify-space-between align-center"
        >
          <h2 class="fw-bold">
            PATIENT Intake
          </h2>
        </div>
      </div>
    </template>

    <!-- 👉 Pages -->
    <RouterView v-slot="{ Component }">
      <Transition
        :name="appRouteTransition"
        mode="out-in"
      >
        <Component :is="Component" />
      </Transition>
    </RouterView>

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 TheSettings -->
    <TheSettings v-if="$route.name.includes('intake') == false" />
  </VerticalNavLayout>
</template>

<style scoped>
.navbar-brand-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
</style>
