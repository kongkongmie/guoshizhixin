# 交接：发布 20260921.2

> 写给接手推送的 Codex。2026-09-21 · 阿青

## 状态

- `src/` 是最终版，`release-notes.json` 最新一条是 **`20260921.2`**。
- 正式版已构建、验证并推送；发布提交为 `d1ac2df`，版本 `20260921.2`。
- 咩咩的酒馆里跑的是同一份源码的本地版（`LOCAL_BUILD=true`），已经在真机上验过。

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
- `src/*.js` 是构建时拼接的代码片段，不是独立模块。全部共享同一个 IIFE，`/* @include */` 的顺序就是初始化顺序，不要随便调。

## 推送之后（让咩咩在酒馆界面里操作，不要用 Codex）

在 V6.2 的酒馆助手脚本里，**打开 Git 正式版，关闭本地版**。

## Pake 更新缓存不足

- Pake 没有浏览器的站点数据清理入口。果实之心只需删除 localStorage 键 `fruit-heart-released-script-v1`，不要清空整个 Pake 数据目录，避免连带删除登录状态和其他酒馆设置。
- 可在开发者工具 Console 执行 `localStorage.removeItem('fruit-heart-released-script-v1'); location.reload();`；没有开发者工具时，用酒馆助手临时脚本执行同一句，运行一次后删除该临时脚本。
- 若仍受 WebView 配额限制，可临时关闭 Git 版、开启已内嵌的 `20260921.2` 本地版。

## 下一步（还没做）

- `src/ui/events.js` 里 30 多个 `if (action === …)` 分支，改成查表。
- `activePreset()` 在同一个微任务里被调用多次，考虑做一个短时缓存。动手之前先量一下 `getPreset` 的实际耗时，确认值得。
- 真机上还没验证：NSFW 开关的切换能不能在**同一回合**内生效；玻璃皮肤在手机上滚动是否流畅。
