<script setup>
/**
 * 首页
 * 模块：欢迎区 / 每日热量环形进度 / 营养素进度 / 搜索 / 餐次标签 /
 *      双列食谱推荐 / 喝水进度 / 步数
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../components/AppIcon.vue';
import EChart from '../components/EChart.vue';
import RecipeCard from '../components/RecipeCard.vue';
import BottomSheet from '../components/BottomSheet.vue';
import { recipeApi, statsApi, userApi, waterApi } from '../api';
import { formatNumber, greeting, todayStr } from '../utils/date';
import { showToast } from '../utils/toast';

const router = useRouter();

const stats = ref(null);
const recipes = ref([]);
const activeMeal = ref('breakfast');
const keyword = ref('');
const loadingRecipes = ref(true);
const waterPending = ref(false);

const targetModal = ref(false);
const targetInput = ref(1700);
const stepsModal = ref(false);
const stepsInput = ref(0);

const mealTabs = [
  { key: 'breakfast', label: '早餐', icon: 'sunrise', color: 'text-[#FFB33B]' },
  { key: 'lunch', label: '午餐', icon: 'sun', color: 'text-[#FFC93C]' },
  { key: 'dinner', label: '晚餐', icon: 'moon', color: 'text-[#93A3B8]' },
  { key: 'snack', label: '加餐', icon: 'cup', color: 'text-[#C69C72]' },
];

// 三大营养素进度行
const nutritionRows = computed(() => {
  if (!stats.value) return [];
  const meta = [
    { key: 'protein', label: '蛋白质', icon: 'flame', color: '#FF9F43', bg: '#FFF3E6' },
    { key: 'carbs', label: '碳水化合物', icon: 'leaf', color: '#7CCB5A', bg: '#EEF8E8' },
    { key: 'fat', label: '脂肪', icon: 'drop', color: '#FFC93C', bg: '#FFF8E2' },
  ];
  return meta.map((item) => ({ ...item, ...stats.value.nutrition[item.key] }));
});

// 环形进度：已摄入 + 剩余
const ringOption = computed(() => {
  const consumed = stats.value?.consumed || 0;
  const remaining = stats.value?.remaining || 0;
  return {
    animationDuration: 500,
    tooltip: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['76%', '92%'],
        center: ['50%', '50%'],
        startAngle: 90,
        silent: true,
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: false },
        itemStyle: { borderRadius: 20, borderColor: '#fff', borderWidth: 2 },
        data: [
          { value: consumed, itemStyle: { color: '#5BC24D' } },
          { value: Math.max(remaining, 0.001), itemStyle: { color: '#EDF3E9' } },
        ],
      },
    ],
  };
});

// 喝水杯数
const waterCups = computed(() => {
  const water = stats.value?.water;
  if (!water) return { filled: 0, total: 8 };
  return { filled: water.cups, total: water.cupGoal || 8 };
});

// 剩余步数文案
const stepsHint = computed(() => {
  const steps = stats.value?.steps;
  if (!steps) return '';
  const left = Math.max(steps.goal - steps.current, 0);
  return left > 0 ? `再走 ${formatNumber(left)} 步，达成目标！` : '今日目标已达成，太棒了！';
});

/** 拉取首页统计 */
const loadStats = async () => {
  try {
    stats.value = await statsApi.getHome(todayStr());
  } catch (error) {
    // 错误提示由 axios 拦截器统一处理
  }
};

/** 拉取推荐食谱（换一批时可排除已展示的） */
const loadRecipes = async (refresh = false) => {
  loadingRecipes.value = true;
  try {
    const exclude = refresh ? recipes.value.map((item) => item.id).join(',') : '';
    let list = await recipeApi.getRecommend({
      mealType: activeMeal.value,
      limit: 4,
      exclude,
    });
    // 剩余数量不足时，重新随机一轮
    if (!list.length) {
      list = await recipeApi.getRecommend({ mealType: activeMeal.value, limit: 4 });
    }
    recipes.value = list;
  } catch (error) {
    recipes.value = [];
  } finally {
    loadingRecipes.value = false;
  }
};

const selectMeal = (key) => {
  if (activeMeal.value === key) return;
  activeMeal.value = key;
  loadRecipes();
};

const onSearch = () => {
  router.push({ path: '/recipes', query: keyword.value ? { keyword: keyword.value } : {} });
};

// 喝水 +250ml
const addWater = async () => {
  if (waterPending.value || !stats.value) return;
  waterPending.value = true;
  try {
    const water = await waterApi.add({ amount: 250, date: todayStr() });
    stats.value.water = water;
    showToast('已记录 250ml 水分');
  } catch (error) {
    // 已统一提示
  } finally {
    waterPending.value = false;
  }
};

const openTargetModal = () => {
  targetInput.value = stats.value?.targetCalories || 1700;
  targetModal.value = true;
};

const saveTarget = async () => {
  const value = Number(targetInput.value);
  if (!value || value < 800 || value > 4000) {
    showToast('请输入 800-4000 千卡之间的目标', 'error');
    return;
  }
  try {
    await userApi.updateProfile({ targetCalories: Math.round(value) });
    targetModal.value = false;
    await loadStats();
    showToast('热量目标已更新');
  } catch (error) {
    // 已统一提示
  }
};

const openStepsModal = () => {
  stepsInput.value = stats.value?.steps.current || 0;
  stepsModal.value = true;
};

const saveSteps = async () => {
  const value = Number(stepsInput.value);
  if (Number.isNaN(value) || value < 0 || value > 100000) {
    showToast('请输入 0-100000 之间的步数', 'error');
    return;
  }
  try {
    await userApi.updateSteps(Math.round(value));
    stepsModal.value = false;
    await loadStats();
    showToast('步数已更新');
  } catch (error) {
    // 已统一提示
  }
};

const notify = () => showToast('今天也要好好吃饭哦～');

onMounted(() => {
  loadStats();
  loadRecipes();
});
</script>

<template>
  <div class="page">
    <!-- 顶部欢迎区 -->
    <header class="hero-bg relative overflow-hidden px-4 pb-3 pt-5">
      <div class="relative z-10 flex items-start gap-3">
        <img
          :src="stats?.user.avatar || '/images/avatar.jpg'"
          alt="头像"
          class="h-[52px] w-[52px] shrink-0 rounded-full border-2 border-white object-cover shadow"
        />
        <div class="min-w-0">
          <h1 class="text-[17px] font-bold leading-6 text-ink">
            {{ greeting() }}，<span class="text-primary-700">开始你的轻盈一天</span>
            <span class="ml-0.5">☀️</span>
          </h1>
          <p class="mt-0.5 text-[11px] text-[#7E8C79]">
            好好吃饭，是变得更好的开始
            <span class="ml-0.5 text-primary-400">♡</span>
          </p>
        </div>
        <button
          type="button"
          class="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#54644F] shadow-sm"
          aria-label="消息"
          @click="notify"
        >
          <AppIcon name="bell" :size="17" />
        </button>
      </div>

      <!-- 手写体装饰 -->
      <div class="handwrite pointer-events-none absolute right-5 top-[56px] text-[9px] leading-[1.3]">
        更轻盈<br />更健康的自己
        <span class="text-primary-400">♡</span>
      </div>
      <!-- 背景柔光装饰 -->
      <div class="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/30 blur-2xl" />
    </header>

    <!-- 每日热量卡片 -->
    <section v-if="stats" class="px-4">
      <div
        class="rounded-[26px] bg-gradient-to-br from-[#7CD06A] via-[#A9DE96] to-[#D9EDC9] p-[3px] shadow-soft"
      >
        <div class="rounded-[23px] bg-white px-3 pb-3 pt-3.5">
          <div class="flex items-center gap-2">
            <!-- 环形进度 -->
            <div class="relative h-[118px] w-[118px] shrink-0">
              <EChart :option="ringOption" height="118px" />
              <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-[10px] text-[#8A9885]">今日还可摄入</span>
                <span class="mt-0.5 text-[25px] font-bold leading-7 text-ink">
                  {{ formatNumber(stats.remaining) }}
                </span>
                <span class="text-[10px] text-[#8A9885]">千卡</span>
              </div>
            </div>

            <!-- 目标与营养素 -->
            <div class="min-w-0 flex-1">
              <div class="flex items-end justify-between">
                <div class="flex items-center gap-1">
                  <span class="text-[12px] font-semibold text-ink">每日热量目标</span>
                  <button
                    type="button"
                    class="rounded p-0.5 text-primary-500"
                    aria-label="修改热量目标"
                    @click="openTargetModal"
                  >
                    <AppIcon name="edit" :size="12" />
                  </button>
                </div>
                <span class="text-[13px] font-bold text-ink">
                  {{ formatNumber(stats.targetCalories) }}
                  <span class="text-[9px] font-normal text-muted">千卡</span>
                </span>
              </div>

              <div
                v-for="row in nutritionRows"
                :key="row.key"
                class="mt-2"
              >
                <div class="flex items-center gap-1.5">
                  <span
                    class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                    :style="{ backgroundColor: row.bg, color: row.color }"
                  >
                    <AppIcon :name="row.icon" :size="11" />
                  </span>
                  <span class="text-[11px] text-[#5E6B5A]">{{ row.label }}</span>
                  <span class="ml-auto text-[11px] font-semibold text-ink">
                    {{ row.consumed }}
                    <span class="font-normal text-[#9AA79A]"> / {{ row.goal }} g</span>
                  </span>
                  <span class="w-7 text-right text-[9px] text-[#9AA79A]">{{ row.percent }}%</span>
                </div>
                <div class="ml-[24px] mt-1 h-[5px] overflow-hidden rounded-full bg-[#F1F5EC]">
                  <div
                    class="h-full rounded-full transition-all"
                    :style="{ width: `${Math.min(row.percent, 100)}%`, backgroundColor: row.color }"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="mt-1.5 flex items-center gap-1 pl-1 text-[10px] text-[#8A9885]">
            <AppIcon name="flame" :size="12" class="text-primary-500" />
            已摄入 {{ formatNumber(stats.consumed) }} / {{ formatNumber(stats.targetCalories) }} 千卡
          </div>
        </div>
      </div>
    </section>

    <!-- 搜索 -->
    <section class="mt-3 px-4">
      <form
        class="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-3 shadow-card"
        @submit.prevent="onSearch"
      >
        <AppIcon name="search" :size="17" class="shrink-0 text-[#9AA79A]" />
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索食谱、食材或菜名..."
          class="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-[#A9B5A5]"
        />
        <button type="button" class="shrink-0 text-primary-500" aria-label="扫一扫" @click="notify">
          <AppIcon name="scan" :size="18" />
        </button>
      </form>
    </section>

    <!-- 餐次标签 -->
    <section class="mt-3 px-4">
      <div class="flex gap-2">
        <button
          v-for="meal in mealTabs"
          :key="meal.key"
          type="button"
          class="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] transition-colors"
          :class="
            activeMeal === meal.key
              ? 'bg-primary-600 font-semibold text-white shadow-soft'
              : 'bg-white text-[#5E6B5A] shadow-card'
          "
          @click="selectMeal(meal.key)"
        >
          <AppIcon
            :name="meal.icon"
            :size="14"
            :class="activeMeal === meal.key ? 'text-white' : meal.color"
          />
          {{ meal.label }}
        </button>
      </div>
    </section>

    <!-- 今日推荐 -->
    <section class="mt-4 px-4">
      <div class="mb-2.5 flex items-center justify-between">
        <h2 class="section-title">
          <AppIcon name="leaf" :size="16" class="text-primary-600" />
          今日推荐
        </h2>
        <button
          type="button"
          class="flex items-center gap-0.5 text-[11px] text-[#7D8C78]"
          @click="loadRecipes(true)"
        >
          换一批
          <AppIcon name="chevron-right" :size="13" />
        </button>
      </div>

      <div v-if="loadingRecipes" class="grid grid-cols-2 gap-3">
        <div v-for="i in 4" :key="i" class="h-[180px] animate-pulse rounded-2xl bg-white/70" />
      </div>

      <div v-else-if="recipes.length" class="grid grid-cols-2 gap-3">
        <RecipeCard v-for="recipe in recipes" :key="recipe.id" :recipe="recipe" />
      </div>

      <div v-else class="rounded-2xl bg-white py-8 text-center text-[12px] text-muted shadow-card">
        该餐次暂无推荐食谱，换个餐次看看吧
      </div>
    </section>

    <!-- 喝水 & 步数 -->
    <section v-if="stats" class="mt-4 grid grid-cols-2 gap-3 px-4">
      <!-- 喝水 -->
      <div class="soft-card flex min-h-[138px] flex-col p-3">
        <div class="flex items-center gap-1 text-[12px] font-semibold text-ink">
          <AppIcon name="drop" :size="14" class="text-[#5AB0E8]" />
          今日喝水
        </div>
        <div class="mt-1 flex items-center justify-between">
          <p class="text-[20px] font-bold leading-6 text-ink">
            {{ formatNumber(stats.water.current) }}
            <span class="text-[10px] font-normal text-muted">/ {{ stats.water.goal }} ml</span>
          </p>
          <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white disabled:opacity-50"
            aria-label="喝一杯水"
            :disabled="waterPending"
            @click="addWater"
          >
            <AppIcon name="plus" :size="14" />
          </button>
        </div>
        <div class="mt-2 h-[6px] overflow-hidden rounded-full bg-[#EDF3E8]">
          <div
            class="h-full rounded-full bg-[#5AB0E8] transition-all"
            :style="{ width: `${stats.water.percent}%` }"
          />
        </div>
        <div class="mt-auto flex items-center justify-between pt-2.5">
          <span
            v-for="i in waterCups.total"
            :key="i"
            class="text-[#5AB0E8]"
            :class="i <= waterCups.filled ? '' : 'opacity-25'"
          >
            <AppIcon name="cup" :size="13" :class="i <= waterCups.filled ? 'fill-current' : ''" />
          </span>
        </div>
      </div>

      <!-- 步数 -->
      <button
        type="button"
        class="soft-card relative flex min-h-[138px] flex-col p-3 text-left"
        @click="openStepsModal"
      >
        <div class="flex items-center gap-1 text-[12px] font-semibold text-ink">
          <AppIcon name="activity" :size="14" class="text-primary-600" />
          今日步数
          <AppIcon name="chevron-right" :size="14" class="ml-auto text-[#B4C0AF]" />
        </div>
        <p class="mt-1 text-[20px] font-bold leading-6 text-ink">
          {{ formatNumber(stats.steps.current) }}
          <span class="text-[10px] font-normal text-muted">/ {{ formatNumber(stats.steps.goal) }}</span>
        </p>
        <div class="mt-2 h-[6px] overflow-hidden rounded-full bg-[#EDF3E8]">
          <div
            class="h-full rounded-full bg-primary-500 transition-all"
            :style="{ width: `${stats.steps.percent}%` }"
          />
        </div>
        <p class="mt-auto pt-2 text-[9px] leading-3 text-[#8A9885]">{{ stepsHint }}</p>
        <!-- 迷你柱状装饰 -->
        <div class="pointer-events-none absolute bottom-3 right-3 flex items-end gap-[2px] opacity-70">
          <span class="h-2 w-[3px] rounded-sm bg-primary-300" />
          <span class="h-3 w-[3px] rounded-sm bg-primary-300" />
          <span class="h-5 w-[3px] rounded-sm bg-primary-400" />
          <span class="h-4 w-[3px] rounded-sm bg-primary-300" />
        </div>
      </button>
    </section>

    <!-- 修改每日热量目标 -->
    <BottomSheet v-model="targetModal" title="设置每日热量目标">
      <p class="text-[12px] leading-5 text-[#7D8C78]">
        建议女性减脂期每日摄入 1200-1800 千卡，请根据身体状况合理设置。
      </p>
      <label class="mt-4 block text-[12px] font-medium text-[#5E6B5A]">每日目标（千卡）</label>
      <input v-model.number="targetInput" type="number" min="800" max="4000" class="field mt-1.5" />
      <div class="mt-3 flex gap-2">
        <button
          v-for="preset in [1500, 1700, 1900]"
          :key="preset"
          type="button"
          class="flex-1 rounded-xl border py-2 text-[12px]"
          :class="
            targetInput === preset
              ? 'border-primary-400 bg-primary-50 text-primary-700'
              : 'border-[#E6EEE0] text-[#7D8C78]'
          "
          @click="targetInput = preset"
        >
          {{ preset }} 千卡
        </button>
      </div>
      <button
        type="button"
        class="mt-5 w-full rounded-2xl bg-primary-600 py-3 text-[14px] font-semibold text-white"
        @click="saveTarget"
      >
        保存目标
      </button>
    </BottomSheet>

    <!-- 修改今日步数 -->
    <BottomSheet v-model="stepsModal" title="记录今日步数">
      <p class="text-[12px] leading-5 text-[#7D8C78]">步数会同步换算成运动消耗，用于记录页展示。</p>
      <label class="mt-4 block text-[12px] font-medium text-[#5E6B5A]">今日步数</label>
      <input v-model.number="stepsInput" type="number" min="0" max="100000" class="field mt-1.5" />
      <button
        type="button"
        class="mt-5 w-full rounded-2xl bg-primary-600 py-3 text-[14px] font-semibold text-white"
        @click="saveSteps"
      >
        保存步数
      </button>
    </BottomSheet>
  </div>
</template>
