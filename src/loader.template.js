(async () => {
    'use strict';
__HASH__
    let stage = '读取脚本缓存';
    const BASE = 'https://raw.githubusercontent.com/kongkongmie/guoshizhixin/main/';
    const CACHE = 'fruit-heart-released-script-v1';
    const SEEN = 'fruit-heart-release-seen-v1';
    const LOADER_VERSION = __LOADER_VERSION__;
    async function download() {
        stage = '连接 GitHub 发布信息';
        const response = await fetch(BASE + 'release.json', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`检查更新失败：${response.status}`);
        const release = await response.json();
        if (!/^\d{8}\.\d+$/.test(release.version) || !/^[a-f0-9]{64}$/.test(release.sha256)) throw new Error('脚本发布信息无效');
        stage = '下载 GitHub 脚本文件';
        const responseCode = await fetch(BASE + `releases/${release.version}/fruit-heart.js`, { cache: 'force-cache', signal: AbortSignal.timeout(20000) });
        if (!responseCode.ok) throw new Error(`下载脚本失败：${responseCode.status}`);
        const code = await responseCode.text();
        const entry = { version: release.version, sha256: release.sha256, code };
        stage = '校验下载文件';
        if (!await valid(entry)) throw new Error('脚本校验未通过');
        noteSeen(release.version);
        return entry;
    }
    async function valid(entry) {
        if (!entry || typeof entry.code !== 'string' || typeof entry.sha256 !== 'string') return false;
        return hashScript(entry.code) === entry.sha256;
    }
    // 主脚本 1.2 秒后还会自己查一次同一个 release.json。把这轮的结果记下来给它用，
    // 每次刷新酒馆就少打一次 GitHub —— 国内网络下那是一次 15 秒的挂起。
    function noteSeen(version) {
        try { localStorage.setItem(SEEN, JSON.stringify({ version, at: Date.now() })); } catch {}
    }
    function save(entry) {
        let previous = null;
        try {
            previous = localStorage.getItem(CACHE);
            localStorage.removeItem(CACHE);
            localStorage.setItem(CACHE, JSON.stringify(entry));
        } catch (error) {
            try { localStorage.removeItem(CACHE); if (previous !== null) localStorage.setItem(CACHE, previous); } catch {}
            console.warn('[果实之心] 浏览器未能保存脚本缓存', error);
        }
    }
    async function run(entry) {
        stage = '执行面板脚本';
        const url = URL.createObjectURL(new Blob([entry.code], { type: 'text/javascript' }));
        try { await import(url); }
        finally { URL.revokeObjectURL(url); }
    }
    try {
        let cached;
        try { cached = JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch {}
        const cachedValid = await valid(cached);
        if (cachedValid && cached.version === LOADER_VERSION) {
            await run(cached);
            // 已缓存的版本立即运行，更新留到下一次脚本重载，避免打断正在编辑的面板。
            void download().then(next => {
                if (next.sha256 !== cached.sha256) {
                    save(next);
                    console.info('[果实之心] 新版脚本已下载，下次重载生效：', next.version);
                }
            }).catch(error => console.warn('[果实之心] 本次未能检查更新', error));
        } else {
            try {
                const entry = await download();
                await run(entry);
                save(entry);
            } catch (error) {
                if (!cachedValid) throw error;
                console.warn('[果实之心] 新版下载失败，改用已校验的离线缓存', error);
                stage = '执行离线缓存';
                await run(cached);
            }
        }
    } catch (error) {
        console.error('[果实之心] 脚本加载失败', error);
        let host = window;
        try { while (host.parent !== host) host = host.parent; } catch {}
        host.toastr?.error(`果实之心：${stage}失败。${error.message || String(error)}。可先关闭 Git 版，手动开启本地版。`);
    }
})();
