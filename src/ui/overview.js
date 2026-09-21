    function bilingualPrompt(preset, config) {
        return activePrompts(preset).find(prompt => !isDivider(prompt) && /双语/.test(String(prompt.name || ''))) || null;
    }
    function switchRow(key, label, prompt, extra = '') {
        const on = isOn(prompt);
        return `<div class="fh-row"><span class="fh-k">${h(label)}</span><div class="fh-v">`
            + (prompt ? `<button class="fh-sw ${on ? 'on' : ''}" data-master="${h(key)}" role="switch" aria-checked="${on}" aria-label="${h(label)}"></button>` : '<span class="fh-dim">未找到对应条目</span>')
            + extra + '</div></div>';
    }
    function groupSelect(group, config, preset, cls = '', prefix = '') {
        return selectFrom(activePrompts(preset).filter(prompt => exclusiveFamily(prompt, config) === group), group, prefix, cls);
    }
    // 不用原生 <select> 了：它的弹层是系统画的，样式一点改不了（她说「下拉框还是很丑」，
    // 那个深色系统菜单确实丑），而且排版极贵 —— 六个下拉五十多个 option，光布局 260ms。
    // 换成自己的选择面板：手机上从底部升起，宽屏上居中，样式跟着皮肤走。
    function selectFrom(items, group, prefix = '', cls = '') {
        if (!items.length) return '';
        const active = items.filter(prompt => prompt.enabled);
        const label = active.length > 1 ? `多项已开（${active.length}）`
            : active.length === 1 ? prefix + plainName(active[0].name) : prefix + '全部关闭';
        return `<button class="fh-sel ${active.length === 1 ? 'on' : ''} ${cls}" data-pick-group="${h(group)}"`
            + ` data-prefix="${h(prefix)}" aria-label="${h(group)}">${h(label)}<i>▾</i></button>`;
    }
    let sheetOpen = false;
    function closePicker() { root.find('.fh-sheet').remove(); sheetOpen = false; }
    function openPicker(title, items, onPick) {
        closePicker();
        const box = jq(`<div class="fh-sheet"><div class="fh-sheet-bg" data-sheet-close></div>
          <div class="fh-sheet-box"><div class="fh-sheet-head">${h(title)}</div>
          <div class="fh-sheet-list">${items.map((item, index) => `<button class="fh-sheet-item ${item.on ? 'on' : ''}" data-pick-index="${index}">
            <span>${h(item.label)}</span>${item.note ? `<em>${h(item.note)}</em>` : ''}<i>✓</i></button>`).join('')}</div>
          <button class="fh-sheet-cancel" data-sheet-close>取消</button></div></div>`).appendTo(root.find('.fh-shell'));
        sheetOpen = true;
        box.on('click', '[data-sheet-close]', closePicker);
        box.on('click', '[data-pick-index]', function () {
            const item = items[Number(this.dataset.pickIndex)];
            closePicker();
            onPick(item.value);
        });
        const first = box.find('.fh-sheet-item.on')[0] || box.find('.fh-sheet-item')[0];
        if (first) first.scrollIntoView({ block: 'nearest' });
    }
    function structureLine(preset, config) {
        const fm = findByContent(preset, c => /structure_sample/i.test(c));
        if (!fm || !fm.enabled) return '输出结构条目未开启';
        const names = { '标题': '标题', 'prologue': '序言', 'status_1': '顶栏', 'content': '正文', 'status_2': '底栏', 'status_3': '状态', 'update_variable': '变量', 'tableEdit': '表格', 'meow_FM': '摘要', 'char_date': '角色表', 'branches': '选项', 'snow': '小剧场', '文生图': '生图', 'online': '线上' };
        const live = new Set();
        for (const prompt of activePrompts(preset)) {
            if (!prompt.enabled) continue;
            for (const m of String(prompt.content || '').matchAll(/\{\{setvar::([^:}]+)::([\s\S]*?)\}\}/g)) if (m[2].trim()) live.add(m[1].trim());
        }
        const parts = ['ECoT'];
        for (const m of String(fm.content).matchAll(/\{\{getvar::([^:}]+?)\s*\}\}/g)) {
            const key = m[1].trim();
            if (names[key] && live.has(key)) parts.push(names[key]);
        }
        return parts.join(' → ');
    }
    function outSection(items, data, id) {
        return items.filter(p => sectionOf(p, data) === id && !isDivider(p) && !/^📌/.test(p.name));
    }
    // 区名是会改的：她把「🔞 亲密」改名成「🔞 NSFW」之后，首页那张卡立刻变成 0 / 0。
    // 但每个大区的 emoji 是独有的（她自己定的规矩），所以名字和 emoji 两条都认，改名不至于把卡打空。
    const SECTION_KEYS = {
        theatre: /剧场|🎭/,
        nsfw: /亲密|NSFW|🔞/i,
        out: /输出|🍏/,
        tail: /尾部|尾巴|🔌/,
    };
    function sectionIdOf(data, test) { return data.groups.find(group => test.test(group.name))?.id || ''; }
    let statsMemo = { key: '', value: null };
    function homeStats(preset, config) {
        const key = presetFingerprint();
        if (statsMemo.key === key && statsMemo.value) return statsMemo.value;
        const value = { structure: structureLine(preset, config) };
        statsMemo = { key, value };
        return value;
    }
    function countLink(list, id) {
        return `<button class="fh-more fh-n" data-goto-section="${h(id)}">${list.filter(p => p.enabled).length} / ${list.length} ›</button>`;
    }
    // 收起来的时候优先摆已开的 —— 不然一排全是关着的，等于没说
    function collapse(items, open, keep = 5) {
        if (open || items.length <= keep) return items;
        return [...items].sort((a, b) => (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0)).slice(0, keep);
    }
    function chipOf(prompt, extra = '') {
        return `<button class="fh-chip ${prompt.enabled ? 'on' : ''}" data-chip="${h(promptId(prompt))}">${h(plainName(prompt.name) + extra)}</button>`;
    }
    // 一张卡里既有单选组又有复选条目时，按条目本身的顺序排，单选组就地变成一个下拉
    function mixedChips(items, config, all) {
        const out = [];
        const done = new Set();
        for (const prompt of items) {
            const family = exclusiveFamily(prompt, config);
            if (!family) { out.push(chipOf(prompt)); continue; }
            if (done.has(family)) continue;
            done.add(family);
            out.push(selectFrom(all.filter(p => exclusiveFamily(p, config) === family), family, family + '：'));
        }
        return out.join('');
    }
    function renderOverview() {
        const preset = activePreset();
        const config = readConfig(preset);
        const all = activePrompts(preset);
        const data = sectionData(preset);
        const range = wordRange();
        const models = modelChoices(preset);
        const now = currentModel(config, models);
        const theatre = theatreMaster(preset), nsfw = nsfwMaster(preset);
        const showItems = theatreItems(preset, config);
        const theatreId = sectionIdOf(data, SECTION_KEYS.theatre), nsfwId = sectionIdOf(data, SECTION_KEYS.nsfw), outId = sectionIdOf(data, SECTION_KEYS.out);
        const nsfwItems = outSection(all, data, nsfwId);
        const outItems = outSection(all, data, outId);
        const bodyItems = outItems.filter(p => BODY_OUT.test(plainName(p.name)));
        const masters = new Set([theatre, nsfw].filter(Boolean).map(promptId));
        const restItems = outItems.filter(p => !BODY_OUT.test(plainName(p.name)) && !masters.has(promptId(p)));
        const stream = Boolean((preset.settings || {}).should_stream);
        const farmerAll = all.filter(p => exclusiveFamily(p, config) === '果农');
        const farmerNow = plainName((farmerAll.find(p => p.enabled) || {}).name || '') || '未选';
        const seg = WORD_PRESETS.map(([label, min, max]) => {
            const hit = String(range[0]) === String(min) && String(range[1]) === String(max);
            return `<button class="${hit ? 'on' : ''}" data-word-range="${min}:${max}" title="${min === max ? min : min + '-' + max} 字">${h(label)}</button>`;
        }).join('') + `<button data-action="word-custom" title="${h(range[0])}-${h(range[1])} 字">自定义</button>`;
        const fold = id => homeFolded(config, id);
        const head = (id, name, extra = '') => `<div class="fh-ch" data-fold="${id}"><i class="fh-dot"></i><b>${h(name)}</b>${extra}
            <i class="fh-fold">${fold(id) ? '▸' : '▾'}</i></div>`;
        const part = {};
        part.qr = `<div class="fh-grp" style="${cardVars('qr')}"><button class="fh-qr-entry" data-nav="qr"><span class="fh-qr-ico">⌘</span>
          <span class="fh-qr-copy"><strong>快捷指令 QR</strong><small>可自定义编辑，兼容酒馆原生 QR</small></span>
          <span class="fh-qr-go">›</span></button></div>`;
        part.common = `<div class="fh-lab">常用</div>
        <div class="fh-grp" style="${cardVars('common')}"><div class="fh-pad">
          <button class="fh-btn solid" data-qr="总结模式" data-qr-label="大总结——合并之前的大总结" title="大总结，并合并之前的大总结">合并大总结</button>
          <button class="fh-btn solid" data-qr="隐藏楼层" title="输入范围，例如 0-10">隐藏楼层</button>
          <button class="fh-btn solid" data-qr="取消隐藏" title="一般保留最近 5-10 楼">取消隐藏</button>
          <button class="fh-btn solid" data-qr="自动继续" title="直接发送「继续推进剧情」，不经过输入框">自动继续</button></div></div>`;
        const bi = bilingualPrompt(preset, config);
        part.turn = `<div class="fh-lab">常规设置</div>
        <div class="fh-grp" style="${cardVars('turn')}"><div class="fh-grid">
          <div class="fh-cell"><span class="fh-ck">流式传输</span><div class="fh-cv">
            <button class="fh-sw ${stream ? 'on' : ''}" data-master="stream" role="switch" aria-checked="${stream}" aria-label="流式传输"></button></div></div>
          <div class="fh-cell"><span class="fh-ck">自动双语</span><div class="fh-cv">${bi
            ? `<button class="fh-sw ${isOn(bi) ? 'on' : ''}" data-chip="${h(promptId(bi))}" role="switch" aria-checked="${isOn(bi)}" aria-label="自动双语"></button>`
            : '<span class="fh-dim">没找到双语条目</span>'}</div></div>
          <div class="fh-cell"><span class="fh-ck">抢话</span><div class="fh-cv">${groupSelect('抢话', config, preset)}</div></div>
          <div class="fh-cell"><span class="fh-ck">字数<em>${h(range[0])}-${h(range[1])}</em></span><div class="fh-cv"><span class="fh-seg">${seg}</span></div></div>
          <div class="fh-cell"><span class="fh-ck">视角</span><div class="fh-cv">${groupSelect('人称', config, preset)}</div></div>
          <div class="fh-cell"><span class="fh-ck">文风</span><div class="fh-cv">${groupSelect('文风', config, preset)}</div></div>
          <div class="fh-cell"><span class="fh-ck">模型</span><div class="fh-cv">${models.length
            ? `<button class="fh-sel ${now ? 'on' : ''}" data-pick-model aria-label="模型">${h(now ? now.label : '未选模型')}<i>▾</i></button>`
            : '<span class="fh-dim">条目名末尾写 # 模型名即可</span>'}</div></div>
          <div class="fh-cell"><span class="fh-ck">思考方式</span><div class="fh-cv">${groupSelect('COT', config, preset)}</div>
            ${cotNote(preset, config) ? `<span class="fh-hint">${h(cotNote(preset, config))}</span>` : ''}</div>
        </div></div>`;
        part.theatre = `<div class="fh-grp" style="${cardVars('theatre')}">
          ${head('theatre', '小剧场', `${countLink(showItems, theatreId)}${theatre
            ? `<button class="fh-sw ${isOn(theatre) ? 'on' : ''}" data-master="theatre" role="switch" aria-checked="${isOn(theatre)}" aria-label="小剧场总开关"></button>`
            : '<span class="fh-n">没找到总开关</span>'}`)}
          ${fold('theatre') ? '' : `<div class="fh-row"><span class="fh-k">主剧场</span><div class="fh-v">${groupSelect('主剧场', config, preset)}</div></div>
          <div class="fh-row"><span class="fh-k">随机</span><div class="fh-v"><span class="fh-seg">${[[0, '关'], [1, '1 个'], [2, '2 个']]
            .map(([n, label]) => `<button class="${(Number(config.theatreRandom) || 0) === n ? 'on' : ''}" data-theatre-random="${n}"`
              + ` title="${n ? '每回合从全部 💡 里随机开 ' + n + ' 个' : '不随机，按你勾选的来'}">${label}</button>`).join('')}</span></div></div>
          <div class="fh-pad"><div class="fh-chips">${collapse(showItems, theatreOpen).map(p => chipOf(p)).join('')}
            ${showItems.length > 5 ? `<button class="fh-more" data-action="toggle-theatre">素材 ${showItems.length} 项 ${theatreOpen ? '▾' : '›'}</button>` : ''}</div></div>`}
        </div>`;
        // 一颗三档代替原来的两颗开关：关闭 / 常开 / 自动。
        // 原来是「总开关」＋「自动判断」两颗，自动开着时还要把前一颗禁用 —— 两颗表达一件事，看着就乱。
        const nsfwMode = !nsfw ? '' : nsfwAutoEnabled ? 'auto' : (isOn(nsfw) ? 'on' : 'off');
        const NSFW_MODES = [['off', 'OFF', '关闭预设中的 NSFW 总开关'], ['on', 'ON', '打开预设中的 NSFW 总开关'],
            ['auto', '自动', '根据剧情是否处于 NSFW 场景自动开关']];
        // 世界书那两个开关在首页并成同一条三档：不干涉 / 蓝灯干涉 / 蓝绿灯都干涉
        const WB_MODES = [['none', '不干涉', '世界书条目原样发送'], ['blue', '蓝灯干涉', '自动控制 🔵 常驻条目是否发送'],
            ['green', '绿灯干涉', '🔵 和 🟢 都自动控制；NSFW 关闭时绿灯条目即使关键词命中也不发送']];
        const toSettings = '<a class="fh-link" data-nav="settings" role="button" tabindex="0">详情见设置页</a>。';
        part.nsfw = `<div class="fh-grp" style="${cardVars('nsfw')}">
          ${head('nsfw', 'NSFW', countLink(nsfwItems, nsfwId))}
          ${fold('nsfw') ? '' : `${nsfw ? `<div class="fh-row"><span class="fh-k">NSFW一键总控</span><div class="fh-v"><span class="fh-seg">${NSFW_MODES
              .map(([id, label, tip]) => `<button class="${nsfwMode === id ? 'on' : ''}" data-nsfw-mode="${id}" title="${h(tip)}">${label}</button>`).join('')}</span></div></div>
          <div class="fh-pad"><p class="fh-note">${nsfwMode === 'auto'
              ? '根据剧情是否处于 NSFW 场景自动开关，'
              : nsfwMode === 'on' ? '打开预设中的 NSFW 总开关，发送 NSFW 指导，'
              : '关闭预设中的 NSFW 总开关，不发送 NSFW 指导，'}${toSettings}</p></div>
          <div class="fh-row fh-stack"><span class="fh-k">是否控制 NSFW 相关的世界书条目</span><div class="fh-v"><span class="fh-seg">${WB_MODES
              .map(([id, label, tip]) => `<button class="${wbMode() === id ? 'on' : ''}" data-wb-mode="${id}" title="${h(tip)}" ${wbAvailable() ? '' : 'disabled'}>${label}</button>`).join('')}</span></div></div>`
            : '<div class="fh-pad"><p class="fh-note">无法连接到预设中的 NSFW 总开关条目。</p></div>'}
          <div class="fh-pad"><div class="fh-chips">${collapse(nsfwItems, nsfwOpen).map(p => chipOf(p)).join('')}
            ${nsfwItems.length > 5 ? `<button class="fh-more" data-action="toggle-nsfw">细项 ${nsfwItems.length} 项 ${nsfwOpen ? '▾' : '›'}</button>` : ''}</div></div>`}
        </div>`;
        part.body = `<div class="fh-grp" style="${cardVars('body')}">
          ${head('body', '正文', countLink(bodyItems, outId))}
          ${fold('body') ? '' : `<div class="fh-pad"><div class="fh-chips">${bodyItems.map(p => chipOf(p)).join('')}</div></div>`}
        </div>`;
        part.rest = `<div class="fh-grp" style="${cardVars('rest')}">
          ${head('rest', '非正文', countLink(restItems, outId))}
          ${fold('rest') ? '' : `<div class="fh-pad"><div class="fh-chips">${mixedChips(restItems, config, all)}</div></div>`}
        </div>`;
        part.farmer = `<div class="fh-grp" style="${cardVars('farmer')}">
          ${head('farmer', '果农人格', `<span class="fh-n">${h(farmerNow)}</span>`)}
          ${fold('farmer') ? '' : `<div class="fh-pad">${groupSelect('果农', config, preset, 'wide')}</div>`}
        </div>`;
        main.html(`${homeOrder(config).map(id => part[id] || '').join('')}
        <div class="fh-foot" data-stat="structure">计算中…</div>`);
        // 这行要扫全部正文，放到下一帧算，先让面板显示出来
        hostWindow.requestAnimationFrame(() => {
            if (currentView !== 'overview' || !root.hasClass('open')) return;
            try { root.find('[data-stat=structure]').text(homeStats(activePreset(), readConfig()).structure); } catch {}
        });
    }
