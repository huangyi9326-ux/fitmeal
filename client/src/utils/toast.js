/**
 * 全局轻提示：任何页面 import { showToast } 即可调用
 */
import { reactive } from 'vue';

export const toastState = reactive({
  visible: false,
  message: '',
  type: 'success',
});

let timer = null;

export function showToast(message, type = 'success') {
  if (!message) return;
  toastState.message = message;
  toastState.type = type;
  toastState.visible = true;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    toastState.visible = false;
  }, 1800);
}
