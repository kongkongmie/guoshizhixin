    function renderEntries() {
        const preset = activePreset();
        const config = readConfig(preset);
        const data = sectionData(preset);
        const prompts = activePrompts(preset, config).filter(prompt => !isDivider(prompt));
        const query = entryQuery.trim().toLowerCase();
        const match = prompt => (!query || String(prompt.name).toLowerCase().includes(query)) && (!entriesOnOnly || prompt.enabled);
        const rowOf = prompt => {
            const part = nameParts(prompt.name);
            return `<label class="fh-item ${prompt.enabled ? 'on' : ''}"><span class="fh-item-name">${h(part.title.replace(LEAD_EMOJI, ''))}</span>`
                + `<span class="fh-item-meta">${sourceBadge(prompt)}${part.group ? `<i class="fh-g">${h(part.group)}</i>` : ''}${part.hints.map(x => `<i>${h(x)}</i>`).join('')}</span>`
                + `<input class="fh-hidden-check" type="checkbox" data-prompt-id="${h(promptId(prompt))}" ${prompt.enabled ? 'checked' : ''}><span class="fh-tick">✓</span></label>`;
        };
        const hidden = new Set(config.hiddenSections || []);
        const groups = orderedGroups(data, config).filter(group => !hidden.has(group.id) || group.id === forceSection);
        let body;
        if (sortSections) {
            body = `<div class="fh-sortlist">${groups.map(group => {
                const items = prompts.filter(prompt => sectionOf(prompt, data) === group.id);
                return `<div class="fh-sortrow" data-sort-id="${h(group.id)}"><i class="fh-grip">⠿</i><b>${h(group.name)}</b><span>${items.length}</span></div>`;
            }).join('')}</div>`;
        } else if (query || entriesOnOnly) {
            const hits = prompts.filter(match);
            body = hits.length ? `<div class="fh-items fh-sec open">${hits.map(rowOf).join('')}</div>` : '<div class="fh-empty">没有匹配的条目</div>';
        } else {
            body = groups.map(group => {
                const items = prompts.filter(prompt => sectionOf(prompt, data) === group.id);
                if (!items.length) return '';
                const on = items.filter(prompt => prompt.enabled).length;
                const open = openSections.has(group.id);
                // 默认只画区标题；点开才渲染这一区的行 —— 原来一口气画 278 行，手机要等一秒多。
                return `<section class="fh-sec ${open ? 'open' : ''}" data-sec-id="${h(group.id)}">
                    <button class="fh-sec-head" data-section="${h(group.id)}"><b>${h(group.name)}</b><span>${on} / ${items.length}</span><i>${open ? '▾' : '▸'}</i></button>
                    ${open ? `<div class="fh-items">${items.map(rowOf).join('')}</div>` : ''}</section>`;
            }).join('');
        }
        main.html(`${titleBlock('条目', sortSections ? '按住 ⠿ 上下拖，排你顺手的顺序。只动面板里的排列，预设本身不变。' : '按分区折叠，点开哪个区才加载哪个区。')}
          <div class="fh-toolbar"><div class="fh-search"><input data-entry-search type="text" placeholder="搜索全部条目…" value="${h(entryQuery)}" ${sortSections ? 'disabled' : ''}></div>
            <label class="fh-check"><input data-action="entries-on-only" type="checkbox" ${entriesOnOnly ? 'checked' : ''} ${sortSections ? 'disabled' : ''}> 仅看已开启</label>
            <button class="fh-btn ${sortSections ? 'on' : 'solid'}" data-action="sections-sort">${sortSections ? '完成排序' : '排序分区'}</button></div>
          ${body}`);
        if (sortSections) bindSectionSort();
        if (forceSection) {
            const node = main.find(`[data-sec-id="${forceSection}"]`)[0];
            forceSection = '';
            if (node) hostWindow.requestAnimationFrame(() => node.scrollIntoView({ block: 'start' }));
        }
    }
    // 区排序：指针拖，手机上也能用（HTML5 drag 在触屏上是死的）
    function bindHomeSort() {
        const list = main.find('[data-home-sort]')[0];
        if (!list) return;
        let row = null;
        list.addEventListener('pointerdown', event => {
            if (event.target.closest('.fh-sw')) return;
            row = event.target.closest('.fh-sortrow');
            if (!row) return;
            row.classList.add('moving'); list.setPointerCapture(event.pointerId); event.preventDefault();
        });
        list.addEventListener('pointermove', event => {
            if (!row) return;
            for (const node of list.querySelectorAll('.fh-sortrow')) {
                if (node === row) continue;
                const box = node.getBoundingClientRect();
                if (event.clientY > box.top && event.clientY < box.bottom) {
                    list.insertBefore(row, event.clientY < box.top + box.height / 2 ? node : node.nextSibling);
                    break;
                }
            }
        });
        const finish = event => {
            if (!row) return;
            row.classList.remove('moving'); row = null;
            try { list.releasePointerCapture(event.pointerId); } catch {}
            const order = [...list.querySelectorAll('.fh-sortrow')].map(node => node.dataset.sortId);
            guarded(async () => {
                await updateBoth(preset => {
                    const config = readConfig(preset);
                    config.homeOrder = order;
                    writeConfig(preset, config); return preset;
                });
            });
        };
        list.addEventListener('pointerup', finish);
        list.addEventListener('pointercancel', finish);
    }
    function bindSectionSort() {
        const list = main.find('.fh-sortlist')[0];
        if (!list) return;
        let row = null;
        list.addEventListener('pointerdown', event => {
            const hit = event.target.closest('.fh-sortrow');
            if (!hit) return;
            row = hit; row.classList.add('moving');
            list.setPointerCapture(event.pointerId);
            event.preventDefault();
        });
        list.addEventListener('pointermove', event => {
            if (!row) return;
            for (const node of list.querySelectorAll('.fh-sortrow')) {
                if (node === row) continue;
                const box = node.getBoundingClientRect();
                if (event.clientY > box.top && event.clientY < box.bottom) {
                    list.insertBefore(row, event.clientY < box.top + box.height / 2 ? node : node.nextSibling);
                    break;
                }
            }
        });
        const finish = event => {
            if (!row) return;
            row.classList.remove('moving'); row = null;
            try { list.releasePointerCapture(event.pointerId); } catch {}
            const order = [...list.querySelectorAll('.fh-sortrow')].map(node => node.dataset.sortId);
            guarded(async () => {
                await updateBoth(preset => {
                    const config = readConfig(preset);
                    config.sectionOrder = order;
                    writeConfig(preset, config); return preset;
                });
            });
        };
        list.addEventListener('pointerup', finish);
        list.addEventListener('pointercancel', finish);
    }

