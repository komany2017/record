import { createRouter, createWebHistory } from 'vue-router';
import RootApp from '../RootApp.vue';
import Home from '../App.vue';

const routes = [
  {
    path: '/',
    component: RootApp,
    children: [
      {
        path: '',
        component: Home,
        name: 'Home',
        meta: { title: '数据录入' }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 全局导航守卫，设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '治疗记录系统';
  next();
});

export default router;