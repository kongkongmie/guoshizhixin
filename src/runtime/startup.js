    hostWindow.__FRUIT_HEART_MAIN__ = { open, destroy };
    bindNsfwAuto();
    bindEntry();
    bindPresetChangeEvents();
    try { ecotEndTags(); } catch {}
    window.addEventListener('pagehide', destroyOnPageHide, { once: true });
    window.addEventListener('unload', destroyOnPageHide, { once: true });
    const modelLinkTimer = setInterval(syncConnectedModel, 1000);
    void syncConnectedModel();
    const entrySweepTimer = setInterval(() => { if (!doc.hidden) { refreshEntryBinding(); sweepBarEntry(); ensureWandEntry(); } }, 2500);   // 关着要藏，开着要补入口，两种情况都得扫
    scheduleUpdateCheck();
