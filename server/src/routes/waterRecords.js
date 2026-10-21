/**
 * 喝水记录接口：按天汇总 / 喝一杯 / 撤销 / 清空当天
 */
const express = require('express');
const db = require('../db');
const { success, fail } = require('../utils/response');
const { today } = require('../utils/date');

const router = express.Router();
const USER_ID = 1;
const CUP_SIZE = 250; // 一杯水 250ml

/** 汇总某天的喝水数据 */
function getWaterSummary(date = today()) {
  const user = db.prepare('SELECT water_goal FROM users WHERE id = ?').get(USER_ID);
  const records = db
    .prepare(`
      SELECT id, amount, record_date FROM water_records
      WHERE user_id = ? AND record_date = ?
      ORDER BY id ASC
    `)
    .all(USER_ID, date);

  const total = records.reduce((sum, item) => sum + item.amount, 0);
  const goal = user ? user.water_goal : 2000;

  // 字段名与 /api/stats 中的 water 对象保持一致，前端可直接替换
  return {
    date,
    current: total,
    goal,
    percent: goal ? Math.min(Math.round((total / goal) * 100), 100) : 0,
    cups: Math.floor(total / CUP_SIZE),
    cupGoal: Math.ceil(goal / CUP_SIZE),
    records,
  };
}

// 查询某天喝水情况
router.get('/', (req, res) => {
  return success(res, getWaterSummary(req.query.date || today()));
});

// 喝一杯水（默认 250ml）
router.post('/', (req, res) => {
  const amount = Number(req.body.amount) || CUP_SIZE;
  if (amount < 50 || amount > 2000) return fail(res, '单次饮水量需在 50-2000ml 之间');

  const date = req.body.date || today();
  db.prepare('INSERT INTO water_records (user_id, amount, record_date) VALUES (?, ?, ?)').run(
    USER_ID,
    Math.round(amount),
    date
  );
  return success(res, getWaterSummary(date), '已记录喝水');
});

// 撤销某一条喝水记录
router.delete('/:id', (req, res) => {
  const row = db
    .prepare('SELECT * FROM water_records WHERE id = ? AND user_id = ?')
    .get(req.params.id, USER_ID);
  if (!row) return fail(res, '记录不存在', 404);

  db.prepare('DELETE FROM water_records WHERE id = ?').run(req.params.id);
  return success(res, getWaterSummary(row.record_date), '已撤销');
});

// 清空某天喝水记录
router.delete('/day/:date', (req, res) => {
  db.prepare('DELETE FROM water_records WHERE user_id = ? AND record_date = ?').run(
    USER_ID,
    req.params.date
  );
  return success(res, getWaterSummary(req.params.date), '已清空当日喝水记录');
});

module.exports = router;
