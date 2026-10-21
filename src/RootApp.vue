<template>
  <div class="root-container">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <nav class="tab-bar">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="tab-item"
        :class="{ active: isActive(tab) }"
      >
        <span class="tab-icon" v-html="tab.icon"></span>
        <span class="tab-label">{{ tab.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script>
const ICONS = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  record: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16"/><path d="M6 15l4-5 3 3 5-6"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6"/></svg>'
};

export default {
  name: 'RootApp',
  data() {
    return {
      tabs: [
        { path: '/', label: '今日', icon: ICONS.today, match: ['/'] },
        { path: '/record', label: '记录', icon: ICONS.record, match: ['/record'] },
        { path: '/preview', label: '趋势', icon: ICONS.trend, match: ['/preview'] },
        { path: '/me', label: '我的', icon: ICONS.me, match: ['/me', '/water', '/manage', '/protocol'] }
      ]
    };
  },
  methods: {
    isActive(tab) {
      const path = this.$route.path;
      return tab.match.some(p => (p === '/' ? path === '/' : path.startsWith(p)));
    }
  }
};
</script>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f4f5f7;
  color: #1f2430;
  -webkit-tap-highlight-color: transparent;
}

* {
  box-sizing: border-box;
}

.root-container {
  min-height: 100vh;
  padding-bottom: calc(62px + env(safe-area-inset-bottom, 0px));
}

.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  background: #ffffff;
  border-top: 1px solid #eceef2;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 58px;
  color: #8b919c;
  text-decoration: none;
  font-size: 11px;
}

.tab-item.active {
  color: #4f7df3;
}

.tab-icon {
  width: 22px;
  height: 22px;
  display: block;
}

.tab-icon svg {
  width: 22px;
  height: 22px;
  display: block;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
