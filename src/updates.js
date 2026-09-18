    const RELEASE_BASE = 'https://raw.githubusercontent.com/kongkongmie/guoshizhixin/main/';
    const RELEASE_NOTES = __RELEASE_NOTES__;
    let availableRelease = null;
    let updateMessage = '';
    let updateBusy = false;
    function isNewerRelease(version) {
        const [day, revision] = version.split('.').map(Number);
        const [currentDay, currentRevision] = SCRIPT_VERSION.split('.').map(Number);
        return day > currentDay || (day === currentDay && revision > currentRevision);
    }
    function renderUpdates() {
        const notes = availableRelease?.history || RELEASE_NOTES;
        main.html(`${titleBlock('脚本更新', `当前运行 v${SCRIPT_VERSION}`)}
          <div class="fh-card-actions"><button class="fh-btn" data-nav="settings">返回设置</button>
          <button class="fh-btn primary" data-action="check-update" ${updateBusy ? 'disabled' : ''}>检查更新</button>
          ${availableRelease && isNewerRelease(availableRelease.version) ? `<button class="fh-btn" data-action="download-update" ${updateBusy ? 'disabled' : ''}>下载 v${h(availableRelease.version)}</button>` : ''}</div>
          <p class="fh-pad" role="status">${h(updateMessage || '更新下载完成后，下次刷新生效。使用本地测试版时，需切回 Git 版才能运行下载的版本。')}</p>
          ${notes.map(note => `<section class="fh-card fh-mt"><div class="fh-card-head"><h3>v${h(note.version)}</h3><p>${h(note.date || '')}</p></div><ul>${note.changes.map(change => `<li>${h(change)}</li>`).join('')}</ul></section>`).join('')}`);
    }
    async function checkScriptUpdate(download = false) {
        if (updateBusy) return;
        updateBusy = true;
        updateMessage = download ? '正在下载更新…' : '正在检查更新…';
        renderUpdates();
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
                localStorage.setItem('fruit-heart-released-script-v1', JSON.stringify({ version: release.version, sha256, code }));
                updateMessage = `v${release.version} 已下载。刷新页面后，Git 版将运行新版。`;
            }
        } catch (error) {
            updateMessage = `${error.message || '更新失败'}。当前脚本仍可继续使用。`;
        } finally {
            updateBusy = false;
            if (currentView === 'updates') renderUpdates();
        }
    }
