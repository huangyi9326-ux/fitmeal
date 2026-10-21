/**
 * 体重记录接口：趋势查询 / 新增（同一天覆盖）/ 删除
 */
const express = require('express');
const db = require('../db');
const { success, fail } = require('../utils/response');
const { today } = require('../utils/date');
const { round1 } = require('../utils/helpers');

const router = express.Router();
const USER_ID = 1;

/** 同步 users.current_weight 为最近一次体重 */
function syncCurrentWeight() {
  const latest = db
    .prepare('SELECT weight FROM weight_records WHERE user_id = ? ORDER BY record_date DESC LIMIT 1')
    .get(USER_ID);
  if (latest) {
    db.prepare('UPDATE users SET current_weight = ? WHERE id = ?').run(latest.weight, USER_ID);
  }
}

// 查询最近 N 天体重，返回按日期升序，方便直接绘制折线图
router.get('/', (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 7, 2), 90);
  const endDate = req.query.date || today();

  const rows = db
    .prepare(`
      SELECT id, weight, record_date
      FROM weight_records
      WHERE user_id = ? AND record_date <= ?
      ORDER BY record_date DESC
      LIMIT ?
    `)
    .all(USER_ID, endDate, days)
    .reverse();

  const list = rows.map((row) => ({
    id: row.id,
    weight: round1(row.weight),
    recordDate: row.record_date,
  }));

  const current = list.length ? list[list.length - 1].weight : null;
  const previous = list.length > 1 ? list[list.length - 2].weight : current;
  const user = db.prepare('SELECT target_weight FROM users WHERE id = ?').get(USER_ID);

  return success(res, {
    list,
    current,
    previous,
    delta: current !== null ? round1(current - previous) : 0,
    targetWeight: user ? round1(user.target_weight) : null,
  });
});

// 新增体重记录（同一天再次提交会覆盖当天数据）
router.post('/', (req, res) => {
  const weight = Number(req.body.weight);
  if (Number.isNaN(weight) || weight < 30 || weight > 200) {
    return fail(res, '体重需在 30-200kg 之间');
  }

  const date = req.body.recordDate || today();
  db.prepare(`
    INSERT INTO weight_records (user_id, weight, record_date)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, record_date) DO UPDATE SET weight = excluded.weight
  `).run(USER_ID, round1(weight), date);

  syncCurrentWeight();

  const row = db
    .prepare('SELECT * FROM weight_records WHERE user_id = ? AND record_date = ?')
    .get(USER_ID, date);

  return success(res, { id: row.id, weight: round1(row.weight), recordDate: row.record_date }, '体重已记录');
});

// 删除体重记录
router.delete('/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM weight_records WHERE id = ? AND user_id = ?')
    .run(req.params.id, USER_ID);
  if (!info.changes) return fail(res, '记录不存在', 404);
  syncCurrentWeight();
  return success(res, null, '已删除');
});

module.exports = router;
