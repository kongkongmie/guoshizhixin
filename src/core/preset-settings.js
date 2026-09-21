    // ═══ 跟着预设走的设置 ═══
    // 自动化（NSFW 自动 / 世界书三档 / 插头模型跟随）：存进 🔧 控制配置。
    //   导出预设时一起带走，换设备也跟着；切到另一份预设就换成那份自己的。
    // 面板外观（日夜 / 皮肤 / 字体 / 入口 / 猫的大小 / 楼层跳转）：预设里存的是「开局默认」。
    //   这台设备上没选过的才用它；选过的记在本机，作者下次更新预设也冲不掉。
    // 老版本把这些存在浏览器里。预设里读不到时，先接本机的旧值，并在启动时补写进预设一次。
    const PANEL_KEYS = {
        theme: themeKey, skin: skinKey, font: fontKey, ballSize: ballSizeKey,
        entryBar: 'fruit-heart-entry-bar', entryBall: 'fruit-heart-entry-ball', jumpNav: 'fruit-heart-jump-nav',
    };
    const PANEL_VALID = {
        theme: value => ['system', 'day', 'night'].includes(value),
        skin: value => SKINS.some(item => item[0] === value),
        font: value => FONTS.some(item => item.id === value),
        ballSize: value => BALL_SIZES.some(item => item[0] === value),
        entryBar: value => typeof value === 'boolean',
        entryBall: value => typeof value === 'boolean',
        jumpNav: value => typeof value === 'boolean',
    };
    const WB_MODE_SET = new Set(['none', 'blue', 'green']);
    function localHas(key) { try { return hostWindow.localStorage.getItem(key) !== null; } catch { return false; } }

    // 启动时、切预设后各跑一次。返回需要补写进预设的旧值（没有就是空对象）。
    function loadPresetSettings() {
        let config;
        try { config = readConfig(); } catch { return {}; }   // 没有控制配置的预设：全用默认，不写
        const migrate = {};
        const auto = config.nsfwAuto || {};

        if (typeof auto.enabled === 'boolean') nsfwAutoEnabled = auto.enabled;
        else { nsfwAutoEnabled = readFlag(nsfwAutoKey(), false); if (localHas(nsfwAutoKey())) migrate.enabled = nsfwAutoEnabled; }

        if (WB_MODE_SET.has(auto.worldbook)) { wbEnabled = auto.worldbook !== 'none'; wbGreen = auto.worldbook === 'green'; }
        else {
            wbEnabled = readFlag(WB_ENABLED_KEY, false);
            wbGreen = wbEnabled && readFlag(WB_GREEN_KEY, false);
            if (localHas(WB_ENABLED_KEY)) migrate.worldbook = wbMode();
        }

        if (typeof config.modelLink === 'boolean') modelLinkEnabled = config.modelLink;
        else { modelLinkEnabled = readFlag(modelLinkKey, true); if (localHas(modelLinkKey)) migrate.modelLink = modelLinkEnabled; }

        const panel = config.panelDefaults || {};
        const take = (key, apply) => { if (!localHas(PANEL_KEYS[key]) && PANEL_VALID[key](panel[key])) apply(panel[key]); };
        // 预设里还没有这一格、本机却选过：把本机的当成开局默认补进预设（作者第一次升级时发生）
        const current = { theme, skin, font, ballSize, entryBar, entryBall, jumpNav };
        for (const key of Object.keys(PANEL_KEYS)) {
            if (!(key in panel) && localHas(PANEL_KEYS[key])) (migrate.panel ||= {})[key] = current[key];
        }
        take('theme', value => { theme = value; });
        take('skin', value => { skin = value; });
        take('font', value => { font = value; });
        take('ballSize', value => { ballSize = value; });
        take('entryBar', value => { entryBar = value; });
        take('entryBall', value => { entryBall = value; });
        take('jumpNav', value => { jumpNav = value; });
        return migrate;
    }

    async function savePresetSetting(mutate) {
        try {
            await updateBoth(preset => { const config = readConfig(preset); mutate(config); writeConfig(preset, config); return preset; });
        } catch (error) {
            console.warn('[果实之心] 设置未能写入预设', error);
            toast('error', '设置没能写进预设：' + (error.message || '写入失败'));
        }
    }
    // 只动自己那一格，不整体替换 nsfwAuto —— 词表也存在同一个对象里
    function saveNsfwAutoEnabled() { return savePresetSetting(config => { config.nsfwAuto = { ...(config.nsfwAuto || {}), enabled: nsfwAutoEnabled }; }); }
    function saveWorldbookMode() { return savePresetSetting(config => { config.nsfwAuto = { ...(config.nsfwAuto || {}), worldbook: wbMode() }; }); }
    function saveModelLink() { return savePresetSetting(config => { config.modelLink = modelLinkEnabled; }); }
    // 面板外观：本机记一份（你自己的），预设里也记一份（导出后别人的开局默认）
    function savePanelSetting(key, value) {
        try { hostWindow.localStorage.setItem(PANEL_KEYS[key], String(value)); } catch { /* 无痕模式 */ }
        return savePresetSetting(config => { config.panelDefaults = { ...(config.panelDefaults || {}), [key]: value }; });
    }

    // 切预设后：读新预设的设置，把跟着变的东西都刷一遍
    function applyPresetSettings() {
        const migrate = loadPresetSettings();
        if (nsfwAutoEnabled) bindNsfwAuto();
        if (wbEnabled) bindWorldbookFilter();
        nsfwResetScope();
        wbInvalidate();
        applyTheme();
        applyBallSize();
        refreshNsfwIndicator();
        if (Object.keys(migrate).length) {
            void savePresetSetting(config => {
                const auto = { ...(config.nsfwAuto || {}) };
                if ('enabled' in migrate) auto.enabled = migrate.enabled;
                if ('worldbook' in migrate) auto.worldbook = migrate.worldbook;
                config.nsfwAuto = auto;
                if ('modelLink' in migrate) config.modelLink = migrate.modelLink;
                if (migrate.panel) config.panelDefaults = { ...migrate.panel, ...(config.panelDefaults || {}) };
            });
        }
    }
