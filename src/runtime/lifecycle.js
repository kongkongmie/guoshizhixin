    function destroy() {
        if (destroyed) return;
        destroyed = true;
        nsfwAutoController.destroy();
        stopListeners(nsfwAutoStops);
        stopListeners(helperEventStops);
        stopListeners(buttonEventStops);
        updateAbortController?.abort();
        window.removeEventListener('pagehide', destroyOnPageHide);
        window.removeEventListener('unload', destroyOnPageHide);
        modelLinkDestroyed = true;
        if (hostWindow.__FRUIT_HEART_MAIN__?.destroy === destroy) delete hostWindow.__FRUIT_HEART_MAIN__;
        clearEntryArtifacts();
        clearInterval(modelLinkTimer);
        clearInterval(entrySweepTimer);
        hostWindow.visualViewport?.removeEventListener('resize', syncViewport);
        hostWindow.visualViewport?.removeEventListener('scroll', syncViewport);
        hostWindow.removeEventListener('resize', syncViewport);
        clearTimeout(searchTimer); clearTimeout(updateCheckTimer); clearInterval(syncTimer); jq(doc).off(`keydown${KEY_EVENT_NS}`); jq(hostWindow).off(`resize${BALL_EVENT_NS}`); root.remove(); style.remove();
    }
    function destroyOnPageHide() { destroy(); }

