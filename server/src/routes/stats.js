/**
 * 统计接口：首页 / 记录页所需的聚合数据
 */
const express = require('express');
const db = require('../db');
const { success } = require('../utils/response');
const { today } = require('../utils/date');
const {
  mealGoals,
  nutritionGoals,
  stepsToCalories,
  round1,
} = require('../utils/helpers');

const router = express.Router();
const USER_ID = 1;
const CUP_SIZE = 250;
const MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'snack'];

/** 组装某一天的全部统计数据 */
function buildDailyStats(date) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(USER_ID);
  const targetCalories = user.target_calories;

  // 按餐次汇总饮食记录
  const mealRows = db
    .prepare(`
      SELECT meal_type, COUNT(*) AS count,
             COALESCE(SUM(calories), 0) AS calories,
             COALESCE(SUM(protein), 0) AS protein,
             COALESCE(SUM(carbs), 0) AS carbs,
             COALESCE(SUM(fat), 0) AS fat
      FROM diet_records
      WHERE user_id = ? AND record_date = ?
      GROUP BY meal_type
    `)
    .all(USER_ID, date);

  const rowsByMeal = Object.fromEntries(mealRows.map((row) => [row.meal_type, row]));
  const goals = mealGoals(targetCalories);
  const nGoals = nutritionGoals(targetCalories);

  const meals = {};
  let consumed = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let recordCount = 0;

  MEAL_KEYS.forEach((key) => {
    const row = rowsByMeal[key];
    const cal = Math.round(row ? row.calories : 0);
    consumed += cal;
    protein += row ? row.protein : 0;
    carbs += row ? row.carbs : 0;
    fat += row ? row.fat : 0;
    recordCount += row ? row.count : 0;

    meals[key] = {
      consumed: cal,
      goal: goals[key],
      percent: goals[key] ? Math.round((cal / goals[key]) * 100) : 0,
      count: row ? row.count : 0,
    };
  });

  // 喝水
  const waterTotal = db
    .prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total FROM water_records
      WHERE user_id = ? AND record_date = ?
    `)
    .get(USER_ID, date).total;

  // 步数只统计“今天”，历史日期没有步数记录
  const steps = user.steps_date === date ? user.daily_steps : 0;

  // 体重（截至所选日期的最近两条）
  const weights = db
    .prepare(`
      SELECT weight FROM weight_records
      WHERE user_id = ? AND record_date <= ?
      ORDER BY record_date DESC LIMIT 2
    `)
    .all(USER_ID, date);
  const currentWeight = weights[0] ? weights[0].weight : user.current_weight;
  const previousWeight = weights[1] ? weights[1].weight : currentWeight;

  return {
    date,
    user: {
      nickname: user.nickname,
      avatar: user.avatar,
      height: user.height,
      targetWeight: round1(user.target_weight),
      currentWeight: round1(currentWeight),
      waterGoal: user.water_goal,
      stepGoal: user.step_goal,
      targetCalories,
    },
    targetCalories,
    consumed,
    remaining: Math.max(targetCalories - consumed, 0),
    percent: targetCalories ? Math.min(Math.round((consumed / targetCalories) * 100), 100) : 0,
    recordCount,
    nutrition: {
      protein: {
        consumed: round1(protein),
        goal: nGoals.protein,
        percent: nGoals.protein ? Math.round((protein / nGoals.protein) * 100) : 0,
      },
      carbs: {
        consumed: round1(carbs),
        goal: nGoals.carbs,
        percent: nGoals.carbs ? Math.round((carbs / nGoals.carbs) * 100) : 0,
      },
      fat: {
        consumed: round1(fat),
        goal: nGoals.fat,
        percent: nGoals.fat ? Math.round((fat / nGoals.fat) * 100) : 0,
      },
    },
    meals,
    water: {
      current: waterTotal,
      goal: user.water_goal,
      percent: user.water_goal ? Math.min(Math.round((waterTotal / user.water_goal) * 100), 100) : 0,
      cups: Math.floor(waterTotal / CUP_SIZE),
      cupGoal: Math.ceil(user.water_goal / CUP_SIZE),
    },
    steps: {
      current: steps,
      goal: user.step_goal,
      calories: stepsToCalories(steps),
      percent: user.step_goal ? Math.min(Math.round((steps / user.step_goal) * 100), 100) : 0,
    },
    weight: {
      current: round1(currentWeight),
      previous: round1(previousWeight),
      delta: round1(currentWeight - previousWeight),
      goal: round1(user.target_weight),
      toGoal: round1(user.target_weight - currentWeight),
    },
  };
}

// 首页统计（默认今天）
router.get('/home', (req, res) => {
  return success(res, buildDailyStats(req.query.date || today()));
});

// 记录页统计（支持指定日期）
router.get('/daily', (req, res) => {
  return success(res, buildDailyStats(req.query.date || today()));
});

module.exports = router;
module.exports.buildDailyStats = buildDailyStats;
