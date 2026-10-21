<script setup>
/**
 * ECharts 通用容器
 * 页面只需要传入 option，组件负责初始化、响应式和销毁
 */
import * as echarts from 'echarts';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '150px' },
});

const el = ref(null);
let chart = null;
let observer = null;

const render = () => {
  if (!chart) return;
  // notMerge = true，避免切换日期时旧数据残留
  chart.setOption(props.option, true);
};

onMounted(async () => {
  await nextTick();
  chart = echarts.init(el.value);
  render();
  observer = new ResizeObserver(() => chart && chart.resize());
  observer.observe(el.value);
});

watch(() => props.option, render, { deep: true });

onBeforeUnmount(() => {
  if (observer) observer.disconnect();
  if (chart) chart.dispose();
  chart = null;
});
</script>

<template>
  <div ref="el" :style="{ height, width: '100%' }" />
</template>
