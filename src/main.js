/* eslint-disable import/order */
import '@/@iconify/icons-bundle'
import App from '@/App.vue'
import ability from '@/plugins/casl/ability'
import layoutsPlugin from '@/plugins/layouts'
import vuetify from '@/plugins/vuetify'
import { loadFonts } from '@/plugins/webfontloader'
import router from '@/router'
import { abilitiesPlugin } from '@casl/vue'
import '@core/scss/template/index.scss'
import '@styles/styles.scss'
import 'nprogress/nprogress.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import VSelect from 'vue-select'
import 'vue-select/dist/vue-select.css'
import Toast from "vue-toastification"
import "vue-toastification/dist/index.css"

loadFonts()


// Create vue app
const app = createApp(App)


// Use plugins
app.use(vuetify)
app.use(createPinia())
app.use(router)
app.use(layoutsPlugin)
app.use(abilitiesPlugin, ability, {
  useGlobalProperties: true,
})
app.use(Toast);
app.component('v-select', VSelect);

// Mount vue app
app.mount('#app')
