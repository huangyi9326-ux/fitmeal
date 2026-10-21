<script setup>
/**
 * 我的收藏页
 * 数据来自收藏表，取消收藏后实时从列表移除
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../components/AppIcon.vue';
import RecipeCard from '../components/RecipeCard.vue';
import { favoriteApi } from '../api';

const router = useRouter();
const list = ref([]);
const loading = ref(true);

const loadFavorites = async () => {
  loading.value = true;
  try {
    list.value = await favoriteApi.getList();
  } catch (error) {
    list.value = [];
  } finally {
    loading.value = false;
  }
};

// 卡片取消收藏后，从当前列表移除
const onFavoriteChange = (payload) => {
  if (!payload.isFavorite) {
    list.value = list.value.filter((item) => item.id !== payload.id);
  }
};

onMounted(loadFavorites);
</script>

<template>
  <div class="page">
    <header class="flex items-center px-4 py-3">
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-card"
        aria-label="返回"
        @click="router.back()"
      >
        <AppIcon name="chevron-left" :size="18" />
      </button>
      <div class="flex-1 text-center">
        <h1 class="text-[16px] font-semibold text-ink">我的收藏</h1>
        <p class="text-[10px] text-muted">共 {{ list.length }} 道食谱</p>
      </div>
      <span class="h-8 w-8" />
    </header>

    <main class="px-4">
      <div v-if="loading" class="grid grid-cols-2 gap-3">
        <div v-for="i in 4" :key="i" class="h-[190px] animate-pulse rounded-2xl bg-white/70" />
      </div>

      <div v-else-if="list.length" class="grid grid-cols-2 gap-3">
        <RecipeCard
          v-for="recipe in list"
          :key="recipe.id"
          :recipe="recipe"
          @favorite-change="onFavoriteChange"
        />
      </div>

      <div v-else class="card mt-2 flex flex-col items-center px-6 py-14 text-center">
        <span class="text-[34px]">💚</span>
        <p class="mt-3 text-[13px] font-medium text-ink">还没有收藏食谱</p>
        <p class="mt-1 text-[11px] text-muted">在食谱卡片上点一下爱心，就能收藏到这里</p>
        <router-link
          to="/recipes"
          class="mt-4 rounded-full bg-primary-50 px-4 py-2 text-[12px] font-medium text-primary-700"
        >
          去逛逛食谱
        </router-link>
      </div>
    </main>
  </div>
</template>
