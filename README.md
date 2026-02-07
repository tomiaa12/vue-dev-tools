# Vue DevTools 在线版（Standalone）

一段 JS 直接在线引入，即可在浏览器/移动端页面里使用 **Vue DevTools**（支持 Vue2 / Vue3，无需安装浏览器插件）。

## Vue 2

```html
<div id="app">{{ message }}</div>

<script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
<script src="https://cdn.jsdelivr.net/gh/tomiaa12/vue-dev-tools@cdn-v1.0.7/vue-devtools-standalone.min.js"></script>

<script>
  // 先初始化 DevTools
  VueDevtoolsStandalone.createVueDevtools({ autoShow: true });

  // 启用 Vue devtools
  Vue.config.devtools = true;

  // 再创建 Vue 应用
  new Vue({
    el: "#app",
    data: { message: "Hello Vue 2!" },
  });

  // 如果没有自动检测到（少数场景），手动通知
  setTimeout(() => {
    window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.emit("init", Vue);
  }, 100);
</script>
```

## Vue 3

```html
<div id="app"></div>

<script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
<script src="https://cdn.jsdelivr.net/gh/tomiaa12/vue-dev-tools@cdn-v1.0.7/vue-devtools-standalone.min.js"></script>

<script>
  const { createApp } = Vue;

  // 先初始化 DevTools
  VueDevtoolsStandalone.createVueDevtools({ autoShow: true });

  const app = createApp({
    template: "<div>Hello Vue 3!</div>",
  });

  // 启用 Vue devtools
  app.config.devtools = true;

  app.mount("#app");

  // 如果没有自动检测到（少数场景），手动通知
  setTimeout(() => {
    window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.emit("app:init", app);
  }, 100);
</script>
```
