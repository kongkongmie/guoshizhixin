    function findCard(set, key) {
        const cards = (set && set.cards) || [];
        return cards.find(item => item.id === key) || cards.find(item => item.label === key) || null;
    }
    // 她给标签加了前缀（「大总结——合并之前的大总结」→「【推荐用】大总结——合并之前的大总结」），
    // 首页那颗按钮里写死的名字就对不上了，/pass 一个不存在的标签会一路穿过所有 /if，
    // 最后 setinput 写进去一个空串 —— 表现就是「点了没反应」。这里先精确后包含地认一次。
    function resolveLabel(message, want) {
        if (!want) return '';
        const labels = qrLabels(message);
        if (labels.includes(want)) return want;
        return labels.find(x => x.includes(want)) || labels.find(x => want.includes(x)) || '';
    }
    async function runQr(cardId, choice = '') {
        const card = findCard(qrSet(readConfig()), cardId);
        if (!card) throw new Error('这个大类已经不在了');
        if (typeof triggerSlash !== 'function') throw new Error('Slash 指令 API 不可用');
        const label = resolveLabel(card.message, choice);
        if (choice && !label) throw new Error(`「${card.label}」里没有「${choice}」这条指令，可能是被改名或删掉了`);
        close();
        await triggerSlash(qrCommandFor(label, card.message));
    }
    async function saveQrName() {
        const name = String(root.find('[data-qr-setname]').val() || '').trim();
        return guarded(async () => {
            if (name) await writeQr(set => { set.name = name; });
            renderQr();
        });
    }
    async function setQuickGroup(group, id) {
        const preset = activePreset();
        const target = id ? promptMap(preset).get(id) : null;
        if (id && !target) throw new Error('没有找到该条目');
        await updateBoth(next => {
            const config = readConfig(next);
            captureManualChanges(next, config);
            for (const prompt of next.prompts || []) {
                const currentId = promptId(prompt);
                if (currentId === CONFIG_ID) continue;
                if (exclusiveFamily(prompt, config) !== group) continue;
                prompt.enabled = Boolean(id) && currentId === id;
            }
            captureManualChanges(next, config);
            rememberAppliedStates(next, config);
            writeConfig(next, config);
            return next;
        });
        toast('success', `${group}：${target ? stripSource(target.name) : '全部关闭'}`);
    }
    // quiet：来自首页那两颗总开关（小剧场 / NSFW）。它们本来就是「这个功能开不开」这一件事，
    // 位置固定、一眼看得见，每次点都要再确认一次纯属挡路。条目页里点具体条目时该问的还是照问。
    // silent：跟随剧情自动拨的那一下。它每回合都可能发生，弹一次就是一次打扰 ——
    // 状态本身在首页卡和悬浮入口的小点上看得见，不需要再糊一层浮层。
    async function setPrompt(id, enabled, quiet = false, silent = false) {
        const preset = activePreset();
        const before = promptMap(preset).get(id);
        if (!before) throw new Error('没有找到该条目');
        if (!quiet && coreWarning(before) && !hostWindow.confirm(`“${stripSource(before.name)}”是核心或特殊条目，确定要${enabled ? '开启' : '关闭'}吗？`)) return false;
        const family = enabled ? exclusiveFamily(before, readConfig(preset)) : '';
        await updateBoth(target => {
            const config = readConfig(target);
            captureManualChanges(target, config);
            for (const prompt of target.prompts || []) {
                const currentId = promptId(prompt);
                if (currentId === CONFIG_ID) continue;
                let next = prompt.enabled;
                if (currentId === id) next = enabled;
                else if (family && exclusiveFamily(prompt, config) === family) next = false;
                const link = LINKED_TOGGLES.find(item => item.group === family && item.also === currentId);
                if (link) next = enabled && id === link.when;
                prompt.enabled = Boolean(next);
            }
            captureManualChanges(target, config);
            rememberAppliedStates(target, config);
            writeConfig(target, config);
            return target;
        });
        if (!silent) toast('success', `${stripSource(before.name)}：${enabled ? '已开启' : '已关闭'}`);
        return true;
    }
    // 自定义输入框走的也是这一条路 —— 只是取值方式不同，改写规则一份就够。
    function saveWordCount() {
        return applyWordRange(Number(root.find('#fh-word-min').val()), Number(root.find('#fh-word-max').val()));
    }
    async function applyWordRange(min, max) {
        if (!Number.isFinite(min) || !Number.isFinite(max) || min < 100 || max < min) throw new Error('字数范围不正确');
        await updateBoth(preset => {
            const config = readConfig(preset);
            const prompt = wordCountPrompt(preset, config);
            if (!prompt) throw new Error('当前模型组没有可修改的正文字数条目');
            prompt.content = prompt.content.replace(WORD_RANGE, match => match.replace(/\d+/, String(min)).replace(/([\-–—~～至到]+\s*)\d+/, (_, separator) => separator + max));
            return preset;
        });
        toast('success', `正文字数已改为 ${min}-${max} 字`);
    }
    async function toggleMaster(key) {
        if (key === 'stream') {
            const next = !(activePreset().settings || {}).should_stream;
            await updateBoth(preset => { preset.settings.should_stream = next; return preset; });
            return toast('success', next ? '已开启流式传输' : '已关闭流式传输');
        }
        const preset = activePreset();
        const target = key === 'nsfw' ? nsfwMaster(preset) : theatreMaster(preset);
        if (!target) throw new Error('没找到对应的总开关条目');
        // 手动拨了一下：自动判断这边的计数作废，下一次发送重新算。
        if (key === 'nsfw') { nsfwQuietStreak = 0; nsfwTurnKey = ''; nsfwLastApplied = null; }
        await setPrompt(promptId(target), !target.enabled, true);
        if (key === 'nsfw') paintNsfwIndicator(!target.enabled);
    }
    // 「初始参数」＝具名预设文件里存着的那一份，不需要额外记快照。
    async function restoreParams() {
        const name = ensureTarget();
        const saved = typeof getPreset === 'function' ? getPreset(name) : null;
        if (!saved?.settings) throw new Error('读不到这份预设保存的参数');
        if (!hostWindow.confirm('把温度、上下文等生成参数恢复成预设文件里保存的那一份？')) return;
        await updateBoth(preset => { Object.assign(preset.settings, structuredClone(saved.settings)); return preset; });
        toast('success', '生成参数已恢复');
    }
    function currentStates(preset, config) {
        return Object.fromEntries(activePrompts(preset).map(prompt => [promptId(prompt), Boolean(prompt.enabled)]));
    }
    async function saveProfile(name) {
        if (!name) return;
        await updateBoth(preset => {
            const config = readConfig(preset);
            config.profiles = config.profiles || {};
            config.profiles[name] = currentStates(preset, config);
            config.activeProfile = name;
            writeConfig(preset, config);
            return preset;
        });
        toast('success', `已保存方案「${name}」`);
    }
    async function applyProfile(name) {
        const states = readConfig().profiles?.[name];
        if (!states) throw new Error('方案不存在');
        await updateBoth(preset => {
            const config = readConfig(preset);
            for (const prompt of activePrompts(preset)) {
                const id = promptId(prompt);
                if (id in states) prompt.enabled = Boolean(states[id]);
            }
            config.activeProfile = name;
            captureManualChanges(preset, config);
            rememberAppliedStates(preset, config);
            writeConfig(preset, config);
            return preset;
        });
        toast('success', `已套用方案「${name}」`);
    }
    async function deleteProfile() {
        const config = readConfig();
        const name = config.activeProfile;
        if (!name || !config.profiles?.[name]) throw new Error('当前没有选中的方案');
        if (!hostWindow.confirm(`删除方案「${name}」？开关状态不变。`)) return;
        await updateBoth(preset => {
            const current = readConfig(preset);
            delete current.profiles[name];
            current.activeProfile = '';
            writeConfig(preset, current);
            return preset;
        });
        toast('success', '方案已删除');
    }
    async function importProfile(raw) {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { throw new Error('这段文本不是有效的方案'); }
        const name = String(parsed.fruitHeartProfile || '').trim();
        if (!name || !parsed.states || typeof parsed.states !== 'object') throw new Error('这段文本不是果实之心的方案');
        await updateBoth(preset => {
            const config = readConfig(preset);
            config.profiles = config.profiles || {};
            config.profiles[name] = parsed.states;
            writeConfig(preset, config);
            return preset;
        });
        toast('success', `已导入方案「${name}」`);
    }
