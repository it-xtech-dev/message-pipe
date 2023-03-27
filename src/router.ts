import { createRouter, createWebHistory } from "vue-router";
import ChildWindow from "./components/ChildWindow.vue";
import MainWindow from "./components/MainWindow.vue";

const routes = [
  {
    path: "/",
    name: "Main",
    component: MainWindow,
  },
  {
    path: "/child",
    name: "Child",
    component: ChildWindow,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
