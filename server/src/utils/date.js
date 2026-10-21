/**
 * 通用日期工具
 * 项目内的日期统一使用 YYYY-MM-DD 字符串，避免时区带来的偏移问题。
 */
const pad = (n) => String(n).padStart(2, '0');

/** 将 Date 对象格式化为 YYYY-MM-DD（按服务器本地时区） */
function formatDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 获取今天的日期字符串 */
function today() {
  return formatDate(new Date());
}

/** 获取当前时间 HH:mm */
function currentTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 日期字符串加减天数 */
function addDays(dateStr, amount) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + amount);
  return formatDate(d);
}

/** 计算两个日期相差的天数（a - b），用于“已坚持 N 天” */
function diffDays(a, b) {
  const start = new Date(`${a}T00:00:00`);
  const end = new Date(`${b}T00:00:00`);
  return Math.round((start - end) / 86400000);
}

module.exports = { formatDate, today, currentTime, addDays, diffDays };
