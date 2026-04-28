# Vue DevTools 在线版（Standalone）

一段 JS 直接在线引入，即可在浏览器/移动端页面里使用 **Vue DevTools**（支持 Vue2 / Vue3，无需安装浏览器插件）。

## Vue 2

```html
<div id="app">{{ message }}</div>
<div id="devtools" style="height: 420px; margin-top: 16px; border: 1px solid #eee"></div>

<script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
<script src="https://cdn.jsdelivr.net/gh/tomiaa12/vue-dev-tools@cdn/vue-devtools-standalone.min.js"></script>

<script>
  // 先初始化 DevTools
  VueDevtoolsStandalone.createVueDevtools({
    target: document.getElementById("devtools"),
  });

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
<div id="devtools" style="height: 420px; margin-top: 16px; border: 1px solid #eee"></div>

<script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
<script src="https://cdn.jsdelivr.net/gh/tomiaa12/vue-dev-tools@cdn/vue-devtools-standalone.min.js"></script>

<script>
  const { createApp } = Vue;

  // 先初始化 DevTools
  VueDevtoolsStandalone.createVueDevtools({
    target: document.getElementById("devtools"),
  });

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

## 挂载方式

`createVueDevtools({ target })` 现在支持两种模式：

1. 传入 `target`：直接把 Vue DevTools 面板挂到该节点里，不创建悬浮按钮、弹出层、标题栏或关闭按钮。
2. 不传 `target`：维持默认悬浮模式，会创建右下角悬浮按钮和弹出层，并带关闭按钮。

如果使用 `target` 模式，建议给目标节点设置明确的高度，例如：

```html
<div id="devtools" style="height: 420px"></div>
```

## 一键加载

```js
(() => {
  const DEVTOOLS_URL =
    "https://cdn.jsdelivr.net/gh/tomiaa12/vue-dev-tools@cdn/vue-devtools-standalone.min.js";

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  (async () => {
    if (!window.VueDevtoolsStandalone) {
      await loadScript(DEVTOOLS_URL);
    }

    window.VueDevtoolsStandalone.createVueDevtools();
  })().catch((e) => console.error("[VueDevtoolsStandalone] load failed:", e));
})();
```
