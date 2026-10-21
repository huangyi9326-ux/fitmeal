/**
 * 轻盈食光 · 减脂餐 H5 后端入口
 * 技术栈：Node.js + Express + SQLite(better-sqlite3)
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

require('./db'); // 初始化数据库（自动建表 + 首次写入演示数据）

const app = express();
const PORT = process.env.PORT || 3000;

// 跨域：开发阶段前端 5173 访问后端 3000，需要放开 CORS
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态资源：上传图片
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 业务路由
app.use('/api/user', require('./routes/user'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/diet-records', require('./routes/dietRecords'));
app.use('/api/weight-records', require('./routes/weightRecords'));
app.use('/api/water-records', require('./routes/waterRecords'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/upload', require('./routes/upload'));

// 健康检查，方便确认服务是否启动
app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { server: 'fitmeal', time: new Date().toISOString() } });
});

// 若前端已执行 npm run build，则由后端直接托管 dist，实现单端口部署
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404
app.use((req, res) => {
  res.status(404).json({ code: 1, message: '接口不存在' });
});

// 统一错误处理
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(500).json({ code: 1, message: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`\n🥗 轻盈食光后端已启动: http://localhost:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/api/health\n`);
});
