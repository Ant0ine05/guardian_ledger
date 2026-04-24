import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// ── Navigation guard : protège le dashboard ──────────────────────────────────
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('app_token')) {
    return { name: 'login' }
  }
  // Si déjà connecté, pas besoin d'afficher la page login
  if (to.name === 'login' && localStorage.getItem('app_token')) {
    return { name: 'dashboard' }
  }
})

export default router
