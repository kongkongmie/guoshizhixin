const NSFW_DEFAULT_WORDS = '做爱, 性爱, 亲热, 亲密, 接吻, 口交, 指交, 手交, 骑乘, 插入, 抽送, 勃起, 高潮, 射精, 内射, 精液, 阴茎, 肉棒, 鸡巴, 小穴, 阴道, 阴蒂, 乳房, 乳头, 裸体, 脱衣';
// Shared by the bundled script and isolated behavior tests.
function nsfwKeywords(value) {
    return [...new Set(String(value || '').split(/[,，、;；\r\n]+/).map(word => word.trim().toLowerCase()).filter(Boolean))];
}
function nsfwMatch(text, settings) {
    const content = String(text || '').toLowerCase();
    return nsfwKeywords(settings.words).find(word => content.includes(word)) || '';
}
function createNsfwAutoController({ identity, settings, apply, status }) {
    let disposed = false, epoch = 0, misses = 0, owner = '', round = null;
    let pending = Promise.resolve();
    function reset() { epoch++; misses = 0; round = null; owner = ''; }
    function write(enabled, token, word) {
        const valid = () => !disposed && token.epoch === epoch && token.owner === identity() && settings().enabled;
        pending = pending.catch(() => {}).then(async () => {
            if (!valid()) return;
            const changed = await apply(enabled, valid);
            if (valid()) status({ enabled, word, misses, changed });
        });
        return pending;
    }
    async function begin(text) {
        if (disposed) return;
        const id = identity();
        if (id !== owner) { reset(); owner = id; }
        const config = settings();
        round = null;
        if (!config.enabled || !nsfwKeywords(config.words).length) return;
        const word = nsfwMatch(text, config);
        round = { owner: id, epoch, hit: Boolean(word) };
        if (word) { misses = 0; await write(true, round, word); }
    }
    async function finish(text) {
        const token = round;
        round = null;
        if (!token || disposed || token.epoch !== epoch || token.owner !== identity() || !settings().enabled) return;
        const word = nsfwMatch(text, settings());
        if (word || token.hit) {
            misses = 0;
            if (word) await write(true, token, word);
        } else {
            misses++;
            if (misses >= (settings().cooldown === 1 ? 1 : 2)) await write(false, token, '');
            else status({ waiting: true, misses });
        }
    }
    return { begin, finish, reset, cancel() { epoch++; round = null; }, destroy() { disposed = true; reset(); } };
}
