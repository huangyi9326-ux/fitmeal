<script setup>
/** 底部弹层：用于记录饮食、修改资料、选择餐次等场景 */
import AppIcon from './AppIcon.vue';

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const close = () => emit('update:modelValue', false);
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="fixed inset-0 z-[60] flex items-end justify-center">
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/35" @click="close" />

        <!-- 面板 -->
        <div
          class="sheet-panel relative max-h-[84vh] w-full max-w-[375px] overflow-y-auto rounded-t-[26px] bg-white px-5 pb-8 pt-5"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-[16px] font-semibold text-ink">{{ title }}</h3>
            <button
              type="button"
              class="rounded-full bg-[#F2F7ED] p-1.5 text-[#7B8A76]"
              aria-label="关闭"
              @click="close"
            >
              <AppIcon name="x" :size="16" />
            </button>
          </div>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
