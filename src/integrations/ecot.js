    function ecotEnabled() {
        const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT;
        return api && typeof api.getEnabled === 'function' ? api.getEnabled() : false;
    }
    function ecotStatus() {
        const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT;
        return api ? (ecotEnabled() ? '已开启' : '已关闭') : '未就绪';
    }
    const DEFAULT_ECOT_END_TAGS = ['</ECoT>', '</thinking>', '</think>', '<!-- End of The ECoT -->', '<!-- End the ECoT -->'];
    const LEGACY_ECOT_END_TAGS = ['</ECoT>', '</thinking>', '</think>', '<!-- End of The ECoT -->'];
    function sameTags(actual, expected) {
        const tags = Array.isArray(actual) ? actual.map(tag => String(tag)) : [];
        return tags.length === expected.length && expected.every(tag => tags.includes(tag));
    }
    function ecotEndTags() {
        const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT;
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
    function wordRange() {
        const config = readConfig();
        const prompt = wordCountPrompt(activePreset(), config);
        const match = (prompt?.content || '').match(WORD_RANGE);
        return match ? [match[1], match[2]] : [2200, 2500];
    }
