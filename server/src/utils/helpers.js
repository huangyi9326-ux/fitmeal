/**
 * 业务公共方法：BMI、餐次目标、记录格式化
 */
const { today } = require('./date');

/** 根据身高（cm）与体重（kg）计算 BMI，保留 1 位小数 */
function calcBMI(weight, height) {
  if (!weight || !height) return 0;
  const h = height / 100;
  return Math.round((weight / (h * h)) * 10) / 10;
}

/** BMI 文案区间 */
function bmiLabel(bmi) {
  if (!bmi) return '暂无数据';
  if (bmi < 18.5) return '偏瘦';
  if (bmi < 24) return '健康范围';
  if (bmi < 28) return '偏重';
  return '肥胖';
}

/**
 * 把每日总热量拆分到四个餐次。
 * 默认目标 1700 千卡时约为 340 / 442 / 714 / 204，
 * 与设计稿中的 340 / 440 / 710 / 210 基本一致。
 */
function mealGoals(targetCalories = 1700) {
  const target = Number(targetCalories) || 1700;
  const breakfast = Math.round(target * 0.2);
  const lunch = Math.round(target * 0.26);
  const dinner = Math.round(target * 0.42);
  const snack = target - breakfast - lunch - dinner;
  return { breakfast, lunch, dinner, snack };
}

/** 营养素目标：蛋白质 120g / 碳水 200g / 脂肪 60g（随总热量等比缩放） */
function nutritionGoals(targetCalories = 1700) {
  const ratio = (Number(targetCalories) || 1700) / 1700;
  return {
    protein: Math.round(120 * ratio),
    carbs: Math.round(200 * ratio),
    fat: Math.round(60 * ratio),
  };
}

/** 将饮食记录转为前端需要的结构 */
function mapDietRecord(row) {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    mealType: row.meal_type,
    foodName: row.food_name,
    description: row.description || '',
    image: row.image || '',
    calories: Math.round(row.calories || 0),
    protein: Math.round((row.protein || 0) * 10) / 10,
    carbs: Math.round((row.carbs || 0) * 10) / 10,
    fat: Math.round((row.fat || 0) * 10) / 10,
    recordDate: row.record_date,
    recordTime: row.record_time,
  };
}

/** 逗号分隔的字符串转数组，用于 tags */
function parseJson(value, fallback = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

/** 将食谱数据行转为前端结构 */
function mapRecipe(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cover: row.cover_image,
    images: parseJson(row.images, [row.cover_image]),
    calories: Math.round(row.calories),
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    tags: parseJson(row.tags),
    mealType: row.meal_type,
    prepTime: row.prep_time,
    difficulty: row.difficulty,
    rating: row.rating,
    favoriteCount: row.favorite_count,
    ingredients: parseJson(row.ingredients),
    steps: parseJson(row.steps),
    isFavorite: Boolean(row.isFavorite),
  };
}

/** 根据当前时间推断默认餐次 */
function guessMealType(time = '') {
  const hour = Number((time || '').split(':')[0]);
  if (Number.isNaN(hour)) return 'breakfast';
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
}

/** 运动消耗估算：步行约 0.05 千卡/步 */
function stepsToCalories(steps) {
  return Math.round((Number(steps) || 0) * 0.05);
}

/** 体重目标差值，返回保留 1 位小数的数字 */
function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

module.exports = {
  calcBMI,
  bmiLabel,
  mealGoals,
  nutritionGoals,
  mapDietRecord,
  mapRecipe,
  parseJson,
  guessMealType,
  stepsToCalories,
  round1,
  today,
};
