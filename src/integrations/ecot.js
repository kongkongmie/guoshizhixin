    function ecotApi() {
        return hostWindow.FruitHeartECoT || window.FruitHeartECoT;
    }
    function ecotEnabled() {
        const api = ecotApi();
        return api && typeof api.getEnabled === 'function' ? api.getEnabled() : false;
    }
    function ecotStatus() {
        const api = ecotApi();
        return api ? `ECoT 模块 ${api.version ? 'v' + api.version : '旧版'} · ${ecotEnabled() ? '已开启' : '已关闭'}` : 'ECoT 模块未就绪';
    }
    const DEFAULT_ECOT_END_TAGS = ['</ECoT>', '</thinking>', '</think>', '<!-- End of The ECoT -->', '<!-- End the ECoT -->'];
    const LEGACY_ECOT_END_TAGS = ['</ECoT>', '</thinking>', '</think>', '<!-- End of The ECoT -->'];
    function sameTags(actual, expected) {
        const tags = Array.isArray(actual) ? actual.map(tag => String(tag)) : [];
        return tags.length === expected.length && expected.every(tag => tags.includes(tag));
    }
    function ecotEndTags() {
        const api = ecotApi();
        if (!api || typeof api.getEndTags !== 'function') return [...DEFAULT_ECOT_END_TAGS];
        try {
            const tags = api.getEndTags();
            if (sameTags(tags, LEGACY_ECOT_END_TAGS) && typeof api.setEndTags === 'function') {
                api.setEndTags(DEFAULT_ECOT_END_TAGS);
                return [...DEFAULT_ECOT_END_TAGS];
            }
            return Array.isArray(tags) && tags.length ? tags : [...DEFAULT_ECOT_END_TAGS];
        } catch { return [...DEFAULT_ECOT_END_TAGS]; }
    }
    function ecotOptionsReady() {
        const api = ecotApi();
        return Boolean(api && typeof api.getAutoParse === 'function' && typeof api.setAutoParse === 'function'
            && typeof api.getTrimBeforeLanguageCheck === 'function' && typeof api.setTrimBeforeLanguageCheck === 'function');
    }
    function ecotAutoParseEnabled() {
        const api = ecotApi();
        try { return typeof api?.getAutoParse === 'function' ? Boolean(api.getAutoParse()) : true; } catch { return true; }
    }
    function ecotTrimLanguageEnabled() {
        const api = ecotApi();
        try { return typeof api?.getTrimBeforeLanguageCheck === 'function' ? Boolean(api.getTrimBeforeLanguageCheck()) : true; } catch { return true; }
    }
    function wordRange() {
        const config = readConfig();
        const prompt = wordCountPrompt(activePreset(), config);
        const match = (prompt?.content || '').match(WORD_RANGE);
        return match ? [match[1], match[2]] : [2200, 2500];
    }
