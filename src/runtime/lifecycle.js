    function destroy() {
        if (destroyed) return;
        destroyed = true;
        stopListeners(helperEventStops);
        stopListeners(buttonEventStops);
        updateAbortController?.abort();
        window.removeEventListener('pagehide', destroyOnPageHide);
        window.removeEventListener('unload', destroyOnPageHide);
        modelLinkDestroyed = true;
        if (hostWindow.__FRUIT_HEART_MAIN__?.destroy === destroy) delete hostWindow.__FRUIT_HEART_MAIN__;
        nsfwAutoEnabled = false;   // 事件解绑不了，就让回调自己空转
        clearEntryArtifacts();
        clearInterval(modelLinkTimer);
        clearInterval(entrySweepTimer);
        hostWindow.visualViewport?.removeEventListener('resize', syncViewport);
        hostWindow.visualViewport?.removeEventListener('scroll', syncViewport);
        hostWindow.removeEventListener('resize', syncViewport);
        clearTimeout(searchTimer); clearTimeout(updateCheckTimer); clearInterval(syncTimer); jq(doc).off(`keydown${KEY_EVENT_NS}`); jq(hostWindow).off(`resize${BALL_EVENT_NS}`); root.remove(); style.remove();
    }
    function destroyOnPageHide() { destroy(); }
