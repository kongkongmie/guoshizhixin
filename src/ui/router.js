    function render(view = currentView) {
        const changedView = view !== currentView;
        currentView = view;
        syncNav();
        if (view === 'overview') renderOverview();
        else if (view === 'qr') renderQr();
        else if (view === 'entries') renderEntries();
        else if (view === 'updates') renderUpdates();
        else if (view === 'settings') renderSettings();
        if (changedView) main.scrollTop(0);
        renderedFingerprint = presetFingerprint();
    }

    // 首页「合并大总结 / 隐藏楼层 / 取消隐藏」传的是大类名字，QR 页传的是 id。
    // 以前只按 id 找，首页三颗按钮一点就报「这个大类已经不在了」。两种都认。
