/**
 * SQLite 数据层
 * - 使用 better-sqlite3，同步 API，简单直接
 * - 首次启动自动建表并写入演示数据
 * - 数据库文件位于 server/data/fitmeal.db，刷新/重启都不会丢失
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { today, addDays } = require('./utils/date');

// 数据目录（不存在则创建）
const dataDir = path.join(__dirname, '../data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'fitmeal.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/** 创建全部数据表 */
function createTables() {
  db.exec(`
    -- 用户表：单用户 Demo，所有接口默认操作 id = 1 的用户
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      height REAL DEFAULT 170,
      current_weight REAL DEFAULT 60,
      target_weight REAL DEFAULT 55,
      target_calories INTEGER DEFAULT 1700,
      water_goal INTEGER DEFAULT 2000,
      step_goal INTEGER DEFAULT 8000,
      daily_steps INTEGER DEFAULT 0,
      steps_date TEXT DEFAULT '',
      level INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 0,
      weekly_goal INTEGER DEFAULT 7,
      weekly_done INTEGER DEFAULT 0,
      settings TEXT DEFAULT '{}',
      joined_at TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 减脂食谱表：食材/步骤/标签使用 JSON 文本存储
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      calories INTEGER DEFAULT 0,
      protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      tags TEXT DEFAULT '[]',
      meal_type TEXT DEFAULT 'lunch',
      prep_time INTEGER DEFAULT 20,
      difficulty TEXT DEFAULT '简单',
      rating REAL DEFAULT 4.5,
      favorite_count INTEGER DEFAULT 0,
      ingredients TEXT DEFAULT '[]',
      steps TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 收藏表：user_id + recipe_id 唯一，重复收藏不会写入两条
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE (user_id, recipe_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    -- 饮食记录表：记录某一餐吃了什么，recipe_id 可为空（自定义食物）
    CREATE TABLE IF NOT EXISTS diet_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      recipe_id INTEGER,
      meal_type TEXT NOT NULL,
      food_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      calories INTEGER DEFAULT 0,
      protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      record_date TEXT NOT NULL,
      record_time TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 体重记录表：同一天只保留一条（新增时覆盖）
    CREATE TABLE IF NOT EXISTS weight_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      weight REAL NOT NULL,
      record_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE (user_id, record_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 喝水记录表：每次喝一杯记一条，按日期汇总
    CREATE TABLE IF NOT EXISTS water_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL DEFAULT 250,
      record_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_recipes_meal ON recipes(meal_type);
    CREATE INDEX IF NOT EXISTS idx_diet_user_date ON diet_records(user_id, record_date);
    CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_records(user_id, record_date);
    CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_records(user_id, record_date);
  `);
}

/** 演示食谱数据 */
const recipeSeed = [
  {
    name: '莓果香蕉燕麦碗',
    description: '高纤燕麦搭配莓果与酸奶，饱腹感满分，开启轻盈早晨。',
    cover: '/images/recipes/berry-oatmeal.jpg',
    calories: 362,
    protein: 14,
    carbs: 58,
    fat: 8,
    tags: ['高蛋白', '低脂', '富含膳食纤维'],
    mealType: 'breakfast',
    prepTime: 15,
    difficulty: '简单',
    rating: 4.7,
    favoriteCount: 1862,
    ingredients: [
      { emoji: '🌾', name: '燕麦片', amount: '50 g' },
      { emoji: '🍌', name: '香蕉', amount: '半根' },
      { emoji: '🫐', name: '蓝莓', amount: '50 g' },
      { emoji: '🍓', name: '草莓', amount: '60 g' },
      { emoji: '🥛', name: '无糖酸奶', amount: '100 g' },
      { emoji: '🌱', name: '奇亚籽', amount: '5 g' },
    ],
    steps: [
      { emoji: '🍳', description: '燕麦片加入 150ml 牛奶或清水，小火煮 5 分钟至浓稠。' },
      { emoji: '🍓', description: '香蕉切片，草莓对半切开，莓果洗净沥干水分。' },
      { emoji: '🥣', description: '燕麦盛入碗中，铺上香蕉与莓果，淋上无糖酸奶。' },
      { emoji: '🥜', description: '撒上奇亚籽与少许坚果碎，即可享用。' },
    ],
  },
  {
    name: '香草煎鸡胸藜麦沙拉',
    description: '低脂高蛋白，饱腹又营养，轻松享受健康美味。',
    cover: '/images/recipes/chicken-salad.jpg',
    calories: 298,
    protein: 32,
    carbs: 36,
    fat: 8,
    tags: ['高蛋白', '低脂', '轻负担'],
    mealType: 'lunch',
    prepTime: 20,
    difficulty: '简单',
    rating: 4.8,
    favoriteCount: 2368,
    ingredients: [
      { emoji: '🍗', name: '鸡胸肉', amount: '150 g' },
      { emoji: '🌾', name: '藜麦', amount: '50 g' },
      { emoji: '🍅', name: '圣女果', amount: '80 g' },
      { emoji: '🥬', name: '混合生菜', amount: '100 g' },
      { emoji: '🥑', name: '牛油果', amount: '半个（约 70 g）' },
      { emoji: '🍋', name: '柠檬', amount: '1/4 个' },
      { emoji: '🫒', name: '橄榄油', amount: '5 g（1 小勺）' },
      { emoji: '🧂', name: '黑胡椒 / 海盐', amount: '适量' },
    ],
    steps: [
      { emoji: '🧂', description: '鸡胸肉用黑胡椒、海盐和橄榄油腌制 10 分钟。' },
      { emoji: '🍳', description: '平底锅中火煎鸡胸肉，每面煎 3-4 分钟，煎至金黄熟透，切片备用。' },
      { emoji: '🥣', description: '藜麦用清水煮熟，约 12 分钟，沥干水分放凉。' },
      { emoji: '🥗', description: '将生菜、藜麦、鸡胸肉、圣女果、牛油果放入碗中，淋上柠檬汁和橄榄油，拌匀即可。' },
    ],
  },
  {
    name: '牛油果全麦吐司',
    description: '全麦面包搭配牛油果与水波蛋，营养均衡的元气早餐。',
    cover: '/images/recipes/avocado-toast.jpg',
    calories: 320,
    protein: 16,
    carbs: 34,
    fat: 13,
    tags: ['营养均衡', '低脂', '快手'],
    mealType: 'breakfast',
    prepTime: 10,
    difficulty: '简单',
    rating: 4.6,
    favoriteCount: 1985,
    ingredients: [
      { emoji: '🍞', name: '全麦吐司', amount: '2 片' },
      { emoji: '🥑', name: '牛油果', amount: '半个' },
      { emoji: '🥚', name: '鸡蛋', amount: '1 个' },
      { emoji: '🍋', name: '柠檬汁', amount: '几滴' },
      { emoji: '🧂', name: '海盐 / 黑胡椒', amount: '适量' },
    ],
    steps: [
      { emoji: '🍞', description: '全麦吐司放入烤箱 180℃ 烤 3 分钟至表面微脆。' },
      { emoji: '🥑', description: '牛油果压成泥，加入柠檬汁、海盐和黑胡椒拌匀。' },
      { emoji: '🥚', description: '鸡蛋煮成水波蛋，约 3 分钟。' },
      { emoji: '🍽️', description: '牛油果泥涂在吐司上，放上水波蛋，撒黑胡椒即可。' },
    ],
  },
  {
    name: '香煎三文鱼配芦笋',
    description: '优质蛋白与 Omega-3 的轻享组合，低负担高满足。',
    cover: '/images/recipes/salmon-asparagus.jpg',
    calories: 385,
    protein: 28,
    carbs: 12,
    fat: 24,
    tags: ['高蛋白', '低碳水', '优质脂肪'],
    mealType: 'dinner',
    prepTime: 25,
    difficulty: '中等',
    rating: 4.9,
    favoriteCount: 1543,
    ingredients: [
      { emoji: '🐟', name: '三文鱼', amount: '150 g' },
      { emoji: '🌿', name: '芦笋', amount: '120 g' },
      { emoji: '🍅', name: '圣女果', amount: '60 g' },
      { emoji: '🍋', name: '柠檬', amount: '半个' },
      { emoji: '🫒', name: '橄榄油', amount: '5 g' },
      { emoji: '🧂', name: '海盐 / 黑胡椒', amount: '适量' },
    ],
    steps: [
      { emoji: '🧂', description: '三文鱼用海盐、黑胡椒腌制 10 分钟。' },
      { emoji: '🍳', description: '平底锅少油，三文鱼皮朝下煎 3 分钟，翻面再煎 2 分钟。' },
      { emoji: '🌿', description: '芦笋焯水 1 分钟，再放入锅中快煎上色。' },
      { emoji: '🍽️', description: '装盘，挤上柠檬汁，搭配圣女果即可。' },
    ],
  },
  {
    name: '番茄虾仁全麦意面',
    description: '高蛋白虾仁搭配全麦意面，酸甜开胃不负担。',
    cover: '/images/recipes/shrimp-pasta.jpg',
    calories: 420,
    protein: 26,
    carbs: 52,
    fat: 10,
    tags: ['高蛋白', '低脂', '饱腹'],
    mealType: 'lunch',
    prepTime: 30,
    difficulty: '中等',
    rating: 4.7,
    favoriteCount: 1218,
    ingredients: [
      { emoji: '🍝', name: '全麦意面', amount: '60 g' },
      { emoji: '🍤', name: '虾仁', amount: '120 g' },
      { emoji: '🍅', name: '番茄', amount: '2 个' },
      { emoji: '🧅', name: '洋葱', amount: '1/4 个' },
      { emoji: '🧄', name: '蒜', amount: '2 瓣' },
      { emoji: '🫒', name: '橄榄油', amount: '5 g' },
      { emoji: '🧂', name: '黑胡椒', amount: '适量' },
    ],
    steps: [
      { emoji: '🍝', description: '全麦意面下锅煮 8-10 分钟，捞出备用。' },
      { emoji: '🍤', description: '虾仁用盐和黑胡椒腌制 5 分钟。' },
      { emoji: '🍅', description: '番茄、洋葱、蒜切碎，少油炒香，加入番茄煮成酱。' },
      { emoji: '🍳', description: '放入虾仁和意面翻炒 2 分钟，收汁装盘。' },
    ],
  },
  {
    name: '鸡胸肉蔬菜卷',
    description: '全麦饼皮裹满鸡胸与蔬菜，清爽低脂，适合忙碌日常。',
    cover: '/images/recipes/chicken-wrap.jpg',
    calories: 265,
    protein: 24,
    carbs: 18,
    fat: 9,
    tags: ['低脂', '高蛋白', '快手'],
    mealType: 'lunch',
    prepTime: 15,
    difficulty: '简单',
    rating: 4.5,
    favoriteCount: 908,
    ingredients: [
      { emoji: '🌯', name: '全麦饼皮', amount: '1 张' },
      { emoji: '🍗', name: '鸡胸肉', amount: '100 g' },
      { emoji: '🥬', name: '生菜', amount: '50 g' },
      { emoji: '🥒', name: '黄瓜', amount: '50 g' },
      { emoji: '🥕', name: '胡萝卜', amount: '40 g' },
      { emoji: '🥫', name: '低脂沙拉酱', amount: '10 g' },
    ],
    steps: [
      { emoji: '🍗', description: '鸡胸肉切条，用盐和黑胡椒煎熟。' },
      { emoji: '🥒', description: '黄瓜、胡萝卜切丝，生菜洗净沥干。' },
      { emoji: '🌯', description: '全麦饼皮小火加热 30 秒。' },
      { emoji: '🥗', description: '铺上生菜、鸡胸肉和蔬菜丝，卷紧后对半切开。' },
    ],
  },
  {
    name: '希腊酸奶坚果杯',
    description: '高蛋白低糖加餐，酸奶与坚果的轻盈组合。',
    cover: '/images/recipes/yogurt-parfait.jpg',
    calories: 210,
    protein: 12,
    carbs: 18,
    fat: 10,
    tags: ['高蛋白', '低糖', '加餐首选'],
    mealType: 'snack',
    prepTime: 5,
    difficulty: '简单',
    rating: 4.6,
    favoriteCount: 756,
    ingredients: [
      { emoji: '🥛', name: '无糖希腊酸奶', amount: '150 g' },
      { emoji: '🥜', name: '混合坚果', amount: '15 g' },
      { emoji: '🫐', name: '蓝莓', amount: '30 g' },
      { emoji: '🍓', name: '草莓', amount: '30 g' },
      { emoji: '🌾', name: '燕麦脆', amount: '10 g' },
    ],
    steps: [
      { emoji: '🥛', description: '杯底铺一层希腊酸奶。' },
      { emoji: '🌾', description: '加入燕麦脆与一半莓果。' },
      { emoji: '🥜', description: '再铺一层酸奶，放上坚果和剩余莓果。' },
      { emoji: '❄️', description: '冷藏 5 分钟，口感更佳。' },
    ],
  },
  {
    name: '清蒸鳕鱼时蔬',
    description: '清蒸锁住鲜味，低脂高蛋白，晚餐轻盈无负担。',
    cover: '/images/recipes/steamed-cod.jpg',
    calories: 245,
    protein: 30,
    carbs: 9,
    fat: 8,
    tags: ['高蛋白', '低脂', '轻负担'],
    mealType: 'dinner',
    prepTime: 20,
    difficulty: '简单',
    rating: 4.8,
    favoriteCount: 1120,
    ingredients: [
      { emoji: '🐟', name: '鳕鱼', amount: '150 g' },
      { emoji: '🥦', name: '西兰花', amount: '100 g' },
      { emoji: '🥕', name: '胡萝卜', amount: '50 g' },
      { emoji: '🌽', name: '玉米笋', amount: '50 g' },
      { emoji: '🫚', name: '姜丝', amount: '少许' },
      { emoji: '🥫', name: '蒸鱼豉油', amount: '5 g' },
    ],
    steps: [
      { emoji: '🐟', description: '鳕鱼解冻后擦干水分，铺上姜丝腌制 5 分钟。' },
      { emoji: '♨️', description: '水开后上锅蒸 8 分钟。' },
      { emoji: '🥦', description: '西兰花、胡萝卜、玉米笋焯水 1 分钟。' },
      { emoji: '🍽️', description: '鳕鱼淋少许蒸鱼豉油，搭配时蔬装盘。' },
    ],
  },
  {
    name: '南瓜小米粥',
    description: '温和养胃的低脂早餐，南瓜自然甜香。',
    cover: '/images/recipes/pumpkin-congee.jpg',
    calories: 180,
    protein: 6,
    carbs: 34,
    fat: 2,
    tags: ['低脂', '养胃', '高纤维'],
    mealType: 'breakfast',
    prepTime: 25,
    difficulty: '简单',
    rating: 4.4,
    favoriteCount: 642,
    ingredients: [
      { emoji: '🌾', name: '小米', amount: '40 g' },
      { emoji: '🎃', name: '南瓜', amount: '100 g' },
      { emoji: '🔴', name: '枸杞', amount: '5 g' },
      { emoji: '💧', name: '清水', amount: '400 ml' },
    ],
    steps: [
      { emoji: '🌾', description: '小米淘洗后浸泡 10 分钟。' },
      { emoji: '🎃', description: '南瓜去皮切小块。' },
      { emoji: '🍲', description: '小米与南瓜加水煮 15 分钟。' },
      { emoji: '🍽️', description: '加入枸杞再煮 2 分钟即可。' },
    ],
  },
];

/** 首次启动写入演示数据 */
function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return;

  const day = today();
  // 含今天在内共 28 天，因此起始日为 27 天前
  const joinedAt = `${addDays(day, -27)} 08:00:00`;

  const insertUser = db.prepare(`
    INSERT INTO users
      (nickname, avatar, height, current_weight, target_weight, target_calories,
       water_goal, step_goal, daily_steps, steps_date, level, streak_days,
       weekly_goal, weekly_done, settings, joined_at)
    VALUES
      (@nickname, @avatar, @height, @current_weight, @target_weight, @target_calories,
       @water_goal, @step_goal, @daily_steps, @steps_date, @level, @streak_days,
       @weekly_goal, @weekly_done, @settings, @joined_at)
  `);

  const insertRecipe = db.prepare(`
    INSERT INTO recipes
      (name, description, cover_image, images, calories, protein, carbs, fat,
       tags, meal_type, prep_time, difficulty, rating, favorite_count, ingredients, steps)
    VALUES
      (@name, @description, @cover, @images, @calories, @protein, @carbs, @fat,
       @tags, @mealType, @prepTime, @difficulty, @rating, @favoriteCount, @ingredients, @steps)
  `);

  const insertDiet = db.prepare(`
    INSERT INTO diet_records
      (user_id, recipe_id, meal_type, food_name, description, image, calories,
       protein, carbs, fat, record_date, record_time)
    VALUES
      (@userId, @recipeId, @mealType, @foodName, @description, @image, @calories,
       @protein, @carbs, @fat, @recordDate, @recordTime)
  `);

  const insertWeight = db.prepare(`
    INSERT INTO weight_records (user_id, weight, record_date) VALUES (?, ?, ?)
  `);

  const insertWater = db.prepare(`
    INSERT INTO water_records (user_id, amount, record_date) VALUES (?, ?, ?)
  `);

  const insertFavorite = db.prepare(`
    INSERT OR IGNORE INTO favorites (user_id, recipe_id) VALUES (?, ?)
  `);

  // 使用事务保证初始化原子性
  const runSeed = db.transaction(() => {
    insertUser.run({
      nickname: '小悦悦',
      avatar: '/images/avatar.jpg',
      height: 170,
      current_weight: 62.5,
      target_weight: 55.0,
      target_calories: 1700,
      water_goal: 2000,
      step_goal: 8000,
      daily_steps: 6280,
      steps_date: day,
      level: 3,
      streak_days: 18,
      weekly_goal: 7,
      weekly_done: 3,
      settings: JSON.stringify({ mealReminder: true, waterReminder: true, exerciseReminder: false }),
      joined_at: joinedAt,
    });

    // 食谱
    const recipeIds = recipeSeed.map((r) => {
      const info = insertRecipe.run({
        ...r,
        images: JSON.stringify([r.cover]),
        tags: JSON.stringify(r.tags),
        ingredients: JSON.stringify(r.ingredients),
        steps: JSON.stringify(r.steps),
      });
      return Number(info.lastInsertRowid);
    });

    // 收藏：香草煎鸡胸藜麦沙拉 + 香煎三文鱼配芦笋
    insertFavorite.run(1, recipeIds[1]);
    insertFavorite.run(1, recipeIds[3]);

    // 今日饮食记录（与首页/记录页展示对应）
    const dietSeed = [
      { recipeIndex: 0, mealType: 'breakfast', time: '07:30' },
      { recipeIndex: 1, mealType: 'lunch', time: '12:20' },
      { recipeIndex: 2, mealType: 'dinner', time: '18:30' },
      {
        recipeIndex: null,
        mealType: 'snack',
        time: '15:40',
        foodName: '坚果水果小碗',
        description: '巴旦木、蓝莓、草莓、无糖酸奶',
        image: '/images/recipes/yogurt-parfait.jpg',
        calories: 122,
        protein: 3,
        carbs: 14,
        fat: 6,
      },
    ];

    dietSeed.forEach((item) => {
      if (item.recipeIndex !== null) {
        const recipe = recipeSeed[item.recipeIndex];
        insertDiet.run({
          userId: 1,
          recipeId: recipeIds[item.recipeIndex],
          mealType: item.mealType,
          foodName: recipe.name,
          description: recipe.ingredients.slice(0, 3).map((i) => i.name).join('、'),
          image: recipe.cover,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          recordDate: day,
          recordTime: item.time,
        });
      } else {
        insertDiet.run({
          userId: 1,
          recipeId: null,
          mealType: item.mealType,
          foodName: item.foodName,
          description: item.description,
          image: item.image,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          recordDate: day,
          recordTime: item.time,
        });
      }
    });

    // 最近 7 天体重（今天是 62.5kg，昨天 62.9kg，形成 -0.4kg 的变化）
    const weights = [63.5, 63.2, 63.0, 62.8, 62.9, 62.9, 62.5];
    weights.forEach((weight, index) => {
      insertWeight.run(1, weight, addDays(day, index - 6));
    });

    // 今日喝水 4 杯（每杯 300ml，共 1200ml）
    for (let i = 0; i < 4; i += 1) {
      insertWater.run(1, 300, day);
    }
  });

  runSeed();
  console.log('[db] 数据库初始化完成，已写入演示数据');
}

createTables();
seed();

module.exports = db;
