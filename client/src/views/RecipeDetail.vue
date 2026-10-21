<script setup>
/**
 * 食谱详情页
 * 大图 / 简介 / 营养数据 / 食材清单 / 制作步骤 / 收藏 / 加入今日计划
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppIcon from '../components/AppIcon.vue';
import BottomSheet from '../components/BottomSheet.vue';
import { dietApi, favoriteApi, recipeApi } from '../api';
import { todayStr } from '../utils/date';
import { showToast } from '../utils/toast';

const route = useRoute();
const router = useRouter();

const recipe = ref(null);
const loading = ref(true);
const favorite = ref(false);
const favoriteCount = ref(0);
const favoritePending = ref(false);

const planModal = ref(false);
const selectedMeal = ref('lunch');
const planPending = ref(false);

const mealOptions = [
  { key: 'breakfast', label: '早餐', icon: 'sunrise', color: 'text-[#FFB33B]' },
  { key: 'lunch', label: '午餐', icon: 'sun', color: 'text-[#FFC93C]' },
  { key: 'dinner', label: '晚餐', icon: 'moon', color: 'text-[#93A3B8]' },
  { key: 'snack', label: '加餐', icon: 'cup', color: 'text-[#C69C72]' },
];

const nutritionList = computed(() => {
  if (!recipe.value) return [];
  return [
    { key: 'calories', label: '千卡', value: recipe.value.calories, icon: 'flame', color: '#FF9F43', bg: '#FFF3E6' },
    { key: 'protein', label: '蛋白质', value: `${recipe.value.protein} g`, icon: 'flame', color: '#FF9F43', bg: '#FFF3E6' },
    { key: 'carbs', label: '碳水化合物', value: `${recipe.value.carbs} g`, icon: 'leaf', color: '#7CCB5A', bg: '#EEF8E8' },
    { key: 'fat', label: '脂肪', value: `${recipe.value.fat} g`, icon: 'drop', color: '#FFC93C', bg: '#FFF8E2' },
  ];
});

/** 根据当前时间选中默认餐次 */
const guessMeal = () => {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
};

const loadDetail = async () => {
  loading.value = true;
  try {
    const data = await recipeApi.getDetail(route.params.id);
    recipe.value = data;
    favorite.value = data.isFavorite;
    favoriteCount.value = data.favoriteCount;
  } catch (error) {
    recipe.value = null;
  } finally {
    loading.value = false;
  }
};

// 收藏 / 取消收藏
const toggleFavorite = async () => {
  if (favoritePending.value || !recipe.value) return;
  favoritePending.value = true;
  const next = !favorite.value;
  favorite.value = next;
  favoriteCount.value += next ? 1 : -1;

  try {
    const result = next
      ? await favoriteApi.add(recipe.value.id)
      : await favoriteApi.remove(recipe.value.id);
    favorite.value = result.isFavorite;
    favoriteCount.value = result.favoriteCount;
    showToast(next ? '已加入收藏' : '已取消收藏');
  } catch (error) {
    favorite.value = !next;
    favoriteCount.value += next ? -1 : 1;
  } finally {
    favoritePending.value = false;
  }
};

const openPlan = () => {
  selectedMeal.value = guessMeal();
  planModal.value = true;
};

// 加入今日计划：写入饮食记录表
const addToPlan = async () => {
  if (planPending.value || !recipe.value) return;
  planPending.value = true;
  try {
    await dietApi.create({
      recipeId: recipe.value.id,
      mealType: selectedMeal.value,
      recordDate: todayStr(),
    });
    planModal.value = false;
    const meal = mealOptions.find((item) => item.key === selectedMeal.value);
    showToast(`已加入今日${meal?.label || '饮食'}计划`);
  } catch (error) {
    // 错误提示已统一处理
  } finally {
    planPending.value = false;
  }
};

const goBack = () => {
  if (window.history.length > 1) router.back();
  else router.push('/recipes');
};

onMounted(loadDetail);
</script>

<template>
  <div class="page pb-40">
    <!-- 顶栏 -->
    <header class="flex items-center px-4 py-3">
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-card"
        aria-label="返回"
        @click="goBack"
      >
        <AppIcon name="chevron-left" :size="18" />
      </button>
      <h1 class="flex-1 text-center text-[16px] font-semibold text-ink">食谱详情</h1>
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-card"
        :class="favorite ? 'text-[#FF6B6B]' : 'text-[#9AA79A]'"
        :aria-label="favorite ? '取消收藏' : '收藏'"
        @click="toggleFavorite"
      >
        <AppIcon name="heart" :size="18" :class="favorite ? 'fill-current' : ''" />
      </button>
    </header>

    <!-- 加载中 -->
    <div v-if="loading" class="px-4">
      <div class="h-[240px] animate-pulse rounded-3xl bg-white/70" />
      <div class="mt-4 h-6 w-2/3 animate-pulse rounded bg-white/70" />
      <div class="mt-3 h-24 animate-pulse rounded-3xl bg-white/70" />
    </div>

    <!-- 食谱不存在 -->
    <div v-else-if="!recipe" class="card mx-4 mt-4 flex flex-col items-center px-6 py-14">
      <span class="text-[34px]">🍽️</span>
      <p class="mt-3 text-[13px] text-ink">食谱不存在或已下架</p>
      <button
        type="button"
        class="mt-4 rounded-full bg-primary-50 px-4 py-2 text-[12px] text-primary-700"
        @click="router.replace('/recipes')"
      >
        返回食谱列表
      </button>
    </div>

    <template v-else>
      <!-- 菜品大图 -->
      <div class="relative mx-4 overflow-hidden rounded-[24px] shadow-card">
        <img
          :src="recipe.cover"
          :alt="recipe.name"
          class="aspect-[4/3] w-full object-cover"
        />
        <span
          class="absolute bottom-2.5 right-2.5 rounded-full bg-black/35 px-2.5 py-1 text-[10px] text-white backdrop-blur"
        >
          {{ recipe.tags[0] || '健康食谱' }}
        </span>
      </div>

      <div class="mt-3.5 px-4">
        <!-- 名称与简介 -->
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <h2 class="text-[21px] font-bold leading-7 text-ink">{{ recipe.name }}</h2>
            <p class="mt-1 text-[11px] leading-5 text-[#7D8C78]">{{ recipe.description }}</p>
          </div>
          <div class="shrink-0 text-right">
            <p class="flex items-center justify-end gap-0.5 text-[16px] font-bold text-[#FFB020]">
              <span>★</span>{{ recipe.rating }}
            </p>
            <p class="mt-0.5 text-[9px] text-[#9AA79A]">{{ favoriteCount }} 人已收藏</p>
          </div>
        </div>

        <!-- 热量 / 标签 / 时间 -->
        <div class="mt-3 flex items-center gap-2">
          <p class="shrink-0">
            <span class="text-[26px] font-bold leading-8 text-[#FF8A1E]">{{ recipe.calories }}</span>
            <span class="ml-0.5 text-[11px] text-[#8A968A]">千卡 / 份</span>
          </p>
          <div class="flex flex-1 flex-wrap gap-1">
            <span
              v-for="tag in recipe.tags"
              :key="tag"
              class="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] text-primary-700"
            >
              {{ tag }}
            </span>
          </div>
          <span class="flex shrink-0 items-center gap-0.5 text-[10px] text-[#8A968A]">
            <AppIcon name="clock" :size="12" />
            {{ recipe.prepTime }} 分钟
          </span>
        </div>

        <!-- 营养成分 -->
        <section class="card mt-4 overflow-hidden">
          <div class="flex items-center justify-between border-b border-[#F1F5EC] px-4 py-3">
            <h3 class="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <AppIcon name="activity" :size="14" class="text-primary-600" />
              营养成分
              <span class="text-[10px] font-normal text-muted">（每份）</span>
            </h3>
            <span class="text-[9px] text-[#A2AEA0]">数据为估算值</span>
          </div>
          <div class="grid grid-cols-4 gap-1 px-2 py-4">
            <div v-for="item in nutritionList" :key="item.key" class="flex flex-col items-center">
              <span
                class="flex h-8 w-8 items-center justify-center rounded-full"
                :style="{ backgroundColor: item.bg, color: item.color }"
              >
                <AppIcon :name="item.icon" :size="16" />
              </span>
              <p class="mt-1.5 text-[14px] font-bold text-ink">{{ item.value }}</p>
              <p class="mt-0.5 text-[9px] text-[#93A091]">{{ item.label }}</p>
            </div>
          </div>
        </section>

        <!-- 食材清单 -->
        <section class="card mt-4 px-4 py-4">
          <h3 class="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <AppIcon name="leaf" :size="14" class="text-primary-600" />
            食材清单
            <span class="text-[10px] font-normal text-muted">（1 份）</span>
          </h3>
          <div class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div
              v-for="ingredient in recipe.ingredients"
              :key="ingredient.name"
              class="flex items-center gap-1.5"
            >
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F7FAF3] text-[12px]">
                {{ ingredient.emoji }}
              </span>
              <span class="min-w-0 flex-1 truncate text-[11px] text-[#4E5D4A]">
                {{ ingredient.name }}
              </span>
              <span class="shrink-0 text-[10px] text-[#8A968A]">{{ ingredient.amount }}</span>
              <span class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white">
                <AppIcon name="check" :size="9" />
              </span>
            </div>
          </div>
        </section>

        <!-- 制作步骤 -->
        <section class="card mt-4 px-4 py-4">
          <h3 class="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <AppIcon name="chef" :size="14" class="text-primary-600" />
            制作步骤
          </h3>
          <ol class="mt-3 space-y-3">
            <li
              v-for="(step, index) in recipe.steps"
              :key="index"
              class="flex items-start gap-2.5"
            >
              <span
                class="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[10px] font-semibold text-white"
              >
                {{ index + 1 }}
              </span>
              <div class="min-w-0 flex-1 rounded-xl bg-[#F8FBF5] px-3 py-2.5">
                <div class="flex items-start gap-2">
                  <span class="text-[16px] leading-5">{{ step.emoji }}</span>
                  <p class="text-[11px] leading-[1.7] text-[#5B6956]">{{ step.description }}</p>
                </div>
              </div>
            </li>
          </ol>
        </section>

        <p class="mt-5 text-center text-[10px] text-[#AEBAAB]">· 好好吃饭，是变得更好的开始 ·</p>
      </div>

      <!-- 底部操作栏（位于 Tab 之上） -->
      <div
        class="fixed left-1/2 z-30 w-full max-w-[375px] -translate-x-1/2 bg-gradient-to-t from-white via-white/95 to-white/0 px-4 pb-3 pt-6"
        :style="{ bottom: 'calc(62px + env(safe-area-inset-bottom))' }"
      >
        <button
          type="button"
          class="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary-600 py-3 text-[14px] font-semibold text-white shadow-soft active:bg-primary-700"
          @click="openPlan"
        >
          <AppIcon name="plus" :size="18" />
          加入今日计划
        </button>
      </div>
    </template>

    <!-- 选择餐次 -->
    <BottomSheet v-model="planModal" title="加入今日计划">
      <div class="flex items-center gap-3 rounded-2xl bg-[#F8FBF5] p-3">
        <img :src="recipe?.cover" :alt="recipe?.name" class="h-14 w-14 rounded-xl object-cover" />
        <div class="min-w-0">
          <p class="truncate text-[13px] font-semibold text-ink">{{ recipe?.name }}</p>
          <p class="mt-0.5 text-[11px] text-[#FF8A1E]">{{ recipe?.calories }} 千卡 / 份</p>
        </div>
      </div>

      <p class="mt-4 text-[12px] font-medium text-[#5E6B5A]">选择加入哪一餐</p>
      <div class="mt-2 grid grid-cols-4 gap-2">
        <button
          v-for="meal in mealOptions"
          :key="meal.key"
          type="button"
          class="flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px]"
          :class="
            selectedMeal === meal.key
              ? 'border-primary-400 bg-primary-50 font-semibold text-primary-700'
              : 'border-[#E9F0E4] text-[#67755F]'
          "
          @click="selectedMeal = meal.key"
        >
          <AppIcon :name="meal.icon" :size="17" :class="meal.color" />
          {{ meal.label }}
        </button>
      </div>

      <button
        type="button"
        class="mt-5 w-full rounded-2xl bg-primary-600 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
        :disabled="planPending"
        @click="addToPlan"
      >
        确认加入
      </button>
    </BottomSheet>
  </div>
</template>
