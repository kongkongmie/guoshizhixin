# 20260920丨果实之心丨V6.13 与 .15 脚本代码审阅
> 更新于 2026-09-20 · 状态：A1/A2/A3/A5 已改并验证，A4 未做；其余全部待办

## 结论

**git 版与本地版是同一份代码**，`releases/20260919.15/fruit-heart.js` 与
`交付\20260918丨果实之心丨本地完整脚本\果实之心-v20260919.15-本地完整版.js`
只差一行：`const SUBTITLE`（「果实 V6+」vs「本地版」）。审阅按一份算，改动一律落在
`src/fruit-heart.template.js`（行号见下），`build.mjs` 重出两份。

**预设本身是干净的**，没有发现结构性问题：
310 条 prompts / 274 条在 `prompt_order`（36 条是 unused 池，含 5 条 `#CLAUDE` 备用）；
`prompts[].enabled` 与 `prompt_order[].enabled` 零不一致；无重名；
18 个分区 emoji 无撞车、274 条全部归区；18 个互斥组**每组当前都只开了一条**；
实际发送 93 条 / 35,159 字。
`extensions.fruitHeartSections` 与 `baibaiToolkit.presetPromptGroups` 目前字节级一致，没有跑偏。

已排除的两个假警报（别再查一遍）：
- `final_message / order / outline / origin_input / merged_input / modnote`
  读了没人写 —— 它们由 QR 的 `/setvar` 写，不在预设条目里，正常。
- XML 标签配平扫描报的 `<user> <snow> <ECoT> <性爱指导> <novel_header>` 等
  「开了没闭」全是输出格式标签，不是容器标签，不成立。

---

## 已做（2026-09-20，只改 `src/fruit-heart.template.js`，未构建、未发布、未动预设）

A1 / A2 / A3 / A5 四处，模板 212,237 → 210,269 字符。**A4 没做**，理由见下。

验证（jsdom + 真 jQuery + 真 V6.13 数据，`getPreset` 按酒馆助手语义模拟
identifier→id、按 `prompt_order` 分在册/未用、enabled 取自 order）：

- `node --check` 通过；eslint `no-undef` 与 `.15` 基线**同样只剩 2 条**
  （`releases/*/fruit-heart.js` 第 84-85 行，vendored js-sha256 的 Node 分支，浏览器里是死代码）
- 构建产物按版本号归一后 diff：**只有这四处改动，没有第五处**
- 四个页面渲染节点数/HTML 长度与 `.15` **逐字节一致**（只差版本号那一行）
- 首页栏目拖拽 → 写回 `config.homeOrder` ✓；分区拖拽 → 写回 `config.sectionOrder` ✓（`makeSortable` 的 key 参数走通）
- 首页「短」按钮 → `需求字数2200-2500字` 改成 `需求字数800-800字` ✓（`saveWordCount` 改成转调后仍对）
- A1 实测收益：开面板＋切四页＋展开一区，`readConfig` 20→16 次、`configPrompt`（310 条 find）22→18 次

**A4（32 个 `if (action === …)` 改查表）主动跳过。** 那条链里的分支共享
`event` / `this` 闭包，用 `return` 兼作控制流，还有 `qr-tag-save || qr-tag-delete`
这种一个分支管两个动作、并在体内读 `action` 的写法。机械改表要逐个处理这些差异，
而收益只有可读性，零用户可见变化 —— 32 颗按钮的真机点检成本远大于收益。
要做的话单开一轮，配一张逐颗点过去的清单。

## 一、白拿的精简（改动小，不碰行为）

| # | 位置（template.js） | 事 |
|---|---|---|
| A1 | L529 `activePrompts(preset, config = readConfig(preset))` | 第二参数**函数体里根本没用**。默认值照样求值 —— 8 个只传 preset 的调用点等于白跑一遍 `readConfig`。删参数即可。**注意**：它顺带起了「预设没有控制配置就抛错」的作用，删前确认 `combinationLabel` / `captureTagState` 等调用点没靠它兜底 |
| A2 | L1570 `saveWordCount` / L1583 `applyWordRange` | 函数体一字不差，只差取值方式。`saveWordCount` 读完两个输入框 `return applyWordRange(min,max)`，省 12 行 |
| A3 | L1329 `bindHomeSort` / L1366 `bindSectionSort` | 同一套 pointer 拖拽，只差选择器与 config 键（`homeOrder`/`sectionOrder`）。抽 `makeSortable(sel, key)`，省约 40 行，以后调拖拽手感只改一处 |
| A4 | `[data-action]` 委托（built L2342 起，约 200 行） | 32 个 `if (action === '…')` 串成一条。换成 `const ACTIONS = { 'xxx': fn }` 查表 |
| A5 | L37 `GROUP_ORDER` | 含 `喵喵选择器`（那两条已不在 `prompt_order`，永远不出现），缺 `头部`（实有 2 条，现被排到末尾）。对调 |

（A1/A2/A3/A5 已落，保留上表是为了记清改了什么、为什么。）

## 二、性能：常驻定时器每 2.5 秒抓两次整份预设

`entrySweepTimer`（L2408，面板关着也在跑）每轮调 `sweepBarEntry()` + `ensureWandEntry()`，
两条路**第一件事都是** `hasFruitHeartConfig()` → `activePreset()` → `getPreset('in_use')`。

两处的判断顺序都是「先问预设、后问 DOM」，而能短路的恰恰是 DOM 那一问：

- `ensureWandEntry`（L2211）：把 `existing?.dataset.fhInstance === INSTANCE_ID` 提到 `hasFruitHeartConfig()` 之前
- `ensureBarEntry`（L2268）：把 `barEntryButtons().length` 提到 `hasFruitHeartConfig()` 之前

稳态下这两次 getPreset 就没了。另：`sweepBarEntry()` 一轮里 `barEntryButtons()` 被算 3 次
（自身 / `ensureBarEntry` / `dressBarEntry`），每次 4 选择器 querySelectorAll —— 算一次传下去。

**下面两条先量再做。** 控制台：

```js
const t=performance.now(); for(let i=0;i<20;i++) TavernHelper.getPreset('in_use');
console.log((performance.now()-t)/20 + ' ms/次');
```

- 若 >5ms：`autoSections`（L640）是 `new WeakMap()`、键为 preset 对象。
  getPreset 每次返回新对象的话，这个缓存**一次都命中不了**，`derivedSections` 每次重算。
- 若 >5ms：`render()` 渲染函数取一次 preset、结尾 `presetFingerprint()`（L2040）又取一次，
  每次切页/点开关至少两次。给 `activePreset()` 加 microtask 级记忆
  （`queueMicrotask(() => memo = null)`），同一次同步渲染共用一份，遇 `await` 自动失效。

## 三、预设的随身重量（不改行为，只减体积）

V6.13 紧凑序列化 979,625 字节。

- **`20260919丨果实之心丨本地测试版` 条目 237,519 字（约 24%），`enabled:false`。**
  每次面板写入要连它跑两遍（具名文件 + settings.json），每次 getPreset 也要带着它。
  磁盘上 `交付\20260918丨果实之心丨本地完整脚本\` 已有同一份，随时可贴回。建议从预设里删。
- **控制配置 `fruit-heart-control-config-v2` 94,066 字**，其中：
  - `assignments` 19,531 字 —— 全脚本**零引用**
  - `categories` 1,288 字 —— 只出现在 `readConfig` 的版本校验里，从没被读
  这两块是废弃的 7 大类/26 小类坐标系残留。删 `assignments`、`categories` 清成 `[]`，
  校验那句不用改，config 立刻瘦 20 KB。
- 停用的美化正则 `MoM美化-[12]喵喵选择器-悬浮窗@宵迦` 35 KB、`[9]开篇序言双色版` 10 KB（仅记录）

## 四、体验

1. **每次刷新酒馆打 3 次 GitHub。** 加载器 2 次（`release.json` + 发布文件），
   主脚本 `scheduleUpdateCheck()` 1.2 秒后又打一次 `release.json` —— 完全重复。
   让加载器把本轮结果写进 localStorage（版本 + 时间戳），主脚本读它；
   只有用户手点「检查更新」或距上次超过数小时才自己发请求。国内网络下少一次 15 秒挂起。
2. **玻璃皮肤在手机上没有安全模式。** `@media (max-width:560px),(hover:none) and (pointer:coarse)`
   只关了 `transition` 和 `box-shadow`，三层 `backdrop-filter` 原样留着：
   `.fh-shell` blur(22) / `.fh-sheet-box` blur(26) / `.fh-bottom-nav` blur(16)。
   底部导航那层最贵 —— 固定层压在滚动内容上，每帧重算模糊。**这就是玻璃温室那次的坑。**
   在该 media 里给 `[data-skin=glass]` 补 `backdrop-filter:none` + 不透明底色。
3. **`setPrompt` 写死两个 UUID**（L1559）：`bd638843…`＝`🧠 防抢话`，
   `87c8a41d…`＝`🤖 防抢话｜只演其他角色｜抢话单选`。两条现在都在，功能正常。
   但这跟「总闸按正文特征定位、不按名字/ID」的自定规矩反着来。
   抽成文件头一张 `LINKED = [{group:'抢话', when:<id>, also:<id>}]` 表并写清是哪两条。
4. **`RELEASE_NOTES` 整份内联进脚本**，现 14 版约 5 KB，只涨不跌。
   `build.mjs` 里截最近 8 版，其余留在 GitHub。
5. **撤销上一步**（她自己的旧待办，本轮确认仍没做）。注意 `config.lastAppliedStates`
   **不能**直接当回退源 —— `setPrompt` 在改完之后才 `rememberAppliedStates`，存的是新状态。
   做法是在 `updateBoth` 之前把 `currentStates(preset, config)` 压进一个内存栈（不写预设）。

## 非显然的约束

- 改的是 `src/fruit-heart.template.js`，不是 built 或 `交付\` 下那份；`node build.mjs` 重出两份，
  `release-notes.json` 加版本号（同版本号内容不同会被 build.mjs 拒绝覆盖）。
- `js-sha256` 内联 18.6 KB **不能**换成 `crypto.subtle` —— 20260918.5 就是因为
  Web Crypto 只在安全上下文可用，普通 HTTP / 局域网酒馆全线加载失败才内联的。别再提这条。
- 写预设仍按老规矩：她完全关掉酒馆 → 写具名文件 + settings.json → 重开（不是 F5）。
- 本机 `device_bash` 起不来（Workspace unavailable），全程走 stage/commit。

## 下一步

- [x] A1/A2/A3/A5 已改并验证，只写了 `src/fruit-heart.template.js`
- [ ] **还没构建、没发布、没写进预设。** 要发就：`release-notes.json` 顶部加
      `20260920.1` → `node build.mjs` → 推 origin → 关酒馆写两份文件。
      构建会同时出 `releases/20260920.1/fruit-heart.js`、`release.json`、`loader.js`、
      `install/…json`；**先推 GitHub 再让用户刷新**，否则加载器指向一个不存在的版本
- [ ] 跑一次 getPreset 计时，决定二章后两条做不做
- [ ] A4 单开一轮（见上）
- [ ] 二章的两处判断顺序调整 + `barEntryButtons` 只算一次
- [ ] 四.2 玻璃皮肤手机安全模式（真机看一眼滚动）
- [ ] 三章的预设瘦身需要她先关酒馆，单独一轮做
