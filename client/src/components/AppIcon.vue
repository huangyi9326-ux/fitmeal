<script setup>
/**
 * 轻量图标组件：用内联 SVG 避免引入图标库
 * 用法：<AppIcon name="heart" :size="20" />
 */
import { computed } from 'vue';

const props = defineProps({
  name: { type: String, default: 'info' },
  size: { type: [Number, String], default: 20 },
});

const icons = {
  home: '<path d="M3 10.6 12 3l9 7.6"/><path d="M5.5 9.4V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.4"/><path d="M9.5 21v-6h5v6"/>',
  chef: '<path d="M6 13.5A4.5 4.5 0 0 1 7.6 4.8a5.3 5.3 0 0 1 8.8 0A4.5 4.5 0 0 1 18 13.5"/><path d="M6 13.5h12V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9 17.5h6"/>',
  record:
    '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V2.8h6V4"/><path d="M8.5 9.5h7"/><path d="M8.5 13.5h7"/><path d="M8.5 17.5h4"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 21c.5-3.6 3.6-5.7 7.2-5.7s6.7 2.1 7.2 5.7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m16.4 16.4 4.1 4.1"/>',
  bell: '<path d="M18 9a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10 21h4"/>',
  heart:
    '<path d="M12 20.5S3.5 15.3 3.5 9.3A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.5 3.3c0 6-8.5 11.2-8.5 11.2z"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  'chevron-left': '<path d="m15 5-7 7 7 7"/>',
  'chevron-right': '<path d="m9 5 7 7-7 7"/>',
  'chevron-down': '<path d="m5 9 7 7 7-7"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  flame:
    '<path d="M12 22c4 0 7-2.8 7-6.5 0-3-1.6-5-3.4-7C14.3 7 13 5.5 13 3c-2.5 1.4-3.5 3.7-3.5 5.8 0 1.2-1 1.5-1.7.7-.4-.5-.8-1.2-.8-2.1C5.5 9.2 5 11.6 5 15c0 3.7 3 7 7 7z"/>',
  drop: '<path d="M12 3s6 6.3 6 10.5a6 6 0 0 1-12 0C6 9.3 12 3 12 3z"/>',
  leaf: '<path d="M20 4C10 4 5 8 5 14a6 6 0 0 0 6 6c6 0 9-6 9-16z"/><path d="M4 21c2-6 6-10 12-13"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  activity: '<path d="M3 12h4l2.5-6 4 13 2.5-7H21"/>',
  cup: '<path d="M7 8h10v9a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M9 5.5c0-1 1-1.5 1-2.5"/><path d="M13 5.5c0-1 1-1.5 1-2.5"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  sunrise:
    '<path d="M12 3v3"/><path d="M5 10a7 7 0 0 1 14 0"/><path d="M2 10h2M20 10h2M4.9 5.9 6 7M19.1 5.9 18 7"/><path d="M3 19h18"/><path d="M7 15h10"/>',
  scan: '<path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  camera:
    '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v14a2.5 2.5 0 0 0-2.5-2.5H4z"/><path d="M20 4h-4a3 3 0 0 0-3 3v14a2.5 2.5 0 0 1 2.5-2.5H20z"/>',
  'arrow-right': '<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>',
  crown: '<path d="M3 8l4 3 5-6 5 6 4-3-2 11H5z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  utensils:
    '<path d="M6 3v7a2 2 0 0 0 2 2v9M10 3v18"/><path d="M17 3c-1.8 1.5-2 4-2 6s.7 3 2 3 2-1 2-3-.2-4.5-2-6z"/><path d="M17 12v9"/>',
  scale: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 10a4 4 0 0 1 8 0"/><path d="m12 10 2-2"/><path d="M7 19h10"/>',
};

const inner = computed(() => icons[props.name] || icons.info);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="inner"
  />
</template>
