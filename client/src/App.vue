<script setup>
import TabBar from './components/TabBar.vue';
import Toast from './components/Toast.vue';
</script>

<template>
  <div class="app-shell">
    <!-- 页面内容由路由渲染 -->
    <router-view />

    <!-- 底部 Tab 导航：首页 / 食谱 / 记录 / 我的 -->
    <TabBar />

    <!-- 全局轻提示 -->
    <Toast />
  </div>
</template>
