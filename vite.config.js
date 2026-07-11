import { fileURLToPath } from 'url'
import { inspect } from 'node:util'
import VueI18n from '@intlify/vite-plugin-vue-i18n'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import DefineOptions from 'unplugin-vue-define-options/vite'
import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'
import Layouts from 'vite-plugin-vue-layouts'
import vuetify from 'vite-plugin-vuetify'

const devLoggerPlugin = {
  name: 'dev-logger-plugin',
  configureServer(server) {
    server.ws.on('custom:debug-log', data => {
      const timestamp = new Date().toISOString()
      const payload = data?.payload ?? ''

      const payloadText = typeof payload === 'string'
        ? payload
        : inspect(payload, {
          depth: null,
          colors: false,
          compact: false,
          maxArrayLength: null,
          maxStringLength: null,
        })

      console.log(`【${timestamp}】[DEV LOG] ${data?.message || ''}\n${payloadText}`)
    })
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    devLoggerPlugin,
    vue(),
    vueJsx(),

    // https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin
    vuetify({
      styles: {
        configFile: 'src/styles/variables/_vuetify.scss',
      },
    }),
    Pages({
      dirs: ['./src/pages'],

      // We need three routes using single routes so we will ignore generating route for this SFC file
      onRoutesGenerated: routes => {
        const mapped = routes.map(r => {
          if (r.path === '/site' || r.path.startsWith('/site/')) {
            return {
              ...r,
              path: r.path === '/site' ? '/' : r.path.replace(/^\/site/, ''),
              meta: Object.assign({}, r.meta || {}, { public: true }),
            }
          }
          
          return r
        })

        const manualDrNetworkRoutes = [
          {
            path: '/admin/dr-networks/:networkId/finance',
            name: 'admin-dr-network-finance',
            component: '/src/pages/admin/dr-networks/[networkId]/finance.vue',
          },
          {
            path: '/admin/dr-networks/:networkId/cases',
            name: 'admin-dr-network-cases',
            component: '/src/pages/admin/dr-networks/[networkId]/cases/index.vue',
          },
          {
            path: '/admin/dr-networks/:networkId/cases/:orderId',
            name: 'admin-dr-network-case-detail',
            component: '/src/pages/admin/dr-networks/[networkId]/cases/[orderId].vue',
          },
          {
            path: '/admin/dr-networks/:networkId/flows/:flowId/steps',
            name: 'admin-dr-network-flow-steps',
            component: '/src/pages/admin/dr-networks/[networkId]/flows/[flowId]/steps.vue',
          },
          {
            path: '/admin/dr-networks/:networkId/flows/:flowId/defaults',
            name: 'admin-dr-network-flow-defaults',
            component: '/src/pages/admin/dr-networks/[networkId]/flows/[flowId]/defaults.vue',
          },
          {
            path: '/admin/dr-networks/:networkId/products/:productId/flows/:flowId',
            name: 'admin-dr-network-product-flow',
            component: '/src/pages/admin/dr-networks/[networkId]/products/[productId]/flows/[flowId].vue',
          },
          {
            path: '/admin/dr-networks/:networkId/question-sets/:setId',
            name: 'admin-dr-network-question-set',
            component: '/src/pages/admin/dr-networks/[networkId]/question-sets/[setId].vue',
          },
        ]

        const manualDrNetworkPaths = new Set(manualDrNetworkRoutes.map(route => route.path))
        const generatedWithoutManualDrNetworkRoutes = mapped.filter(route => !manualDrNetworkPaths.has(route.path))

        const prioritized = generatedWithoutManualDrNetworkRoutes
          .map((route, index) => ({ route, index }))
          .sort((a, b) => {
            const aDrNetwork = a.route.path === '/admin/dr-networks' || a.route.path.startsWith('/admin/dr-networks/')
            const bDrNetwork = b.route.path === '/admin/dr-networks' || b.route.path.startsWith('/admin/dr-networks/')

            if (aDrNetwork !== bDrNetwork)
              return aDrNetwork ? -1 : 1

            if (aDrNetwork && bDrNetwork)
              return b.route.path.length - a.route.path.length

            return a.index - b.index
          })
          .map(({ route }) => route)

        return [
          {
            path: '/apps/email/:filter',
            name: 'apps-email-filter',
            component: '/src/pages/apps/email/index.vue',
            meta: {
              navActiveLink: 'apps-email',
              layoutWrapperClasses: 'layout-content-height-fixed',
            },
          },
          {
            path: '/apps/email/label/:label',
            name: 'apps-email-label',
            component: '/src/pages/apps/email/index.vue',
            meta: {
              navActiveLink: 'apps-email',
              layoutWrapperClasses: 'layout-content-height-fixed',
            },
          },
          ...manualDrNetworkRoutes,
          ...prioritized,
        ]
      },
    }),
    Layouts({
      layoutsDirs: './src/layouts/',
    }),
    Components({
      dirs: ['src/@core/components', 'src/views/demos'],
      dts: true,
    }),
    AutoImport({
      eslintrc: {
        enabled: true,
        filepath: './.eslintrc-auto-import.json',
      },
      imports: ['vue', 'vue-router', '@vueuse/core', '@vueuse/math', 'vue-i18n', 'pinia'],
      vueTemplate: true,
    }),
    VueI18n({
      runtimeOnly: true,
      compositionOnly: true,
      include: [
        fileURLToPath(new URL('./src/plugins/i18n/locales/**', import.meta.url)),
      ],
    }),
    DefineOptions(),
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@themeConfig': fileURLToPath(new URL('./themeConfig.js', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/@core', import.meta.url)),
      '@layouts': fileURLToPath(new URL('./src/@layouts', import.meta.url)),
      '@images': fileURLToPath(new URL('./src/assets/images/', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/styles/', import.meta.url)),
      '@configured-variables': fileURLToPath(new URL('./src/styles/variables/_template.scss', import.meta.url)),
      '@axios': fileURLToPath(new URL('./src/plugins/axios', import.meta.url)),
      '@validators': fileURLToPath(new URL('./src/@core/utils/validators', import.meta.url)),
      'apexcharts': fileURLToPath(new URL('node_modules/apexcharts-clevision', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  optimizeDeps: {
    exclude: ['vuetify'],
    entries: [
      './src/**/*.vue',
    ],
  },
})
