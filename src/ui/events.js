    root.on('input change', '.fh-nsfw-auto input,.fh-nsfw-auto textarea', captureNsfwAutoDraft);
    root.on('click', '[data-nav]', function () {
        render(this.dataset.nav);
    });
    root.on('click', '[data-action]', function (event) {
        if (this.matches('input')) return;
        event.preventDefault();
        const action = this.dataset.action;
        if (action === 'nsfw-default-words') { root.find('#fh-nsfw-auto-words').val(nsfwKeywords(String(root.find('#fh-nsfw-auto-words').val() || '') + ',' + NSFW_DEFAULT_WORDS).join(', ')); captureNsfwAutoDraft(); return; }
        if (action === 'save-nsfw-auto') return saveNsfwAuto();
        if (action === 'toggle-model-link') {
            modelLinkEnabled = !modelLinkEnabled;
            try { hostWindow.localStorage.setItem(modelLinkKey, String(modelLinkEnabled)); } catch {}
            modelLinkSignature = ''; pendingModelSignature = '';
            renderSettings();
            return;
        }
        if (action === 'open-updates') { open(); render('updates'); return; }
        if (action === 'check-update') return checkScriptUpdate();
        if (action === 'download-update') return checkScriptUpdate(true);
        if (action === 'close') return close();
        if (action === 'fullscreen') {
            const full = !root.hasClass('fh-is-fullscreen');
            root.toggleClass('fh-is-fullscreen', full);
            root.find('.fh-fullscreen').attr('aria-pressed', String(full)).attr('aria-label', full ? '退出面板全屏' : '面板全屏');
            syncViewport(); return;
        }
        if (action === 'clear-panel-cache') {
            if (!hostWindow.confirm('清理果实之心的显示偏好和悬浮球位置？不会删除预设、聊天、方案或思维链设置。')) return;
            try {
                for (const key of [themeKey, skinKey, fontKey, ballSizeKey, 'fruit-heart-ball-pos']) hostWindow.localStorage.removeItem(key);
            } catch (error) { toast('error', '浏览器未允许清理本地显示缓存'); return; }
            familyCache.clear(); renderedFingerprint = '';
            theme = 'system'; skin = 'paper'; font = 'skin'; ballSize = 'm';
            applyTheme(); bindEntry(); renderSettings(); syncViewport();
            toast('success', '面板缓存已清理，预设和聊天未改动'); return;
        }
        if (action === 'theme') { theme = resolvedTheme() === 'night' ? 'day' : 'night'; hostWindow.localStorage.setItem(themeKey, theme); applyTheme(); return; }
        if (action === 'toggle-nsfw') { nsfwOpen = !nsfwOpen; return renderOverview(); }
        if (action === 'toggle-theatre') { theatreOpen = !theatreOpen; return renderOverview(); }
        if (action === 'word-custom') {
            const now = wordRange();
            const input = hostWindow.prompt('正文字数范围（例如 2200-2500）', `${now[0]}-${now[1]}`);
            if (!input) return;
            const parts = String(input).match(/(\d+)\D+(\d+)/) || String(input).match(/(\d+)/);
            if (!parts) return toast('error', '没看懂这个范围');
            const min = Number(parts[1]), max = Number(parts[2] || parts[1]);
            return guarded(async () => { await applyWordRange(min, max); renderOverview(); });
        }
        if (action === 'restore-params') return guarded(async () => { await restoreParams(); renderSettings(); });
        if (action === 'sections-sort') { sortSections = !sortSections; return renderEntries(); }
        if (action === 'qr-edit') { qrEdit = !qrEdit; qrTag = null; qrCardEdit = ''; if (!qrEdit) return saveQrName(); return renderQr(); }
        if (action === 'qr-tag-cancel') { qrTag = null; return renderQr(); }
        if (action === 'qr-card-cancel') { qrCardEdit = ''; return renderQr(); }
        if (action === 'qr-tag-save' || action === 'qr-tag-delete') {
            const state = qrTag;
            if (!state) return;
            const remove = action === 'qr-tag-delete';
            const label = String(root.find('[data-qr-name]').val() || '').trim();
            const text = String(root.find('[data-qr-text]').val() || '').trim();
            const hint = String(root.find('[data-qr-hint]').val() || '').trim();
            if (remove && !hostWindow.confirm(`删掉「${state.label || label}」？`)) return;
            if (!remove && !label) return toast('error', '先给它起个标签名');
            if (!remove && !text) return toast('error', '还没写要做什么');
            return guarded(async () => {
                await writeQr(set => {
                    const card = set.cards.find(x => x.id === state.card);
                    if (!card) throw new Error('这个大类已经不在了');
                    if (!qrLabels(card.message).length) { card.message = text; return; }   // 无二级菜单的整条指令
                    if (remove) { card.message = dropBranch(card.message, state.label); return; }
                    const body = state.kind === 'raw' ? `\n${text}\n` : makeBody(text, hint);
                    if (!state.exists) { card.message = addBranch(card.message, label, body); return; }
                    let next = saveBranch(card.message, state.label, body);
                    if (label !== state.label) next = renameBranch(next, state.label, label);
                    card.message = next;
                });
                qrTag = null;
                toast('success', remove ? '已删掉' : `「${label}」已保存`);
                renderQr();
            });
        }
        if (action === 'qr-card-save' || action === 'qr-card-delete') {
            const id = qrCardEdit;
            const remove = action === 'qr-card-delete';
            const label = String(root.find('[data-card-label]').val() || '').trim();
            const title = String(root.find('[data-card-title]').val() || '').trim();
            const descBox = root.find('[data-card-desc]')[0];
            const desc = descBox ? String(descBox.value || '').trim() : null;
            if (remove && !hostWindow.confirm('整个大类连同里面的标签一起删掉？')) return;
            if (!remove && !label) return toast('error', '大类得有个名字');
            return guarded(async () => {
                await writeQr(set => {
                    if (remove) { set.cards = set.cards.filter(x => x.id !== id); return; }
                    const card = set.cards.find(x => x.id === id);
                    if (!card) return;
                    card.label = label; card.title = title;
                    if (desc !== null) card.message = writeDesc(card.message, desc);
                });
                qrCardEdit = '';
                toast('success', remove ? '已删掉' : '已保存');
                renderQr();
            });
        }
        if (action === 'qr-card-new') {
            const label = String(hostWindow.prompt('新大类叫什么？', '我的指令') || '').trim();
            if (!label) return;
            return guarded(async () => {
                await writeQr(set => {
                    if (set.cards.some(x => x.label === label)) throw new Error('已经有同名大类了');
                    set.cards.push({ id: 'qr-new-' + Date.now().toString(36), label, title: '', message: NEW_CARD_BODY(label) });
                });
                renderQr();
            });
        }
        if (action === 'qr-reset') {
            if (!hostWindow.confirm('恢复出厂的 QR 集？你改过的、加过的全没了。')) return;
            return guarded(async () => { await writeQr(() => qrSeed()); toast('success', '已恢复出厂'); renderQr(); });
        }
        if (action === 'qr-export') {
            const set = qrSet(readConfig());
            const stamp = new Date();
            const day = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}`;
            const shipped = { ...set, name: `${set.name}-${day}-BY果实之心` };
            const text = JSON.stringify(qrExport(shipped), null, 2);
            const link = doc.createElement('a');
            link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
            link.download = `${shipped.name.replace(/[\\/:*?"<>|]/g, '')}.json`;
            doc.body.appendChild(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(link.href), 2000);
            return toast('success', '导出好了，酒馆的快速回复里直接导入这个文件就能用');
        }
        if (action === 'qr-import') {
            const picker = doc.createElement('input');
            picker.type = 'file'; picker.accept = '.json,application/json';
            picker.onchange = () => {
                const file = picker.files && picker.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => guarded(async () => {
                    const next = qrImport(String(reader.result));
                    if (!hostWindow.confirm(`导入「${next.name}」，${next.cards.length} 个大类？现在这套会被整个换掉。`)) return;
                    await writeQr(() => next);
                    qrTag = null; qrCardEdit = '';
                    toast('success', `已导入 ${next.cards.length} 个大类`);
                    renderQr();
                });
                reader.readAsText(file);
            };
            picker.click();
            return;
        }
        if (action === 'sections-sync') {
            return guarded(async () => {
                let summary = '';
                await updateBoth(preset => {
                    const plan = applySectionPlan(preset);
                    summary = [plan.adds.length ? `新条目 ${plan.adds.length} 条` : '', plan.moves.length ? `挪区 ${plan.moves.length} 条` : '', plan.newHeads.length ? `新区 ${plan.newHeads.length} 个` : ''].filter(Boolean).join('，');
                    return preset;
                });
                toast('success', summary ? '已同步：' + summary : '没有要同步的');
                renderSettings();
            });
        }
        if (action === 'sections-all' || action === 'sections-none') {
            const all = action === 'sections-all';
            return guarded(async () => {
                await updateBoth(preset => {
                    const config = readConfig(preset);
                    config.hiddenSections = all ? [] : sectionData(preset).groups.map(g => g.id);
                    writeConfig(preset, config); return preset;
                });
                renderSettings();
            });
        }
        if (action === 'kill-script') {
            if (!hostWindow.confirm('彻底关闭果实之心？\n\n面板入口会全部消失。要恢复的话，需要到酒馆助手里把「🍎 果实之心-主面板」这个脚本重新启用一次。')) return;
            try { hostWindow.localStorage.setItem('fruit-heart-disabled', 'true'); } catch {}
            toast('info', '果实之心已关闭');
            return destroy();
        }
        if (action === 'profile-save') {
            const name = hostWindow.prompt('方案名称', readConfig().activeProfile || '我的组合');
            if (!name) return;
            return guarded(async () => { await saveProfile(name.trim()); renderSettings(); });
        }
        if (action === 'profile-delete') return guarded(async () => { await deleteProfile(); renderSettings(); });
        if (action === 'profile-export') {
            const config = readConfig();
            const name = config.activeProfile;
            if (!name || !config.profiles?.[name]) return toast('error', '先保存一个方案');
            hostWindow.prompt('复制这段文本发给别人', JSON.stringify({ fruitHeartProfile: name, states: config.profiles[name] }));
            return;
        }
        if (action === 'profile-import') {
            const raw = hostWindow.prompt('粘贴方案文本');
            if (!raw) return;
            return guarded(async () => { await importProfile(raw); renderSettings(); });
        }
        if (action === 'save-word-count') return guarded(async () => { await saveWordCount(); renderSettings(); });
        if (action === 'reset-prompt-states') {
            if (!hostWindow.confirm('确定把全部条目开关恢复到初始状态吗？')) return;
            return guarded(async () => { await resetPromptStates(); render('settings'); });
        }
        if (action === 'ecot-apply') return guarded(async () => { const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT; if (!api) throw new Error('ECoT 模块未就绪'); await api.applyFormatter(); toast('success', 'ECoT 已配置'); renderSettings(); });
        if (action === 'ecot-scan') return guarded(async () => { const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT; if (!api) throw new Error('ECoT 模块未就绪'); await api.rescan(); toast('success', '历史消息扫描完成'); });
        if (action === 'ecot-save-tags') return guarded(async () => { const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT; if (!api) throw new Error('ECoT 模块未就绪'); api.setEndTags(root.find('#fh-ecot-end-tags').val()); toast('success', '结束标签已保存'); renderSettings(); });
        if (action === 'ecot-reset-tags') return guarded(async () => { const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT; if (!api) throw new Error('ECoT 模块未就绪'); api.resetEndTags(); toast('success', '已恢复默认结束标签'); renderSettings(); });
    });
    root.on('click', '[data-model-tag]', function () { const tag = this.dataset.modelTag; guarded(async () => { await applyTag(tag); render(currentView); }); });
    root.on('click', '[data-tag-family]', function () { selectedTagFamily = this.dataset.tagFamily; render(currentView); });
    root.on('click', '[data-qr]', function () {
        const cardId = this.dataset.qr, label = this.dataset.qrLabel || '';
        if (!qrEdit) return guarded(() => runQr(cardId, label));
        // 编辑模式下点标签＝改它。认得出「写进输入框」那种写法就给友好表单，认不出就直接改原始指令。
        const card = findCard(qrSet(readConfig()), cardId);
        if (!card) return toast('error', '这个大类已经不在了');
        if (!label) { qrTag = { card: cardId, label: '', text: card.message, hint: '', kind: 'raw', exists: true }; return renderQr(); }
        const body = branchBody(card.message, label);
        const friendly = friendlyText(body);
        qrTag = friendly === null
            ? { card: cardId, label, text: body.trim(), hint: '', kind: 'raw', exists: true, raw: card.message }
            : { card: cardId, label, text: friendly, hint: askHint(body), kind: 'request', exists: true, raw: card.message };
        renderQr();
    });
    root.on('click', '[data-goto-section]', function () {
        const id = this.dataset.gotoSection;
        if (id) { forceSection = id; openSections.add(id); entryQuery = ''; entriesOnOnly = false; }
        render('entries');
    });
    // 这一栏只有正文里写了 {{输入}} 才有用（点标签时先弹个框问你一句）。
    // 之前不管写没写都摆在那儿，填了也不生效 —— 她的原话是「这一行没用」。
    root.on('input', '[data-qr-text]', function () {
        const box = root.find('[data-qr-hint]')[0];
        if (box) box.hidden = !ASK_MARK.test(this.value || '');
    });
    root.on('click', '[data-qr-add]', function () {
        const card = findCard(qrSet(readConfig()), this.dataset.qrAdd);
        qrTag = { card: this.dataset.qrAdd, label: '', text: '', hint: '', kind: 'request', exists: false, raw: card ? card.message : '' };
        renderQr();
    });
    root.on('click', '[data-card-edit]', function () {
        qrCardEdit = qrCardEdit === this.dataset.cardEdit ? '' : this.dataset.cardEdit;
        renderQr();
    });
    root.on('click', '[data-section]', function () {
        const id = this.dataset.section;
        if (openSections.has(id)) openSections.delete(id); else openSections.add(id);
        renderEntries();
    });
    root.on('click', '[data-master]', function () {
        const key = this.dataset.master;
        guarded(async () => { await toggleMaster(key); renderOverview(); });
    });
    root.on('click', '[data-theatre-random]', function () {
        const want = Number(this.dataset.theatreRandom) || 0;
        guarded(async () => {
            await updateBoth(preset => { const config = readConfig(preset); config.theatreRandom = want; writeConfig(preset, config); return preset; });
            if (want) await rollTheatre();     // 选完立刻抽一次，不用等下回合才看到效果
            renderOverview();
            toast('success', want ? `小剧场：每回合随机 ${want} 个` : '小剧场：不随机');
        });
    });
    root.on('click', '[data-chip]', function () {
        const id = this.dataset.chip;
        guarded(async () => { await setPrompt(id, !this.classList.contains('on')); renderOverview(); });
    });
    root.on('change', '[data-model-select]', function () { const tag = this.value; guarded(async () => { await applyTag(tag); render(currentView); }); });
    root.on('click', '[data-profile]', function () { const name = this.dataset.profile; guarded(async () => { await applyProfile(name); renderSettings(); }); });
    root.on('click', '[data-pick-font]', function () {
        openPicker('字体', FONTS.map(item => ({ label: item.label, note: item.note, value: item.id, on: item.id === font })), id => {
            font = id;
            try { hostWindow.localStorage.setItem(fontKey, font); } catch { /* 无痕模式会抛，忽略 */ }
            applyFont(); renderSettings();
        });
    });
    root.on('click', '[data-ball-size]', function () {
        ballSize = this.dataset.ballSize;
        try { hostWindow.localStorage.setItem(ballSizeKey, ballSize); } catch { /* 无痕模式会抛 */ }
        applyBallSize();
        renderSettings();
    });
    root.on('click', '[data-skin-set]', function () {
        skin = this.dataset.skinSet;
        try { hostWindow.localStorage.setItem(skinKey, skin); } catch {}
        applyTheme(); renderSettings();
    });
    root.on('click', '[data-theme-set]', function () { theme = this.dataset.themeSet; hostWindow.localStorage.setItem(themeKey, theme); applyTheme(); renderSettings(); });
    root.on('click', '[data-entry-toggle]', function () {
        const which = this.dataset.entryToggle;
        if (which === 'bar') { entryBar = !entryBar; hostWindow.localStorage.setItem('fruit-heart-entry-bar', String(entryBar)); }
        else if (which === 'jump') { jumpNav = !jumpNav; hostWindow.localStorage.setItem('fruit-heart-jump-nav', String(jumpNav)); }
        else { entryBall = !entryBall; hostWindow.localStorage.setItem('fruit-heart-entry-ball', String(entryBall)); }
        if (!entryBar && !entryBall && !jumpNav) toast('info', '快捷栏入口和悬浮猫咪都已关闭');
        bindEntry(); renderSettings();
    });
    root.on('click', '[data-section-show]', function () {
        const id = this.dataset.sectionShow;
        guarded(async () => {
            await updateBoth(preset => {
                const config = readConfig(preset);
                const set = new Set(config.hiddenSections || []);
                if (set.has(id)) set.delete(id); else set.add(id);
                config.hiddenSections = [...set];
                writeConfig(preset, config); return preset;
            });
            renderSettings();
        });
    });
    root.on('click', '[data-word-range]', function () { const [min, max] = this.dataset.wordRange.split(':').map(Number); guarded(async () => { await applyWordRange(min, max); renderOverview(); }); });
    root.on('click', '[data-home-open]', function (event) {
        event.stopPropagation();
        const id = this.dataset.homeOpen;
        guarded(async () => {
            await updateBoth(preset => {
                const config = readConfig(preset);
                config.homeOpen = { ...(config.homeOpen || {}) };
                config.homeOpen[id] = config.homeOpen[id] === false;
                writeConfig(preset, config); return preset;
            });
            delete folded[id];
            renderSettings();
        });
    });
    root.on('click', '[data-fold]', function (event) {
        if (event.target.closest('.fh-sw,.fh-more,[data-goto-section]')) return;
        const id = this.dataset.fold;
        folded[id] = !homeFolded(readConfig(), id);
        renderOverview();
    });
    root.on('click', '[data-pick-group]', function () {
        const group = this.dataset.pickGroup, prefix = this.dataset.prefix || '';
        const config = readConfig();
        const items = activePrompts(activePreset(), config).filter(prompt => exclusiveFamily(prompt, config) === group);
        const list = [{ value: '', label: '全部关闭', on: !items.some(prompt => prompt.enabled) }]
            .concat(items.map(prompt => ({ value: promptId(prompt), label: plainName(prompt.name),
                note: hintText(prompt.name), on: Boolean(prompt.enabled) })));
        openPicker(prefix ? prefix.replace(/[：:]\s*$/, '') : group, list,
            value => guarded(async () => { await setQuickGroup(group, value); render(); }));
    });
    root.on('click', '[data-pick-model]', function () {
        const config = readConfig(), models = modelChoices(), now = currentModel(config, models);
        openPicker('模型', models.map(item => ({ value: item.tag, label: item.label, on: Boolean(now && item.tag === now.tag) })),
            tag => guarded(async () => { await applyTag(tag); render(); }));
    });
    root.on('change', '[data-prompt-id]', function () { const element = this; guarded(async () => { const changed = await setPrompt(element.dataset.promptId, element.checked); if (!changed) element.checked = !element.checked; renderEntries(); }); });
    root.on('change', '[data-action="ecot-toggle"]', function () { const api = hostWindow.FruitHeartECoT || window.FruitHeartECoT; if (!api) return toast('error', 'ECoT 模块未就绪'); api.setEnabled(this.checked); if (this.checked) guarded(() => api.applyFormatter()); renderSettings(); });
    root.on('change', '[data-action="entries-on-only"]', function () { entriesOnOnly = this.checked; renderEntries(); });
    function filterSearch(element) {
        clearTimeout(searchTimer);
        const caret = element.selectionStart;
        entryQuery = element.value; renderEntries();
        const input = root.find('[data-entry-search]')[0];
        input.focus(); input.setSelectionRange(caret, caret);
    }
    root.on('input', '[data-entry-search]', function (event) {
        clearTimeout(searchTimer);
        if (event.originalEvent?.isComposing) return;
        const element = this;
        searchTimer = setTimeout(() => { if (element.isConnected) filterSearch(element); }, 180);
    });
    root.on('compositionend', '[data-entry-search]', function () { filterSearch(this); });
    root.on('keydown', '[data-entry-search]', function (event) { if (event.key === 'Enter' && !event.originalEvent?.isComposing) filterSearch(this); });
    root.on('click', '.fh-shell', event => event.stopPropagation());
    root.on('click', event => { if (!root.hasClass('fh-is-fullscreen') && event.target === root[0]) close(); });

