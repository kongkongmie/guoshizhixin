    hostWindow.__FRUIT_HEART_MAIN__ = { open, destroy };
    applyPresetSettings();      // 先读这份预设里存的设置（NSFW 自动、世界书、外观默认…），再装入口
    bindEntry();
    bindPresetChangeEvents();
    void wbClearLegacyLedger().catch(error => console.warn('[果实之心] 清理旧版世界书账本失败', error));
    try { ecotEndTags(); } catch {}
    window.addEventListener('pagehide', destroyOnPageHide, { once: true });
    window.addEventListener('unload', destroyOnPageHide, { once: true });
    const modelLinkTimer = setInterval(syncConnectedModel, 1000);
    void syncConnectedModel();
    const entrySweepTimer = setInterval(() => { if (!doc.hidden) { refreshEntryBinding(); sweepBarEntry(); ensureWandEntry(); } }, 2500);   // 关着要藏，开着要补入口，两种情况都得扫
    scheduleUpdateCheck();
