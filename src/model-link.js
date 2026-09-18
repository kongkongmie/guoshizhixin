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
