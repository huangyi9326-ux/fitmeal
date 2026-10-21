/**
 * 食谱接口：列表 / 推荐 / 详情
 */
const express = require('express');
const db = require('../db');
const { success, fail } = require('../utils/response');
const { mapRecipe } = require('../utils/helpers');

const router = express.Router();
const USER_ID = 1;
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

/** 带收藏状态的食谱查询语句 */
const recipeQuery = `
  SELECT r.*,
    EXISTS (
      SELECT 1 FROM favorites f WHERE f.recipe_id = r.id AND f.user_id = ?
    ) AS isFavorite
  FROM recipes r
`;

// 推荐食谱（放在 /:id 之前，避免被动态路由匹配）
router.get('/recommend', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 4, 20);
  const mealType = req.query.mealType;
  const exclude = String(req.query.exclude || '')
    .split(',')
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n > 0);

  const conditions = [];
  const params = [USER_ID];

  if (mealType && MEAL_TYPES.includes(mealType)) {
    conditions.push('r.meal_type = ?');
    params.push(mealType);
  }
  if (exclude.length) {
    conditions.push(`r.id NOT IN (${exclude.map(() => '?').join(',')})`);
    params.push(...exclude);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`${recipeQuery} ${where} ORDER BY RANDOM() LIMIT ?`)
    .all(...params, limit);

  return success(res, rows.map(mapRecipe));
});

// 食谱列表：支持关键词（菜名 / 简介 / 食材）、餐次、标签筛选
router.get('/', (req, res) => {
  const { keyword = '', mealType = '', tag = '' } = req.query;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const conditions = [];
  const params = [USER_ID];

  if (keyword.trim()) {
    conditions.push('(r.name LIKE ? OR r.description LIKE ? OR r.ingredients LIKE ?)');
    const like = `%${keyword.trim()}%`;
    params.push(like, like, like);
  }
  if (mealType && MEAL_TYPES.includes(mealType)) {
    conditions.push('r.meal_type = ?');
    params.push(mealType);
  }
  if (tag) {
    conditions.push('r.tags LIKE ?');
    params.push(`%"${tag}"%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`${recipeQuery} ${where} ORDER BY r.id ASC LIMIT ?`)
    .all(...params, limit);

  return success(res, { total: rows.length, list: rows.map(mapRecipe) });
});

// 食谱详情
router.get('/:id', (req, res) => {
  const row = db.prepare(`${recipeQuery} WHERE r.id = ?`).get(USER_ID, req.params.id);
  if (!row) return fail(res, '食谱不存在', 404);
  return success(res, mapRecipe(row));
});

module.exports = router;
