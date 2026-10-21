import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Recipes from '../views/Recipes.vue';
import RecipeDetail from '../views/RecipeDetail.vue';
import RecordPage from '../views/RecordPage.vue';
import Profile from '../views/Profile.vue';
import Favorites from '../views/Favorites.vue';

// 路由表：底部 Tab 四个页面 + 详情页 + 收藏页
const routes = [
  { path: '/', name: 'home', component: Home, meta: { title: '首页' } },
  { path: '/recipes', name: 'recipes', component: Recipes, meta: { title: '食谱' } },
  {
    path: '/recipes/:id',
    name: 'recipe-detail',
    component: RecipeDetail,
    meta: { title: '食谱详情' },
  },
  { path: '/record', name: 'record', component: RecordPage, meta: { title: '记录' } },
  { path: '/profile', name: 'profile', component: Profile, meta: { title: '我的' } },
  { path: '/favorites', name: 'favorites', component: Favorites, meta: { title: '我的收藏' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 切换页面回到顶部；返回时恢复之前的滚动位置
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 };
  },
});

router.afterEach((to) => {
  document.title = `${to.meta.title || '轻盈食光'} · 轻盈食光`;
});

export default router;
