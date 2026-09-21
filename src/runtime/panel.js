    let returnFocus = null;
    function close() { void flushNsfwRules(); clearInterval(syncTimer); syncTimer = null; closePicker(); if (root[0].contains(doc.activeElement)) doc.activeElement.blur(); root.removeClass('open'); if (returnFocus?.isConnected && !returnFocus.matches('input,textarea,[contenteditable]')) returnFocus.focus({ preventScroll:true }); }
    // 指纹只取 id / 名称 / 开关 —— 不含正文。原来每 0.7 秒序列化 0.4 MB，手机会发热。
    function presetFingerprint() {
        const preset = activePreset();
        let hash = 0;
        const feed = text => { for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0; };
        feed(loadedName()); feed(detectModelText() || ''); feed(String(ecotStatus()));
        for (const prompt of preset.prompts) { feed(promptId(prompt)); feed(prompt.name || ''); feed(prompt.enabled ? '1' : '0'); }
        feed(JSON.stringify(preset.settings || {}));
        return String(hash);
    }
    function refreshFromPreset() {
        if (!entryBar) sweepBarEntry();   // 酒馆换聊天会重建 QR 栏，藏过的按钮会再冒出来
        if (destroyed || !root.hasClass('open') || busy || doc.hidden || sheetOpen) return;
        if (root[0].contains(doc.activeElement) && doc.activeElement.matches('input,select,textarea')) return;
        try {
            if (presetFingerprint() === renderedFingerprint) return;
            const scroll = main.scrollTop();
            render(currentView);
            main.scrollTop(scroll);
        } catch (error) {
            close(); toast('info', '当前预设已改变，请重新打开控制台');
        }
    }
    function open() {
        if (destroyed) return;
        if (!root.hasClass('open')) returnFocus = doc.activeElement;
        if (doc.activeElement?.matches('input,textarea,[contenteditable]')) doc.activeElement.blur();
        syncViewport(); render('overview'); main.scrollTop(0); applyTheme(); root.addClass('open'); root.find('.fh-close')[0].focus({ preventScroll:true });
        clearInterval(syncTimer); syncTimer = setInterval(refreshFromPreset, 2000);
        // 补新增的 QR 按钮。放在开面板时做，一辈子就写一次；失败也只是这次没补上，不挡开面板。
        upgradeQr().then(() => { if (root.hasClass('open') && currentView === 'qr') renderQr(); })
            .catch(error => console.error('[果实之心] QR 升级', error));
    }
    jq(doc).on(`keydown${KEY_EVENT_NS}`, event => {
        if (!root.hasClass('open')) return;
        if (event.key === 'Escape') { event.stopPropagation(); if (sheetOpen) return closePicker(); close(); }
        if (event.key !== 'Tab') return;
        const items = root.find('button:visible:not(:disabled),input:visible:not(:disabled),select:visible:not(:disabled),textarea:visible:not(:disabled),summary:visible,a[href]:visible,[tabindex]:visible:not([tabindex="-1"])').toArray();
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last?.focus({ preventScroll:true }); }
        else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first?.focus({ preventScroll:true }); }
    });
