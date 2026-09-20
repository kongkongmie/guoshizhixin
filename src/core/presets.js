    function loadedName() {
        try { return typeof getLoadedPresetName === 'function' ? getLoadedPresetName() : ''; } catch { return ''; }
    }
    // 不按预设名做白名单。这个脚本是用酒馆助手绑在预设上的，能跑起来就说明装它的那个预设
    // 正被载入 —— 再去匹配名字，只会在出新版本号时把自己锁死（写死 '果实V6.3' 那次，载入
    // V6.4 全线抛错，表现为「面板点了没反应」）。想把面板装到别的预设上的人，自己装就是了。
    // 真正要守的两件事仍在：这里挡住读不到预设名，updateBoth 里挡住写之前预设被换掉；
    // 没有果实之心控制配置的预设，会在 readConfig 那里得到一句明确的报错。
    function ensureTarget() {
        const name = loadedName();
        if (!name) throw new Error('读不到当前预设名，请重新载入预设后再打开面板');
        return name;
    }
    function activePreset() {
        if (typeof getPreset !== 'function') throw new Error('酒馆助手预设 API 不可用');
        ensureTarget();
        return getPreset('in_use');
    }
    async function updateBoth(updater) {
        if (typeof updatePresetWith !== 'function') throw new Error('酒馆助手写入 API 不可用');
        if (destroyed) return;
        const name = ensureTarget();
        const updated = await updatePresetWith('in_use', async preset => {
            if (destroyed || ensureTarget() !== name) throw new Error('预设已切换，请重新打开面板');
            const updated = await updater(preset);
            if (destroyed || ensureTarget() !== name) throw new Error('操作已过期，预设已切换或脚本已卸载');
            configPrompt(updated).enabled = false;
            return updated;
        }, { render: 'immediate' });
        if (destroyed || ensureTarget() !== name) return;
        await updatePresetWith(name, saved => ({ ...saved, prompts: updated.prompts, prompts_unused: updated.prompts_unused, settings: updated.settings, extensions: updated.extensions }), { render: 'none' });
    }
    async function guarded(task) {
        if (busy || destroyed) return;
        busy = true;
        root.addClass('fh-busy');
        try { await task(); }
        catch (error) { console.error('[果实之心]', error); toast('error', error.message || '操作失败'); }
        finally { busy = false; root.removeClass('fh-busy'); }
    }

    function configPrompt(preset) {
        return (preset.prompts || []).find(prompt => promptId(prompt) === CONFIG_ID);
    }
    let configCache = { raw: '', value: null };
    function readConfig(preset = activePreset()) {
        const prompt = configPrompt(preset);
        if (prompt && prompt.content === configCache.raw && configCache.value) return configCache.value;
        if (!prompt) throw new Error('当前预设里没有果实之心控制配置，面板管不了它');
        const config = JSON.parse(prompt.content || '{}');
        if (config.version !== 4 || !config.tagStates || !config.initialTagStates || !config.initialStates || !config.lastAppliedStates || !config.controlGroups || !Array.isArray(config.categories)) throw new Error('果实之心控制配置版本不正确');
        configCache = { raw: prompt.content, value: config };
        return config;
    }
    function writeConfig(preset, config) {
        const prompt = configPrompt(preset);
        if (!prompt) throw new Error('没有找到果实之心控制配置');
        prompt.content = JSON.stringify(config);
        prompt.enabled = false;
    }
    function promptMap(preset = activePreset()) {
        return new Map((preset.prompts || []).map(prompt => [promptId(prompt), prompt]));
    }
    function activePrompts(preset = activePreset(), config = readConfig(preset)) {
        return (preset.prompts || []).filter(prompt => promptId(prompt) !== CONFIG_ID);
    }
    function modelTags(name) {
        return [...String(name || '').matchAll(/#\s*([^#]+?)(?=#|$)/g)]
            .map(match => match[1].trim().replace(/\s+/g, ' ').toUpperCase()).filter(Boolean);
    }
    function allModelTags(preset = activePreset()) {
        return [...new Set(activePrompts(preset).flatMap(prompt => modelTags(prompt.name)))].sort((a, b) => a.localeCompare(b));
    }
    function stripSource(name) { return String(name || '').replace(/\s*#\s*[^#]+?(?=#|$)/g, '').trimEnd(); }
    // 列表里只显示主名；互斥组与提示另用徽章展示，避免一行塞满竖线。
    // 她要求：极简 COT 后面用小字标一下什么时候开。只写她交代过的那条，
    // 别的选项我不替她编解释 —— 退回条目名里 ｜ 后面自带的提示。
    const COT_NOTES = { '极简': '大总结 / 其他任务不听话时开' };
    // 条目名里的 ｜ 提示大多是给她自己看的记账（单选/必开/别动位置），不往用户面前搬
    function hintText(name) {
        const plain = plainName(name);
        if (COT_NOTES[plain]) return COT_NOTES[plain];
        return nameParts(name).hints.filter(x => !/单选|多选|必开|别动位置|勿动/.test(x)).join(' · ');
    }
    function cotNote(preset, config) {
        const on = activePrompts(preset, config)
            .filter(prompt => exclusiveFamily(prompt, config) === 'COT' && prompt.enabled);
        return on.length === 1 ? hintText(on[0].name) : '';
    }
    function nameParts(name) {
        const plain = stripSource(name).replace(/\s*@[^\s@#]+/g, '').trim();
        const bits = plain.split('｜').map(part => part.trim()).filter(Boolean);
        const title = bits.shift() || plain;
        const group = bits.find(part => /(?:\d{1,2}|多)选1$/.test(part)) || '';
        const hints = bits.filter(part => part !== group);
        return { title, group, hints };
    }
    function displayName(name) { return nameParts(name).title; }
    const LEAD_EMOJI = /^(?:\p{Extended_Pictographic}\uFE0F?|📌)\s*/u;
    function plainName(name) { return displayName(name).replace(LEAD_EMOJI, ''); }
    // 横线约定（2026-09 定）：
    //   ━━ 名字 ━━ 和 ——名字—— 都是【大区】，会独立成一个分区
    //   --名字--（两个半角连字符）是【小区】，只是区内小标题，不分区
    const DIVIDER = /^\s*(?:━+|—{2,}|-{2,})\s*\S/;
    const BAR = /\s*(?:━+|—{2,}|-{2,})\s*/;
    const BIG_DIVIDER = /^\s*(?:━+|—{2,})\s*\S/;   // 大区：粗线或全角破折号
    const SMALL_DIVIDER = /^\s*-{2,}\s*\S/;          // 小区：半角连字符
    function isDivider(prompt) { return DIVIDER.test(String(prompt?.name || '')); }
    function dividerParts(name) {
        const body = String(name).replace(new RegExp('^' + BAR.source), '').replace(new RegExp(BAR.source + '$'), '');
        const cut = body.search(BAR);
        if (cut < 0) return { title: body.trim(), hint: '' };
        return { title: body.slice(0, cut).trim(), hint: body.slice(cut).replace(new RegExp('^' + BAR.source), '').trim() };
    }
    function groupLabel(group) { return String(group || ''); }
    function discoverGroups(preset, config) {
        const found = new Map();
        for (const prompt of activePrompts(preset, config)) {
            const group = exclusiveFamily(prompt, config);
            if (!group) continue;
            if (!found.has(group)) found.set(group, []);
            found.get(group).push(prompt);
        }
        const rank = name => { const index = GROUP_ORDER.indexOf(name); return index < 0 ? GROUP_ORDER.length : index; };
        return [...found.entries()].filter(([, items]) => items.length > 1)
            .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
    }
    // 型号写法归到同一模型组；保留条目原始标签和各自开关记忆。
    function modelGroup(tag) {
        const name = String(tag || '').trim().toUpperCase().replace(/[_-]+/g, ' ');
        if (/^GEMINI\b/.test(name)) {
            if (/FLASH|\d\s*F\b/.test(name)) return 'GEMINI FLASH';
            if (/PRO/.test(name)) return 'GEMINI PRO';
        }
        return name;
    }
    const MODELS = [
        { tag: 'GEMINI FLASH', label: 'Gemini Flash' },
        { tag: 'GEMINI PRO', label: 'Gemini Pro' },
        { tag: 'CLAUDE', label: 'Claude' },
        { tag: 'DS', label: 'DeepSeek' },
    ];
    function currentModel(config, models) {
        return models.find(item => item.tag === modelGroup(config.activeTag)) || null;
    }
    function modelChoices(preset = activePreset()) {
        const have = new Set(allModelTags(preset).map(modelGroup));
        const known = MODELS.filter(item => have.has(item.tag));
        const families = new Set([...have].filter(tag => tagVariant(tag)).map(tag => tagFamily(tag)));
        const extra = [...have].filter(tag => !MODELS.some(item => item.tag === tag) && !families.has(tag)).map(tag => ({ tag, label: tag }));
        return [...known, ...extra];
    }
    function tagFamily(tag) { return String(tag || '').split(' ')[0]; }
    function tagVariant(tag) { return String(tag || '').slice(tagFamily(tag).length).trim(); }
    function tagGroups(preset = activePreset()) {
        const groups = new Map();
        for (const tag of allModelTags(preset)) {
            const family = tagFamily(tag);
            if (!groups.has(family)) groups.set(family, []);
            groups.get(family).push(tag);
        }
        return groups;
    }
    function appliedTag(promptTags, selectedTag) {
        if (promptTags.includes(selectedTag)) return selectedTag;
        const grouped = promptTags.find(tag => modelGroup(tag) === modelGroup(selectedTag));
        if (grouped) return grouped;
        const family = tagFamily(selectedTag);
        return selectedTag !== family && promptTags.includes(family) ? family : '';
    }
    // ── 分区：直接读柏宝箱的分组数据，和酒馆里看到的是同一套 ──
    // 分区数据优先用柏宝箱那张表（她自己拖过的顺序在那儿）。
    // 但它不是必需品：表不在、或者一条都没归到区里（别人没装柏宝箱、或者预设是从零搭的），
    // 就按前台顺序的「━━ 区名 ━━」现算一份顶上，只在内存里用，一个字都不写回预设。
    const autoSections = new WeakMap();
    function derivedSections(preset) {
        let hit = autoSections.get(preset);
        if (hit) return hit;
        const groups = [];
        const map = {};
        let current = '';
        for (const prompt of activePrompts(preset)) {
            const name = String(prompt.name || '');
            if (BIG_DIVIDER.test(name) && !SECTION_END.test(name)) {
                current = 'fh-auto-' + groups.length;
                groups.push({ id: current, name: dividerParts(name).title || '新区', order: groups.length });
            }
            if (current) map[promptId(prompt)] = { groupId: current };
        }
        hit = { groups, map, derived: true };
        autoSections.set(preset, hit);
        return hit;
    }
    function sectionData(preset = activePreset()) {
        const box = preset?.extensions?.fruitHeartSections ?? preset?.extensions?.baibaiToolkit?.presetPromptGroups;
        const groups = Array.isArray(box?.groups) ? [...box.groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
        const map = box?.prompts || {};
        if (groups.length && Object.keys(map).length) return { groups, map };
        return derivedSections(preset);
    }
    function sectionOf(prompt, data) { return data.map[promptId(prompt)]?.groupId || ''; }
    // 条目页里区的先后 —— 只是面板里的排列，预设里条目的实际顺序一个字都不动
    function orderedGroups(data, config) {
        const wanted = (config.sectionOrder || []).filter(id => data.groups.some(g => g.id === id));
        if (!wanted.length) return data.groups;
        const rank = new Map(wanted.map((id, index) => [id, index]));
        return [...data.groups].sort((a, b) => (rank.has(a.id) ? rank.get(a.id) : 900 + (a.order ?? 0)) - (rank.has(b.id) ? rank.get(b.id) : 900 + (b.order ?? 0)));
    }

    // ── 同步条目变化 ──
    // 你在酒馆里往某个区里塞了新条目、或者把条目拖到别的区去了，柏宝箱的分组表不会自己跟着动。
    // 这里按【前台顺序】重新推一遍：每条归到它上面最近的那条「━━ 区名 ━━」。
    const SECTION_END = /\bend\b/i;
    function syncLabel(name) { return DIVIDER.test(String(name)) ? dividerParts(String(name)).title : plainName(String(name)); }
    function sectionPlan(preset = activePreset()) {
        const box = preset?.extensions?.fruitHeartSections ?? preset?.extensions?.baibaiToolkit?.presetPromptGroups;
        const groups = Array.isArray(box?.groups) ? box.groups : [];
        const map = box?.prompts || {};
        const known = new Map(groups.map(group => [group.id, group]));
        const seen = [];
        const moves = [];
        const adds = [];
        const newHeads = [];
        let current = '';
        for (const prompt of activePrompts(preset)) {
            const id = promptId(prompt);
            if (id === CONFIG_ID) continue;
            const name = String(prompt.name || '');
            if (BIG_DIVIDER.test(name) && !SECTION_END.test(name)) {
                const owner = map[id]?.groupId;
                if (owner && known.has(owner)) current = owner;
                else { current = 'fruit-sync-' + seen.length + '-' + (dividerParts(name).title || '新区'); newHeads.push({ id: current, name: dividerParts(name).title || '新区' }); }
            }
            if (current && !seen.includes(current)) seen.push(current);
            const was = map[id]?.groupId || '';
            if (was === current) continue;
            (was && known.has(was) ? moves : adds).push({ id, name, from: was, to: current });
        }
        const label = new Map([...groups.map(g => [g.id, g.name]), ...newHeads.map(x => [x.id, x.name])]);
        return { box, groups, map, known, seen, moves, adds, newHeads, nameOf: id => label.get(id) || '（无区）', total: moves.length + adds.length + newHeads.length };
    }
    function applySectionPlan(preset) {
        // 面板分区独立保存；柏宝箱有自己的内存缓存，不能直接争写它的分区表。
        const source = preset.extensions?.fruitHeartSections ?? preset.extensions?.baibaiToolkit?.presetPromptGroups;
        if (!source) throw new Error('这份预设没有分区数据');
        preset.extensions.fruitHeartSections = structuredClone(source);
        const plan = sectionPlan(preset);
        plan.box.groups = plan.groups;
        plan.box.prompts = plan.map;
        for (const head of plan.newHeads) plan.groups.push({ id: head.id, name: head.name, order: 0, collapsed: true, enabled: true });
        for (const move of [...plan.moves, ...plan.adds]) plan.map[move.id] = { ...(plan.map[move.id] || {}), groupId: move.to };
        // 区的先后也跟着前台顺序走 —— 整区挪过位置的话，条目页里也应该跟着挪
        const rank = new Map(plan.seen.map((id, index) => [id, index]));
        plan.groups.sort((a, b) => (rank.has(a.id) ? rank.get(a.id) : 900 + (a.order ?? 0)) - (rank.has(b.id) ? rank.get(b.id) : 900 + (b.order ?? 0)));
        plan.groups.forEach((group, index) => { group.order = index; });
        return plan;
    }

    // ── 总闸按【正文特征】定位，不按条目名 —— 名字会被改，正文里的宏不会 ──
    function findByContent(preset, test) {
        return (preset.prompts || []).find(p => promptId(p) !== CONFIG_ID && test(p.content || '')) || null;
    }
    function initPrompt(preset = activePreset()) {
        return findByContent(preset, c => /\{\{trim\}\}/.test(c) && (c.match(/\{\{setvar::/g) || []).length > 30);
    }
    function nsfwMaster(preset = activePreset()) {
        const init = initPrompt(preset);
        return (preset.prompts || []).find(p => p !== init && /\{\{setglobalvar::NSFW::/.test(p.content || '')) || null;
    }
    function theatreMaster(preset = activePreset()) {
        const init = initPrompt(preset);
        return (preset.prompts || []).find(p => p !== init && promptId(p) !== CONFIG_ID && /\{\{setvar::snow::/.test(p.content || '')) || null;
    }
    // 小剧场素材＝剧场区里除主剧场以外的那些（她用 💡 开头标记）
    function theatreItems(preset, config) {
        const data = sectionData(preset);
        const section = sectionIdOf(sectionData(preset), SECTION_KEYS.theatre);
        const inSection = activePrompts(preset, config).filter(p => sectionOf(p, data) === section && !isDivider(p));
        const marked = inSection.filter(p => /^💡/.test(p.name));
        return marked.length ? marked : inSection.filter(p => exclusiveFamily(p, config) !== '主剧场' && !/^(?:📌|👨)/.test(p.name));
    }
    // 随机小剧场：每回合从全部 💡 里抽 1-2 个开着，其余关掉。
    // 抽的时机挂在酒馆的 GENERATION_AFTER_COMMANDS 上 —— 这个事件酒馆是 await 的，
    // 而且在组装提示词之前，所以抽的结果当回合就生效，不会慢一拍。
    // 结果照常写回预设（和你手点勾选走同一条路），所以面板上一眼能看到本回合抽中了谁。
    function bodyLength(content) {
        return String(content || '').replace(/\{\{\/\/[\s\S]*?\}\}/g, '').replace(/<\/?[^>\n]{1,40}>/g, '').replace(/\s+/g, '').length;
    }
    function pickSome(list, count) {
        const pool = [...list];
        const out = [];
        while (out.length < count && pool.length) out.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
        return out;
    }
    async function rollTheatre() {
        const preset = activePreset();
        const config = readConfig(preset);
        const want = Number(config.theatreRandom) || 0;
        if (!want) return;
        const master = theatreMaster(preset);
        if (master && !master.enabled) return;   // 总开关关着，抽了也不出现，别白写一次预设
        // 空壳条目（比如「💡 自定义剧场」，里面只有一行「小剧场主题：」）抽中了等于白抽，剔掉
        const pool = theatreItems(preset, config).filter(prompt => bodyLength(prompt.content) >= 20);
        if (pool.length < 2) return;
        const pick = new Set(pickSome(pool.map(promptId), Math.min(want, pool.length)));
        await updateBoth(target => {
            const cfg = readConfig(target);
            captureManualChanges(target, cfg);
            for (const prompt of theatreItems(target, cfg)) prompt.enabled = pick.has(promptId(prompt));
            rememberAppliedStates(target, cfg);
            writeConfig(target, cfg);
            return target;
        });
    }
    function isOn(prompt) { return Boolean(prompt && prompt.enabled); }

    // 正文字数条目按【正文里的字数写法】定位，不按条目名 —— 条目名会被改，正文格式不会。
    const WORD_RANGE = /(?:需求字数|需)\s*(\d+)\s*[-–—~～至到]+\s*(\d+)\s*字/;
    function wordCountPrompt(preset = activePreset(), config = readConfig(preset)) {
        const hits = activePrompts(preset, config).filter(item => WORD_RANGE.test(item.content || ''));
        return hits.find(item => item.enabled) || hits[0] || null;
    }
    function coreWarning(prompt) {
        const name = prompt?.name || '';
        return PLACEHOLDER_IDS.has(promptId(prompt)) || /📌|必开|别动|不要开|别开|勿开/i.test(name);
    }
    // groupForName 要跑一串正则。一次首页渲染会问到一千多次（三个下拉 + 剧场 + 非正文混排），
    // 手机上光这一项就两百多毫秒。按条目名缓存，名字没变就不重算。
    const familyCache = new Map();
    function exclusiveFamily(prompt, config) {
        const name = String(prompt.name || '');
        let hit = familyCache.get(name);
        if (hit === undefined) {
            hit = groupForName(name) || '';
            if (familyCache.size > 600) familyCache.clear();
            familyCache.set(name, hit);
        }
        return hit || config.controlGroups[promptId(prompt)] || '';
    }
    function combinationLabel(preset, config) {
        if (allModelTags(preset).includes(config.activeTag)) return config.activeTag;
        return activePrompts(preset).every(prompt => Boolean(prompt.enabled) === Boolean(config.initialStates[promptId(prompt)])) ? '初始组合' : '自定义组合';
    }
    function detectModelText() {
        try {
            const settings = SillyTavern.getContext().chatCompletionSettings || {};
            const source = String(settings.chat_completion_source || '').toLowerCase();
            const keys = {
                openai: 'openai_model', claude: 'claude_model', google: 'google_model', makersuite: 'google_model',
                vertexai: 'vertexai_model', openrouter: 'openrouter_model', custom: 'custom_model', deepseek: 'deepseek_model',
                minimax: 'minimax_model', electronhub: 'electronhub_model', nanogpt: 'nanogpt_model', xai: 'xai_model',
            };
            return String(settings[keys[source]] || source || '');
        } catch {}
        const source = String(jq('#chat_completion_source', doc).val() || '').toLowerCase();
        const selectors = { openai: '#model_openai_select', claude: '#model_claude_select', google: '#model_google_select', makersuite: '#model_google_select', openrouter: '#model_openrouter_select', custom: '#custom_model' };
        return String(jq(selectors[source] || '', doc).val() || source || '');
    }
__MODEL_LINK__
__NSFW_AUTO_CORE__
__NSFW_AUTO_RUNTIME__

    function captureTagState(preset, config, tag) {
        if (!tag) return;
        for (const prompt of activePrompts(preset)) {
            const stateTag = appliedTag(modelTags(prompt.name), tag);
            if (stateTag) {
                config.tagStates[stateTag] ||= {};
                config.tagStates[stateTag][promptId(prompt)] = Boolean(prompt.enabled);
            }
        }
    }
    function captureManualChanges(preset, config) {
        for (const prompt of activePrompts(preset)) {
            const id = promptId(prompt), enabled = Boolean(prompt.enabled), tags = modelTags(prompt.name);
            for (const tag of tags) {
                config.tagStates[tag] ||= {};
                if (!(id in config.tagStates[tag])) config.tagStates[tag][id] = enabled;
            }
            if (config.lastAppliedStates[id] === enabled) continue;
            const selected = appliedTag(tags, config.activeTag);
            for (const tag of selected ? [selected] : tags) config.tagStates[tag][id] = enabled;
        }
    }
    function rememberAppliedStates(preset, config) {
        config.lastAppliedStates = Object.fromEntries(activePrompts(preset, config).map(prompt => [promptId(prompt), Boolean(prompt.enabled)]));
    }
    // 尾部按模型强制：标签对得上的开，对不上的关。
    // 不按条目名认，按条目自己带的 # 标签认 —— 名字会被改，标签不会。
    function applyTails(preset, config, tag) {
        const data = sectionData(preset);
        const tail = sectionIdOf(data, SECTION_KEYS.tail);
        if (!tail) return;
        for (const prompt of activePrompts(preset, config)) {
            if (sectionOf(prompt, data) !== tail || isDivider(prompt)) continue;
            const tags = modelTags(prompt.name);
            if (!tags.length) continue;      // 不带模型标签的尾条目不归模型管
            prompt.enabled = Boolean(appliedTag(tags, tag));
        }
    }
    async function applyTag(tag) {
        await updateBoth(preset => {
            const config = readConfig(preset);
            captureManualChanges(preset, config);
            captureTagState(preset, config, config.activeTag);
            config.tagStates[tag] ||= {};
            for (const prompt of activePrompts(preset, config).filter(prompt => appliedTag(modelTags(prompt.name), tag))) {
                const id = promptId(prompt);
                const stateTag = appliedTag(modelTags(prompt.name), tag);
                config.tagStates[stateTag] ||= {};
                if (!(id in config.tagStates[stateTag])) config.tagStates[stateTag][id] = Boolean(prompt.enabled);
            }
            for (const prompt of activePrompts(preset, config)) {
                const promptTags = modelTags(prompt.name);
                if (!promptTags.length) continue;
                const stateTag = appliedTag(promptTags, tag);
                prompt.enabled = stateTag ? Boolean(config.tagStates[stateTag]?.[promptId(prompt)]) : false;
            }
            applyTails(preset, config, tag);
            config.activeTag = tag;
            selectedTagFamily = tagFamily(tag);
            captureTagState(preset, config, tag);   // 把强制过的尾部状态记回去，下次选同一个还是这样
            rememberAppliedStates(preset, config);
            writeConfig(preset, config);
            return preset;
        });
        toast('success', `已切换模型标签：# ${tag}`);
    }
    async function resetPromptStates() {
        await updateBoth(preset => {
            const config = readConfig(preset);
            for (const prompt of activePrompts(preset, config)) prompt.enabled = Boolean(config.initialStates[promptId(prompt)]);
            config.activeTag = '';
            config.tagStates = structuredClone(config.initialTagStates);
            rememberAppliedStates(preset, config);
            writeConfig(preset, config);
            return preset;
        });
        toast('success', '已恢复初始开关状态');
    }

