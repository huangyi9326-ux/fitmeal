# 轻盈食光 · 减脂餐移动端 H5

前后端分离的减脂餐 H5 项目，按 375px 移动端画布设计，包含首页、食谱、食谱详情、记录、我的、我的收藏等页面，页面之间路由连通，所有增删改查均落库到 SQLite。

## 技术栈

| 端 | 技术 |
| --- | --- |
| 后端 | Node.js + Express + better-sqlite3（SQLite）+ multer + cors |
| 前端 | Vue 3 + Vite + TailwindCSS 3 + Vue Router 4 + Axios + ECharts 5 |

## 目录结构

```
fitmeal/
├── server/                        # 后端
│   ├── data/fitmeal.db            # SQLite 数据库（首次启动自动生成）
│   ├── uploads/                   # 上传的图片（首次启动自动生成）
│   └── src/
│       ├── index.js               # 服务入口：CORS、静态资源、路由挂载
│       ├── db.js                  # 建表 + 演示种子数据
│       ├── routes/
│       │   ├── user.js            # 用户资料 / 步数 / 提醒设置
│       │   ├── recipes.js         # 食谱列表 / 推荐 / 详情
│       │   ├── favorites.js       # 收藏
│       │   ├── dietRecords.js     # 饮食记录
│       │   ├── weightRecords.js   # 体重记录
│       │   ├── waterRecords.js    # 喝水记录
│       │   ├── stats.js           # 首页 / 记录页聚合统计
│       │   └── upload.js          # 图片上传
│       └── utils/                 # 日期、响应体、营养目标计算
└── client/                        # 前端
    ├── public/images/             # 食谱配图与头像
    ├── index.html
    └── src/
        ├── api/index.js           # Axios 实例 + 统一响应解包
        ├── router/index.js        # 路由表
        ├── components/            # TabBar / EChart / RecipeCard / BottomSheet / Toast / AppIcon
        ├── views/                 # Home / Recipes / RecipeDetail / RecordPage / Profile / Favorites
        ├── utils/                 # 日期与轻提示
        └── assets/styles.css      # Tailwind 与全局样式
```

## 启动说明

环境要求：Node.js >= 18。

### 1. 启动后端

```bash
cd server
npm install
npm run dev        # 开发模式（文件变更自动重启）
# 或 npm start     # 普通启动
```

后端地址：`http://localhost:3000`，健康检查：`http://localhost:3000/api/health`。

### 2. 启动前端

另开一个终端：

```bash
cd client
npm install
npm run dev
```

浏览器打开：**http://localhost:5173**（建议用开发者工具切换到 375px 宽度查看移动端效果）。

Vite 已配置代理，`/api` 与 `/uploads` 会转发到 `http://localhost:3000`，开发时无需额外处理跨域。

### 3. 生产部署（可选，单端口）

```bash
cd client
npm run build      # 产物输出到 client/dist
cd ../server
npm start          # 后端同时托管 dist，直接访问 http://localhost:3000
```

## 数据库说明

- 数据库文件：`server/data/fitmeal.db`，首次启动自动建表并写入演示数据。
- 数据表：`users`（用户）、`recipes`（减脂食谱）、`favorites`（收藏）、`diet_records`（饮食记录）、`weight_records`（体重记录）、`water_records`（喝水记录）。
- 演示模式为单用户，所有接口默认操作 `user_id = 1`。
- 想恢复初始演示数据：停止后端，删除 `server/data/fitmeal.db`（以及同目录的 `-wal`、`-shm` 文件），重新启动即可。

## 页面路由

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 首页 | 欢迎区、热量环、营养素进度、搜索、餐次标签、食谱卡片、喝水、步数 |
| `/recipes` | 食谱 | 关键词搜索 + 餐次筛选 |
| `/recipes/:id` | 食谱详情 | 大图、营养、食材、步骤、收藏、加入今日计划 |
| `/record` | 记录 | 日期切换、摄入环、体重折线、餐次环、饮食记录、喝水、运动消耗 |
| `/profile` | 我的 | 头像昵称、身体数据、减脂进度、收藏入口、设置 |
| `/favorites` | 我的收藏 | 双列收藏卡片，可取消收藏 |

底部 Tab：首页 `/`、食谱 `/recipes`、记录 `/record`、我的 `/profile`；详情页归属「食谱」高亮，收藏页归属「我的」高亮。

## RESTful 接口

统一响应格式：`{ "code": 0, "message": "success", "data": ... }`，`code` 非 0 表示业务错误。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET / PUT | `/api/user` | 获取 / 更新用户资料 |
| PATCH | `/api/user/steps` | 更新今日步数 |
| PUT | `/api/user/settings` | 更新提醒设置 |
| GET | `/api/recipes` | 食谱列表（`keyword`、`mealType`、`page`、`limit`） |
| GET | `/api/recipes/recommend` | 推荐食谱 |
| GET | `/api/recipes/:id` | 食谱详情 |
| GET | `/api/favorites` | 收藏列表 |
| POST | `/api/favorites` | 添加收藏（body: `recipeId`） |
| DELETE | `/api/favorites/:recipeId` | 取消收藏 |
| GET | `/api/diet-records` | 饮食记录（`date`） |
| POST | `/api/diet-records` | 新增记录（支持 `recipeId` 或自定义食物） |
| PUT | `/api/diet-records/:id` | 修改记录 |
| DELETE | `/api/diet-records/:id` | 删除记录 |
| GET | `/api/weight-records` | 体重记录 |
| POST | `/api/weight-records` | 新增体重（body: `weight`、`date`） |
| DELETE | `/api/weight-records/:id` | 删除体重记录 |
| GET | `/api/water-records` | 某天喝水汇总（`date`） |
| POST | `/api/water-records` | 喝一杯水（body: `amount`、`date`） |
| DELETE | `/api/water-records/:id` | 撤销一条喝水记录 |
| DELETE | `/api/water-records/day/:date` | 清空某天喝水记录 |
| GET | `/api/stats/home` | 首页聚合统计（`date`） |
| GET | `/api/stats/daily` | 记录页聚合统计（`date`） |
| POST | `/api/upload` | 图片上传（`multipart/form-data`，字段名 `file`，≤5MB，jpg/png/webp/gif） |

上传成功返回 `{ "url": "/uploads/xxx.jpg" }`，可直接用于 `<img src>`。

## 说明

- 图表使用 ECharts 绘制：首页热量环、记录页摄入环与餐次环、体重趋势折线图；`EChart` 组件负责初始化、尺寸监听与销毁。
- 所有增删改操作均请求后端接口并写入 SQLite，页面刷新后数据不丢失。
- 无会员/付费模块，无复杂动画，整体为清新浅绿 + 大圆角卡片风格。
