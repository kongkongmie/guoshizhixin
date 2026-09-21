    // ── NSFW 跟随剧情 ─────────────────────────────────────────────────
    // 主判据是摘要。`📌 摘要｜必开` 每回合都让模型写一行
    //   scene:当前场景，如果是NSFW场景则需要记录性爱进度n/10
    // 这条是必开的，**跟 NSFW 总开关开没开无关** —— 所以这个数字两头都能用：
    // 它在，说明模型认定这是 NSFW 场景（该开）；它不在，说明不是（该关）。
    // 一个字都不用往预设正文里加，信号本来就在那儿。
    //
    // 模型不会写 0/10，它从 1/10 起跳（「第一轮计为1/10」），所以「关」＝这个数字没出现。
    //
    // 关键词只干一件事：抢那一回合。摘要天生慢一拍（它描述的是刚写完的这一段），
    // 你打「做爱」的当条要靠词命中才来得及。
    //
    // 不让模型预测下一回合。每回合问它「等下要不要」，它会一路答要，
    // 然后为了圆自己那句去推剧情 —— 就是 V6.4 第二轮修过的「单向推进」。
    // 开关按预设名分开存：在果实里打开，不该让日月西那边也显示成开着。
    // （这个做法借自咩咩朋友那版的 `fruit-heart-nsfw-auto-v1:<预设名>`。）
    const NSFW_AUTO_KEY_BASE = 'fruit-heart-nsfw-auto';
    function nsfwAutoKey() { const n = loadedName(); return n ? `${NSFW_AUTO_KEY_BASE}:${n}` : NSFW_AUTO_KEY_BASE; }
    const NSFW_AUTO_DEFAULTS = {
        // 只在预设里一个词都没存过时兜底用。正常情况下词表跟着预设走，改这里没有意义。
        open: ['做爱', '上床', '插入', '口交', '内射', '高潮', '前戏',
            '自慰', '勃起', '脱光', '含住', '骑上', '湿了', '硬了',
            '瑟瑟', '涩涩', '色色', 'nsfw', '鸡巴', '小穴', '阴道',
            '小逼', '屄', '阴蒂', '淫水', '爱液', '后穴', '精液',
            '阴唇', '子宫', '宫口', '屁眼', 'G点', '阴茎', '肉棒'],
        close: ['事后', '结束性爱', '完事后'],
        hold: 1,
    };
    // 摘要块里的 scene 那一行。整块拿不到就退回全文找 n/10。
    const FM_BLOCK = /<meow_FM>([\s\S]{0,4000}?)<\/meow_FM>/i;
    const FM_SCENE = /^[ \t]*scene\s*[:：](.*)$/mi;
    // 带标签的最准，优先认它 —— 预设里 📌 摘要 就是让模型写「性爱进度n/10」。
    const SEX_LABELED = /(?:性爱|性事|情欲|欢爱|交合|云雨|NSFW)\s*进度\s*[:：]?\s*(\d{1,2})\s*\/\s*10/i;
    // 没有标签才退回裸的 n/10。紧挨在它前面若是「xx度 / xx值 / xx率」那种别的十分制
    // （好感度 8/10、紧张度 3/10），就不是性爱进度 —— 不枚举词，只看有没有度/值/率。
    const ANY_TEN = /(.{0,6})(\d{1,2})\s*\/\s*10/g;
    const OTHER_METRIC = /[度值率]\s*[:：]?\s*$/;
    // NSFW 总开关自己种的自检注释。摘要被关掉的人靠它兜底。
    const NSFW_SCENE_MARK = /舒适性爱检查|性爱柔和检测/;

    let nsfwAutoEnabled = readFlag(nsfwAutoKey(), false);   // 默认关：行为改变不替任何人做主
    // 换聊天 / 换预设要把「连着几段没戏」的计数清零，否则会把 A 聊天的状态带到 B。
    let nsfwScope = '';
    function nsfwIdentity() {
        let chat = '';
        try { chat = String(SillyTavern.getContext()?.getCurrentChatId?.() ?? ''); } catch {}
        return `${loadedName()}|${chat}`;
    }
    function nsfwResetScope() { nsfwQuietStreak = 0; nsfwTurnKey = ''; nsfwLastApplied = null; nsfwAutoNote = '已切换预设或聊天，判定状态重置'; }
    // 换了预设，词表得重新从新预设里读一份
    function nsfwDropLive() { nsfwLive = null; }
    let nsfwQuietStreak = 0;
    let nsfwLastApplied = null;
    let nsfwTurnKey = '';
    let nsfwAutoBusy = false;
    let nsfwAutoNote = '尚未运行';
    let nsfwHold = NSFW_AUTO_DEFAULTS.hold;


    function nsfwAutoRules(config) {
        const saved = (config && config.nsfwAuto) || {};
        const list = (value, fallback) => (Array.isArray(value) ? value : fallback)
            .map(word => String(word).trim()).filter(Boolean);
        return {
            open: list(saved.open, NSFW_AUTO_DEFAULTS.open),
            close: list(saved.close, NSFW_AUTO_DEFAULTS.close),
            wbMark: list(saved.wbMark, WB_MARK_DEFAULT),
            hold: Math.min(9, Math.max(1, Number(saved.hold) || NSFW_AUTO_DEFAULTS.hold)),
        };
    }
    function nsfwHit(text, words) {
        const value = String(text || '').toLowerCase();
        return words.find(word => word && value.includes(String(word).toLowerCase())) || '';
    }
    function chatNow() {
        try { return SillyTavern.getContext().chat || []; } catch { return []; }
    }
    function lastOf(test) {
        const chat = chatNow();
        for (let i = chat.length - 1; i >= 0; i--) if (test(chat[i])) return String(chat[i].mes || '');
        return '';
    }
    function lastReplyText() { return lastOf(m => m && !m.is_user && !m.is_system); }
    function lastUserText() { return lastOf(m => m && m.is_user); }

    // 读摘要。返回 true＝是 NSFW 场景 / false＝不是 / null＝这条正文里没有摘要，读不出来
    // true=在 NSFW 场景 / false=不在 / null=读不出来，别瞎猜
    function sceneIsSexual(reply) {
        const block = FM_BLOCK.exec(String(reply || ''));
        if (!block) return null;
        const labeled = SEX_LABELED.exec(block[1]);
        if (labeled) return Number(labeled[1]) > 0;   // 模型从 1/10 起跳；真写了 0/10 也按结束算
        const scene = FM_SCENE.exec(block[1]);
        const hay = scene ? scene[1] : block[1];
        const found = [];
        ANY_TEN.lastIndex = 0;
        for (let m = ANY_TEN.exec(hay); m; m = ANY_TEN.exec(hay)) {
            if (!OTHER_METRIC.test(m[1])) found.push(Number(m[2]));
        }
        if (!found.length) return false;
        if (new Set(found).size > 1) return null;     // 一行里好几个十分制，认不准就不动
        return found[0] > 0;
    }
    // true 要开 / false 要关 / null 不动
    function nsfwDecide(on, input, reply, rules) {
        const closeHit = nsfwHit(input, rules.close);
        if (closeHit) { nsfwQuietStreak = 0; nsfwAutoNote = `输入命中关闭词「${closeHit}」，已关闭`; return false; }
        const openHit = nsfwHit(input, rules.open);
        if (openHit) { nsfwQuietStreak = 0; nsfwAutoNote = `输入命中启动词「${openHit}」，已开启`; return true; }

        const scene = sceneIsSexual(reply);
        if (scene === true) { nsfwQuietStreak = 0; nsfwAutoNote = '摘要显示处于 NSFW 场景，已开启'; return true; }
        if (scene === null) {
            // 上一条正文里根本没有摘要（摘要条目被关了，或者是开场白）。
            // 退回自检注释；它也没有就什么都不做 —— 读不出信号时绝不瞎关。
            if (NSFW_SCENE_MARK.test(reply)) { nsfwQuietStreak = 0; nsfwAutoNote = '摘要缺失，按正文自检注释判定为 NSFW 场景'; return true; }
            nsfwAutoNote = '无可用判定依据，维持当前状态';
            return null;
        }
        if (!on) { nsfwAutoNote = '摘要显示非 NSFW 场景，维持关闭'; return null; }
        nsfwQuietStreak += 1;
        if (nsfwQuietStreak < rules.hold) { nsfwAutoNote = `事后缓冲 ${nsfwQuietStreak}/${rules.hold - 1} 回合`; return null; }
        nsfwAutoNote = rules.hold > 1 ? `非 NSFW 场景已持续 ${rules.hold} 回合，已关闭` : '摘要显示非 NSFW 场景，已关闭';
        return false;
    }
    async function syncNsfwScene() {
        if (!nsfwAutoEnabled || nsfwAutoBusy || busy) return;
        // 换了预设或换了聊天就先清零，别把上一个场子的计数带过来。
        const scope = nsfwIdentity();
        if (scope !== nsfwScope) { nsfwScope = scope; nsfwResetScope(); }
        // MESSAGE_SENT 和 GENERATION_AFTER_COMMANDS 同一回合会各来一次，只算头一次。
        const key = `${chatNow().length}|${lastUserText().slice(-60)}`;
        if (key === nsfwTurnKey) return;
        nsfwTurnKey = key;
        nsfwAutoBusy = true;
        try {
            const preset = activePreset();
            if (!configPrompt(preset)) return;
            const target = nsfwMaster(preset);
            if (!target) { nsfwAutoNote = '未找到预设中的 NSFW 总开关条目'; return; }
            const on = isOn(target);
            if (nsfwLastApplied !== null && on !== nsfwLastApplied) nsfwQuietStreak = 0;   // 你手动动过，重新给满一轮
            const want = nsfwDecide(on, lastUserText(), lastReplyText(), nsfwAutoRules(readConfig(preset)));
            nsfwLastApplied = want === null ? on : want;
            console.info('[果实之心] NSFW 判定：', nsfwAutoNote);
            if (want === null || want === on) return;
            await setPrompt(promptId(target), want, true, true);   // 静默：状态看小点，不弹浮层
            paintNsfwIndicator(want);
            wbInvalidate();                      // 世界书拦截下一次生成要读到新状态
            if (!want) nsfwQuietStreak = 0;
            if (root.hasClass('open') && currentView === 'overview') renderOverview();
        } catch (error) {
            nsfwAutoNote = '本回合判定异常，已跳过';
            console.warn('[果实之心] NSFW 跟随剧情未执行', error);
        } finally { nsfwAutoBusy = false; }
    }
    // 静默状态显示：NSFW 开着时，快捷栏入口和悬浮猫咪的角上点一颗很淡的点。
    // 只在状态真的变了才动 DOM —— 每 2.5 秒的入口巡检不会读预设，那条零读取的规矩不能破。
    let nsfwLit = null;
    function nsfwEntryNodes() {
        const list = [...doc.querySelectorAll(`[data-fh-instance="${INSTANCE_ID}"][data-fh-cat="1"]`)];
        const ball = doc.querySelector(`#${APP_ID}-fallback`);
        if (ball) list.push(ball);
        return list;
    }
    function paintNsfwIndicator(on) {
        nsfwLit = Boolean(on);
        for (const node of nsfwEntryNodes()) node.classList.toggle('fh-nsfw-lit', nsfwLit);
    }
    // 新长出来的入口（换了聊天、酒馆重画了快捷栏）也要跟上当前状态
    function dressNsfwIndicator(node) { if (nsfwLit !== null && node) node.classList.toggle('fh-nsfw-lit', nsfwLit); }
    function refreshNsfwIndicator() {
        try { const target = nsfwMaster(activePreset()); paintNsfwIndicator(target ? isOn(target) : false); }
        catch { /* 读不到预设就先不点，等下一次发送 */ }
    }
    let nsfwBound = false;
    function bindNsfwAuto() {
        if (nsfwBound) return;
        const on = resolveFunction('eventOn');
        const events = hostWindow.tavern_events || window.tavern_events;
        if (!on || !events) return;                 // 酒馆助手太老就静默跳过，不影响别的功能
        nsfwBound = true;
        // MESSAGE_SENT：你那句已经进聊天记录，提示词还没组装 —— 唯一能当回合生效的位置。
        if (events.MESSAGE_SENT) { try { on(events.MESSAGE_SENT, () => syncNsfwScene()); } catch {} }
        // 重 roll / 续写没有新的用户消息，补一道；判据是同一套。
        if (events.GENERATION_AFTER_COMMANDS) {
            try {
                on(events.GENERATION_AFTER_COMMANDS, (type, _option, dryRun) => {
                    if (dryRun || type === 'quiet' || type === 'impersonate') return;
                    return syncNsfwScene();
                });
            } catch {}
        }
        // 生成被你按停了：这一轮不算数，下次发送重新判一遍。
        if (events.GENERATION_STOPPED) { try { on(events.GENERATION_STOPPED, () => { nsfwTurnKey = ''; }); } catch {} }
        // 换聊天 / 换预设：计数清零。
        for (const name of new Set([events.CHAT_CHANGED, events.OAI_PRESET_CHANGED_AFTER, events.PRESET_CHANGED].filter(Boolean))) {
            try { on(name, () => { nsfwScope = ''; wbInvalidate(); nsfwDropLive(); }); } catch {}
        }
    }
    // ── 词表编辑（标签式，改了就生效）──
    // 没有「保存 / 放弃 / 恢复默认」了：加一个词、删一个词、换一档缓冲，当场就是最终状态。
    // 但写预设是重活（两个文件），所以内存先改、界面先更新，500 毫秒内没有新动作才真正落盘；
    // 关面板 / 切预设 / 卸载时会先把欠的那一次补上（flushNsfwRules）。
    let nsfwLive = null;          // 当前这份词表，界面和判定都读它
    let nsfwSaveTimer = null;
    function nsfwRules() {
        if (!nsfwLive) { const r = nsfwAutoRules(readConfig()); nsfwLive = { open: [...r.open], close: [...r.close], wbMark: [...r.wbMark], hold: r.hold }; }
        return nsfwLive;
    }
    function nsfwEditStart(config) {
        if (!nsfwLive) { const r = nsfwAutoRules(config); nsfwLive = { open: [...r.open], close: [...r.close], wbMark: [...r.wbMark], hold: r.hold }; }
        nsfwHold = nsfwLive.hold;
        return nsfwLive;
    }
    function nsfwTouched() {
        clearTimeout(nsfwSaveTimer);
        nsfwSaveTimer = setTimeout(() => { nsfwSaveTimer = null; void flushNsfwRules(); }, 500);
    }
    async function flushNsfwRules() {
        clearTimeout(nsfwSaveTimer); nsfwSaveTimer = null;
        if (!nsfwLive) return;
        const rules = nsfwLive;
        try { await saveNsfwRules(rules); }
        catch (error) { console.warn('[果实之心] 词表未能写入预设', error); toast('error', '词表没能写进预设：' + (error.message || '写入失败')); }
    }
    function nsfwTags(kind, words) {
        return words.map((word, index) => `<button class="fh-tag" data-nsfw-drop="${h(kind)}:${index}"`
            + ` title="点一下删掉「${h(word)}」">${h(word)}<i>×</i></button>`).join('')
            || '<span class="fh-dim">一个词都没有了</span>';
    }
    // 一次可以贴一串，用逗号、顿号、空格、换行分开都认
    function nsfwSplit(value) {
        return String(value || '').split(/[\n,，、;；|｜\s]+/).map(word => word.trim()).filter(Boolean);
    }
    async function saveNsfwRules(rules) {
        await updateBoth(preset => {
            const config = readConfig(preset);
            config.nsfwAuto = { ...(config.nsfwAuto || {}), open: [...rules.open], close: [...rules.close], wbMark: [...rules.wbMark], hold: rules.hold };
            writeConfig(preset, config); return preset;
        });
        nsfwQuietStreak = 0;
    }
