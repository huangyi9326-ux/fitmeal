<script setup>
/**
 * 饮食记录页
 * 日期切换 / 今日摄入环形图 / 体重趋势折线图 / 四餐进度环 /
 * 饮食记录增删改 / 喝水 / 运动消耗
 */
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../components/AppIcon.vue';
import EChart from '../components/EChart.vue';
import BottomSheet from '../components/BottomSheet.vue';
import {
  dietApi,
  recipeApi,
  statsApi,
  userApi,
  waterApi,
  weightApi,
} from '../api';
import {
  addDays,
  formatNumber,
  formatShort,
  isToday,
  todayStr,
  weekOf,
} from '../utils/date';
import { showToast } from '../utils/toast';

const router = useRouter();

const selectedDate = ref(todayStr());
const stats = ref(null);
const dietData = ref({ records: [], summary: {} });
const weightData = ref({ list: [], current: null, delta: 0, targetWeight: null });
const loading = ref(false);

const waterPending = ref(false);
const recordModal = ref(false);
const recordPending = ref(false);
const editingId = ref(null);
const nutritionModal = ref(false);
const weightModal = ref(false);
const weightInput = ref('');
const stepsModal = ref(false);
const stepsInput = ref(0);
const availableRecipes = ref([]);
const recipesLoaded = ref(false);

// 新增 / 编辑饮食记录的表单
const form = reactive({
  tab: 'recipe', // recipe | custom
  recipeId: null,
  mealType: 'lunch',
  foodName: '',
  calories: '',
  note: '',
  recordTime: '',
});

const mealOptions = [
  { key: 'breakfast', label: '早餐', icon: 'sunrise', color: 'text-[#FFB33B]' },
  { key: 'lunch', label: '午餐', icon: 'sun', color: 'text-[#FFC93C]' },
  { key: 'dinner', label: '晚餐', icon: 'moon', color: 'text-[#93A3B8]' },
  { key: 'snack', label: '加餐', icon: 'cup', color: 'text-[#C69C72]' },
];

const mealMeta = {
  breakfast: { label: '早餐', color: '#FFB33B', icon: 'sunrise' },
  lunch: { label: '午餐', color: '#FFC93C', icon: 'sun' },
  dinner: { label: '晚餐', color: '#9CB7A8', icon: 'moon' },
  snack: { label: '加餐', color: '#FF9F5A', icon: 'cup' },
};

const weekDays = computed(() => weekOf(selectedDate.value));
const records = computed(() => dietData.value.records || []);

const dateTitle = computed(() =>
  isToday(selectedDate.value) ? '今日' : formatShort(selectedDate.value)
);

// 今日摄入环形图
const mainRingOption = computed(() => {
  const consumed = stats.value?.consumed || 0;
  const target = stats.value?.targetCalories || 1700;
  const done = Math.min(consumed, target);
  return {
    animationDuration: 500,
    tooltip: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['76%', '93%'],
        center: ['50%', '50%'],
        startAngle: 90,
        silent: true,
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: false },
        itemStyle: { borderRadius: 16, borderColor: '#fff', borderWidth: 2 },
        data: [
          { value: done, itemStyle: { color: '#5BC24D' } },
          { value: Math.max(target - done, 0.001), itemStyle: { color: '#EDF3E9' } },
        ],
      },
    ],
  };
});

/** 生成单个餐次的小环形图配置 */
const mealRingOption = (meal) => {
  const percent = Math.max(Math.min(meal.percent, 100), 0);
  return {
    animationDuration: 400,
    tooltip: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['70%', '90%'],
        center: ['50%', '50%'],
        startAngle: 90,
        silent: true,
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: false },
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 1.5 },
        data: [
          { value: percent, itemStyle: { color: meal.color } },
          { value: Math.max(100 - percent, 0.001), itemStyle: { color: '#EFF4EA' } },
        ],
      },
    ],
  };
};

const meals = computed(() => {
  return Object.entries(mealMeta).map(([key, meta]) => ({
    key,
    ...meta,
    ...(stats.value?.meals[key] || { consumed: 0, goal: 0, percent: 0, count: 0 }),
  }));
});

// 记录列表里展示的餐次名
const mealLabel = (key) => mealMeta[key]?.label || '加餐';

// 体重趋势折线图
const weightOption = computed(() => {
  const list = weightData.value.list || [];
  const dates = list.map((item) => formatShort(item.recordDate));
  const values = list.map((item) => item.weight);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  return {
    animationDuration: 500,
    grid: { left: 14, right: 14, top: 22, bottom: 18, containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#9AA79A',
        fontSize: 8,
        interval: Math.max(Math.floor(dates.length / 4) - 1, 0),
      },
    },
    yAxis: {
      type: 'value',
      min: values.length ? Math.floor((min - 0.4) * 10) / 10 : 0,
      max: values.length ? Math.ceil((max + 0.4) * 10) / 10 : 1,
      splitNumber: 2,
      axisLabel: { show: false },
      splitLine: { lineStyle: { color: '#F1F5EC', type: 'dashed' } },
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#5BC24D', width: 2 },
        itemStyle: { color: '#5BC24D', borderColor: '#fff', borderWidth: 1.5 },
        areaStyle: { color: 'rgba(91, 194, 77, 0.12)' },
        label: {
          show: true,
          position: 'top',
          color: '#4E8A3C',
          fontSize: 9,
          // 只显示最新一个点的数值，避免标签拥挤
          formatter: (params) => (params.dataIndex === values.length - 1 ? params.value : ''),
        },
      },
    ],
  };
});

/** 加载页面全部数据 */
const loadAll = async () => {
  loading.value = true;
  try {
    const [statsRes, dietRes, weightRes] = await Promise.all([
      statsApi.getDaily(selectedDate.value),
      dietApi.getByDate(selectedDate.value),
      weightApi.getTrend({ days: 7, date: selectedDate.value }),
    ]);
    stats.value = statsRes;
    dietData.value = dietRes;
    weightData.value = weightRes;
  } catch (error) {
    // 错误提示统一处理
  } finally {
    loading.value = false;
  }
};

watch(selectedDate, loadAll);

const shiftWeek = (direction) => {
  selectedDate.value = addDays(selectedDate.value, direction * 7);
};

const pickDate = (day) => {
  if (day.date === selectedDate.value) return;
  selectedDate.value = day.date;
};

/** 当前时间 HH:mm */
const currentTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** 根据时间猜餐次 */
const guessMeal = () => {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
};

const loadRecipeOptions = async () => {
  if (recipesLoaded.value) return;
  try {
    const result = await recipeApi.getList({ limit: 50 });
    availableRecipes.value = result.list;
    recipesLoaded.value = true;
  } catch (error) {
    availableRecipes.value = [];
  }
};

/** 打开新增记录弹层 */
const openCreate = () => {
  editingId.value = null;
  form.tab = 'recipe';
  form.recipeId = null;
  form.mealType = guessMeal();
  form.foodName = '';
  form.calories = '';
  form.note = '';
  form.recordTime = currentTime();
  recordModal.value = true;
  loadRecipeOptions();
};

/** 打开编辑弹层 */
const openEdit = (record) => {
  editingId.value = record.id;
  form.tab = 'custom';
  form.recipeId = record.recipeId;
  form.mealType = record.mealType;
  form.foodName = record.foodName;
  form.calories = record.calories;
  form.note = record.description || '';
  form.recordTime = record.recordTime;
  recordModal.value = true;
};

/** 提交新增 / 修改 */
const submitRecord = async () => {
  if (recordPending.value) return;
  recordPending.value = true;

  try {
    if (editingId.value) {
      // 修改：热量、名称、餐次、时间
      await dietApi.update(editingId.value, {
        mealType: form.mealType,
        foodName: form.foodName,
        calories: Number(form.calories),
        recordTime: form.recordTime,
        note: form.note,
      });
      showToast('记录已更新');
    } else if (form.tab === 'recipe') {
      if (!form.recipeId) {
        showToast('请选择一个食谱', 'error');
        recordPending.value = false;
        return;
      }
      await dietApi.create({
        recipeId: form.recipeId,
        mealType: form.mealType,
        recordTime: form.recordTime,
        recordDate: selectedDate.value,
      });
      showToast('已记录饮食');
    } else {
      if (!form.foodName.trim()) {
        showToast('请输入食物名称', 'error');
        recordPending.value = false;
        return;
      }
      const cal = Number(form.calories);
      if (!cal || cal <= 0) {
        showToast('请输入有效的热量', 'error');
        recordPending.value = false;
        return;
      }
      await dietApi.create({
        foodName: form.foodName.trim(),
        calories: cal,
        note: form.note,
        mealType: form.mealType,
        recordTime: form.recordTime,
        recordDate: selectedDate.value,
      });
      showToast('已记录饮食');
    }

    recordModal.value = false;
    await loadAll();
  } catch (error) {
    // 错误提示统一处理
  } finally {
    recordPending.value = false;
  }
};

/** 删除记录 */
const removeRecord = async (record) => {
  if (!window.confirm(`确定删除「${record.foodName}」这条记录吗？`)) return;
  try {
    await dietApi.remove(record.id);
    showToast('已删除记录');
    await loadAll();
  } catch (error) {
    // 已统一提示
  }
};

/** 喝水 +250ml */
const addWater = async () => {
  if (waterPending.value || !stats.value) return;
  waterPending.value = true;
  try {
    const water = await waterApi.add({ amount: 250, date: selectedDate.value });
    stats.value.water = water;
    showToast('已记录 250ml 水分');
  } catch (error) {
    // 已统一提示
  } finally {
    waterPending.value = false;
  }
};

const openWeightModal = () => {
  weightInput.value = stats.value?.weight.current || '';
  weightModal.value = true;
};

/** 记录体重 */
const saveWeight = async () => {
  const value = Number(weightInput.value);
  if (!value || value < 30 || value > 200) {
    showToast('请输入 30-200kg 之间的体重', 'error');
    return;
  }
  try {
    await weightApi.create({ weight: value, recordDate: selectedDate.value });
    weightModal.value = false;
    showToast('体重已记录');
    await loadAll();
  } catch (error) {
    // 已统一提示
  }
};

const openStepsModal = () => {
  stepsInput.value = stats.value?.steps.current || 0;
  stepsModal.value = true;
};

/** 更新步数 */
const saveSteps = async () => {
  const value = Number(stepsInput.value);
  if (Number.isNaN(value) || value < 0 || value > 100000) {
    showToast('请输入 0-100000 之间的步数', 'error');
    return;
  }
  try {
    await userApi.updateSteps(Math.round(value));
    stepsModal.value = false;
    showToast('步数已更新');
    await loadAll();
  } catch (error) {
    // 已统一提示
  }
};

/** 点击记录行：食谱来源跳详情，自定义记录打开编辑 */
const onRowClick = (record) => {
  if (record.recipeId) router.push(`/recipes/${record.recipeId}`);
  else openEdit(record);
};

const waterCups = computed(() => {
  const water = stats.value?.water;
  return { filled: water?.cups || 0, total: water?.cupGoal || 8 };
});

onMounted(loadAll);
</script>

<template>
  <div class="page">
    <!-- 顶部标题 -->
    <header class="hero-bg relative overflow-hidden px-4 pb-4 pt-6">
      <div class="relative z-10">
        <h1 class="text-[24px] font-bold leading-8 text-ink">饮食记录</h1>
        <p class="mt-0.5 text-[12px] text-[#7E8C79]">
          记录每一餐，遇见更好的自己
          <span class="ml-0.5 text-primary-400">♡</span>
        </p>
      </div>
      <div class="handwrite pointer-events-none absolute right-4 top-5 text-[10px]">
        好习惯<br />成就更轻盈的你
        <span class="text-primary-400">♡</span>
      </div>
    </header>

    <!-- 日期选择 -->
    <section class="px-4">
      <div class="soft-card flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#7D8C78]"
          aria-label="上一周"
          @click="shiftWeek(-1)"
        >
          <AppIcon name="chevron-left" :size="15" />
        </button>

        <div class="flex flex-1">
          <button
            v-for="day in weekDays"
            :key="day.date"
            type="button"
            class="flex flex-1 flex-col items-center rounded-lg py-1 leading-4"
            :class="
              day.date === selectedDate
                ? 'bg-primary-600 font-semibold text-white'
                : 'text-[#67755F]'
            "
            @click="pickDate(day)"
          >
            <span class="text-[9px]" :class="day.isToday && day.date !== selectedDate ? 'text-primary-600' : ''">
              {{ day.isToday ? '今天' : day.weekday }}
            </span>
            <span class="mt-0.5 text-[10px]">{{ day.short }}</span>
          </button>
        </div>

        <button
          type="button"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#7D8C78]"
          aria-label="下一周"
          @click="shiftWeek(1)"
        >
          <AppIcon name="chevron-right" :size="15" />
        </button>
      </div>
    </section>

    <!-- 今日摄入概览 -->
    <section v-if="stats" class="mt-3 px-4">
      <div class="card px-4 py-4">
        <div class="flex items-center gap-3">
          <!-- 大环 -->
          <div class="relative h-[108px] w-[108px] shrink-0">
            <EChart :option="mainRingOption" height="108px" />
            <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-[9px] text-[#8A9885]">{{ dateTitle }}摄入</span>
              <span class="mt-0.5 text-[22px] font-bold leading-6 text-ink">
                {{ formatNumber(stats.consumed) }}
              </span>
              <span class="text-[9px] text-[#8A9885]">千卡</span>
              <span class="mt-0.5 text-[8px] text-[#A2AEA0]">目标 {{ formatNumber(stats.targetCalories) }}</span>
            </div>
          </div>

          <!-- 三项指标 -->
          <div class="min-w-0 flex-1 space-y-2">
            <div class="flex items-center gap-2">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF3E6] text-[#FF9F43]">
                <AppIcon name="flame" :size="13" />
              </span>
              <span class="text-[11px] text-[#67755F]">还可摄入</span>
              <span class="ml-auto text-[13px] font-bold text-ink">
                {{ formatNumber(stats.remaining) }}
                <span class="text-[9px] font-normal text-muted">千卡</span>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF8E8] text-primary-600">
                <AppIcon name="activity" :size="13" />
              </span>
              <span class="text-[11px] text-[#67755F]">摄入占比</span>
              <span class="ml-auto text-[13px] font-bold text-ink">{{ stats.percent }}%</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF8E8] text-primary-600">
                <AppIcon name="record" :size="13" />
              </span>
              <span class="text-[11px] text-[#67755F]">记录餐次</span>
              <span class="ml-auto text-[13px] font-bold text-ink">
                {{ stats.recordCount }}
                <span class="text-[9px] font-normal text-muted">/ 4</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 体重趋势 -->
    <section class="mt-3 px-4">
      <div class="card px-4 pb-2 pt-3.5">
        <div class="flex items-center justify-between">
          <h2 class="flex items-center gap-1 text-[13px] font-semibold text-ink">
            体重趋势
            <span class="text-[9px] font-normal text-muted">（公斤）</span>
          </h2>
          <button
            type="button"
            class="flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-medium text-primary-700"
            @click="openWeightModal"
          >
            <AppIcon name="edit" :size="11" />
            记录体重
          </button>
        </div>

        <div class="mt-1 flex items-end gap-2">
          <p class="text-[22px] font-bold leading-7 text-ink">
            {{ weightData.current ?? '--' }}
            <span class="text-[10px] font-normal text-muted">kg</span>
          </p>
          <span
            v-if="weightData.current"
            class="mb-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
            :class="weightData.delta <= 0 ? 'bg-primary-50 text-primary-700' : 'bg-[#FFF3E6] text-[#E28320]'"
          >
            {{ weightData.delta > 0 ? '+' : '' }}{{ weightData.delta }} kg
          </span>
          <span class="mb-1 ml-auto text-[9px] text-muted">目标 {{ weightData.targetWeight ?? '--' }} kg</span>
        </div>

        <EChart v-if="weightData.list.length > 1" :option="weightOption" height="116px" />
        <p v-else class="py-8 text-center text-[11px] text-muted">还没有足够的体重数据</p>
      </div>
    </section>

    <!-- 餐次摄入进度 -->
    <section class="mt-3 px-4">
      <div class="card px-4 py-4">
        <div class="flex items-center justify-between">
          <h2 class="section-title text-[13px]">
            <AppIcon name="utensils" :size="14" class="text-primary-600" />
            餐次摄入进度
          </h2>
          <button
            type="button"
            class="flex items-center gap-0.5 text-[10px] text-[#7D8C78]"
            @click="nutritionModal = true"
          >
            查看营养分析
            <AppIcon name="chevron-right" :size="12" />
          </button>
        </div>

        <div class="mt-3 grid grid-cols-4 gap-1">
          <div v-for="meal in meals" :key="meal.key" class="flex flex-col items-center">
            <div class="relative h-[62px] w-[62px]">
              <EChart :option="mealRingOption(meal)" height="62px" />
              <span class="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-ink">
                {{ meal.percent }}%
              </span>
            </div>
            <span class="mt-1 flex items-center gap-0.5 text-[11px] font-medium text-ink">
              <AppIcon :name="meal.icon" :size="11" :style="{ color: meal.color }" />
              {{ meal.label }}
            </span>
            <span class="mt-0.5 text-[8px] text-[#95A091]">{{ meal.consumed }} / {{ meal.goal }} 千卡</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 今日饮食记录 -->
    <section class="mt-3 px-4">
      <div class="card overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3.5">
          <h2 class="section-title text-[13px]">
            <AppIcon name="leaf" :size="14" class="text-primary-600" />
            {{ dateTitle }}饮食记录
          </h2>
          <button
            type="button"
            class="flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1.5 text-[10px] font-medium text-white"
            @click="openCreate"
          >
            <AppIcon name="plus" :size="12" />
            记录饮食
          </button>
        </div>

        <div v-if="loading" class="space-y-2 px-4 pb-4">
          <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-xl bg-[#F7FAF3]" />
        </div>

        <div v-else-if="records.length" class="divide-y divide-[#F3F7EE] border-t border-[#F3F7EE]">
          <div
            v-for="record in records"
            :key="record.id"
            class="flex cursor-pointer items-center gap-2 px-3 py-3 active:bg-[#FAFCF8]"
            @click="onRowClick(record)"
          >
            <!-- 时间 / 餐次 -->
            <div class="w-8 shrink-0 text-center">
              <p class="text-[10px] font-medium leading-4 text-[#5E6B5A]">{{ record.recordTime }}</p>
              <p class="text-[9px] leading-4 text-[#9AA79A]">{{ mealLabel(record.mealType) }}</p>
            </div>

            <img
              v-if="record.image"
              :src="record.image"
              :alt="record.foodName"
              class="h-11 w-11 shrink-0 rounded-xl object-cover"
            />
            <span
              v-else
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5FAF0] text-[18px]"
            >
              🥣
            </span>

            <div class="min-w-0 flex-1">
              <p class="truncate text-[12px] font-medium text-ink">{{ record.foodName }}</p>
              <p class="mt-0.5 truncate text-[9px] text-[#95A091]">{{ record.description }}</p>
              <p class="mt-0.5 text-[10px] font-semibold text-[#FF8A1E]">
                {{ record.calories }} <span class="font-normal text-[9px] text-muted">千卡</span>
              </p>
            </div>

            <div class="flex shrink-0 flex-col items-end gap-1">
              <span class="flex items-center gap-0.5 rounded-full bg-primary-50 px-1.5 py-0.5 text-[8px] text-primary-700">
                <AppIcon name="check" :size="8" />
                已记录
              </span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-[#9AA79A]"
                  aria-label="编辑"
                  @click.stop="openEdit(record)"
                >
                  <AppIcon name="edit" :size="12" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-[#D98B8B]"
                  aria-label="删除"
                  @click.stop="removeRecord(record)"
                >
                  <AppIcon name="trash" :size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="flex flex-col items-center border-t border-[#F3F7EE] px-4 py-9 text-center">
          <span class="text-[26px]">🍃</span>
          <p class="mt-2 text-[11px] text-muted">还没有记录，认真吃好每一餐吧</p>
        </div>
      </div>
    </section>

    <!-- 喝水 & 运动消耗 -->
    <section v-if="stats" class="mt-3 grid grid-cols-2 gap-3 px-4">
      <!-- 喝水 -->
      <div class="soft-card flex min-h-[138px] flex-col p-3">
        <div class="flex items-center gap-1 text-[12px] font-semibold text-ink">
          <AppIcon name="drop" :size="14" class="text-[#5AB0E8]" />
          喝水记录
        </div>
        <div class="mt-1 flex items-center justify-between">
          <p class="text-[19px] font-bold leading-6 text-ink">
            {{ formatNumber(stats.water.current) }}
            <span class="text-[9px] font-normal text-muted">/ {{ stats.water.goal }} ml</span>
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
          <div class="h-full rounded-full bg-[#5AB0E8]" :style="{ width: `${stats.water.percent}%` }" />
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

      <!-- 运动消耗 -->
      <button
        type="button"
        class="soft-card relative flex min-h-[138px] flex-col overflow-hidden p-3 text-left"
        @click="openStepsModal"
      >
        <div class="flex items-center gap-1 text-[12px] font-semibold text-ink">
          <AppIcon name="activity" :size="14" class="text-primary-600" />
          运动消耗
          <AppIcon name="chevron-right" :size="14" class="ml-auto text-[#B4C0AF]" />
        </div>
        <p class="mt-1 text-[19px] font-bold leading-6 text-ink">
          {{ formatNumber(stats.steps.calories) }}
          <span class="text-[9px] font-normal text-muted">千卡</span>
        </p>
        <p class="mt-1 text-[9px] leading-3 text-[#8A9885]">
          步行 {{ formatNumber(stats.steps.current) }} 步<br />约 {{ formatNumber(stats.steps.calories) }} 千卡
        </p>
        <div class="pointer-events-none absolute -bottom-1 right-1 text-[34px] opacity-80">🏃</div>
      </button>
    </section>

    <!-- 新增 / 编辑饮食记录 -->
    <BottomSheet v-model="recordModal" :title="editingId ? '编辑饮食记录' : '记录饮食'">
      <!-- 从食谱选择 / 自定义 -->
      <div v-if="!editingId" class="flex rounded-xl bg-[#F5F9F1] p-1">
        <button
          type="button"
          class="flex-1 rounded-lg py-2 text-[12px]"
          :class="form.tab === 'recipe' ? 'bg-white font-semibold text-primary-700 shadow-sm' : 'text-[#7D8C78]'"
          @click="form.tab = 'recipe'"
        >
          从食谱选择
        </button>
        <button
          type="button"
          class="flex-1 rounded-lg py-2 text-[12px]"
          :class="form.tab === 'custom' ? 'bg-white font-semibold text-primary-700 shadow-sm' : 'text-[#7D8C78]'"
          @click="form.tab = 'custom'"
        >
          自定义食物
        </button>
      </div>

      <!-- 食谱选择列表 -->
      <div v-if="!editingId && form.tab === 'recipe'" class="mt-3 max-h-[210px] space-y-1.5 overflow-y-auto">
        <button
          v-for="item in availableRecipes"
          :key="item.id"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-xl border p-2 text-left"
          :class="
            form.recipeId === item.id
              ? 'border-primary-400 bg-primary-50'
              : 'border-[#EEF3E8] bg-white'
          "
          @click="form.recipeId = item.id"
        >
          <img :src="item.cover" :alt="item.name" class="h-10 w-10 rounded-lg object-cover" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-[12px] font-medium text-ink">{{ item.name }}</p>
            <p class="text-[10px] text-[#FF8A1E]">{{ item.calories }} 千卡</p>
          </div>
          <span
            class="flex h-4 w-4 items-center justify-center rounded-full border"
            :class="form.recipeId === item.id ? 'border-primary-500 bg-primary-500 text-white' : 'border-[#D8E3D2]'"
          >
            <AppIcon v-if="form.recipeId === item.id" name="check" :size="9" />
          </span>
        </button>
        <p v-if="!availableRecipes.length" class="py-6 text-center text-[11px] text-muted">暂无食谱</p>
      </div>

      <!-- 自定义 / 编辑表单 -->
      <div v-if="editingId || form.tab === 'custom'" class="mt-3 space-y-3">
        <div>
          <label class="text-[11px] font-medium text-[#5E6B5A]">食物名称</label>
          <input v-model="form.foodName" type="text" placeholder="例如：坚果水果小碗" class="field mt-1" />
        </div>
        <div>
          <label class="text-[11px] font-medium text-[#5E6B5A]">热量（千卡）</label>
          <input v-model="form.calories" type="number" min="1" max="5000" placeholder="例如：122" class="field mt-1" />
        </div>
        <div>
          <label class="text-[11px] font-medium text-[#5E6B5A]">备注（选填）</label>
          <input v-model="form.note" type="text" placeholder="吃了什么，心情如何" class="field mt-1" />
        </div>
      </div>

      <!-- 餐次 -->
      <p class="mt-4 text-[11px] font-medium text-[#5E6B5A]">餐次</p>
      <div class="mt-1.5 grid grid-cols-4 gap-2">
        <button
          v-for="meal in mealOptions"
          :key="meal.key"
          type="button"
          class="flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px]"
          :class="
            form.mealType === meal.key
              ? 'border-primary-400 bg-primary-50 font-semibold text-primary-700'
              : 'border-[#E9F0E4] text-[#67755F]'
          "
          @click="form.mealType = meal.key"
        >
          <AppIcon :name="meal.icon" :size="15" :class="meal.color" />
          {{ meal.label }}
        </button>
      </div>

      <div class="mt-3">
        <label class="text-[11px] font-medium text-[#5E6B5A]">时间</label>
        <input v-model="form.recordTime" type="time" class="field mt-1" />
      </div>

      <button
        type="button"
        class="mt-5 w-full rounded-2xl bg-primary-600 py-3 text-[14px] font-semibold text-white disabled:opacity-60"
        :disabled="recordPending"
        @click="submitRecord"
      >
        {{ editingId ? '保存修改' : '确认记录' }}
      </button>
    </BottomSheet>

    <!-- 营养分析 -->
    <BottomSheet v-model="nutritionModal" title="今日营养分析">
      <template v-if="stats">
        <div class="space-y-4">
          <div v-for="(row, key) in stats.nutrition" :key="key">
            <div class="flex items-center justify-between">
              <span class="text-[12px] font-medium text-ink">
                {{ key === 'protein' ? '蛋白质' : key === 'carbs' ? '碳水化合物' : '脂肪' }}
              </span>
              <span class="text-[11px] text-[#7D8C78]">
                {{ row.consumed }} / {{ row.goal }} g
                <span class="ml-1 text-primary-600">{{ row.percent }}%</span>
              </span>
            </div>
            <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F1F5EC]">
              <div
                class="h-full rounded-full"
                :style="{
                  width: `${Math.min(row.percent, 100)}%`,
                  backgroundColor: key === 'protein' ? '#FF9F43' : key === 'carbs' ? '#7CCB5A' : '#FFC93C',
                }"
              />
            </div>
          </div>
        </div>
        <div class="mt-5 rounded-2xl bg-[#F5FAF0] p-3.5">
          <p class="text-[11px] leading-5 text-[#5E7554]">
            {{ stats.nutrition.protein.percent < 80 ? '蛋白质摄入还差一点，可以加一份鸡胸肉或希腊酸奶。' : '蛋白质摄入很充足，继续保持！' }}
            今日已摄入 {{ stats.consumed }} 千卡，目标 {{ stats.targetCalories }} 千卡。
          </p>
        </div>
      </template>
    </BottomSheet>

    <!-- 记录体重 -->
    <BottomSheet v-model="weightModal" title="记录体重">
      <p class="text-[12px] leading-5 text-[#7D8C78]">同一天重复记录会覆盖当天数据，趋势图会同步更新。</p>
      <label class="mt-4 block text-[11px] font-medium text-[#5E6B5A]">体重（kg）</label>
      <input v-model="weightInput" type="number" step="0.1" min="30" max="200" class="field mt-1.5" />
      <button
        type="button"
        class="mt-5 w-full rounded-2xl bg-primary-600 py-3 text-[14px] font-semibold text-white"
        @click="saveWeight"
      >
        保存体重
      </button>
    </BottomSheet>

    <!-- 记录步数 -->
    <BottomSheet v-model="stepsModal" title="记录今日步数">
      <p class="text-[12px] leading-5 text-[#7D8C78]">步数按约 0.05 千卡/步换算为运动消耗，仅作用于今天。</p>
      <label class="mt-4 block text-[11px] font-medium text-[#5E6B5A]">今日步数</label>
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
