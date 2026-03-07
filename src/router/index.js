import { canNavigate } from '@/@layouts/plugins/casl';
import EmailVerification from '@/views/EmailVerification.vue';
import NProgress from 'nprogress';
import { setupLayouts } from 'virtual:generated-layouts';
import { createRouter, createWebHistory } from 'vue-router';
import routes from '~pages';
import { isUserLoggedIn } from './utils';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/pages/user-profile',
      redirect: () => ({ name: 'pages-user-profile-tab', params: { tab: 'profile' } }),
    },
    {
      path: '/pages/account-settings',
      redirect: () => ({ name: 'pages-account-settings-tab', params: { tab: 'account' } }),
    },    
    {
      path: '/email-verify',
      name: 'EmailVerification',
      component: EmailVerification,
      meta: { public: true },
    },
    ...setupLayouts(routes),
  ],
})

router.beforeEach((to, from) => {
  if(to.path){
    NProgress.start();
    NProgress.set(0.1);
  }

  const isPublicRoute = to.meta?.public
    || to.path === '/otp'
    || (to.name && String(to.name).startsWith('site'))
  if (isPublicRoute) {
    return;
  }

  const isLoggedIn = isUserLoggedIn();  
  if (canNavigate(to)) {
    if (to.meta.redirectIfLoggedIn && isLoggedIn)
      return { name: 'lobby' }
  }
  else {
    if (isLoggedIn)
      return { name: 'not-authorized' }
    else{
      if(to.name && to.name.includes('intake') == false){
        return { name: 'login', query: { to: to.name !== 'index' ? to.fullPath : undefined } }
      }
    }
  }

});

router.afterEach(() => {  
  NProgress.done();
});

export default router
