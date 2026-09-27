    // 总开关也可能是在酒馆条目列表里直接点的 —— 发送前再对齐一次「随NSFW」条目
    async function syncNsfwFollowers() {
        if (busy) return;
        const preset = activePreset();
        const master = nsfwMaster(preset);
        if (!master || !configPrompt(preset)) return;
        const on = isOn(master);
        // 总开关也可能是在酒馆条目列表里直接点的：发送时顺手对齐入口小红点
        if (nsfwLit !== on) paintNsfwIndicator(on);
        const followers = activePrompts(preset).filter(isNsfwFollower);
        if (!followers.length) return;
        // 总开关开着时不管跟随条目的开关 —— 你可以自己关花样骰子；只把「总开关关掉时替你关的」恢复回来
        const held = readConfig(preset).nsfwFollowHeld;
        const need = on
            ? Array.isArray(held) && held.length > 0 && followers.some(prompt => !isOn(prompt) && held.includes(promptId(prompt)))
            : followers.some(isOn);
        if (!need) return;
        await updateBoth(target => {
            const config = readConfig(target);
            captureManualChanges(target, config);
            holdNsfwFollowers(config, target.prompts || [], on);
            captureManualChanges(target, config);
            rememberAppliedStates(target, config);
            writeConfig(target, config);
            return target;
        });
    }
    let followBound = false;
    function bindNsfwFollow() {
        if (followBound) return;
        const on = resolveFunction('eventOn');
        const events = hostWindow.tavern_events || window.tavern_events;
        if (!on || !events) return;
        followBound = true;
        const run = () => syncNsfwFollowers().catch(error => console.warn('[果实之心] 随NSFW 条目未能对齐', error));
        if (events.MESSAGE_SENT) listenHelper(on, events.MESSAGE_SENT, run);
        if (events.GENERATION_AFTER_COMMANDS) listenHelper(on, events.GENERATION_AFTER_COMMANDS, (type, _option, dryRun) => {
            if (dryRun || type === 'quiet' || type === 'impersonate') return;
            return run();
        });
    }
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
