<script setup>
/**
 * 我的页面
 * 用户信息 / 身体数据 / 本周减脂目标 / 我的收藏 / 提醒设置 / 帮助与反馈 / 设置
 * （按需求已去除会员付费模块）
 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../components/AppIcon.vue';
import BottomSheet from '../components/BottomSheet.vue';
import { uploadApi, userApi, weightApi } from '../api';
import { showToast } from '../utils/toast';

const router = useRouter();

const profile = ref(null);
const loading = ref(false);

const settingsModal = ref(false);
const remindersModal = ref(false);
const helpModal = ref(false);
const planModal = ref(false);
const weightModal = ref(false);
const weightInput = ref('');
const avatarPending = ref(false);
const avatarInput = ref(null);

const settingsForm = reactive({
  nickname: '',
  height: '',
  currentWeight: '',
  targetWeight: '',
  targetCalories: '',
});

const reminders = reactive({
  mealReminder: true,
  waterReminder: true,
  exerciseReminder: false,
});

// 本周打卡进度
const weekPlan = computed(() => {
  const done = profile.value?.weeklyDone || 0;
  return Array.from({ length: 7 }, (_, index) => ({
    day: index + 1,
    done: index < done,
  }));
});

const remainingDays = computed(() => {
  const p = profile.value;
  if (!p) return 0;
  return Math.max(p.weeklyGoal - p.weeklyDone, 0);
});

// 体重变化文案
const weightDeltaText = computed(() => {
  const delta = profile.value?.weightDelta || 0;
  if (delta === 0) return '与上次持平';
  return `较上次 ${delta > 0 ? '+' : ''}${delta} kg`;
});

// 距离目标还可减重
const toGoalText = computed(() => {
  const value = profile.value?.toGoalWeight || 0;
  if (value >= 0) return `超过目标 ${value} kg`;
  return `还需 -${Math.abs(value)} kg`;
});

const loadProfile = async () => {
  loading.value = true;
  try {
    const data = await userApi.getProfile();
    profile.value = data;
    reminders.mealReminder = data.settings?.mealReminder ?? true;
    reminders.waterReminder = data.settings?.waterReminder ?? true;
    reminders.exerciseReminder = data.settings?.exerciseReminder ?? false;
  } catch (error) {
    // 错误提示统一处理
  } finally {
    loading.value = false;
  }
};

/** 打开设置并回填表单 */
const openSettings = () => {
  if (!profile.value) return;
  settingsForm.nickname = profile.value.nickname;
  settingsForm.height = profile.value.height;
  settingsForm.currentWeight = profile.value.currentWeight;
  settingsForm.targetWeight = profile.value.targetWeight;
  settingsForm.targetCalories = profile.value.targetCalories;
  settingsModal.value = true;
};

/** 保存设置 */
const saveSettings = async () => {
  const height = Number(settingsForm.height);
  const currentWeight = Number(settingsForm.currentWeight);
  const targetWeight = Number(settingsForm.targetWeight);
  const targetCalories = Number(settingsForm.targetCalories);

  if (!settingsForm.nickname.trim()) {
    showToast('昵称不能为空', 'error');
    return;
  }
  if (!height || height < 120 || height > 230) {
    showToast('身高需在 120-230cm 之间', 'error');
    return;
  }
  if (!currentWeight || currentWeight < 30 || currentWeight > 200) {
    showToast('当前体重需在 30-200kg 之间', 'error');
    return;
  }
  if (!targetWeight || targetWeight < 30 || targetWeight > 200) {
    showToast('目标体重需在 30-200kg 之间', 'error');
    return;
  }
  if (!targetCalories || targetCalories < 800 || targetCalories > 4000) {
    showToast('热量目标需在 800-4000 千卡之间', 'error');
    return;
  }

  try {
    await userApi.updateProfile({
      nickname: settingsForm.nickname.trim(),
      height,
      currentWeight,
      targetWeight,
      targetCalories,
    });
    settingsModal.value = false;
    showToast('资料已保存');
    await loadProfile();
  } catch (error) {
    // 已统一提示
  }
};

/** 头像上传（走后端 /api/upload） */
const chooseAvatar = () => avatarInput.value?.click();

const onAvatarChange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('图片不能超过 5MB', 'error');
    return;
  }

  avatarPending.value = true;
  try {
    const result = await uploadApi.uploadImage(file);
    await userApi.updateProfile({ avatar: result.url });
    showToast('头像已更新');
    await loadProfile();
  } catch (error) {
    // 已统一提示
  } finally {
    avatarPending.value = false;
    event.target.value = '';
  }
};

/** 切换提醒设置（写入 user.settings） */
const toggleReminder = async (key) => {
  reminders[key] = !reminders[key];
  try {
    await userApi.updateSettings({ [key]: reminders[key] });
    if (profile.value) profile.value.settings = { ...profile.value.settings, [key]: reminders[key] };
  } catch (error) {
    reminders[key] = !reminders[key];
  }
};

const openWeightModal = () => {
  weightInput.value = profile.value?.currentWeight || '';
  weightModal.value = true;
};

/** 快速记录体重 */
const saveWeight = async () => {
  const value = Number(weightInput.value);
  if (!value || value < 30 || value > 200) {
    showToast('请输入 30-200kg 之间的体重', 'error');
    return;
  }
  try {
    await weightApi.create({ weight: value });
    weightModal.value = false;
    showToast('体重已记录');
    await loadProfile();
  } catch (error) {
    // 已统一提示
  }
};

const faqs = [
  { q: '如何加入今日饮食计划？', a: '进入任意食谱详情页，点击底部「加入今日计划」，选择早餐 / 午餐 / 晚餐 / 加餐即可。' },
  { q: '饮食记录可以修改吗？', a: '在记录页点击记录右侧的编辑按钮，就可以修改名称、热量、餐次和时间。' },
  { q: '数据会丢失吗？', a: '所有数据都保存在本地 SQLite 数据库中，刷新页面或重启服务都不会丢失。' },
  { q: '如何更换头像？', a: '在「我的 - 设置」中点击头像区域，选择本地图片即可上传更换。' },
];

onMounted(loadProfile);
</script>

<template>
  <div class="page">
    <!-- 顶部个人信息 -->
    <header class="hero-bg relative overflow-hidden px-4 pb-6 pt-6">
      <button
        type="button"
        class="absolute right-4 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#54644F] shadow-sm"
        aria-label="设置"
        @click="openSettings"
      >
        <AppIcon name="settings" :size="17" />
      </button>

      <div class="relative z-10 flex items-center gap-3">
        <div class="relative shrink-0">
          <img
            :src="profile?.avatar || '/images/avatar.jpg'"
            alt="头像"
            class="h-[62px] w-[62px] rounded-full border-[3px] border-white object-cover shadow"
          />
          <span
            v-if="avatarPending"
            class="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-[10px] text-white"
          >
            上传中
          </span>
        </div>

        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <h1 class="max-w-[120px] truncate text-[20px] font-bold text-ink">
              {{ profile?.nickname || '轻盈用户' }}
            </h1>
            <span class="flex items-center gap-0.5 rounded-full bg-[#FFF6E5] px-1.5 py-0.5 text-[9px] font-medium text-[#D99B23]">
              <AppIcon name="crown" :size="10" class="fill-current" />
              Lv.{{ profile?.level || 1 }}
            </span>
          </div>
          <p class="mt-1 text-[12px] text-[#5E6B5A]">
            已坚持
            <span class="mx-0.5 text-[17px] font-bold text-primary-700">{{ profile?.joinedDays || 0 }}</span>
            天
          </p>
          <p class="mt-0.5 text-[10px] text-[#7E8C79]">
            每一次健康的选择，都是更好的自己
            <span class="text-primary-400">♡</span>
          </p>
        </div>
      </div>

      <div class="handwrite pointer-events-none absolute right-4 top-[86px] text-[9px] leading-[1.35]">
        坚持健康饮食<br />遇见更轻盈的自己
        <span class="text-primary-400">♡</span>
      </div>
    </header>

    <!-- 加载中 -->
    <div v-if="loading && !profile" class="px-4">
      <div class="h-[120px] animate-pulse rounded-3xl bg-white/70" />
    </div>

    <template v-if="profile">
      <!-- 身体数据 -->
      <section class="px-4">
        <div class="rounded-[24px] bg-gradient-to-br from-[#7CD06A] via-[#A9DE96] to-[#D9EDC9] p-[3px] shadow-soft">
          <div class="rounded-[21px] bg-white px-2 py-3.5">
            <div class="flex items-center justify-between px-2">
              <h2 class="text-[13px] font-semibold text-ink">我的身体数据</h2>
              <button
                type="button"
                class="flex items-center gap-0.5 text-[9px] text-[#93A091]"
                @click="openWeightModal"
              >
                上次记录：今天
                <AppIcon name="chevron-right" :size="11" />
              </button>
            </div>

            <div class="mt-3 grid grid-cols-4 divide-x divide-[#F1F5EC]">
              <button type="button" class="flex flex-col items-center px-1" @click="openWeightModal">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF8E8] text-primary-600">
                  <AppIcon name="scale" :size="15" />
                </span>
                <p class="mt-1.5 text-[17px] font-bold leading-5 text-ink">
                  {{ profile.currentWeight }}
                  <span class="text-[9px] font-normal text-muted">公斤</span>
                </p>
                <p class="text-[9px] text-[#93A091]">当前体重</p>
                <span class="mt-1 rounded-full bg-primary-50 px-1.5 py-0.5 text-[8px] text-primary-700">
                  {{ weightDeltaText }}
                </span>
              </button>

              <div class="flex flex-col items-center px-1">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF3E6] text-[#FF9F43]">
                  <AppIcon name="target" :size="15" />
                </span>
                <p class="mt-1.5 text-[17px] font-bold leading-5 text-ink">
                  {{ profile.targetWeight }}
                  <span class="text-[9px] font-normal text-muted">公斤</span>
                </p>
                <p class="text-[9px] text-[#93A091]">目标体重</p>
                <span class="mt-1 rounded-full bg-[#FFF6E9] px-1.5 py-0.5 text-[8px] text-[#DE9A2B]">
                  {{ toGoalText }}
                </span>
              </div>

              <div class="flex flex-col items-center px-1">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF4FB] text-[#5AB0E8]">
                  <AppIcon name="activity" :size="15" />
                </span>
                <p class="mt-1.5 text-[17px] font-bold leading-5 text-ink">{{ profile.bmi }}</p>
                <p class="text-[9px] text-[#93A091]">BMI 指数</p>
                <span class="mt-1 rounded-full bg-primary-50 px-1.5 py-0.5 text-[8px] text-primary-700">
                  {{ profile.bmiLabel }}
                </span>
              </div>

              <div class="flex flex-col items-center px-1">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF8E8] text-primary-600">
                  <AppIcon name="record" :size="15" />
                </span>
                <p class="mt-1.5 text-[17px] font-bold leading-5 text-ink">
                  {{ profile.joinedDays }}
                  <span class="text-[9px] font-normal text-muted">天</span>
                </p>
                <p class="text-[9px] text-[#93A091]">打卡天数</p>
                <span class="mt-1 rounded-full bg-primary-50 px-1.5 py-0.5 text-[8px] text-primary-700">
                  连续 {{ profile.streakDays }} 天
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 本周减脂目标 / 减脂进度 -->
      <section class="mt-3 px-4">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#F0F9E8] via-[#F7FBF3] to-[#EAF6DD] p-4 shadow-card">
          <div class="relative z-10">
            <div class="flex items-baseline gap-1.5">
              <h2 class="text-[14px] font-semibold text-ink">本周减脂目标</h2>
              <span class="text-[16px] font-bold text-primary-700">
                {{ profile.weeklyDone }}
                <span class="text-[11px] font-normal text-[#7D8C78]">/ {{ profile.weeklyGoal }} 天</span>
              </span>
            </div>
            <p class="mt-1 text-[10px] text-[#7D8C78]">
              {{ remainingDays > 0 ? `再坚持 ${remainingDays} 天，达成本周目标！` : '本周目标已达成，太棒啦！' }}
            </p>
            <div class="mt-2.5 h-[8px] overflow-hidden rounded-full bg-[#E3EFD8]">
              <div
                class="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                :style="{ width: `${Math.min((profile.weeklyDone / profile.weeklyGoal) * 100, 100)}%` }"
              />
            </div>
            <button
              type="button"
              class="mt-3 flex items-center gap-0.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-medium text-[#4E7A3C] shadow-sm"
              @click="planModal = true"
            >
              查看计划
              <AppIcon name="chevron-right" :size="11" />
            </button>
          </div>
          <!-- 靶心装饰 -->
          <div class="pointer-events-none absolute -right-1 -top-2 text-[74px] opacity-25">🎯</div>
        </div>
      </section>

      <!-- 功能列表 -->
      <section class="mt-3 space-y-2.5 px-4">
        <!-- 我的收藏 -->
        <button
          type="button"
          class="card flex w-full items-center gap-3 px-4 py-3.5 text-left"
          @click="router.push('/favorites')"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0EE] text-[#F0807C]">
            <AppIcon name="heart" :size="18" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[13px] font-medium text-ink">我的收藏</span>
            <span class="block text-[9px] text-muted">已收藏 {{ profile.favoriteCount }} 道食谱</span>
          </span>
          <AppIcon name="chevron-right" :size="16" class="text-[#B9C5B5]" />
        </button>

        <!-- 提醒设置 -->
        <button
          type="button"
          class="card flex w-full items-center gap-3 px-4 py-3.5 text-left"
          @click="remindersModal = true"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF6FE] text-[#5BA9E4]">
            <AppIcon name="bell" :size="18" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[13px] font-medium text-ink">提醒设置</span>
            <span class="block text-[9px] text-muted">饮食提醒、喝水提醒、运动提醒</span>
          </span>
          <AppIcon name="chevron-right" :size="16" class="text-[#B9C5B5]" />
        </button>

        <!-- 帮助与反馈 -->
        <button
          type="button"
          class="card flex w-full items-center gap-3 px-4 py-3.5 text-left"
          @click="helpModal = true"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3EFFB] text-[#9177CE]">
            <AppIcon name="info" :size="18" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[13px] font-medium text-ink">帮助与反馈</span>
            <span class="block text-[9px] text-muted">常见问题、意见反馈</span>
          </span>
          <AppIcon name="chevron-right" :size="16" class="text-[#B9C5B5]" />
        </button>

        <!-- 设置 -->
        <button
          type="button"
          class="card flex w-full items-center gap-3 px-4 py-3.5 text-left"
          @click="openSettings"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F3EE] text-[#7C8B77]">
            <AppIcon name="settings" :size="18" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[13px] font-medium text-ink">设置</span>
            <span class="block text-[9px] text-muted">个人资料、身体数据、热量目标</span>
          </span>
          <AppIcon name="chevron-right" :size="16" class="text-[#B9C5B5]" />
        </button>
      </section>

      <p class="mt-5 text-center text-[10px] text-[#AEBAAB]">轻盈食光 · 好好吃饭，慢慢变好</p>
    </template>

    <!-- 编辑设置 -->
    <BottomSheet v-model="settingsModal" title="编辑个人资料">
      <div class="flex justify-center">
        <button type="button" class="relative" @click="chooseAvatar">
          <img
            :src="profile?.avatar || '/images/avatar.jpg'"
            alt="头像"
            class="h-[68px] w-[68px] rounded-full border-2 border-white object-cover shadow"
          />
          <span class="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white shadow">
            <AppIcon name="camera" :size="13" />
          </span>
        </button>
        <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
      </div>
      <p class="mt-1 text-center text-[9px] text-muted">点击头像更换，支持 jpg / png / webp</p>

      <div class="mt-4 space-y-3">
        <div>
          <label class="text-[11px] font-medium text-[#5E6B5A]">昵称</label>
          <input v-model="settingsForm.nickname" type="text" class="field mt-1" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-[11px] font-medium text-[#5E6B5A]">身高（cm）</label>
            <input v-model="settingsForm.height" type="number" class="field mt-1" />
          </div>
          <div>
            <label class="text-[11px] font-medium text-[#5E6B5A]">当前体重（kg）</label>
            <input v-model="settingsForm.currentWeight" type="number" step="0.1" class="field mt-1" />
          </div>
          <div>
            <label class="text-[11px] font-medium text-[#5E6B5A]">目标体重（kg）</label>
            <input v-model="settingsForm.targetWeight" type="number" step="0.1" class="field mt-1" />
          </div>
          <div>
            <label class="text-[11px] font-medium text-[#5E6B5A]">每日热量（千卡）</label>
            <input v-model="settingsForm.targetCalories" type="number" class="field mt-1" />
          </div>
        </div>
      </div>

      <button
        type="button"
        class="mt-5 w-full rounded-2xl bg-primary-600 py-3 text-[14px] font-semibold text-white"
        @click="saveSettings"
      >
        保存资料
      </button>
    </BottomSheet>

    <!-- 提醒设置 -->
    <BottomSheet v-model="remindersModal" title="提醒设置">
      <div class="space-y-2.5">
        <div class="flex items-center gap-3 rounded-2xl bg-[#F8FBF5] p-3.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF3E6] text-[#FF9F43]">
            <AppIcon name="utensils" :size="16" />
          </span>
          <div class="flex-1">
            <p class="text-[12px] font-medium text-ink">饮食提醒</p>
            <p class="text-[9px] text-muted">每天 08:00 / 12:00 / 18:00 提醒记录三餐</p>
          </div>
          <button
            type="button"
            class="relative h-5 w-9 rounded-full transition-colors"
            :class="reminders.mealReminder ? 'bg-primary-500' : 'bg-[#DDE6D8]'"
            :aria-label="reminders.mealReminder ? '关闭饮食提醒' : '开启饮食提醒'"
            @click="toggleReminder('mealReminder')"
          >
            <span
              class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
              :class="reminders.mealReminder ? 'left-[18px]' : 'left-0.5'"
            />
          </button>
        </div>

        <div class="flex items-center gap-3 rounded-2xl bg-[#F8FBF5] p-3.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EDF6FE] text-[#5BA9E4]">
            <AppIcon name="drop" :size="16" />
          </span>
          <div class="flex-1">
            <p class="text-[12px] font-medium text-ink">喝水提醒</p>
            <p class="text-[9px] text-muted">每小时提醒补充水分</p>
          </div>
          <button
            type="button"
            class="relative h-5 w-9 rounded-full transition-colors"
            :class="reminders.waterReminder ? 'bg-primary-500' : 'bg-[#DDE6D8]'"
            aria-label="喝水提醒开关"
            @click="toggleReminder('waterReminder')"
          >
            <span
              class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
              :class="reminders.waterReminder ? 'left-[18px]' : 'left-0.5'"
            />
          </button>
        </div>

        <div class="flex items-center gap-3 rounded-2xl bg-[#F8FBF5] p-3.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EEF8E8] text-primary-600">
            <AppIcon name="activity" :size="16" />
          </span>
          <div class="flex-1">
            <p class="text-[12px] font-medium text-ink">运动提醒</p>
            <p class="text-[9px] text-muted">久坐时提醒起身活动</p>
          </div>
          <button
            type="button"
            class="relative h-5 w-9 rounded-full transition-colors"
            :class="reminders.exerciseReminder ? 'bg-primary-500' : 'bg-[#DDE6D8]'"
            aria-label="运动提醒开关"
            @click="toggleReminder('exerciseReminder')"
          >
            <span
              class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
              :class="reminders.exerciseReminder ? 'left-[18px]' : 'left-0.5'"
            />
          </button>
        </div>
      </div>
      <p class="mt-4 text-center text-[9px] text-[#AEBAAB]">提醒设置会保存到你的账户</p>
    </BottomSheet>

    <!-- 本周计划 -->
    <BottomSheet v-model="planModal" title="本周减脂计划">
      <div class="grid grid-cols-7 gap-1.5">
        <div
          v-for="item in weekPlan"
          :key="item.day"
          class="flex flex-col items-center rounded-xl py-2.5"
          :class="item.done ? 'bg-primary-50 text-primary-700' : 'bg-[#F8FBF5] text-[#9AA79A]'"
        >
          <span class="text-[9px]">D{{ item.day }}</span>
          <span
            class="mt-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px]"
            :class="item.done ? 'bg-primary-600 text-white' : 'bg-[#E8EFE3] text-[#9AA79A]'"
          >
            {{ item.done ? '✓' : item.day }}
          </span>
        </div>
      </div>
      <p class="mt-2 text-center text-[10px] text-muted">
        本周已完成 {{ profile?.weeklyDone }} / {{ profile?.weeklyGoal }} 天
      </p>
      <div class="mt-4 space-y-2">
        <div v-for="(tip, index) in ['每天记录三餐，热量控制在目标范围内', '每天喝够 2000ml 水，少量多次', '每周至少 3 次 30 分钟以上的运动', '保证 7-8 小时睡眠，规律作息']" :key="index" class="flex items-start gap-2 rounded-xl bg-[#F8FBF5] px-3 py-2.5">
          <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white">
            <AppIcon name="check" :size="9" />
          </span>
          <p class="text-[11px] leading-4 text-[#5B6956]">{{ tip }}</p>
        </div>
      </div>
    </BottomSheet>

    <!-- 帮助与反馈 -->
    <BottomSheet v-model="helpModal" title="帮助与反馈">
      <div class="space-y-2.5">
        <details
          v-for="(faq, index) in faqs"
          :key="index"
          class="group rounded-2xl bg-[#F8FBF5] px-3.5 py-3"
        >
          <summary class="flex cursor-pointer items-center justify-between text-[12px] font-medium text-ink">
            {{ faq.q }}
            <AppIcon name="chevron-down" :size="14" class="text-[#9AA79A] group-open:rotate-180" />
          </summary>
          <p class="mt-2 text-[11px] leading-5 text-[#67755F]">{{ faq.a }}</p>
        </details>
      </div>
      <div class="mt-4 rounded-2xl border border-[#EEF3E8] px-3.5 py-3">
        <p class="text-[11px] font-medium text-ink">意见反馈</p>
        <p class="mt-1 text-[10px] leading-4 text-muted">这是本地演示项目，如遇问题可查看项目 README 或检查后端服务是否启动。</p>
      </div>
    </BottomSheet>

    <!-- 记录体重 -->
    <BottomSheet v-model="weightModal" title="记录体重">
      <p class="text-[12px] leading-5 text-[#7D8C78]">记录今天的体重，身体数据与趋势图会一起更新。</p>
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
  </div>
</template>
