# 源码结构与维护入口

果实之心仍交付一个酒馆助手脚本 JSON。开发源码按职责拆分，由 Node 构建工具组装；浏览器不逐个加载这些文件，也不新增 npm 依赖。

## 找到要改的模块

| 任务 | 文件 | 职责与边界 |
|---|---|---|
| 查看加载顺序 | `src/fruit-heart.template.js` | 29 行组装入口；保留唯一私有 IIFE 与样式注入 |
| 常量、默认 QR 数据、图标 | `src/config.js` | 产品常量与默认内容，不绑定事件 |
| 助手与父窗口环境、实例状态 | `src/runtime/context.js` | 定位 hostWindow/doc/jQuery，销毁旧实例，创建命名空间和监听清理登记 |
| 预设读写、分区、模型分组和总开关 | `src/core/presets.js` | `activePreset`、`updateBoth`、配置读写、`nsfwMaster` 等；保留模型/NSFW 功能的原始初始化位置 |
| 用户发起的预设和方案操作 | `src/core/actions.js` | `setPrompt`、`toggleMaster`、字数、方案等操作；不生成页面 HTML |
| QR 数据解析与保存 | `src/core/quick-replies.js` | 标签、分支、导入导出及默认 QR 升级 |
| 设置页布局 | `src/ui/settings.js` | 渲染设置；使用已有配置接口，不另建数据副本 |
| 首页 / 条目 / QR 页面 | `src/ui/overview.js`、`entries.js`、`quick-replies.js` | 页面 HTML 与页面专属控件；通过 core 操作预设 |
| 页面路由和事件分发 | `src/ui/router.js`、`events.js` | `render` 与 DOM 委托事件；将动作交给业务函数，避免在这里重复实现预设写入 |
| 通用标题、导航、面板 DOM | `src/ui/primitives.js`、`shell.js` | 创建页面骨架和 viewport 适配 |
| 皮肤、日夜模式、字体 | `src/ui/theme.js` | 状态与切换逻辑；具体 CSS 在 styles |
| 面板开关、刷新、键盘焦点 | `src/runtime/panel.js` | `open/close` 和面板轮询；关闭面板不卸载后台功能 |
| 快捷栏、猫咪、魔杖入口 | `src/runtime/quick-entry.js` | 入口创建、拖拽、显示偏好与宿主按钮还原 |
| 生成事件、小剧场 | `src/runtime/generation.js` | 生成前的事件接线；业务规则仍由 core 执行 |
| 启动与卸载 | `src/runtime/startup.js`、`lifecycle.js` | 集中启动绑定/定时器，集中销毁监听、请求、DOM、全局入口 |
| 独立 ECoT 集成 | `src/integrations/ecot.js` | 只通过 FruitHeartECoT 接口访问，独立脚本并未包含在本仓库 |
| NSFW 联动 | `src/nsfw-auto.js`、`nsfw-auto-runtime.js`、`nsfw-auto.css` | 纯轮次规则 / 助手适配和设置卡片 / 专属样式 |
| 模型联动与更新 | `src/model-link.js`、`updates.js` | 已有独立功能模块，保持原接入方式 |

表内简写文件名与同行前一个完整路径处于同一目录。

## 样式顺序

1. `src/styles/panel.css`：基础变量、控件、布局、猫咪和响应式规则。
2. `src/styles/themes.css`：果园手账与黑金玻璃的覆盖；暖纸基础在 panel.css。
3. `src/styles/overrides.css`：快捷入口、更新页、viewport 与宿主文字阴影隔离。
4. `src/nsfw-auto.css`：关键词联动专属规则。

构建按此顺序原样连接，再用 `JSON.stringify` 注入脚本。不要按文件名排序或使用会重排规则的压缩工具，否则 CSS 优先级可能变化。新样式沿用已有变量和 `#fruit-heart-v6` 前缀。

## 构建与共享接口

`scripts/assemble.mjs` 展开模板的 `/* @include src/... */` 标记。路径从仓库根开始，循环包含、重复包含、文件缺失与缺失构建占位符都会报错。替换内容使用函数回调，避免把字符串里的 `$&` 等当成替换指令。

这是构建时分文件，不是独立 ES 模块：各片段仍在同一个私有 IIFE 中共享声明。没有新增 window 全局，也没有声称模块之间已经完全隔离。这样可以保留既有调用、闭包和初始化顺序，降低本次结构整理的兼容风险。

共享约定：

- 预设读取通过 `activePreset/readConfig`；持久写入通过 `updateBoth`，避免页面自行复制保存逻辑。NSFW 自动控制有意只写 `in_use`，不要改为保存具名预设。
- 页面切换使用 `render(view)`；修改主题使用 `applyTheme`，不要另起一套页面状态或 CSS 注入。
- 助手事件使用 `listenHelper` 登记到对应 stop 列表；入口重新绑定前清理按钮监听。NSFW 控制器管理自己的 stop 列表，最终仍由 `destroy` 清理。
- 新增长期资源时，在 `startup` 明确启动时机，并在 `lifecycle` 登记对应清理。DOM 委托使用当前实例命名空间。
- 不随意调整 include 顺序：顶层 `const/let` 有初始化时机。纯函数声明可以较早引用，实例对象只能在依赖初始化后创建。
- 外部扩展 API 的版本核对方式沿用工作区 `tavern-helper-script` skill，不根据目录名推断 API 可用性。

如果以后要真正隔离共享状态，可以逐个模块改成显式传入依赖的工厂函数；应作为另一个有行为回归验证的改动，不与文件搬迁混在一起。

## 验证和交付

```sh
node --test tests/*.test.mjs
node build.mjs --local
node --check dev/fruit-heart.js
```

开发时改 `src/`，通过 `dev/fruit-heart-local.json` 试用，不编辑 `releases/`、`loader.js` 或已发布安装文件。正式发布仍需先增加版本，既有发布文件不可覆盖。

本次拆分前后 `dev/fruit-heart.js` 和 `dev/fruit-heart-local.json` 逐字节一致；JS SHA-256：

`29e1a792dafdf07741032c0cd75cbb1b3144754aefb13d92445447c94358898d`

37 项测试通过。此次没有改变运行代码或视觉，也没有重复执行上一轮的浏览器流程；上一轮截图和宿主模拟验证见 [维护检查记录](review-2026-09-20.md)。后续功能修改仍需按影响范围运行宿主回归。
