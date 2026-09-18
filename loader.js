(async () => {
    'use strict';
    const BASE = 'https://raw.githubusercontent.com/kongkongmie/guoshizhixin/main/';
    const CACHE = 'fruit-heart-released-script-v1';
    async function download() {
        const response = await fetch(BASE + 'release.json', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`检查更新失败：${response.status}`);
        const release = await response.json();
        if (!/^\d{8}\.\d+$/.test(release.version) || !/^[a-f0-9]{64}$/.test(release.sha256)) throw new Error('脚本发布信息无效');
        const responseCode = await fetch(BASE + `releases/${release.version}/fruit-heart.js`, { cache: 'force-cache', signal: AbortSignal.timeout(20000) });
        if (!responseCode.ok) throw new Error(`下载脚本失败：${responseCode.status}`);
        const code = await responseCode.text();
        const entry = { version: release.version, sha256: release.sha256, code };
        if (!await valid(entry)) throw new Error('脚本校验未通过');
        return entry;
    }
    async function valid(entry) {
        if (!entry || typeof entry.code !== 'string' || typeof entry.sha256 !== 'string') return false;
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(entry.code));
        return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('') === entry.sha256;
    }
    function save(entry) {
        try { localStorage.setItem(CACHE, JSON.stringify(entry)); }
        catch (error) { console.warn('[果实之心] 浏览器未能保存脚本缓存', error); }
    }
    async function run(entry) {
        const url = URL.createObjectURL(new Blob([entry.code], { type: 'text/javascript' }));
        try { await import(url); }
        finally { URL.revokeObjectURL(url); }
    }
    try {
        let cached;
        try { cached = JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch {}
        if (await valid(cached)) {
            await run(cached);
            // 已缓存的版本立即运行，更新留到下一次脚本重载，避免打断正在编辑的面板。
            void download().then(next => {
                if (next.sha256 !== cached.sha256) {
                    save(next);
                    console.info('[果实之心] 新版脚本已下载，下次重载生效：', next.version);
                }
            }).catch(error => console.warn('[果实之心] 本次未能检查更新', error));
        } else {
            const entry = await download();
            await run(entry);
            save(entry);
        }
    } catch (error) {
        console.error('[果实之心] 脚本加载失败', error);
        let host = window;
        try { while (host.parent !== host) host = host.parent; } catch {}
        host.toastr?.error('果实之心脚本加载失败，请检查网络后刷新。');
    }
})();
