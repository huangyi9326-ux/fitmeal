<script setup>
/**
 * 食谱页
 * 支持关键词搜索、餐次筛选，双列卡片展示，点击进入详情
 */
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppIcon from '../components/AppIcon.vue';
import RecipeCard from '../components/RecipeCard.vue';
import { recipeApi } from '../api';

const route = useRoute();
const router = useRouter();

const keyword = ref(String(route.query.keyword || ''));
const activeMeal = ref('all');
const recipes = ref([]);
const loading = ref(false);

const mealTabs = [
  { key: 'all', label: '全部' },
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' },
  { key: 'snack', label: '加餐' },
];

/** 加载食谱列表 */
const loadRecipes = async () => {
  loading.value = true;
  try {
    const result = await recipeApi.getList({
      keyword: keyword.value.trim(),
      mealType: activeMeal.value === 'all' ? '' : activeMeal.value,
    });
    recipes.value = result.list;
  } catch (error) {
    recipes.value = [];
  } finally {
    loading.value = false;
  }
};

const onSearch = () => {
  // 把关键词同步到地址栏，刷新后依然保留
  router.replace({ path: '/recipes', query: keyword.value ? { keyword: keyword.value } : {} });
  loadRecipes();
};

const selectMeal = (key) => {
  activeMeal.value = key;
  loadRecipes();
};

const resetFilter = () => {
  keyword.value = '';
  activeMeal.value = 'all';
  router.replace({ path: '/recipes' });
  loadRecipes();
};

// 从首页搜索框跳转过来时，同步关键词
watch(
  () => route.query.keyword,
  (value) => {
    const next = String(value || '');
    if (next !== keyword.value) {
      keyword.value = next;
      loadRecipes();
    }
  }
);

onMounted(loadRecipes);
</script>

<template>
  <div class="page">
    <!-- 顶部 -->
    <header class="hero-bg relative overflow-hidden px-4 pb-4 pt-6">
      <div class="relative z-10">
        <h1 class="text-[24px] font-bold leading-8 text-ink">食谱</h1>
        <p class="mt-0.5 text-[12px] text-[#7E8C79]">
          好好吃饭，遇见更好的自己
          <span class="ml-0.5 text-primary-400">♡</span>
        </p>
      </div>
      <div class="handwrite pointer-events-none absolute right-5 top-5 text-[10px]">
        低卡也可以<br />很好吃
      </div>

      <!-- 搜索 -->
      <form
        class="relative z-10 mt-4 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-3 shadow-card"
        @submit.prevent="onSearch"
      >
        <AppIcon name="search" :size="17" class="shrink-0 text-[#9AA79A]" />
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索食谱、食材或菜名..."
          class="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-[#A9B5A5]"
        />
        <button type="submit" class="shrink-0 text-[11px] font-medium text-primary-600">搜索</button>
      </form>
    </header>

    <!-- 餐次筛选 -->
    <div class="mt-3 flex gap-2 overflow-x-auto px-4 no-scrollbar">
      <button
        v-for="meal in mealTabs"
        :key="meal.key"
        type="button"
        class="shrink-0 rounded-full px-4 py-1.5 text-[12px] transition-colors"
        :class="
          activeMeal === meal.key
            ? 'bg-primary-600 font-semibold text-white shadow-soft'
            : 'bg-white text-[#67755F] shadow-card'
        "
        @click="selectMeal(meal.key)"
      >
        {{ meal.label }}
      </button>
    </div>

    <!-- 列表 -->
    <main class="mt-4 px-4">
      <div class="mb-2.5 flex items-center justify-between">
        <h2 class="section-title">
          <AppIcon name="leaf" :size="16" class="text-primary-600" />
          {{ keyword ? `“${keyword}” 的结果` : '全部食谱' }}
        </h2>
        <span class="text-[11px] text-[#93A091]">共 {{ recipes.length }} 道</span>
      </div>

      <div v-if="loading" class="grid grid-cols-2 gap-3">
        <div v-for="i in 6" :key="i" class="h-[190px] animate-pulse rounded-2xl bg-white/70" />
      </div>

      <div v-else-if="recipes.length" class="grid grid-cols-2 gap-3">
        <RecipeCard v-for="recipe in recipes" :key="recipe.id" :recipe="recipe" />
      </div>

      <div v-else class="card mt-2 flex flex-col items-center px-6 py-12 text-center">
        <span class="text-[34px]">🥗</span>
        <p class="mt-3 text-[13px] font-medium text-ink">没有找到相关食谱</p>
        <p class="mt-1 text-[11px] text-muted">换个关键词或餐次再试试吧</p>
        <button
          type="button"
          class="mt-4 rounded-full bg-primary-50 px-4 py-2 text-[12px] font-medium text-primary-700"
          @click="resetFilter"
        >
          查看全部食谱
        </button>
      </div>
    </main>
  </div>
</template>
