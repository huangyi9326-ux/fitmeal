<script setup>
/**
 * 双列食谱卡片
 * 点击卡片跳转详情，点击右上角爱心收藏/取消收藏
 */
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from './AppIcon.vue';
import { favoriteApi } from '../api';
import { showToast } from '../utils/toast';

const props = defineProps({
  recipe: { type: Object, required: true },
});
const emit = defineEmits(['favorite-change']);

const router = useRouter();
const favorite = ref(Boolean(props.recipe.isFavorite));
const pending = ref(false);

watch(
  () => props.recipe.isFavorite,
  (value) => {
    favorite.value = Boolean(value);
  }
);

const goDetail = () => {
  router.push(`/recipes/${props.recipe.id}`);
};

// 收藏 / 取消收藏（实时写库，刷新后状态不丢失）
const toggleFavorite = async () => {
  if (pending.value) return;
  pending.value = true;
  const next = !favorite.value;
  favorite.value = next;

  try {
    const result = next
      ? await favoriteApi.add(props.recipe.id)
      : await favoriteApi.remove(props.recipe.id);

    favorite.value = result.isFavorite;
    emit('favorite-change', {
      id: props.recipe.id,
      isFavorite: result.isFavorite,
      favoriteCount: result.favoriteCount,
    });
    showToast(next ? '已加入收藏' : '已取消收藏');
  } catch (error) {
    favorite.value = !next; // 失败回滚
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <article
    class="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-card transition-transform active:scale-[0.98]"
    @click="goDetail"
  >
    <div class="relative aspect-[4/3] overflow-hidden bg-[#EEF4EA]">
      <img
        :src="recipe.cover"
        :alt="recipe.name"
        loading="lazy"
        class="h-full w-full object-cover"
      />
      <button
        type="button"
        class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm"
        :class="favorite ? 'text-[#FF6B6B]' : 'text-[#9AA79A]'"
        :aria-label="favorite ? '取消收藏' : '收藏'"
        @click.stop="toggleFavorite"
      >
        <AppIcon name="heart" :size="16" :class="favorite ? 'fill-current' : ''" />
      </button>
    </div>

    <div class="px-2.5 pb-3 pt-2">
      <h3 class="line-clamp-1 text-[13px] font-semibold leading-5 text-ink">{{ recipe.name }}</h3>
      <p class="mt-0.5 text-[12px]">
        <span class="font-semibold text-[#FF8A1E]">{{ recipe.calories }}</span>
        <span class="ml-0.5 text-[11px] text-[#95A091]">千卡</span>
      </p>
      <div class="mt-1.5 flex flex-wrap gap-1">
        <span
          v-for="tag in recipe.tags.slice(0, 2)"
          :key="tag"
          class="rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] leading-4 text-primary-700"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </article>
</template>
