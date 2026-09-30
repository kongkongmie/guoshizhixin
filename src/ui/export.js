    // ── 导出小说页 ──
    // 选项存本机（localStorage）：这是「我喜欢怎么导」，不是预设的一部分，跟着设备走。
    // 楼层范围不存 —— 每个聊天不一样；「接着上次」按聊天记上次导到哪一楼。
    const EXPORT_KEY = 'fruit-heart-export-v1';
    const EXPORT_LAST_KEY = 'fruit-heart-export-last-v1';
    const EXPORT_DEFAULTS = { keep: ['content'], user: 'keep', orphan: 'keep', hidden: true, chapter: 'number',
        para: 'blank', cleanMd: true, speaker: false, floorNo: false, cover: true, rules: [] };
    const EXPORT_PREVIEW_CHARS = 1600;
    function readJson(key, fallback) {
        try { const raw = hostWindow.localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
    }
    function writeJson(key, value) {
        try { hostWindow.localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    }
    let exportOpts = { ...EXPORT_DEFAULTS, ...readJson(EXPORT_KEY, {}) };
    if (!Array.isArray(exportOpts.keep)) exportOpts.keep = [...EXPORT_DEFAULTS.keep];
    if (!Array.isArray(exportOpts.rules)) exportOpts.rules = [];
    let exportRange = { chat: null, from: 0, to: 0, title: '' };
    let exportRulesOpen = false;
    let exportRuleEdit = -1;           // 正在改第几条；-1 = 新增
    let exportDetectMemo = { key: '', value: null };
    let exportJob = 0;
    function saveExportOpts() { writeJson(EXPORT_KEY, exportOpts); }

    function exportChat() {
        let ctx = {};
        try { ctx = SillyTavern.getContext() || {}; } catch {}
        const chat = Array.isArray(ctx.chat) ? ctx.chat : [];
        let id = '';
        try { id = String(ctx.getCurrentChatId?.() ?? ''); } catch {}
        let name = '';
        try {
            if (ctx.groupId) name = (ctx.groups || []).find(g => String(g.id) === String(ctx.groupId))?.name || '';
            else if (ctx.characterId !== undefined) name = ctx.characters?.[ctx.characterId]?.name || '';
        } catch {}
        return { chat, id, name: name || ctx.name2 || '' };
    }
    function exportLast(id) { return id ? Number(readJson(EXPORT_LAST_KEY, {})[id]) : NaN; }
    function exportTime() {
        const d = new Date(), p = n => String(n).padStart(2, '0');
        return { stamp: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`,
            text: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}` };
    }
    function exportRunOpts(info) {
        return { ...exportOpts, from: exportRange.from, to: exportRange.to, title: exportRange.title || info.name,
            meta: { character: info.name, time: exportTime().text } };
    }
    function exportDetect(info) {
        const key = [info.id, info.chat.length, exportRange.from, exportRange.to, exportOpts.hidden].join('|');
        if (exportDetectMemo.key !== key) exportDetectMemo = { key, value: nxDetect(info.chat, exportRange.from, exportRange.to, exportOpts.hidden) };
        return exportDetectMemo.value;
    }
    function expSeg(key, choices) {
        return `<span class="fh-seg">${choices.map(([value, label, tip]) => `<button class="${exportOpts[key] === value ? 'on' : ''}"`
            + ` data-exp-set="${key}" data-val="${h(value)}"${tip ? ` title="${h(tip)}"` : ''}>${h(label)}</button>`).join('')}</span>`;
    }
    function expSwitch(key, label) {
        const on = Boolean(exportOpts[key]);
        return `<button class="fh-sw ${on ? 'on' : ''}" data-exp-toggle="${key}" role="switch" aria-checked="${on}" aria-label="${h(label)}"></button>`;
    }
    function expRow(label, control, stack = false) {
        return `<div class="fh-row${stack ? ' fh-stack' : ''}"><span class="fh-k">${h(label)}</span><div class="fh-v">${control}</div></div>`;
    }
    function ruleText(rule) {
        const find = String(rule.find || ''), to = String(rule.replace ?? '');
        return `${find.length > 28 ? find.slice(0, 28) + '…' : find} → ${to === '' ? '（删掉）' : to.length > 16 ? to.slice(0, 16) + '…' : to}`;
    }

    function renderExport() {
        const info = exportChat();
        const scroll = currentView === 'export' ? main.scrollTop() : 0;
        if (exportRange.chat !== info.id) exportRange = { chat: info.id, from: 0, to: Math.max(0, info.chat.length - 1), title: info.name };
        [exportRange.from, exportRange.to] = info.chat.length ? nxRange(info.chat, exportRange.from, exportRange.to) : [0, 0];
        if (!info.chat.length) {
            main.html(`${titleBlock('导出为 TXT 小说')}<div class="fh-card"><div class="fh-empty">当前没有打开聊天。先进一个聊天再来。</div>
              <div class="fh-card-actions"><button class="fh-btn" data-nav="overview">返回首页</button></div></div>`);
            return;
        }
        const det = exportDetect(info);
        const lastEnd = exportLast(info.id);
        const maxFloor = info.chat.length - 1;
        const canResume = Number.isFinite(lastEnd) && lastEnd < maxFloor;
        const tags = [...det.counts.entries()].sort((a, b) => (a[0] === 'content' ? -1 : b[0] === 'content' ? 1 : b[1] - a[1]));
        const keep = new Set(exportOpts.keep);
        const chips = tags.map(([tag, count]) => `<button class="fh-chip ${keep.has(tag) ? 'on' : ''}" data-exp-keep="${h(tag)}"`
            + ` title="&lt;${h(tag)}&gt; 在 ${count} 层里出现">${h(NX_LABELS[tag] || tag)}<em class="fh-exp-n">${count}</em></button>`).join('');
        const rules = exportOpts.rules;
        const editing = exportRuleEdit >= 0 ? rules[exportRuleEdit] : null;

        main.html(`<div class="fh-page-head fh-exp-head"><div><h2>导出为 TXT 小说<em class="fh-sign">@hy</em></h2><p>${h(info.name || '当前聊天')} · 共 ${info.chat.length} 楼（0 – ${maxFloor}）</p></div>
            <button class="fh-btn" data-nav="overview">‹ 首页</button></div>

          <div class="fh-lab">范围</div>
          <div class="fh-card">
            <div class="fh-row"><span class="fh-k">楼层</span><div class="fh-v fh-exp-range">
              <input type="text" inputmode="numeric" data-exp-from value="${exportRange.from}" aria-label="起始楼层">
              <span class="fh-dim">至</span>
              <input type="text" inputmode="numeric" data-exp-to value="${exportRange.to}" aria-label="结束楼层"></div></div>
            <div class="fh-pad"><span class="fh-seg">
              <button data-exp-range="all" class="${exportRange.from === 0 && exportRange.to === maxFloor ? 'on' : ''}">全部</button>
              <button data-exp-range="resume" ${canResume ? `title="上次导到第 ${lastEnd} 楼"` : 'disabled title="这个聊天还没导出过，或上次已经导到最后"'}>接着上次${canResume ? `（${lastEnd + 1} 起）` : ''}</button>
              <button data-exp-range="recent">最近 20 楼</button></span></div>
            ${expRow('包含已隐藏的楼层', expSwitch('hidden', '包含已隐藏的楼层'))}
          </div>

          <div class="fh-lab">保留哪些内容</div>
          <div class="fh-card">
            <div class="fh-pad"><div class="fh-chips">${chips || '<span class="fh-dim">这段楼层里没有标签块，会按全文导出。</span>'}</div>
              <p class="fh-note fh-exp-tip">数字是出现在几层里。思维链、生图提示词、HTML 注释始终去掉。</p></div>
            ${expRow('我的发言', expSeg('user', [['keep', '保留'], ['omit', '省略']]))}
            ${expRow('某层没有勾选的内容时', expSeg('orphan', [['keep', '保留其余文字', '比如 AI 忘了写 <content> 时，正文就在标签外面'], ['skip', '跳过这层']]), true)}
          </div>

          <div class="fh-lab">排版</div>
          <div class="fh-card">
            ${expRow('分章', expSeg('chapter', [['none', '不分章'], ['number', '自动编号', '每条 AI 回复一章，按顺序编号；有小说标题就接在后面'],
                ['source', '用原章号', '照抄 [CHAP]，没有就自动编号']]))}
            ${det.header ? '' : `<div class="fh-pad"><p class="fh-note fh-exp-tip">这段楼层里没有小说标题，章节只有编号。</p></div>`}
            ${expRow('段落', expSeg('para', [['blank', '空行'], ['indent', '首行缩进'], ['raw', '原样']]))}
            ${expRow('去掉 Markdown 符号', expSwitch('cleanMd', '去掉 Markdown 符号'))}
            ${expRow('标注发言人', expSwitch('speaker', '标注发言人'))}
            ${expRow('标注楼层号', expSwitch('floorNo', '标注楼层号'))}
            ${expRow('书名页', expSwitch('cover', '书名页'))}
            ${exportOpts.cover ? `<div class="fh-pad"><input type="text" data-exp-title value="${h(exportRange.title)}" placeholder="书名" aria-label="书名"></div>` : ''}
          </div>

          <div class="fh-card fh-mt">
            <div class="fh-ch" data-exp-fold><i class="fh-dot"></i><b>替换规则</b><span class="fh-n">${rules.filter(r => r.on !== false).length} / ${rules.length}</span>
              <i class="fh-fold">${exportRulesOpen ? '▾' : '▸'}</i></div>
            ${exportRulesOpen ? `${rules.map((rule, index) => `<div class="fh-row fh-exp-rule">
                <button class="fh-sw ${rule.on !== false ? 'on' : ''}" data-exp-rule-on="${index}" role="switch" aria-checked="${rule.on !== false}" aria-label="启用"></button>
                <span class="fh-exp-rtext"><b>${h(rule.name || '替换')}</b><small>${h(ruleText(rule))}</small></span>
                <button class="fh-btn" data-exp-rule-edit="${index}">改</button><button class="fh-btn danger" data-exp-rule-del="${index}">删</button></div>`).join('')}
              <div class="fh-pad fh-exp-form">
                <input type="text" data-exp-rf value="${h(editing?.find || '')}" placeholder="查找：普通文字，或 /正则/g" aria-label="查找">
                <input type="text" data-exp-rr value="${h(editing?.replace || '')}" placeholder="替换为（留空 = 删掉）" aria-label="替换为">
                <div class="fh-exp-acts"><button class="fh-btn primary" data-exp-rule-save>${editing ? '保存这条' : '添加'}</button>
                  ${editing ? '<button class="fh-btn" data-exp-rule-cancel>取消</button>' : ''}
                  <button class="fh-btn" data-exp-rule-import title="酒馆正则导出的 .json，可以一次选多个">导入酒馆正则</button></div>
                <p class="fh-note fh-exp-tip">按顺序在清理排版之前执行。正则写法和酒馆一样，替换里可以用 $1、{{match}}。</p></div>` : ''}
          </div>

          <div class="fh-lab">预览<span class="fh-exp-lab-note">前 ${EXPORT_PREVIEW_CHARS} 字</span></div>
          <div class="fh-card"><pre class="fh-exp-preview" data-exp-preview>生成中…</pre></div>

          <div class="fh-exp-bar"><span class="fh-exp-stat" data-exp-stat>统计中…</span>
            <button class="fh-btn" data-exp-do="copy">复制</button>
            <button class="fh-btn solid" data-exp-do="download">导出 TXT</button></div>
          <input type="file" accept=".json,application/json" multiple hidden data-exp-file>`);
        if (scroll) main.scrollTop(scroll);
        scheduleExportPreview();
    }
    // 页面先画出来，下一帧再整段跑一遍：书名页上的层数字数要是全量的，预览只截前面一段。
    // 实测 1.1 MB 的聊天全量 20~40ms；连点几下只算最后一次。
    function scheduleExportPreview() {
        const job = ++exportJob;
        hostWindow.requestAnimationFrame(() => setTimeout(() => {
            if (job !== exportJob || currentView !== 'export') return;
            const info = exportChat();
            const full = nxRun(info.chat, exportRunOpts(info));
            const text = full.text.length > EXPORT_PREVIEW_CHARS ? full.text.slice(0, EXPORT_PREVIEW_CHARS) + '\n\n……' : full.text;
            main.find('[data-exp-preview]').text(full.floors ? text : '这段楼层导出来是空的。看看上面是不是把内容全取消了，或者范围里只有隐藏楼层。');
            main.find('[data-exp-stat]').html(full.floors
                ? `<b>${full.floors}</b> 层 · <b>${full.chapters}</b> 章<br>约 <b>${full.chars.toLocaleString('zh-CN')}</b> 字`
                : '没有可导出的内容');
        }, 0));
    }
    function exportFileName(info, result) {
        const base = String(exportRange.title || info.name || '聊天').replace(/[\\/:*?"<>|\r\n]+/g, '_').trim().slice(0, 60) || '聊天';
        return `${base}_${result.first}-${result.last}楼_${exportTime().stamp}.txt`;
    }
    async function copyText(text) {
        try { await hostWindow.navigator.clipboard.writeText(text); return true; } catch {}
        const area = doc.createElement('textarea');
        area.value = text; area.setAttribute('readonly', ''); area.style.cssText = 'position:fixed;left:-9999px;top:0';
        doc.body.appendChild(area); area.select();
        let ok = false;
        try { ok = doc.execCommand('copy'); } catch {}
        area.remove();
        return ok;
    }
    async function doExport(kind) {
        const info = exportChat();
        if (!info.chat.length) return toast('warning', '当前没有打开聊天');
        const result = nxRun(info.chat, exportRunOpts(info));
        if (!result.floors) return toast('warning', '这段楼层导出来是空的');
        if (kind === 'copy') {
            if (await copyText(result.text)) toast('success', `已复制 ${result.floors} 层，约 ${result.chars.toLocaleString('zh-CN')} 字`);
            else toast('error', '浏览器不让复制，请用「导出 TXT」');
            return;
        }
        // ﻿：Windows 记事本和一些手机阅读器没有 BOM 会认成 GBK，中文全乱码
        const url = URL.createObjectURL(new Blob(['﻿' + result.text.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' }));
        const link = doc.createElement('a');
        link.href = url; link.download = exportFileName(info, result); link.style.display = 'none';
        doc.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        if (info.id) { const last = readJson(EXPORT_LAST_KEY, {}); last[info.id] = result.last; writeJson(EXPORT_LAST_KEY, last); }
        toast('success', `已导出 ${result.floors} 层 · ${result.chapters} 章 · 约 ${result.chars.toLocaleString('zh-CN')} 字`);
        renderExport();
    }
    function importRegexFiles(files) {
        const tasks = [...files].map(file => file.text().then(text => {
            const data = JSON.parse(text);
            return (Array.isArray(data) ? data : [data]).filter(item => item && typeof item.findRegex === 'string')
                .map(item => ({ name: item.scriptName || item.name || file.name, find: item.findRegex,
                    replace: String(item.replaceString ?? ''), regex: true, on: !item.disabled }));
        }).catch(() => []));
        Promise.all(tasks).then(lists => {
            const added = lists.flat();
            if (!added.length) return toast('warning', '没从文件里读到酒馆正则（需要 findRegex 字段）');
            exportOpts.rules.push(...added); saveExportOpts(); exportRulesOpen = true;
            toast('success', `导入了 ${added.length} 条`); renderExport();
        });
    }
    function exportFloorInput(el, key) {
        const value = String(el.value).trim();
        if (!/^\d+$/.test(value)) { el.value = exportRange[key]; return; }
        exportRange[key] = Number(value);
        renderExport();
    }

    root.on('click', '[data-exp-set]', function () {
        exportOpts[this.dataset.expSet] = this.dataset.val; saveExportOpts(); renderExport();
    });
    root.on('click', '[data-exp-toggle]', function () {
        const key = this.dataset.expToggle;
        exportOpts[key] = !exportOpts[key]; saveExportOpts(); renderExport();
    });
    root.on('click', '[data-exp-keep]', function () {
        const tag = this.dataset.expKeep, keep = new Set(exportOpts.keep);
        if (keep.has(tag)) keep.delete(tag); else keep.add(tag);
        exportOpts.keep = [...keep]; saveExportOpts(); renderExport();
    });
    root.on('click', '[data-exp-range]', function () {
        const info = exportChat(), max = Math.max(0, info.chat.length - 1), mode = this.dataset.expRange;
        if (mode === 'all') { exportRange.from = 0; exportRange.to = max; }
        else if (mode === 'recent') { exportRange.from = Math.max(0, max - 19); exportRange.to = max; }
        else if (mode === 'resume') { const last = exportLast(info.id); if (!Number.isFinite(last)) return; exportRange.from = Math.min(max, last + 1); exportRange.to = max; }
        renderExport();
    });
    root.on('change', '[data-exp-from]', function () { exportFloorInput(this, 'from'); });
    root.on('change', '[data-exp-to]', function () { exportFloorInput(this, 'to'); });
    root.on('keydown', '[data-exp-from],[data-exp-to]', function (event) { if (event.key === 'Enter') this.blur(); });
    root.on('change', '[data-exp-title]', function () { exportRange.title = String(this.value).trim(); scheduleExportPreview(); });
    root.on('click', '[data-exp-fold]', function () { exportRulesOpen = !exportRulesOpen; exportRuleEdit = -1; renderExport(); });
    root.on('click', '[data-exp-rule-on]', function () {
        const rule = exportOpts.rules[Number(this.dataset.expRuleOn)];
        if (!rule) return;
        rule.on = rule.on === false; saveExportOpts(); renderExport();
    });
    root.on('click', '[data-exp-rule-del]', function () {
        const index = Number(this.dataset.expRuleDel);
        if (!exportOpts.rules[index]) return;
        exportOpts.rules.splice(index, 1);
        if (exportRuleEdit === index) exportRuleEdit = -1; else if (exportRuleEdit > index) exportRuleEdit--;
        saveExportOpts(); renderExport();
    });
    root.on('click', '[data-exp-rule-edit]', function () { exportRuleEdit = Number(this.dataset.expRuleEdit); renderExport(); });
    root.on('click', '[data-exp-rule-cancel]', function () { exportRuleEdit = -1; renderExport(); });
    root.on('click', '[data-exp-rule-save]', function () {
        const find = String(main.find('[data-exp-rf]').val() || ''), replace = String(main.find('[data-exp-rr]').val() || '');
        if (!find) return toast('info', '先写要查找的内容');
        const probe = { find, replace, regex: false };
        if (/^\/[\s\S]+\/[a-z]*$/.test(find) && !nxRule(probe)) return toast('error', '这条正则写得不对，浏览器认不出来');
        const old = exportRuleEdit >= 0 ? exportOpts.rules[exportRuleEdit] : null;
        if (old) Object.assign(old, { find, replace, regex: old.regex && !/^\/[\s\S]+\/[a-z]*$/.test(find) ? old.regex : false });
        else exportOpts.rules.push({ name: find.length > 12 ? find.slice(0, 12) + '…' : find, find, replace, regex: false, on: true });
        exportRuleEdit = -1; saveExportOpts(); renderExport();
    });
    root.on('click', '[data-exp-rule-import]', function () { main.find('[data-exp-file]')[0]?.click(); });
    root.on('change', '[data-exp-file]', function () { if (this.files?.length) importRegexFiles(this.files); this.value = ''; });
    root.on('click', '[data-exp-do]', function () { const kind = this.dataset.expDo; guarded(() => doExport(kind)); });
