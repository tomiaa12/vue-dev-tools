# Vue DevTools 在线版（Standalone）

一段 JS 直接在线引入，即可在浏览器/移动端页面里使用 **Vue DevTools**（支持 Vue2 / Vue3，无需安装浏览器插件）。

## Vue 2

```html
<div id="app">{{ message }}</div>

<script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
<script src="https://cdn.jsdelivr.net/gh/tomiaa12/vue-dev-tools@cdn/vue-devtools-standalone.min.js"></script>

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
<script src="https://cdn.jsdelivr.net/gh/tomiaa12/vue-dev-tools@cdn/vue-devtools-standalone.min.js"></script>

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

  const getVue2BaseVue = () => {
    // Nuxt (Vue 2)
    let Vue = window.$nuxt?.$root?.constructor;
    if (Vue) {
      while (Vue.super) Vue = Vue.super;
      return Vue;
    }

    // Global Vue (Vue 2 CDN)
    if (window.Vue?.config) return window.Vue;

    // Scan DOM for Vue 2 instances
    try {
      const walker = document.createTreeWalker(
        document.documentElement,
        NodeFilter.SHOW_ELEMENT,
      );
      let node = walker.currentNode;
      while (node) {
        const vm = node.__vue__;
        if (vm) {
          Vue = Object.getPrototypeOf(vm).constructor;
          while (Vue.super) Vue = Vue.super;
          return Vue;
        }
        node = walker.nextNode();
      }
    } catch (_) {
      // Ignore
    }

    return null;
  };

  const tryInitVue2 = () => {
    const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook?.emit) return false;

    const Vue = getVue2BaseVue();
    if (!Vue) return false;

    // 让 legacy scan 能收录到 root 实例（scan.ts 会检查 baseVue.config.devtools）
    if (Vue.config) Vue.config.devtools = true;
    hook.emit("init", Vue);
    return true;
  };

  const tryInitVue3 = () => {
    const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook?.emit) return false;

    // Vue 3：尽量从 DOM 上找出 app（某些构建/环境下 mount 容器会挂 __vue_app__）
    try {
      const apps = new Set();
      const walker = document.createTreeWalker(
        document.documentElement,
        NodeFilter.SHOW_ELEMENT,
      );
      let node = walker.currentNode;
      while (node) {
        const app = node.__vue_app__;
        if (app) apps.add(app);
        node = walker.nextNode();
      }

      if (apps.size) {
        for (const app of apps) {
          hook.emit("app:init", app, app.version, {});
        }
        return true;
      }
    } catch (_) {
      // Ignore
    }

    return false;
  };

  (async () => {
    if (!window.VueDevtoolsStandalone) {
      await loadScript(DEVTOOLS_URL);
    }

    window.VueDevtoolsStandalone.createVueDevtools({ autoShow: true });

    // 关键点：控制台“后加载”时，页面里的 Vue2/Vue3 可能已经跑起来了，
    // 需要补一层“检测 + 通知”才能让 DevTools 扫到组件树。
    const tryInit = () => {
      tryInitVue2();
      tryInitVue3();
    };

    tryInit();
    // 给 iframe/backend 一点时间（hook 支持 buffer，但有些页面加载较慢）
    setTimeout(tryInit, 500);
    setTimeout(tryInit, 2000);

    // Vue 3：如果你能拿到 app 实例（例如挂到 window.__APP__），也可以手动通知：
    // window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.emit("app:init", window.__APP__, window.__APP__?.version, {});
  })().catch((e) => console.error("[VueDevtoolsStandalone] load failed:", e));
})();
```
