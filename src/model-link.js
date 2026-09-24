    const modelLinkKey = 'fruit-heart-model-link';
    let modelLinkEnabled = readFlag(modelLinkKey, true);
    let modelLinkSignature = '';
    let pendingModelSignature = '';
    let pendingModelSince = 0;
    let modelLinkDestroyed = false;

    function linkedModelTag(model, preset) {
        const name = String(model).toUpperCase();
        const tags = allModelTags(preset);
        if (/DEEPSEEK|(?:^|\/)DS[-_]/.test(name)) return tags.includes('DS') ? 'DS' : '';
        if (/CLAUDE/.test(name)) return tags.includes('CLAUDE') ? 'CLAUDE' : '';
        if (/GLM|ZHIPU|BIGMODEL/.test(name)) return tags.includes('GLM') ? 'GLM' : '';
        if (!/GEMINI/.test(name)) return '';
        const group = modelGroup(name.slice(name.indexOf('GEMINI')));
        if (['GEMINI FLASH', 'GEMINI PRO'].includes(group) && tags.some(tag => modelGroup(tag) === group)) return group;
        return tags.includes('GEMINI') ? 'GEMINI' : '';
    }

    async function syncConnectedModel() {
        if (modelLinkDestroyed || !modelLinkEnabled || busy) return;
        const name = loadedName();
        const model = detectModelText();
        if (!name || !model) return;
        const signature = JSON.stringify([name, model]);
        if (signature === modelLinkSignature) return;
        if (signature !== pendingModelSignature) {
            pendingModelSignature = signature;
            pendingModelSince = Date.now();
            return;
        }
        // 自定义模型输入和连接方案切换可能连发事件，等实际设置稳定后再切一次。
        if (Date.now() - pendingModelSince < 500) return;
        try {
            const preset = activePreset();
            if (!configPrompt(preset)) { modelLinkSignature = signature; return; }
            const tag = linkedModelTag(model, preset);
            if (!tag || modelGroup(readConfig(preset).activeTag) === tag) { modelLinkSignature = signature; return; }
            modelLinkSignature = signature;
            await guarded(async () => {
                if (modelLinkDestroyed || !modelLinkEnabled || loadedName() !== name || detectModelText() !== model) return;
                await applyTag(tag);
                if (root.hasClass('open')) render(currentView);
            });
        } catch (error) {
            modelLinkSignature = signature;
            console.warn('[果实之心] 模型联动未执行', error);
        }
    }

    // ---- DeepSeek：连接到 DS 时，往插头「附加参数 → 包括主体参数」写入 thinking disabled ----
    // 换走 DS / 关掉开关时删掉 thinking disabled；用户写的其他 thinking 值（比如 enabled）一律不碰。
    const dsThinkingKey = 'fruit-heart-ds-thinking-off';
    const DS_ADDED_KEY = 'fruit-heart-ds-thinking-added';
    const DS_THINKING_JSON = '{"thinking": {"type": "disabled"}}';
    let dsThinkingOff = readFlag(dsThinkingKey, true);

    function isDeepSeekConnection(settings) {
        const source = String(settings.chat_completion_source || '').toLowerCase();
        if (source === 'deepseek') return true;
        const model = detectModelText();
        if (/deepseek|(?:^|\/)ds[-_]/i.test(model)) return true;
        return source === 'custom' && /deepseek/i.test(String(settings.custom_url || ''));
    }
    // 包括主体参数是 YAML；JSON 也是合法 YAML。能按 JSON 解析就改对象，否则按行处理。
    function withDsThinking(text, on) {
        const source = String(text || '').trim();
        let obj = null;
        if (!source) obj = {};
        else { try { const parsed = JSON.parse(source); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) obj = parsed; } catch {} }
        if (obj) {
            const disabled = obj.thinking && typeof obj.thinking === 'object' && obj.thinking.type === 'disabled';
            if (on) { if ('thinking' in obj) return text; obj.thinking = { type: 'disabled' }; }
            else { if (!disabled) return text; delete obj.thinking; }
            const keys = Object.keys(obj);
            if (!keys.length) return '';
            if (keys.length === 1 && keys[0] === 'thinking') return DS_THINKING_JSON;
            return JSON.stringify(obj, null, 2);
        }
        if (on) return /^thinking\s*:/m.test(source) ? text : `${source}\nthinking:\n  type: disabled`;
        return source.replace(/\n?^thinking:\n {2}type: disabled$/m, '');
    }
    function syncDsThinking() {
        if (modelLinkDestroyed) return;
        let ctx, settings;
        try { ctx = SillyTavern.getContext(); settings = ctx.chatCompletionSettings; } catch { return; }
        if (!settings) return;
        const want = dsThinkingOff && isDeepSeekConnection(settings);
        const added = readFlag(DS_ADDED_KEY, false);
        const current = String(settings.custom_include_body ?? '');
        let next = current;
        if (want && !added) {
            next = withDsThinking(current, true);
            if (next === current) {
                // 已经有 thinking：是 disabled 就当成脚本的（换走 DS 时一起删掉），别的值是用户自己的，不接管
                if (withDsThinking(current, false) !== current) { try { hostWindow.localStorage.setItem(DS_ADDED_KEY, 'true'); } catch {} }
                return;
            }
        } else if (!want && added) {
            next = withDsThinking(current, false);
        } else return;
        try { hostWindow.localStorage.setItem(DS_ADDED_KEY, String(want)); } catch {}
        if (next === current) return;
        settings.custom_include_body = next;
        jq('#custom_include_body', doc).val(next);   // 附加参数弹窗开着时同步显示
        try { ctx.saveSettingsDebounced?.(); } catch {}
        console.info(`[果实之心] DeepSeek 思考参数：${want ? '已写入' : '已移除'} thinking disabled`);
    }
