import { createRouter, createWebHistory } from 'vue-router';
import TodayPage from '../TodayPage.vue';
import RecordPage from '../RecordPage.vue';
import PreviewPage from '../PreviewPage.vue';
import MePage from '../MePage.vue';
import ProtocolPage from '../ProtocolPage.vue';
import WaterPage from '../WaterPage.vue';
import LegacyPage from '../App.vue';

const routes = [
  {
    path: '/',
    component: TodayPage,
    name: 'Today',
    meta: { title: '今日概览' }
  },
  {
    path: '/record',
    component: RecordPage,
    name: 'Record',
    meta: { title: '记录' }
  },
  {
    path: '/preview',
    component: PreviewPage,
    name: 'Preview',
    meta: { title: '趋势' }
  },
  {
    path: '/me',
    component: MePage,
    name: 'Me',
    meta: { title: '我的' }
  },
  {
    path: '/protocol',
    component: ProtocolPage,
    name: 'Protocol',
    meta: { title: '我的治疗方案' }
  },
  {
    path: '/water',
    component: WaterPage,
    name: 'Water',
    meta: { title: '喝水记录' }
  },
  {
    path: '/manage',
    component: LegacyPage,
    name: 'Manage',
    meta: { title: '数据维护' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, left: 0 };
  }
});

// 全局导航守卫，设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '腹透记录';
  next();
});

export default router;
