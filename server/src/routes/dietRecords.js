/**
 * 饮食记录接口：增删改查
 */
const express = require('express');
const db = require('../db');
const { success, fail } = require('../utils/response');
const { today, currentTime } = require('../utils/date');
const { mapDietRecord, guessMealType, round1 } = require('../utils/helpers');

const router = express.Router();
const USER_ID = 1;
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

/** 自定义食物在未填写营养素时，按常见比例估算 */
function estimateMacros(calories) {
  return {
    protein: round1((calories * 0.25) / 4),
    carbs: round1((calories * 0.45) / 4),
    fat: round1((calories * 0.3) / 9),
  };
}

// 查询某天的饮食记录
router.get('/', (req, res) => {
  const date = req.query.date || today();
  const rows = db
    .prepare(`
      SELECT * FROM diet_records
      WHERE user_id = ? AND record_date = ?
      ORDER BY record_time ASC, id ASC
    `)
    .all(USER_ID, date);

  const records = rows.map(mapDietRecord);
  const summary = records.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      acc[item.mealType] = (acc[item.mealType] || 0) + item.calories;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  summary.protein = round1(summary.protein);
  summary.carbs = round1(summary.carbs);
  summary.fat = round1(summary.fat);

  return success(res, { date, total: records.length, records, summary });
});

// 新增饮食记录：可从食谱加入，也可自定义食物
router.post('/', (req, res) => {
  const {
    recipeId,
    mealType,
    foodName,
    calories,
    protein,
    carbs,
    fat,
    note,
    recordDate,
    recordTime,
  } = req.body;

  const date = recordDate || today();
  const time = recordTime || currentTime();
  const type = MEAL_TYPES.includes(mealType) ? mealType : guessMealType(time);

  let payload;

  if (recipeId) {
    // 从食谱加入今日计划：名称、热量、营养素都取食谱快照
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
    if (!recipe) return fail(res, '食谱不存在', 404);
    const ingredients = JSON.parse(recipe.ingredients || '[]');
    payload = {
      recipeId: recipe.id,
      foodName: recipe.name,
      description: ingredients.slice(0, 3).map((i) => i.name).join('、'),
      image: recipe.cover_image,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
    };
  } else {
    // 自定义食物
    if (!foodName || !String(foodName).trim()) return fail(res, '请输入食物名称');
    const cal = Number(calories);
    if (Number.isNaN(cal) || cal <= 0 || cal > 5000) return fail(res, '热量需在 1-5000 千卡之间');
    const estimated = estimateMacros(cal);
    payload = {
      recipeId: null,
      foodName: String(foodName).trim(),
      description: note || '自定义食物',
      image: '',
      calories: Math.round(cal),
      protein: protein !== undefined ? round1(protein) : estimated.protein,
      carbs: carbs !== undefined ? round1(carbs) : estimated.carbs,
      fat: fat !== undefined ? round1(fat) : estimated.fat,
    };
  }

  const info = db
    .prepare(`
      INSERT INTO diet_records
        (user_id, recipe_id, meal_type, food_name, description, image, calories,
         protein, carbs, fat, record_date, record_time)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      USER_ID,
      payload.recipeId,
      type,
      payload.foodName,
      payload.description,
      payload.image,
      payload.calories,
      payload.protein,
      payload.carbs,
      payload.fat,
      date,
      time
    );

  const row = db.prepare('SELECT * FROM diet_records WHERE id = ?').get(info.lastInsertRowid);
  return success(res, mapDietRecord(row), '已记录饮食');
});

// 修改饮食记录（餐次 / 名称 / 热量 / 时间）
router.put('/:id', (req, res) => {
  const record = db
    .prepare('SELECT * FROM diet_records WHERE id = ? AND user_id = ?')
    .get(req.params.id, USER_ID);
  if (!record) return fail(res, '记录不存在', 404);

  const fields = [];
  const values = [];

  if (req.body.mealType && MEAL_TYPES.includes(req.body.mealType)) {
    fields.push('meal_type = ?');
    values.push(req.body.mealType);
  }
  if (req.body.foodName !== undefined) {
    if (!String(req.body.foodName).trim()) return fail(res, '食物名称不能为空');
    fields.push('food_name = ?');
    values.push(String(req.body.foodName).trim());
  }
  if (req.body.recordTime) {
    fields.push('record_time = ?');
    values.push(req.body.recordTime);
  }
  if (req.body.note !== undefined) {
    fields.push('description = ?');
    values.push(req.body.note);
  }
  if (req.body.calories !== undefined) {
    const cal = Number(req.body.calories);
    if (Number.isNaN(cal) || cal <= 0 || cal > 5000) return fail(res, '热量需在 1-5000 千卡之间');
    fields.push('calories = ?');
    values.push(Math.round(cal));

    // 热量变化时按比例调整三大营养素，保持数据自洽
    if (req.body.protein === undefined && req.body.carbs === undefined && req.body.fat === undefined) {
      const ratio = record.calories > 0 ? cal / record.calories : 1;
      fields.push('protein = ?', 'carbs = ?', 'fat = ?');
      values.push(
        round1(record.protein * ratio),
        round1(record.carbs * ratio),
        round1(record.fat * ratio)
      );
    }
  }

  if (req.body.protein !== undefined) {
    fields.push('protein = ?');
    values.push(round1(req.body.protein));
  }
  if (req.body.carbs !== undefined) {
    fields.push('carbs = ?');
    values.push(round1(req.body.carbs));
  }
  if (req.body.fat !== undefined) {
    fields.push('fat = ?');
    values.push(round1(req.body.fat));
  }

  if (!fields.length) return fail(res, '没有需要更新的字段');

  db.prepare(`UPDATE diet_records SET ${fields.join(', ')} WHERE id = ?`).run(
    ...values,
    req.params.id
  );

  const row = db.prepare('SELECT * FROM diet_records WHERE id = ?').get(req.params.id);
  return success(res, mapDietRecord(row), '记录已更新');
});

// 删除饮食记录
router.delete('/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM diet_records WHERE id = ? AND user_id = ?')
    .run(req.params.id, USER_ID);
  if (!info.changes) return fail(res, '记录不存在', 404);
  return success(res, null, '已删除');
});

module.exports = router;
