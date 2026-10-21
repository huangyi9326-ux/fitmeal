<script setup>
/** 全局轻提示 */
import { toastState } from '../utils/toast';
import AppIcon from './AppIcon.vue';
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-0 top-16 z-[80] flex justify-center">
      <Transition name="toast">
        <div
          v-if="toastState.visible"
          class="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] text-white shadow-lg"
          :class="toastState.type === 'error' ? 'bg-[#D9534F]' : 'bg-[#33422F]'"
        >
          <AppIcon :name="toastState.type === 'error' ? 'x' : 'check'" :size="14" />
          <span>{{ toastState.message }}</span>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
