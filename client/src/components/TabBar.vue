<script setup>
/**
 * 底部 Tab 导航
 * 首页 / 食谱 / 记录 / 我的，四个页面互相切换
 */
import { useRoute } from 'vue-router';
import AppIcon from './AppIcon.vue';

const route = useRoute();

const tabs = [
  { label: '首页', icon: 'home', to: '/' },
  { label: '食谱', icon: 'chef', to: '/recipes' },
  { label: '记录', icon: 'record', to: '/record' },
  { label: '我的', icon: 'user', to: '/profile' },
];

// 详情页、收藏页也归属到对应的 Tab 高亮
const isActive = (to) => {
  if (to === '/') return route.name === 'home';
  if (to === '/recipes') return ['recipes', 'recipe-detail'].includes(route.name);
  if (to === '/record') return route.name === 'record';
  if (to === '/profile') return ['profile', 'favorites'].includes(route.name);
  return route.path === to;
};
</script>

<template>
  <nav
    class="fixed bottom-0 left-1/2 z-40 w-full max-w-[375px] -translate-x-1/2 border-t border-[#EDF3E8] bg-white/95 backdrop-blur"
    style="padding-bottom: env(safe-area-inset-bottom)"
  >
    <div class="grid h-[62px] grid-cols-4">
      <router-link
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="relative flex flex-col items-center justify-center gap-[3px] text-[11px] transition-colors"
        :class="isActive(tab.to) ? 'font-semibold text-primary-700' : 'text-[#9AA79A]'"
      >
        <AppIcon :name="tab.icon" :size="23" />
        <span>{{ tab.label }}</span>
        <span
          v-if="isActive(tab.to)"
          class="absolute bottom-[5px] h-1 w-1 rounded-full bg-primary-600"
        />
      </router-link>
    </div>
  </nav>
</template>
