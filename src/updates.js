    const RELEASE_BASE = 'https://raw.githubusercontent.com/kongkongmie/guoshizhixin/main/';
    const RELEASE_NOTES = __RELEASE_NOTES__;
    const SCRIPT_CACHE_KEY = 'fruit-heart-released-script-v1';
    let availableRelease = null;
    let updateMessage = '';
    let updateBusy = false;
    let updateCheckTimer = null;
    function isNewerRelease(version) {
        const [day, revision] = version.split('.').map(Number);
        const [currentDay, currentRevision] = SCRIPT_VERSION.split('.').map(Number);
        return day > currentDay || (day === currentDay && revision > currentRevision);
    }
    function syncUpdateBadge() {
        const badge = root.find('.fh-update-badge')[0];
        if (!badge) return;
        const newer = Boolean(availableRelease && isNewerRelease(availableRelease.version));
        badge.hidden = !newer;
        if (newer) {
            badge.textContent = '🍎';
            badge.title = `发现果实之心更新 v${availableRelease.version}`;
            badge.setAttribute('aria-label', `发现果实之心更新 v${availableRelease.version}`);
        }
    }
    function scheduleUpdateCheck() {
        clearTimeout(updateCheckTimer);
        updateCheckTimer = setTimeout(() => {
            updateCheckTimer = null;
            if (!destroyed) void checkScriptUpdate();
        }, 1200);
    }
    function updateStatusClass() {
        if (updateBusy) return 'busy';
        if (/失败|错误|未保存|校验|quota|storage|setitem/i.test(updateMessage)) return 'error';
        return updateMessage ? 'done' : 'idle';
    }
    function saveReleasedScript(entry) {
        const serialized = JSON.stringify(entry);
        try {
            // 先释放旧版本占用的空间，避免替换大字符串时临时超出 localStorage 配额。
            localStorage.removeItem(SCRIPT_CACHE_KEY);
            localStorage.setItem(SCRIPT_CACHE_KEY, serialized);
        } catch (error) {
            try { localStorage.removeItem(SCRIPT_CACHE_KEY); } catch {}
            throw new Error('浏览器缓存空间不足，更新没有保存。请清理酒馆站点缓存后重试。');
        }
    }
    function renderUpdates() {
        const notes = availableRelease?.history || RELEASE_NOTES;
        main.html(`${titleBlock('脚本更新', `当前运行 v${SCRIPT_VERSION}`)}
          <div class="fh-card fh-update-actions"><div class="fh-card-actions"><button class="fh-btn" data-nav="settings">返回设置</button>
          <button class="fh-btn primary" data-action="check-update" ${updateBusy ? 'disabled' : ''}>检查更新</button>
          ${availableRelease && isNewerRelease(availableRelease.version) ? `<button class="fh-btn" data-action="download-update" ${updateBusy ? 'disabled' : ''}>下载 v${h(availableRelease.version)}</button>` : ''}</div></div>
          <div class="fh-update-status ${updateStatusClass()}" role="status">${h(updateMessage || '检查到新版后，下载按钮会出现在这里。')}</div>
          <p class="fh-update-tip">下载完成后请刷新酒馆页面，Git 版才会运行新版；使用本地测试版时，请切回 Git 版。</p>
          <div class="fh-update-history">${notes.map(note => `<article class="fh-update-entry"><div class="fh-update-entry-head"><strong>v${h(note.version)}</strong><time>${h(note.date || '')}</time></div><ul>${note.changes.map(change => `<li>${h(change)}</li>`).join('')}</ul></article>`).join('')}</div>`);
    }
    async function checkScriptUpdate(download = false) {
        if (updateBusy) return;
        updateBusy = true;
        updateMessage = download ? '正在下载更新…' : '正在检查更新…';
        if (currentView === 'updates') renderUpdates();
        try {
            const response = await fetch(RELEASE_BASE + 'release.json', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
            if (!response.ok) throw new Error(`检查更新失败（${response.status}）`);
            const release = await response.json();
            if (!/^\d{8}\.\d+$/.test(release.version) || !/^[a-f0-9]{64}$/.test(release.sha256)) throw new Error('发布信息格式不正确');
            if (release.history !== undefined && (!Array.isArray(release.history) || !release.history.every(note => note && typeof note.version === 'string' && Array.isArray(note.changes) && note.changes.every(change => typeof change === 'string')))) throw new Error('更新记录格式不正确');
            availableRelease = release;
            if (!download) {
                updateMessage = isNewerRelease(release.version) ? `发现新版 v${release.version}，可下载后刷新。` : '当前已是最新版本。';
            } else {
                if (!isNewerRelease(release.version)) { updateMessage = '当前已是最新版本。'; return; }
                const responseCode = await fetch(RELEASE_BASE + `releases/${release.version}/fruit-heart.js`, { signal: AbortSignal.timeout(20000) });
                if (!responseCode.ok) throw new Error(`下载失败（${responseCode.status}）`);
                const code = await responseCode.text();
                const sha256 = hashScript(code);
                if (sha256 !== release.sha256) throw new Error('校验失败，未保存下载内容');
                saveReleasedScript({ version: release.version, sha256, code });
                updateMessage = `v${release.version} 已下载。请刷新酒馆页面，Git 版才会运行新版。`;
            }
        } catch (error) {
            const detail = String(error?.message || '');
            updateMessage = `${detail || '更新失败'}。当前脚本仍可继续使用。`;
        } finally {
            updateBusy = false;
            syncUpdateBadge();
            if (currentView === 'updates') renderUpdates();
        }
    }
