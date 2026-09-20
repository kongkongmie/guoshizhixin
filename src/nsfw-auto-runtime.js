    const nsfwAutoStops = [];
    let nsfwAutoRound = null;
    let nsfwAutoStatus = '等待新一轮对话';
    function nsfwAutoKey() { return 'fruit-heart-nsfw-auto-v1:' + loadedName(); }
    function nsfwAutoSettings() {
        try {
            const value = JSON.parse(hostWindow.localStorage.getItem(nsfwAutoKey()) || '{}') || {};
            const words = value.version === 2 ? String(value.words ?? NSFW_DEFAULT_WORDS) : nsfwKeywords(NSFW_DEFAULT_WORDS + ',' + String(value.words || '')).join(', ');
            return { enabled: value.enabled === true, words,
                cooldown: value.cooldown === 1 ? 1 : 2 };
        } catch { return { enabled: false, words: NSFW_DEFAULT_WORDS, cooldown: 2 }; }
    }
    function nsfwAutoIdentity() {
        const st = window.SillyTavern || hostWindow.SillyTavern;
        const context = st?.getContext?.();
        const chatId = context?.getCurrentChatId?.() ?? st?.getCurrentChatId?.();
        // No identity means no automatic write: do not guess across chats.
        return chatId == null ? '' : JSON.stringify([loadedName(), chatId]);
    }
    async function applyNsfwAuto(enabled, valid) {
        const deadline = Date.now() + 5000;
        while (busy && valid() && !destroyed && Date.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        if (!valid() || destroyed) return false;
        if (busy) throw new Error('面板操作尚未结束，本轮未自动切换');
        const update = resolveFunction('updatePresetWith');
        if (!update) throw new Error('酒馆助手预设写入接口不可用');
        const existing = nsfwMaster(activePreset());
        if (!existing) throw new Error('未找到预设的 NSFW 总开关');
        if (Boolean(existing.enabled) === enabled) return false;
        let changed = false;
        busy = true;
        try {
            await update('in_use', preset => {
                if (!valid() || destroyed) return preset;
                const target = nsfwMaster(preset);
                if (!target) throw new Error('未找到预设的 NSFW 总开关');
                if (Boolean(target.enabled) === enabled) return preset;
                const config = readConfig(preset);
                captureManualChanges(preset, config);
                target.enabled = enabled;
                captureManualChanges(preset, config);
                rememberAppliedStates(preset, config);
                writeConfig(preset, config);
                changed = true;
                return preset;
            }, { render: 'immediate' });
        } finally { busy = false; }
        if (changed && !destroyed && root.hasClass('open') && currentView !== 'settings') render(currentView);
        return changed;
    }
    const nsfwAutoController = createNsfwAutoController({
        identity: nsfwAutoIdentity, settings: nsfwAutoSettings, apply: applyNsfwAuto,
        status({ enabled, word, misses, changed, waiting }) {
            nsfwAutoStatus = waiting ? `已连续 ${misses} 轮未命中，再 ${nsfwAutoSettings().cooldown - misses} 轮关闭` : enabled ? `命中「${word}」，NSFW 总开关${changed ? '已开启' : '保持开启'}`
                : `连续 ${misses} 轮未命中，NSFW 总开关${changed ? '已关闭' : '保持关闭'}`;
            root.find('[data-nsfw-auto-status]').text(nsfwAutoStatus);
        },
    });
    function nsfwAutoCard(preset) {
        const config = nsfwAutoDraft?.preset === loadedName() ? nsfwAutoDraft.value : nsfwAutoSettings(), master = nsfwMaster(preset);
        return `<section class="fh-card fh-mt fh-nsfw-auto"><div class="fh-card-head"><h3>NSFW 关键词联动</h3>
          <p>与首页 NSFW 总开关联动，保留分区内的细项选择。输入或回复命中时开启，连续未命中后关闭。</p></div>
          <div class="fh-pad fh-nsfw-fields"><label class="fh-nsfw-enable"><span>启用关键词联动</span><input type="checkbox" id="fh-nsfw-auto-enabled" ${config.enabled ? 'checked' : ''} ${master ? '' : 'disabled'}></label>
          <p class="fh-nsfw-target">${master ? `当前总开关：${h(master.name)} · ${master.enabled ? '已开启' : '已关闭'}` : '未找到 NSFW 总开关，请确认当前预设包含对应条目。'}</p>
          <div class="fh-nsfw-field"><label for="fh-nsfw-auto-words">触发关键词</label><p class="fh-dim" id="fh-nsfw-word-help">用逗号分隔，也支持中文逗号、顿号和换行。</p>
          <textarea id="fh-nsfw-auto-words" rows="4" spellcheck="false" aria-describedby="fh-nsfw-word-help">${h(config.words)}</textarea>
          <button type="button" class="fh-btn" data-action="nsfw-default-words">补入默认关键词</button></div>
          <fieldset class="fh-nsfw-cooldown"><legend>连续未命中后关闭</legend><div class="fh-nsfw-options">
            ${[1,2].map(n => `<label class="fh-nsfw-option"><input type="radio" name="fh-nsfw-auto-cooldown" value="${n}" ${config.cooldown === n ? 'checked' : ''}><span>${n} 轮</span></label>`).join('')}</div>
          <p class="fh-dim">一轮 = 用户输入 + 完整回复。默认 2 轮，重新生成和中断不计数。</p></fieldset>
          <details class="fh-nsfw-details"><summary>规则说明</summary><p>忽略英文大小写，按字面包含匹配。规则按预设保存在本浏览器；自动切换不直接写回已保存预设。停用联动保留当前开关状态。</p></details></div>
          <div class="fh-card-actions"><button class="fh-btn primary" data-action="save-nsfw-auto">保存规则</button><span class="fh-nsfw-status" data-nsfw-auto-status role="status">${h(nsfwAutoDirty ? '有未保存的修改' : nsfwAutoStatus)}</span></div></section>`;
    }
    function readNsfwAutoForm() {
        return { version: 2, enabled: root.find('#fh-nsfw-auto-enabled').prop('checked') === true,
            words: nsfwKeywords(root.find('#fh-nsfw-auto-words').val()).join(', '),
            cooldown: Number(root.find('[name="fh-nsfw-auto-cooldown"]:checked').val()) === 1 ? 1 : 2 };
    }
    function captureNsfwAutoDraft() {
        nsfwAutoDraft = { preset: loadedName(), value: readNsfwAutoForm() };
        nsfwAutoDirty = true;
        root.find('[data-nsfw-auto-status]').text('有未保存的修改');
    }
    function saveNsfwAuto() {
        const value = readNsfwAutoForm();
        if (value.enabled && !nsfwKeywords(value.words).length) return toast('error', '请填写至少一个触发关键词');
        if (value.enabled && !nsfwMaster(activePreset())) return toast('error', '未找到 NSFW 总开关');
        try { hostWindow.localStorage.setItem(nsfwAutoKey(), JSON.stringify(value)); }
        catch { return toast('error', '规则保存失败，请检查浏览器存储空间'); }
        nsfwAutoController.reset(); nsfwAutoRound = null;
        nsfwAutoStatus = value.enabled ? '规则已保存，从下一轮对话开始' : '联动已停用，总开关状态保持不变';
        nsfwAutoDirty = false; nsfwAutoDraft = null;
        renderSettings();
    }
    let nsfwAutoDirty = false;
    let nsfwAutoDraft = null;
    function bindNsfwAuto() {
        const on = resolveFunction('eventOn');
        const getMessages = resolveFunction('getChatMessages');
        const events = window.tavern_events || hostWindow.tavern_events || hostWindow.TavernHelper?.tavern_events;
        if (!on || !getMessages || !events?.GENERATION_AFTER_COMMANDS || !events?.GENERATION_ENDED) {
            nsfwAutoStatus = '助手事件或消息接口不可用，请检查酒馆助手版本'; return;
        }
        const lastReply = () => getMessages(-1, { role: 'assistant', hide_state: 'unhidden' })[0];
        const report = error => { nsfwAutoStatus = error.message || '自动切换失败'; root.find('[data-nsfw-auto-status]').text(nsfwAutoStatus); console.warn('[果实之心] NSFW 联动', error); };
        const bind = (name, fn) => { if (name) { const handle = on(name, fn); if (handle?.stop) nsfwAutoStops.push(() => handle.stop()); } };
        bind(events.GENERATION_AFTER_COMMANDS, async (type, options, dryRun) => {
            nsfwAutoRound = null; nsfwAutoController.cancel();
            if (dryRun || (type && type !== 'normal') || options?.automatic_trigger || !nsfwAutoIdentity()) return;
            try {
                const before = lastReply();
                nsfwAutoRound = { identity: nsfwAutoIdentity(), before: JSON.stringify(before) };
                const text = String(doc.querySelector('#send_textarea')?.value || '');
                await nsfwAutoController.begin(text);
            } catch (error) { nsfwAutoRound = null; nsfwAutoController.cancel(); report(error); }
        });
        bind(events.GENERATION_ENDED, async () => {
            const round = nsfwAutoRound; nsfwAutoRound = null;
            if (!round || round.identity !== nsfwAutoIdentity()) return;
            try {
                const reply = lastReply();
                if (!reply || !String(reply.message || '').trim() || JSON.stringify(reply) === round.before) { nsfwAutoController.cancel(); return; }
                await nsfwAutoController.finish(reply.message);
            } catch (error) { report(error); }
        });
        bind(events.GENERATION_STOPPED, () => { nsfwAutoRound = null; nsfwAutoController.cancel(); });
        for (const name of new Set([events.CHAT_CHANGED, events.OAI_PRESET_CHANGED_AFTER, events.PRESET_CHANGED].filter(Boolean))) {
            bind(name, () => { nsfwAutoRound = null; nsfwAutoController.reset(); });
        }
    }
