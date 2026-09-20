    let rollBound = false;
    function bindRoll() {
        if (rollBound) return;
        const on = resolveFunction('eventOn');
        const events = hostWindow.tavern_events || window.tavern_events;
        const name = events?.GENERATION_AFTER_COMMANDS;
        if (!on || !name) return;              // 酒馆助手版本太老就静默跳过，不影响别的功能
        rollBound = true;
        listenHelper(on, name, async (type, _option, dryRun) => {
            if (dryRun) return;
            if (type === 'quiet' || type === 'impersonate') return;   // 总结之类的后台生成不算一回合
            try {
                await rollTheatre();
                if (root.hasClass('open') && currentView === 'overview') renderOverview();
            } catch (error) { console.error('[果实之心] 随机小剧场', error); }
        });
    }
