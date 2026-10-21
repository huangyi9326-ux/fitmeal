/**
 * 日期工具（前端）
 * 统一使用 YYYY-MM-DD 字符串，避免 new Date('YYYY-MM-DD') 的 UTC 偏移问题
 */

const pad = (n) => String(n).padStart(2, '0');

/** 解析日期字符串为本地 Date */
export function parseDate(dateStr) {
  if (dateStr instanceof Date) return dateStr;
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Date -> YYYY-MM-DD */
export function formatDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 今天 */
export function todayStr() {
  return formatDate(new Date());
}

/** 日期加减天数 */
export function addDays(dateStr, amount) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + amount);
  return formatDate(d);
}

/** M/D */
export function formatShort(dateStr) {
  const d = parseDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 星期几（周一 ... 周日） */
export function weekdayCN(dateStr) {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[parseDate(dateStr).getDay()];
}

/** 是否为今天 */
export function isToday(dateStr) {
  return dateStr === todayStr();
}

/**
 * 取某个日期所在的一周（周一至周日）
 * 记录页顶部的日期选择条使用
 */
export function weekOf(dateStr) {
  const d = parseDate(dateStr);
  const day = d.getDay() === 0 ? 7 : d.getDay(); // 周日视为第 7 天
  const monday = addDays(dateStr, 1 - day);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return {
      date,
      weekday: weekdayCN(date),
      short: formatShort(date),
      isToday: isToday(date),
    };
  });
}

/** 根据时间返回问候语 */
export function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早安';
  if (hour < 14) return '午安';
  if (hour < 18) return '下午好';
  return '晚上好';
}

/** 数字千分位 */
export function formatNumber(value) {
  return Number(value || 0).toLocaleString('zh-CN');
}
