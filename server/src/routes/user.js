/**
 * 用户相关接口
 * 单用户 Demo：所有数据默认归属于 id = 1 的用户
 */
const express = require('express');
const db = require('../db');
const { success, fail } = require('../utils/response');
const { today, diffDays } = require('../utils/date');
const {
  calcBMI,
  bmiLabel,
  parseJson,
  round1,
  stepsToCalories,
} = require('../utils/helpers');

const router = express.Router();
const USER_ID = 1;

/** 组装用户资料（含 BMI、体重变化、打卡天数等派生数据） */
function getUserProfile() {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(USER_ID);
  if (!user) return null;

  const recentWeights = db
    .prepare('SELECT weight FROM weight_records WHERE user_id = ? ORDER BY record_date DESC LIMIT 2')
    .all(USER_ID);

  const currentWeight = recentWeights[0] ? recentWeights[0].weight : user.current_weight;
  const previousWeight = recentWeights[1] ? recentWeights[1].weight : currentWeight;
  const bmi = calcBMI(currentWeight, user.height);
  const joinedDate = (user.joined_at || '').slice(0, 10);

  const favoriteCount = db
    .prepare('SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?')
    .get(USER_ID).n;

  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    height: user.height,
    currentWeight: round1(currentWeight),
    previousWeight: round1(previousWeight),
    weightDelta: round1(currentWeight - previousWeight),
    targetWeight: round1(user.target_weight),
    toGoalWeight: round1(user.target_weight - currentWeight),
    targetCalories: user.target_calories,
    waterGoal: user.water_goal,
    stepGoal: user.step_goal,
    dailySteps: user.steps_date === today() ? user.daily_steps : 0,
    stepsCalories: stepsToCalories(user.steps_date === today() ? user.daily_steps : 0),
    level: user.level,
    streakDays: user.streak_days,
    weeklyGoal: user.weekly_goal,
    weeklyDone: user.weekly_done,
    settings: parseJson(user.settings, {}),
    joinedAt: user.joined_at,
    joinedDays: joinedDate ? diffDays(today(), joinedDate) + 1 : 1,
    bmi,
    bmiLabel: bmiLabel(bmi),
    favoriteCount,
  };
}

// 获取用户资料
router.get('/', (req, res) => {
  const profile = getUserProfile();
  if (!profile) return fail(res, '用户不存在', 404);
  return success(res, profile);
});

// 更新用户资料（昵称 / 头像 / 身高 / 目标体重 / 目标热量 / 喝水目标 / 步数目标）
router.put('/', (req, res) => {
  const allowed = {
    nickname: 'nickname',
    avatar: 'avatar',
    height: 'height',
    targetWeight: 'target_weight',
    targetCalories: 'target_calories',
    waterGoal: 'water_goal',
    stepGoal: 'step_goal',
    weeklyGoal: 'weekly_goal',
  };

  const fields = [];
  const values = [];
  Object.entries(allowed).forEach(([key, column]) => {
    if (req.body[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(req.body[key]);
    }
  });

  if (!fields.length) return fail(res, '没有需要更新的字段');

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values, USER_ID);

  // 如果直接修改当前体重，同步写入今日体重记录，保证趋势图一致
  if (req.body.currentWeight !== undefined) {
    const weight = Number(req.body.currentWeight);
    if (Number.isNaN(weight) || weight < 30 || weight > 200) {
      return fail(res, '体重需在 30-200kg 之间');
    }
    db.prepare(`
      INSERT INTO weight_records (user_id, weight, record_date)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, record_date) DO UPDATE SET weight = excluded.weight
    `).run(USER_ID, weight, today());
    db.prepare('UPDATE users SET current_weight = ? WHERE id = ?').run(weight, USER_ID);
  }

  return success(res, getUserProfile(), '资料已更新');
});

// 更新今日步数（首页 / 记录页的步数模块）
router.patch('/steps', (req, res) => {
  const steps = Number(req.body.steps);
  if (Number.isNaN(steps) || steps < 0 || steps > 100000) {
    return fail(res, '步数需在 0-100000 之间');
  }
  db.prepare('UPDATE users SET daily_steps = ?, steps_date = ? WHERE id = ?').run(
    Math.round(steps),
    today(),
    USER_ID
  );
  return success(res, getUserProfile(), '步数已更新');
});

// 更新提醒等设置项（JSON 合并）
router.put('/settings', (req, res) => {
  const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(USER_ID);
  const merged = { ...parseJson(user.settings, {}), ...req.body };
  db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify(merged), USER_ID);
  return success(res, merged, '设置已保存');
});

module.exports = router;
module.exports.getUserProfile = getUserProfile;
