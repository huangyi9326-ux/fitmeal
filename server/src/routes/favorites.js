/**
 * 收藏接口：列表 / 收藏 / 取消收藏
 */
const express = require('express');
const db = require('../db');
const { success, fail } = require('../utils/response');
const { mapRecipe } = require('../utils/helpers');

const router = express.Router();
const USER_ID = 1;

// 我的收藏列表
router.get('/', (req, res) => {
  const rows = db
    .prepare(`
      SELECT r.*, 1 AS isFavorite
      FROM favorites f
      JOIN recipes r ON r.id = f.recipe_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC, f.id DESC
    `)
    .all(USER_ID);
  return success(res, rows.map(mapRecipe));
});

// 收藏食谱
router.post('/', (req, res) => {
  const recipeId = Number(req.body.recipeId);
  if (!Number.isInteger(recipeId)) return fail(res, '缺少 recipeId');

  const recipe = db.prepare('SELECT id, favorite_count FROM recipes WHERE id = ?').get(recipeId);
  if (!recipe) return fail(res, '食谱不存在', 404);

  const info = db
    .prepare('INSERT OR IGNORE INTO favorites (user_id, recipe_id) VALUES (?, ?)')
    .run(USER_ID, recipeId);

  // 只有真正新增时才累加收藏数，避免重复点击重复统计
  if (info.changes > 0) {
    db.prepare('UPDATE recipes SET favorite_count = favorite_count + 1 WHERE id = ?').run(recipeId);
  }

  const favoriteCount = db.prepare('SELECT favorite_count FROM recipes WHERE id = ?').get(recipeId)
    .favorite_count;
  return success(res, { isFavorite: true, favoriteCount }, '已收藏');
});

// 取消收藏
router.delete('/:recipeId', (req, res) => {
  const recipeId = Number(req.params.recipeId);
  const info = db
    .prepare('DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?')
    .run(USER_ID, recipeId);

  if (info.changes > 0) {
    db.prepare(`
      UPDATE recipes SET favorite_count = MAX(favorite_count - 1, 0) WHERE id = ?
    `).run(recipeId);
  }

  const recipe = db.prepare('SELECT favorite_count FROM recipes WHERE id = ?').get(recipeId);
  return success(res, { isFavorite: false, favoriteCount: recipe ? recipe.favorite_count : 0 }, '已取消收藏');
});

module.exports = router;
