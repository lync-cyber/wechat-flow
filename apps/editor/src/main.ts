import "@wechat-flow/blocks";
import "@wechat-flow/marks";
import { registerTheme } from "@wechat-flow/core/src/registry/theme.ts";
import businessTheme from "@wechat-flow/theme-business";
import defaultTheme from "@wechat-flow/theme-default";
import literaryTheme from "@wechat-flow/theme-literary";
import magazineTheme from "@wechat-flow/theme-magazine";
import techTheme from "@wechat-flow/theme-tech";
import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router/index";
import "./styles/tokens.css";

registerTheme(defaultTheme);
registerTheme(magazineTheme);
registerTheme(literaryTheme);
registerTheme(businessTheme);
registerTheme(techTheme);

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
