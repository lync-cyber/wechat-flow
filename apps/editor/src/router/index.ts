import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("../pages/EditorPage.vue"),
  },
  {
    path: "/docs/:docId",
    component: () => import("../pages/EditorPage.vue"),
  },
  {
    path: "/themes",
    component: () => import("../pages/ThemesPage.vue"),
  },
  {
    path: "/settings",
    component: () => import("../pages/SettingsPage.vue"),
  },
  {
    path: "/preview/:docId",
    component: () => import("../pages/PreviewPage.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
