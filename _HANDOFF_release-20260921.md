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
