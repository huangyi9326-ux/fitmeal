/**
 * 统一 API 层
 * 后端统一返回 { code, message, data }，拦截器在这里解包 data。
 * 所有页面只关心业务数据，不需要重复判断 code。
 */
import axios from 'axios';
import { showToast } from '../utils/toast';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

http.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code !== 0) {
        showToast(body.message || '请求失败', 'error');
        return Promise.reject(new Error(body.message || '请求失败'));
      }
      return body.data;
    }
    return body;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '网络异常，请确认后端服务已启动');
    showToast(message, 'error');
    return Promise.reject(error);
  }
);

/* ---------------- 用户 ---------------- */
export const userApi = {
  getProfile: () => http.get('/user'),
  updateProfile: (data) => http.put('/user', data),
  updateSteps: (steps) => http.patch('/user/steps', { steps }),
  updateSettings: (settings) => http.put('/user/settings', settings),
};

/* ---------------- 食谱 ---------------- */
export const recipeApi = {
  getList: (params) => http.get('/recipes', { params }),
  getRecommend: (params) => http.get('/recipes/recommend', { params }),
  getDetail: (id) => http.get(`/recipes/${id}`),
};

/* ---------------- 收藏 ---------------- */
export const favoriteApi = {
  getList: () => http.get('/favorites'),
  add: (recipeId) => http.post('/favorites', { recipeId }),
  remove: (recipeId) => http.delete(`/favorites/${recipeId}`),
};

/* ---------------- 饮食记录 ---------------- */
export const dietApi = {
  getByDate: (date) => http.get('/diet-records', { params: { date } }),
  create: (data) => http.post('/diet-records', data),
  update: (id, data) => http.put(`/diet-records/${id}`, data),
  remove: (id) => http.delete(`/diet-records/${id}`),
};

/* ---------------- 体重记录 ---------------- */
export const weightApi = {
  getTrend: (params) => http.get('/weight-records', { params }),
  create: (data) => http.post('/weight-records', data),
  remove: (id) => http.delete(`/weight-records/${id}`),
};

/* ---------------- 喝水记录 ---------------- */
export const waterApi = {
  getByDate: (date) => http.get('/water-records', { params: { date } }),
  add: (data) => http.post('/water-records', data),
  remove: (id) => http.delete(`/water-records/${id}`),
  clearDay: (date) => http.delete(`/water-records/day/${date}`),
};

/* ---------------- 统计 ---------------- */
export const statsApi = {
  getHome: (date) => http.get('/stats/home', { params: { date } }),
  getDaily: (date) => http.get('/stats/daily', { params: { date } }),
};

/* ---------------- 图片上传 ---------------- */
export const uploadApi = {
  uploadImage: (file) => {
    const form = new FormData();
    form.append('file', file);
    return http.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default http;
