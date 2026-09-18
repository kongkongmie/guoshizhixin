    const modelLinkKey = 'fruit-heart-model-link';
    let modelLinkEnabled = readFlag(modelLinkKey, true);
    let modelLinkSignature = '';
    let pendingModelSignature = '';
    let pendingModelSince = 0;
    let modelLinkDestroyed = false;

    function linkedModelTag(model, preset) {
        const name = String(model).toUpperCase();
        const tags = allModelTags(preset);
        const normalize = value => value.toUpperCase().replace(/FLASH/g, 'F').replace(/[^A-Z0-9]/g, '');
        const exact = tags.filter(tag => normalize(tag) === normalize(name));
        if (exact.length === 1) return exact[0];
        if (/DEEPSEEK|(?:^|\/)DS[-_]/.test(name)) return tags.includes('DS') ? 'DS' : '';
        if (/CLAUDE/.test(name)) return tags.includes('CLAUDE') ? 'CLAUDE' : '';
        if (!/GEMINI/.test(name)) return '';
        const flavor = /FLASH/.test(name) ? 'flash' : /PRO/.test(name) ? 'pro' : '';
        if (!flavor) return tags.includes('GEMINI') ? 'GEMINI' : '';
        const candidates = tags.filter(tag => tagFamily(tag) === 'GEMINI' &&
            (flavor === 'flash' ? /FLASH|\dF$/.test(tag) : /PRO/.test(tag)));
        const version = name.match(/GEMINI[-_ ]*(\d+(?:\.\d+)?)/)?.[1];
        const matchingVersion = version ? candidates.filter(tag => tag.match(/GEMINI\s*(\d+(?:\.\d+)?)/)?.[1] === version) : [];
        if (matchingVersion.length === 1) return matchingVersion[0];
        if (candidates.length === 1) return candidates[0];
        return candidates.length === 0 && tags.includes('GEMINI') ? 'GEMINI' : '';
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
            if (!tag || readConfig(preset).activeTag === tag) { modelLinkSignature = signature; return; }
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
