# 交接：发布 20260921.2

> 写给接手推送的 Codex。2026-09-21 · 阿青

## 状态

- `src/` 的正式基线是 `20260921.2`；工作区已新增未推送的本地版本 **`20260923.1`**。
- 正式版已构建、验证并推送；发布提交为 `d1ac2df`，版本 `20260921.2`。
- 本轮只生成 `dev/fruit-heart.js` 和本地 ECoT 模块，等待咩咩手动贴入酒馆验收。

## 这个版本做了什么

更新日志 19 条，都在 `release-notes.json` 里。结构说明看 `docs/architecture.md`。三块大改动：

1. **NSFW 自动判断**（`src/nsfw-auto.js`）：根据 📌 摘要里的「性爱进度 n/10」自动开关 NSFW 总开关，启动词和关闭词只用来抢在摘要之前生效。
2. **世界书拦截**（`src/nsfw-worldbook.js`）：在 `WORLDINFO_ENTRIES_LOADED` 事件里原地删掉带标记词的条目。**完全不写世界书文件。**
3. **设置跟着预设走**（`src/core/preset-settings.js`）：自动化相关的开关存进 🔧 控制配置，面板外观存成这份预设的开局默认。
4. 合并了 @芝士 的 PR #1（源码拆分和生命周期修复），她那版关键词 NSFW 没收。

## 要做的事

### 1. 清理（全部是没发布过的中间产物，或者已经过时的）

```
releases/20260920.1   releases/20260920.3  …  releases/20260920.12    （共 11 个目录）
src/_HANDOFF_nsfw-auto.md          ← 内容已经并进 docs/architecture.md 和本文档
src/面板文案_待咩咩修改.md          ← 文案校对已经完成
tests/worldbook-api.test.cjs       ← 测的是 .4 那版写世界书的方案，已经废弃
```

**`releases/20260918.*` 和 `releases/20260919.*` 不要删**，这些已经发布过了。

`.gitignore` 里加一行 `node_modules/`。

### 2. 构建和测试

```sh
node build.mjs                         # 生成 releases/20260921.2/、release.json、loader.js、install/*.json
node build.mjs --local                 # 生成 dev/（已经在 gitignore 里）
node --check releases/20260921.2/fruit-heart.js
npx eslint dev/fruit-heart.js          # 正好 2 个错才算正常：vendor 里 js-sha256 第 84、85 行的 require
node --test tests/*.test.mjs           # 19 个通过

npm i --no-save jsdom jquery
set FH_PRESET=H:\sillytavern\SillyTavern\data\default-user\OpenAI Settings\【MoM】果实V6.2丨果实之心@KKM.json
for %t in (nsfw-auto settings-layout settings-page entry-sweep preset-settings) do node tests\%t.test.cjs releases\20260921.2\fruit-heart.js
```

5 套测试的最后一行都应该是「全部通过」或者带 ✓。阿青在容器里对同一份源码跑过，全部通过，
正式版的 sha256 是 `e3ef6f17…4350a`。

## Codex 执行记录（2026-09-21）

- 已按清单删除 11 个未发布的 `releases/20260920.*` 目录和 3 个过时文件，并在 `.gitignore` 加入 `node_modules/`。
- 正式构建 SHA-256 为 `e3ef6f1707019ed718aa81a6d5a981407568849f7e97d116d7c2eb32d8d4350a`，与本文预期逐字一致；`release.json` 声明值与产物实算值一致。
- eslint 正好 2 条 vendor `require` 错误；`node --test tests/*.test.mjs` 为 19/19 通过；5 套 jsdom 回归全部通过。
- 修复了两处仅影响测试的环境问题：`entry-sweep` 改用系统临时目录；NSFW 测试在内存预设副本中建立固定出厂基线，避免用户后来修改的自动化设置让测试漂移。没有写入 `H:\sillytavern\`。
- `origin/main` 与本地一致；按提交哈希和分支 raw URL 读取远端 `release.json`，均已确认版本与 SHA 正确（分支 URL 推送后曾短暂命中旧缓存，随后已刷新）。
- 当前机器未安装 `gh`，因此 PR #1 尚未关闭；需在 GitHub 页面手动关闭并备注“已手工合并”。

### 3. 提交和推送

```sh
git add -A
git commit -m "20260921.2：NSFW 自动判断、世界书拦截、设置随预设保存；合并 @芝士 PR #1"
git push
```

推送后打开 `https://raw.githubusercontent.com/kongkongmie/guoshizhixin/main/release.json`，
确认 `version` 已经是 `20260921.2`。PR #1 在 GitHub 上手动关掉，备注「已手工合并」。

## 坑和约束

- **不要碰 `H:\sillytavern\` 下面的任何文件。** 酒馆在 `settings.json` 的 `oai_settings` 里也存着一份当前预设
  （连脚本正文一起）。开页面时从这里恢复，保存时再写回预设文件。只改预设文件，
  改动会被这份拷贝覆盖掉。之前被覆盖了三次才找到原因。要改脚本，就让咩咩在酒馆界面里粘贴。
- **`build.mjs` 不会覆盖已经存在的版本目录。** 内容不一样会直接报错。要改代码就去 `release-notes.json` 里加版本号，
  不要删掉已发布的目录后重新构建。
- **eslint 的 `files` 只匹配 `dev/fruit-heart.js`。** 对着 `releases/…` 跑会因为没匹配到文件而直接 exit 0，
  那不代表通过，是根本没检查。

## 多语言评估（2026-09-22）

- `src/` 目前有约 702 行含中文，混合了界面文案、提示、预设内部名称和功能识别词；不能整批机械翻译。
- 建议首期只做简体中文和英文界面：新增统一 `t()` 文案层，语言默认跟随浏览器并允许手动切换；内部条目名、QR 指令、识别关键词保持原值，避免破坏功能。
- 预计首期实现与回归 2–3 个工作日；把全部帮助、报错、更新页和移动端排版都完整验收为 3–5 个工作日。框架完成后，每增加一种语言约需 0.5–1.5 天翻译和半天界面回归。
- 预设提示词、QR 正文和模型语义的翻译应单独立项，每种语言约 1–3 周，并需要母语使用者实际生成验收。
- `src/*.js` 是构建时拼接的代码片段，不是独立模块。全部共享同一个 IIFE，`/* @include */` 的顺序就是初始化顺序，不要随便调。

## 推送之后（让咩咩在酒馆界面里操作，不要用 Codex）

在 V6.2 的酒馆助手脚本里，**打开 Git 正式版，关闭本地版**。

## Pake 更新缓存不足

- Pake 没有浏览器的站点数据清理入口。果实之心只需删除 localStorage 键 `fruit-heart-released-script-v1`，不要清空整个 Pake 数据目录，避免连带删除登录状态和其他酒馆设置。
- 可在开发者工具 Console 执行 `localStorage.removeItem('fruit-heart-released-script-v1'); location.reload();`；没有开发者工具时，用酒馆助手临时脚本执行同一句，运行一次后删除该临时脚本。
- 若仍受 WebView 配额限制，可临时关闭 Git 版、开启已内嵌的 `20260921.2` 本地版。

## 20260923 本地 ECoT 开关
> 更新于 2026-09-23 · 状态：本地测试版待咩咩验收，未推送

### 结论

本轮只改了源码和本地 ECoT 模块，没有碰 `H:\sillytavern\`，也没有提交或推送。新本地主脚本版本为 `20260923.1`，设置页新增两个默认开启的开关：自动开启酒馆自动解析、清除 `[语言检定]` 之前的内容。

### 关键决策

- 开关状态沿用 ECoT 模块的 localStorage，不写预设控制配置；这样不会改用户的预设本体。关闭自动解析时立即取消酒馆的自动解析勾选，关闭语言清理只影响之后的解析，已经被删除的旧内容无法恢复。
- 主脚本和预设内的 `fruit-heart-ecot.js` 同步更新；旧 ECoT 模块没有这两个 API 时，主面板会禁用开关并提示先更新模块。
- 本地测试需要同时贴主脚本和 ECoT 模块：主脚本在 `dev/fruit-heart.js`，ECoT 模块在 `dev/fruit-heart-ecot-local.js`。

### 验证

- `node --test tests/*.test.mjs`：19/19 通过。
- `node tests/ecot-options.test.cjs`：通过；默认值、五个结束标签、开关和语言清理行为均验证。
- `settings-page.test.cjs`、`settings-layout.test.cjs`、`preset-settings.test.cjs`、`entry-sweep.test.cjs`：通过。
- `build.mjs` 的浏览器 hash 包装器已显式声明 `require = undefined`，因此 `npx eslint dev/fruit-heart.js` 现在 0 报错；Node 分支仍被 `process = undefined` 和 `window = {}` 禁用。
- `nsfw-auto.test.cjs` 使用旧备份预设时在既有 fixture 缺少 `nsfwAuto.open` 处失败，未归因于本轮 ECoT 改动；换完整当前测试预设后再回归。

### 下一步

- [ ] 咩咩在酒馆里停用旧本地/正式主脚本，贴入 `dev/fruit-heart.js`，并把 `dev/fruit-heart-ecot-local.js` 覆盖预设内同名 ECoT 脚本后测试两个开关。
- [ ] 咩咩确认后再把 `20260923.1` 正式构建、提交并推送；本轮不要执行 `git push`。

## 下一步（还没做）

- `src/ui/events.js` 里 30 多个 `if (action === …)` 分支，改成查表。
- `activePreset()` 在同一个微任务里被调用多次，考虑做一个短时缓存。动手之前先量一下 `getPreset` 的实际耗时，确认值得。
- 真机上还没验证：NSFW 开关的切换能不能在**同一回合**内生效；玻璃皮肤在手机上滚动是否流畅。

## 20260923.2 修复 ECoT 两个开关「不生效」
> 更新于 2026-09-23 · 阿青 · 状态：本地版待咩咩验收，未推送

### 结论
.1 的两个开关只改了一半：「自动解析」关掉后，ECoT 模块自己的 `extract()` 仍在把思维链从正文折进推理块，`applyFormatter()` 仍在每次 SETTINGS_UPDATED 时选中「果实之心」推理格式并强行写 auto_parse 勾选——用户看到的效果和开着一样。「语言检定清理」打开时不整理已有消息，只等下一条/切聊天。

### 改了什么
- ECoT 模块（`dev/fruit-heart-ecot-local.js`，根目录 `fruit-heart-ecot.js` 同步）：
  - 自动解析关闭 = `applyFormatter` 直接 return、`extract` 不再拆正文；关闭那一下取消酒馆 auto_parse 勾选，之后不再碰。
  - `setAutoParse(true)` / `setTrimBeforeLanguageCheck(true)` 自己跑 applyFormatter + rescan，变成 async。
  - 语言检定清理独立于自动解析：酒馆原生解析出的推理块也会被清。标记兼容 `［语言检定］` `【语言检定】` 和括号内空格。
  - `processing` 锁（撞车即丢）换成串行队列；rescan 只 saveChat 一次；新增 CHARACTER_MESSAGE_RENDERED、GENERATION_ENDED(+300ms) 兜底，防原生解析在 MESSAGE_RECEIVED 之后才写 reasoning。
  - api 新增 `version` 字段。
- 主脚本：两个 toggle 改为 await；开关文案改写；设置页底部状态显示 ECoT 模块版本（旧版显示「旧版」），方便判断贴没贴对。
- 版本 `20260923.1` → `20260923.2`（未发布过，直接替换了 release-notes.json 首条）。

### 验证
- node --check 主脚本、ECoT 通过；mock ST 上的行为测试：关/关不动、仅清理只动推理块、开启后三种消息正确拆分、二次 rescan 0 改动。
- 没重跑 build.mjs：dev/fruit-heart.js 是直接改的产物，src 同步改了同样的三处。下次 `node build.mjs --local` 应得到同样结果，先 diff 确认。

### 非显然
- 已经被删掉的 [语言检定] 前内容存在聊天文件里，关开关不会回来。
- 如果预设里还挂着旧 ECoT 脚本（b001）又另贴了一份新的，两份都会跑，旧的会继续无条件清理——设置页状态能看出当前生效的是哪版。

## 20260923.3 · ECoT 不绑定 / DS 关思考 / 词表折叠
> 更新于 2026-09-23 · 阿青 · 状态：本地版待咩咩验收，未推送

- **ECoT「绑定 ECoT 自动解析」语义改正**：开=强制绑定（锁推理模板+勾自动解析+脚本拆正文）；关=完全不碰酒馆推理设置。.2 关闭时会取消一次「自动解析」勾选，咩咩换成自己的模板后发现被取消——.3 删掉了这一步。ECoT 模块 v20260923.3。
- **DeepSeek 自动关闭原生思考**（`src/model-link.js` 末尾 `syncDsThinking`，跟模型联动同一个 1s 定时器）：连接是 DS（source=deepseek / 模型名含 deepseek / custom_url 含 deepseek）时往 `oai_settings.custom_include_body` 写 `{"thinking": {"type": "disabled"}}`，离开 DS 时删掉。localStorage `fruit-heart-ds-thinking-added` 记是不是脚本的；已有 `thinking: disabled` 视为脚本的（接管），其他 thinking 值不碰。能按 JSON 解析就合并对象，否则按 YAML 行追加/删除。开关 `config.dsThinkingOff` 存预设，默认开。
  - 只看**插头**是不是 DS，不看面板模型标签——面板切到 DS 标签但插头是 Gemini 时写 thinking 会被 Gemini 端拒。
  - 酒馆只在「自定义（兼容 OpenAI）」来源下发送附加参数，咩咩就是这种。
- **词表折叠**：启动词/关闭词/世界书触发词用 `<details class="fh-doc fh-tagfold">` 包住，summary 显示词数；展开状态存 `tagFoldOpen`（settings.js 顶部），增删词重绘后保持展开。
- 这次是在容器里改 src 后 `node build.mjs --local` 构建的（先确认构建能逐字节复现 .2 的 dev 产物）。settings-page / settings-layout / preset-settings / ecot-options / model-link 测试通过；另用 jsdom 验证折叠与 DS 开关、mock 验证 DS 写入/合并/移除/接管 8 种情况。

## 20260924.1 · 模型切换加入 GLM
- `src/core/presets.js` 的 `MODELS` 加 `{ tag: 'GLM', label: 'GLM' }`（排在 DeepSeek 后）；`src/model-link.js` 的 `linkedModelTag` 认 `GLM|ZHIPU|BIGMODEL` → `GLM`（预设里没有 #GLM 条目时不切）。
- 预设里目前只有 `🧠 思考约束|思考约束单选 #CLAUDE #DS #GLM` 一条带 GLM 标签。
- model-link 测试补了 3 例；jsdom 用当前 settings.json 的预设验证模型选择里出现 GLM 并能点击切换。ECoT 模块没改，仍是 v20260923.3。

## 20260924.1 追加 · 「随NSFW」跟随条目（为花样骰子）
- 背景：`{{random}}` 塞进 `{{setvar::X::…}}` 不生效（咩咩实测，条目仍发 76 token = setvar 没被识别、残文漏出）；`{{roll:1d10}}` 她说能嵌。所以含 random 的 NSFW 条目改为**直接输出**，不走变量。
- 为了让它仍受 NSFW 总开关管：条目名含 `随NSFW` 的条目跟着 `nsfwMaster` 开关。
  - `setPrompt` 动的是总开关时，跟随条目同步（覆盖首页一键总控、NSFW 自动判断、条目页开关）。
  - `syncNsfwFollowers()`（runtime/generation.js）在 MESSAGE_SENT / GENERATION_AFTER_COMMANDS 时对齐一次，覆盖「在酒馆条目列表里直接点总开关」。启动时 `bindNsfwFollow()`，与 NSFW 自动判断是否开启无关。
- 预设侧：`🔞 花样骰子｜随NSFW·每轮随机` 放在 `📌 🥵NSFW输出` 之后，正文直接写三组 `{{random:…}}`；总开关里不再 getvar 它。
- 验证：jsdom 下首页一键总控 off/on/off 跟随正确；直接改总开关后发送一次跟随对齐；设置页/布局/预设设置/model-link 测试通过。
- **修正（同日）**：初版「随NSFW」每次发送都强制跟总开关对齐，导致 NSFW 开着时没法单独关花样骰子。现改为：总开关关 → 把开着的跟随条目关掉并记入 `config.nsfwFollowHeld`；总开关开 → 只恢复记下的那些；总开关开着时不碰跟随条目。`nsfwFollowHeld` 未定义（老用户）时：面板里把总开关打开会全部恢复一次，发送前的对齐不动它。逻辑在 `holdNsfwFollowers()`（presets.js），`setPrompt` 和 `syncNsfwFollowers` 共用。jsdom 下 10 步场景全部符合预期。

## 20260925.1 · 模型标签记忆被误写（Gemini 条目默认不开）
> 2026-09-25 · 阿青 · 本地版待验收，未推送

- 现象：V6.3 选 Gemini Flash，出厂开启的 #GEMINI 条目（角色平衡/强势角色压制/病态角色压制/台词约束）是关的；`tagStates.GEMINI` 里它们是 false，`initialTagStates.GEMINI` 里是 true。
- 根因（`captureManualChanges`）：在别的模型（Claude/DS）下，只要某条 #GEMINI 条目的 `lastAppliedStates` 过期或缺失（面板外改过开关、新加条目、复制出新预设），切模型前的捕获会把它「被模型强制关掉」的状态写进它**所有**标签的记忆，GEMINI 记忆就被记成关。首次播种（seed）也拿当前状态，同样问题。jsdom 复现：stale lastApplied + 在 Claude 下切回 Gemini Flash → 四条全被记关。
- 修法：新增 `seedTagState()`——首次记忆只有当前模型用现状，其他模型用 `initialStates`；手动改动捕获时，选了模型且条目不属于它就跳过。`applyTag` 的播种也改用 `seedTagState`。
- 已被写坏的记忆不会自动恢复（分不清是不是用户自己关的）：让咩咩在 Gemini Flash 下手动打开一次，或用「重置全部开关」。
- 这版基于磁盘上含「随NSFW」修正版的源码构建；Tavern 里当时跑的是 Git 20260921.2，本地版 b003（20260924.1，无随NSFW）是关的。

## 20260925.1 追加 · NSFW 入口小红点只在「自动」档亮
- 根因：`paintNsfwIndicator` 只在自动判断（nsfw-auto.js）和首页一键总控（`toggleMaster`）里调用；「常开/关闭」档走 `setPrompt`，条目页开关也走 `setPrompt`，都不刷新小红点。
- 修法：`setPrompt` 里动的是 NSFW 总开关（`followNsfw`）时 `paintNsfwIndicator(enabled)`；`syncNsfwFollowers`（发送时）先对齐一次小红点，覆盖在酒馆条目列表里直接点总开关的情况。
- jsdom：常开/关闭来回切 4 次，快捷栏入口和悬浮猫咪的 `fh-nsfw-lit` 都跟随。版本号仍为 20260925.1（未发布）。

## 20260925.1 追加 · 本地版与 Git 版可同时开启
- 需求：两份都开；Git 能加载就用 Git（首次用户自动拿最新），首次又没网时自动用本地版。
- 协议（都在 host window 上）：
  - 加载器一启动就写 `__FRUIT_HEART_LOADER__ = { state: 'loading' }`，结束写 `done` / `failed`。
  - 主脚本 `context.js` 启动闸门：本地版先等加载器露面（≤1.5s），再等它不是 `loading`（≤40s）。然后看 `__FRUIT_HEART_MAIN__`：**另一渠道**（local 标记不同）已有同版本或更新的在跑 → 不启动；否则 destroy 旧的并立刻占位 `{ version, local }`。**同渠道一律接管**（重新粘贴同版本也要生效——第一版写成「同版本不启动」，preset-settings 测试里的重载场景挂了，才改成按渠道判断）。
  - 加载器 `run()` 前：已有本地版且版本 ≥ 要跑的 → 不跑（兼容没有闸门的旧发布代码）。
  - 加载失败：3 秒后若已有实例（本地版接管）只打控制台，不弹 toastr。
- 过渡期：GitHub 上的 20260924.1 没有闸门，但新加载器会替它判断；旧加载器 + 新本地版时，旧 Git 代码仍会无条件接管（所以加载器也要换）。
- 加载器产物 `dev/fruit-heart-loader.js`：按 build.mjs 同样的替换手工生成，LOADER_VERSION 取当前 release.json（20260924.1），没有跑正式构建、没有动 releases/ 和根目录 loader.js。**下次正式发布时 `node build.mjs` 会从 `src/loader.template.js` 重新生成根目录 loader.js，别忘了让用户换加载器。**
- `tests/panel-harness.cjs` 里预置 `__FRUIT_HEART_LOADER__ = { state: 'done' }`，免得本地版每个测试等 1.5 秒。
- jsdom 11 个场景（离线/同版本/Git 旧/Git 新 × 两种启动顺序，仅加载器离线，仅本地版，本地版重载）全部只有 1 个面板、结果符合预期；原有测试通过。

## 20260925.1 发布 · 已推送
> 更新于 2026-09-27 · 状态：完成

- 正式构建 `releases/20260925.1/fruit-heart.js`，sha256 `1f81964b9a0d24c0e35e901c75415f40581e68eadaba3ff8c19b0a230b9920b7`；`release.json`、根目录 `loader.js`（LOADER_VERSION 20260925.1）、`install/…Git加载修复.json` 已重新生成并写回本目录。
- 测试：`node --test tests/*.test.mjs` 22/22；jsdom 五套（nsfw-auto / settings-layout / settings-page / entry-sweep / preset-settings）全部通过；ecot-options 通过；`npx eslint dev/fruit-heart.js` 0 报错。
- 已删除仅用于转交的 `20260925.1.patch`，发布提交为 `1c61ca6`，已推送到 `origin/main`。
- 推送前复核：正式产物 SHA-256 与 `release.json` 一致；22/22 基础测试、ECoT 测试和五套 jsdom 预设回归全部通过；eslint 0 报错。
- 远端最终以 `origin/main`、GitHub `release.json` 与正式产物 SHA 三项一致为准。
- 预设：已写入 `【MoM】果实V6.31丨果实之心@KKM丨20260927`（具名文件 + settings.json 运行态），Git 槽换新加载器（20260925.1）并开启，本地版槽换 20260925.1 本地构建并改名「20260925丨果实之心丨本地版」，两个都开；ECoT 槽未动。原文件备份为 `….json.20260927-换脚本前.bak`。推送前 GitHub 上仍是 20260924.1：新加载器发现本地版更新会让位，面板照常由本地版运行；推送后自动切到 Git 版。

## 20260929.1 · 首页「导出为 TXT 小说」
> 2026-09-29 · 阿青 · 状态：本地版待咩咩验收，未推送、未写进预设

参考 @hy 的「纯净小说导出」脚本，做进果实之心。基线是 V6.4 里跑的本地版 20260925.1（`node build.mjs --local` 与预设 b003 逐字节一致后才动手）。

### 做了什么
- `src/core/novel-export.js`（纯函数）+ `src/ui/export.js`（页面）；首页 `HOME_CARDS` 加 `export`，入口紧跟 QR。
- `homeOrder()` 改了：存过顺序的老用户，新栏目插在它默认的前一个邻居后面，不再甩到最底。
- 产物：`dev/果实之心-v20260929.1-本地版.js`（贴进酒馆助手）和同名 `.json`（新 id，导入不会覆盖 b003）。**没有覆盖 `dev/fruit-heart.js`**。

### 关键决策（和 @hy 那版的区别）
- **标签不手打，从聊天里扫**：范围内出现过哪些最外层 `<tag>…</tag>` 就列哪些，带「在几层里出现」。角色卡自带的状态栏（`<time>` `<coffee>`…）每张卡都不一样，写死一张表必漏。默认只勾 `content`。
- **`<content>` 里夹着生图**：V6.4 的 `<content>` 内含 `<imgthink>` 和 `image###…###`，始终剥掉。思维链：成对的当块丢；**只有没有开标签的**才把开头一路砍到 `</thinking>`（最初写成无条件砍，思维链写在正文后面时整条消息被清空，单测抓到的）。
- **分章默认「自动编号」**：模型写的 `[CHAP]` 不可靠（实测同一聊天里「第八章」后面接「001」）。自动编号＝每条 AI 回复一章＋`[TITLE]`；第 0 楼没标题叫「序章」不占号。「用原章号」照抄。
- **AI 忘写 `<content>`**：该层没有勾选的块时默认保留标签外文字（可改成跳过）。
- 隐藏楼层默认**包含** —— 果实的「隐藏楼层」QR 是省 token 用的，那些楼也是剧情。
- 替换规则：手打的不带斜杠当普通文字；导入的酒馆正则不带斜杠也当正则（和酒馆一致）；`{{match}}` → `$&`；坏正则跳过不炸。
- 选项存本机 `fruit-heart-export-v1`；「接着上次」按聊天 id 记在 `fruit-heart-export-last-v1`（只有「导出 TXT」会记，「复制」不记）。
- TXT 加 BOM、换行转 CRLF（记事本 / 手机阅读器不乱码）。统计＋按钮做成底部吸附条；黑金玻璃里卡片半透，吸附条必须写死不透明底色。

### 验证
- `node --test tests/*.test.mjs` 32/32（新增 `novel-export.test.mjs` 10 条）。
- 新增 `tests/export-page.test.cjs`（jsdom，23 项）+ 原有 5 套 jsdom，全部用 **V6.4 预设**跑通；eslint 0。
- 三份真实聊天（江晦 1.1MB / 许星 / 鹤山）全量导出 20–40ms，输出里零残留标签、`image###`、摘要行。
- Playwright 390px 截图看过暖纸 / 黑金玻璃 / 果园手账三种皮肤和 1280 宽屏。

### 下一步
- [ ] 咩咩在酒馆里停用 b003（20260925 本地版），贴入 `dev/果实之心-v20260929.1-本地版.js`，实机导出一次；**Pake 桌面版里 blob 下载能不能落盘要实测**，不行就用「复制」。
- [ ] 验收后再正式构建 20260929.1、提交、推送（本轮没动 `releases/`、`release.json`、`loader.js`）。
- 没做：Markdown/EPUB 格式、导出思维链（`extra.reasoning`）、swipe 选择 —— 有需要再加。

## 20260930.1 · 非正文卡下拉修正 + 署名
> 2026-09-30 · 阿青 · 状态：本地版待咩咩验收，未推送

- 起因：V6.40 里咩咩加了「Top-题记」（和 Top-简约同属 `｜正文前状态栏单选`），序言删到只剩「开篇序言」。首页非正文卡里出现两个问题：
  1. 「正文前状态栏：Top-题记」太长，被 `.fh-sel` 的 `max-width:12em` 切掉，连 ▾ 都看不见。根因是 `text-overflow:ellipsis` 打在 inline-flex 容器上对裸文字无效。→ 文字包进 `.fh-sel-t` span，省略号打在 span 上，▾ 永远露出来。
  2. 只剩一条的「序言单选」仍渲染成下拉，显示「序言：全部关闭」。→ `mixedChips` 里组成员 ≤1 时按普通胶囊渲染。
- 非正文卡的下拉改用 compact 文案：选中时只写条目名，全关写「组名：关」，多开写「组名：n 项」；完整「组名：条目」放 `title`。常规设置格子里的下拉（抢话/视角/文风/COT…）不受影响。
- 署名：面板标题 `@KKM` → `@KKM@AQING@ACHE`（手机上会换到标题下一行）；导出页与首页入口挂 `@hy`（`.fh-sign`）。
- 「顶部状态栏」没有 `｜正文前状态栏单选`，所以仍单独显示成胶囊 —— 这是预设命名决定的，脚本没替她归组。
- 产物：`dev/果实之心-v20260930.1-本地版.js/.json`。咩咩已把 20260929.1 贴进 V6.40 的 b003（与构建产物逐字一致，只差末尾换行）。
- 验证：32/32 单测；导出页 + 5 套 jsdom 用 V6.40 预设通过；eslint 0；Playwright 390/600px 看过非正文卡（两个下拉 scrollWidth == clientWidth，不再溢出）。

## 20260930.1 发布 · 已推送
> 2026-09-30 · 阿青 · 状态：完成

- 咩咩本机的命令行环境起不来，改为在云端 clone `kongkongmie/guoshizhixin`、放入改动后正式构建并推送。推送前核对：远端 `1741fb6` 与她本地 `src/`、`tests/` 等去掉 CRLF 后逐文件一致。
- 20260929.1 没有单独发布，并入 20260930.1 一起发（更新记录里两条都在）。
- 正式产物 `releases/20260930.1/fruit-heart.js`，sha256 `d68bd22af16b15702b62abd75aad1124bc79e863ac5fbf1b0a1b7f0edd9d7cbe`；与本地版产物除 `LOCAL_BUILD` 外逐字一致，本地版与交付给咩咩的 `dev/果实之心-v20260930.1-本地版.js` 逐字一致。
- `loader.js` 只变了 `LOADER_VERSION`，旧加载器（20260925.1）照常能拉到新版，**不需要换加载器**。
- 测试（V6.40 预设）：32/32；导出页 + 5 套 jsdom 对正式产物全部通过；ECoT 通过；eslint 0。
- **她本地仓库还停在 `1741fb6`，工作区里有同样内容的未提交改动**：在本机执行 `git fetch` 后 `git reset --hard origin/main`（工作区内容与远端一致，不会丢东西；`dev/` 在 gitignore 里不受影响）。
