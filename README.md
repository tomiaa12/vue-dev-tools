# vue-dev-tools（Standalone 构建版）

本仓库通过 **git submodule** 引入上游 [`vue-devtools-plugin`](https://github.com/Zippowxk/vue-devtools-plugin)，在 CI 中打包出 **Standalone 独立版本**，并发布到 `cdn` 分支，方便用 **jsDelivr** 直接引入（支持 Vue2 / Vue3）。

## 用 jsDelivr 引入（推荐）

发布后（见下方“发布到 jsDelivr”），你可以用以下方式固定版本引入：

- **固定版本**：使用 `@cdn-vX.Y.Z`（例如 `@cdn-v2.0.0`）
- 把 `<OWNER>/<REPO>` 换成你自己的仓库

### Vue 2（CDN）

```html
<div id="app">{{ message }}</div>

<script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
<script src="https://cdn.jsdelivr.net/gh/<OWNER>/<REPO>@cdn-v2.0.0/vue-devtools-standalone.min.js"></script>

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

### Vue 3（CDN）

```html
<div id="app"></div>

<script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
<script src="https://cdn.jsdelivr.net/gh/<OWNER>/<REPO>@cdn-v2.0.0/vue-devtools-standalone.min.js"></script>

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

## 发布到 jsDelivr（GitHub Actions）

仓库包含 workflow：`/.github/workflows/cdn-standalone.yml`

触发方式：

- **推送 tag**：匹配 `v*`（例如 `v2.0.0`）
- **手动触发**：Actions 里 `Run workflow`，可选填 `source_tag`

发布内容：

- 会把 Standalone 产物发布到 `cdn` 分支根目录（只保留白名单文件）
- 并打一个不可变标签：`cdn-<tag>`（例如 `cdn-v2.0.0`），用于 jsDelivr 固定版本引用

### GitHub 必要设置

- 仓库建议为 **public**（jsDelivr 无法拉取 private）
- 允许 Actions 写入仓库（用于推送 `cdn` 分支和 tag）：
  - `Settings -> Actions -> General -> Workflow permissions`
  - 选择 **Read and write permissions**

### 常见问题：Remote tag already exists

如果 workflow 报：
`Remote tag already exists: cdn-v2.0.0`

说明远端已经存在同名 `cdn-*` 标签（为了保证“固定版本”不被覆盖，workflow 会直接失败）。你确定要重发同名版本时，先删除远端标签再重跑：

```bash
git push --delete origin cdn-v2.0.0
```

## 本地构建（可选）

```bash
git submodule update --init --recursive
npm run build
```

产物会输出到 `./dist/`。
