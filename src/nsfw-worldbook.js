    // ── 实验性：NSFW 关着时，不发送带标记的世界书条目 ────────────────────
    //
    // 【不碰任何世界书文件。】酒馆在 getSortedEntries() 里是这么写的：
    //
    //     await eventSource.emit(event_types.WORLDINFO_ENTRIES_LOADED,
    //         { globalLore, characterLore, chatLore, personaLore });
    //     entries = [...globalLore, ...characterLore].sort(sortFn);
    //
    // 事件是 await 的，传过来的就是那四个数组本身（不是副本），而且发完才去拼。
    // 所以在这儿把条目挑出去 = 这一次生成不带它们，磁盘一个字节都不动。
    // 下一次生成酒馆重新从世界书读，天然复原 —— 关掉这个功能就是立刻恢复原样，
    // 没有需要还账的东西，浏览器崩了也不会把谁的条目丢在关着的状态。
    //
    // 对比一下被否掉的做法：改条目的 disable 再记账还原。那个会写进 worlds/*.json，
    // 影响所有用到这本书的角色和聊天，而且关掉脚本不会自己变回来。不要再走回去。
    const WB_ENABLED_KEY = 'fruit-heart-nsfw-wb';
    const WB_SEEN_KEY = 'fruit-heart-nsfw-wb-seen';
    const WB_MARK_DEFAULT = ['nsfw'];
    const WB_GREEN_KEY = 'fruit-heart-nsfw-wb-green';
    const WB_LEGACY_LEDGER = 'fruit-heart-nsfw-wb-ledger-v1';   // 旧做法留下的账，见文件末尾
    let wbEnabled = readFlag(WB_ENABLED_KEY, false);
    // 绿灯默认不拦。蓝灯是常驻的，不管剧情在干嘛每回合都塞进去，那才是白烧 token 的大头；
    // 绿灯本来就只在关键词命中时才出现，它自己已经在做差不多的事了，拦它容易误杀。
    // 绿灯干涉只在 NSFW 关着时起作用：条目在酒馆扫关键词之前就被拿走，所以关键词命中也不发。
    // NSFW 开着时上面那行直接放行，绿灯照常按自己的关键词触发 —— 两者并不冲突。
    let wbGreen = readFlag(WB_GREEN_KEY, false);
    let wbNote = '尚未运行';
    let wbLastCount = 0;
    let wbStateAt = 0;
    let wbStateOn = null;     // NSFW 总开关此刻开没开（每次生成最多问一次预设）

    function wbMarks(config) {
        const saved = (config && config.nsfwAuto && config.nsfwAuto.wbMark);
        const list = (Array.isArray(saved) ? saved : WB_MARK_DEFAULT).map(x => String(x).trim()).filter(Boolean);
        return list.length ? list : WB_MARK_DEFAULT;
    }
    function wbEntryName(entry) { return String(entry?.comment ?? entry?.name ?? ''); }
    function wbHitMark(entry, marks) {
        const name = wbEntryName(entry).toLowerCase();
        return marks.some(mark => name.includes(mark.toLowerCase()));
    }
    // 🔵 蓝灯＝常驻（constant）。绿灯＝靠关键词，🔗 向量化的归到绿灯一类处理。
    function wbIsBlue(entry) { return entry?.constant === true; }
    // NSFW 总开关现在是开还是关。生成流程里会被调用，所以给半秒的记忆，别反复翻预设。
    function wbNsfwOn() {
        const now = Date.now();
        if (wbStateOn !== null && now - wbStateAt < 500) return wbStateOn;
        try {
            const preset = activePreset();
            const target = configPrompt(preset) ? nsfwMaster(preset) : null;
            wbStateOn = target ? isOn(target) : true;     // 找不到总开关就当开着，宁可多发不要少发
        } catch { wbStateOn = true; }
        wbStateAt = now;
        return wbStateOn;
    }
    function wbInvalidate() { wbStateOn = null; }

    // 酒馆把四个来源分开传：全局 / 角色 / 聊天 / 玩家角色。四个都要过一遍。
    function filterWorldbookPayload(payload) {
        if (!wbEnabled || !payload || typeof payload !== 'object') return 0;
        if (wbNsfwOn()) { wbNote = 'NSFW 已开启，世界书原样发送'; wbLastCount = 0; return 0; }
        let marks;
        try { marks = wbMarks(readConfig()); } catch { marks = WB_MARK_DEFAULT; }
        let blue = 0, green = 0, kept = 0;
        for (const key of ['globalLore', 'characterLore', 'chatLore', 'personaLore']) {
            const list = payload[key];
            if (!Array.isArray(list)) continue;
            for (let i = list.length - 1; i >= 0; i--) {
                const entry = list[i];
                if (!wbHitMark(entry, marks)) continue;
                const isBlue = wbIsBlue(entry);
                if (!isBlue && !wbGreen) { kept++; continue; }   // 绿灯交给它自己的关键词
                list.splice(i, 1);            // 必须原地改 —— 酒馆用的就是这个数组
                if (isBlue) blue++; else green++;
            }
        }
        const removed = blue + green;
        wbLastCount = removed;
        wbNote = removed
            ? `本回合拦截 ${removed} 条（🔵${blue}${wbGreen ? ` 🟢${green}` : ''}）${kept ? `，🟢${kept} 条按原关键词触发` : ''}`
            : (kept ? `🟢${kept} 条按原关键词触发，未拦截` : '没有命中触发词的条目');
        console.info('[果实之心] 世界书拦截：', wbNote);
        return removed;
    }
    let wbBound = false;
    function bindWorldbookFilter() {
        if (wbBound) return;
        const on = resolveFunction('eventOn');
        const events = hostWindow.tavern_events || window.tavern_events;
        // 事件名酒馆助手没透出来也没关系，它就是这个字符串
        const name = events?.WORLDINFO_ENTRIES_LOADED || 'worldinfo_entries_loaded';
        if (!on) return;
        wbBound = true;
        try {
            on(name, payload => {
                try { filterWorldbookPayload(payload); }
                catch (error) { wbNote = '本回合拦截异常，已跳过'; console.warn('[果实之心] 世界书拦截未执行', error); }
            });
        } catch { wbBound = false; }
    }
    function wbAvailable() { return Boolean(resolveFunction('eventOn')); }
    // 首页那条三档和设置页那两个开关是同一组状态，这里是唯一的换算处。
    function wbMode() { return !wbEnabled ? 'none' : (wbGreen ? 'green' : 'blue'); }
    function setWbMode(mode) {
        wbEnabled = mode !== 'none';
        wbGreen = mode === 'green';
        void saveWorldbookMode();
        wbNote = wbEnabled ? '设置已更改，下一次生成生效' : '已关闭，世界书原样发送';
        wbLastCount = 0;
        if (wbEnabled) bindWorldbookFilter();
    }

    // ── 一次性收尾：20260920.4 那版改过条目的 disable 并记了账。
    // 那个做法已经废弃，这里把账还干净再把钥匙删掉，之后永远不会再写世界书。
    async function wbClearLegacyLedger() {
        let ledger;
        try { ledger = JSON.parse(hostWindow.localStorage.getItem(WB_LEGACY_LEDGER) || 'null'); } catch { return; }
        if (!ledger || typeof ledger !== 'object' || !Object.keys(ledger).length) return;
        const pick = (...names) => { for (const n of names) { const fn = resolveFunction(n); if (fn) return fn; } return null; };
        const read = pick('getWorldbook', 'getLorebookEntries');
        const write = pick('replaceWorldbook', 'setLorebookEntries');
        if (!read || !write) return;
        let count = 0;
        for (const [book, uids] of Object.entries(ledger)) {
            const want = new Set((uids || []).map(String));
            if (!want.size) continue;
            let entries;
            try { entries = await read(book); } catch { continue; }
            if (!Array.isArray(entries)) continue;
            let n = 0;
            for (const entry of entries) {
                const uid = String(entry?.uid ?? entry?.id ?? '');
                if (!want.has(uid)) continue;
                if (typeof entry.enabled === 'boolean') { if (entry.enabled) continue; entry.enabled = true; }
                else { if (!entry.disable) continue; entry.disable = false; }
                n++;
            }
            if (!n) continue;
            try { await write(book, entries, { render: 'none' }); } catch { try { await write(book, entries); } catch { continue; } }
            count += n;
        }
        try { hostWindow.localStorage.removeItem(WB_LEGACY_LEDGER); } catch {}
        if (count) console.info('[果实之心] 已还原旧版本改过的', count, '条世界书条目，之后不再写世界书');
    }
