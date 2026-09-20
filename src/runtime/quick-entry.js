    function resolveFunction(name) {
        const sources = [window, hostWindow, window.TavernHelper, hostWindow.TavernHelper, window.TavernHelper?.scriptButtons, hostWindow.TavernHelper?.scriptButtons].filter(Boolean);
        for (const source of sources) if (typeof source[name] === 'function') return source[name].bind(source);
        return null;
    }
    const BALL_POS = 'fruit-heart-ball-pos';
    function ballPosition() {
        try { const saved = JSON.parse(hostWindow.localStorage.getItem(BALL_POS) || 'null'); if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved; } catch {}
        return null;
    }
    function placeBall(node, x, y) {
        const w = node.offsetWidth || 44;
        const hgt = node.offsetHeight || w;
        const maxX = Math.max(0, hostWindow.innerWidth - w - 4);
        const maxY = Math.max(0, hostWindow.innerHeight - hgt - 4);
        node.style.left = Math.min(Math.max(4, x), maxX) + 'px';
        node.style.top = Math.min(Math.max(4, y), maxY) + 'px';
        node.style.right = 'auto'; node.style.bottom = 'auto';
    }
    // 楼层跳转。#chat 是酒馆的滚动容器，.mes 是一层。
    // 逻辑：▲ 先回到「当前这层」的顶部；已经在顶部了就再上一层。▼ 同理往下。
    function chatScroller() {
        const chat = doc.querySelector('#chat');
        if (chat && chat.scrollHeight > chat.clientHeight + 4) return chat;
        return chat || doc.scrollingElement || doc.documentElement;
    }
    function floorRows(box) {
        // 根滚动元素的 rect.top 本身就等于 -scrollTop，跟普通容器不是一套算法，分开处理
        const isRoot = box === doc.scrollingElement || box === doc.documentElement || box === doc.body;
        const base = isRoot ? -box.scrollTop : (box.getBoundingClientRect().top - box.scrollTop);
        const out = [];
        for (const m of box.querySelectorAll('.mes')) {
            const r = m.getBoundingClientRect();
            if (r.height < 1) continue;          // 隐藏楼层不算
            out.push({ top: r.top - base, bottom: r.bottom - base });
        }
        return out;
    }
    function jumpFloor(dir) {
        const box = chatScroller();
        if (!box) return;
        const rows = floorRows(box);
        const limit = Math.max(0, box.scrollHeight - box.clientHeight);
        if (!rows.length) { box.scrollTo({ top: dir < 0 ? 0 : limit, behavior: 'smooth' }); return; }
        const EPS = 6;
        let target;
        if (dir < 0) {
            let i = 0;
            for (let k = 0; k < rows.length; k++) if (rows[k].top <= box.scrollTop + EPS) i = k;
            if (Math.abs(rows[i].top - box.scrollTop) <= EPS) i = Math.max(0, i - 1);
            target = rows[i].top;
        } else {
            const edge = box.scrollTop + box.clientHeight;
            let i = rows.length - 1;
            for (let k = rows.length - 1; k >= 0; k--) if (rows[k].bottom >= edge - EPS) i = k;
            if (Math.abs(rows[i].bottom - edge) <= EPS) i = Math.min(rows.length - 1, i + 1);
            target = rows[i].bottom - box.clientHeight;
        }
        box.scrollTo({ top: Math.max(0, Math.min(target, limit)), behavior: 'smooth' });
    }
    function showBall() {
        if (ballDock) return;
        ballDock = jq(`<div id="${APP_ID}-dock" data-fh-instance="${INSTANCE_ID}" class="${jumpNav ? 'has-jump' : ''}" style="--dock:${ballScale()}">`
            + `<button type="button" class="fh-jump up" title="回到本层顶部｜再点一下上一层" aria-label="本层顶部">${TAIL_ICON}</button>`
            + `<button type="button" id="${APP_ID}-fallback" title="🐱悬浮猫咪｜按住可以拖" aria-label="🐱悬浮猫咪">${BALL_ICON}</button>`
            + `<button type="button" class="fh-jump down" title="回到本层底部｜再点一下下一层" aria-label="本层底部">${BODY_ICON}</button>`
            + `</div>`).appendTo(doc.body);
        const node = ballDock[0];
        fallbackButton = jq(node.querySelector(`#${APP_ID}-fallback`));
        const saved = ballPosition();
        if (saved) placeBall(node, saved.x, saved.y);
        // 按住拖：移动超过 4px 就算拖，不算点击；松手记住位置
        let drag = null;
        // dock 一旦 setPointerCapture，之后的 pointerup 和 click 都会被重定向到 dock 本身，
        // click 的 event.target 不再是被按下的那个按钮（实测：pointerdown=path，click=dock）。
        // 所以在 pointerdown 这一刻 —— target 还是对的 —— 先把按的是哪个按钮记下来。
        let hitButton = null;
        node.addEventListener('pointerdown', event => {
            if (event.button) return;
            hitButton = event.target.closest && (event.target.closest('.fh-jump')
                || event.target.closest(`#${APP_ID}-fallback`));
            const box = node.getBoundingClientRect();
            drag = { dx: event.clientX - box.left, dy: event.clientY - box.top, x: event.clientX, y: event.clientY, moved: false };
            node.setPointerCapture(event.pointerId);
        });
        node.addEventListener('pointermove', event => {
            if (!drag) return;
            if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return;
            drag.moved = true;
            node.classList.add('dragging');
            placeBall(node, event.clientX - drag.dx, event.clientY - drag.dy);
        });
        let dragged = false;
        node.addEventListener('pointerup', event => {
            if (!drag) return;
            dragged = drag.moved; drag = null;
            node.classList.remove('dragging');
            try { node.releasePointerCapture(event.pointerId); } catch {}
            if (!dragged) return;
            const box = node.getBoundingClientRect();
            try { hostWindow.localStorage.setItem(BALL_POS, JSON.stringify({ x: box.left, y: box.top })); } catch {}
        });
        node.addEventListener('pointercancel', () => { drag = null; dragged = true; hitButton = null; node.classList.remove('dragging'); });
        // 开面板走 click：拖完那一下的 click 要吃掉，不然一松手面板就弹出来
        node.addEventListener('click', event => {
            // 优先用 pointerdown 记下的那个；键盘回车没有指针事件，退回按 target 找
            const target = hitButton || (event.target.closest && (event.target.closest('.fh-jump')
                || event.target.closest(`#${APP_ID}-fallback`)));
            hitButton = null;
            if (dragged) { dragged = false; event.preventDefault(); event.stopPropagation(); return; }
            if (!target) return;
            if (target.classList.contains('fh-jump')) {
                event.preventDefault();
                jumpFloor(target.classList.contains('up') ? -1 : 1);
                return;
            }
            open();
        });
        jq(hostWindow).off(`resize${BALL_EVENT_NS}`).on(`resize${BALL_EVENT_NS}`, () => {
            if (!ballDock) return;
            const box = ballDock[0].getBoundingClientRect();
            placeBall(ballDock[0], box.left, box.top);
        });
    }
    function hideBall() {
        if (ballDock) { ballDock.remove(); ballDock = null; fallbackButton = null; }
        jq(hostWindow).off(`resize${BALL_EVENT_NS}`);
        doc.querySelectorAll(`#${APP_ID}-dock`).forEach(node => node.remove());
    }
    const WAND_ENTRY_ID = `${APP_ID}-wand-entry`;
    let wandEntry = null;
    function ensureWandEntry() {
        if (entryBindingSuspended || !hasFruitHeartConfig()) return;
        const menu = doc.querySelector('#extensionsMenu');
        if (!menu) return;
        const existing = doc.getElementById(WAND_ENTRY_ID);
        if (existing?.dataset.fhInstance === INSTANCE_ID) { wandEntry = existing; return; }
        existing?.remove();
        const item = doc.createElement('div');
        item.id = WAND_ENTRY_ID;
        item.className = 'list-group-item flex-container flexGap5 interactable';
        item.dataset.fhInstance = INSTANCE_ID;
        item.title = '打开果实之心';
        item.setAttribute('role', 'button');
        item.tabIndex = 0;
        item.innerHTML = '<div class="fa-solid fa-apple-whole extensionsMenuExtensionButton"></div><span>果实之心</span>';
        item.addEventListener('click', open);
        item.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            open();
        });
        menu.appendChild(item);
        wandEntry = item;
    }
    function hideWandEntry() {
        if (wandEntry) { wandEntry.remove(); wandEntry = null; }
        doc.querySelectorAll(`#${WAND_ENTRY_ID}`).forEach(node => node.remove());
    }
    // 快捷回复栏里那颗「🍎果实之心」是预设自带的 QR 条目，不是脚本画的。
    // 关掉入口时只解绑点击，按钮还杵在那儿点不动 —— 所以关的时候要顺手把它藏了。
    const QR_BARS = '#qr--bar button,.qr--buttons button,#quickReplies button,.qr--button';
    let syntheticBarEntry = null;
    let boundPresetName = loadedName();
    let entryBindingSuspended = false;
    // 新旧名称都认，避免更新脚本后酒馆里已有的快捷按钮失去入口。
    function isEntryButton(node) {
        if (node.dataset && node.dataset.fhCat) return true;
        const compact = value => String(value || '').replace(/\s+/g, '');
        const label = compact(node.textContent);
        const title = compact(node.getAttribute('title'));
        return BUTTON_NAMES.some(name => compact(name) === label || compact(name) === title);
    }
    function barEntryButtons() {
        const hit = [];
        for (const node of doc.querySelectorAll(QR_BARS)) if (isEntryButton(node)) hit.push(node);
        return hit;
    }
    function hasFruitHeartConfig() {
        try { return Boolean(configPrompt(activePreset())); } catch { return false; }
    }
    function quickReplyHost() {
        const bar = doc.querySelector('#qr--bar');
        if (bar) return bar.querySelector('.qr--buttons') || bar;
        const popout = doc.querySelector('#qr--popout .qr--body');
        if (popout) return popout.querySelector('.qr--buttons') || popout;
        return doc.querySelector('#quickReplies');
    }
    function ensureBarEntry() {
        if (syntheticBarEntry && !syntheticBarEntry.isConnected) syntheticBarEntry = null;
        if (!entryBar || entryBindingSuspended || syntheticBarEntry || !hasFruitHeartConfig()) return;
        if (barEntryButtons().length) return;
        const host = quickReplyHost();
        if (!host) return;
        // 跟酒馆 Quick Reply 一样使用 menu_button + icon/label/expander 结构；直接挂在 #qr--bar 会掉到下一行。
        const button = doc.createElement('div');
        button.className = 'qr--button menu_button fh-synthetic-entry';
        button.dataset.fhSynthetic = '1';
        button.dataset.fhCat = '1';
        button.dataset.fhInstance = INSTANCE_ID;
        button.title = BUTTON_NAME;
        button.setAttribute('aria-label', BUTTON_NAME);
        button.setAttribute('role', 'button');
        button.tabIndex = 0;
        button.innerHTML = '<div class="qr--button-icon fa-solid qr--hidden"></div>'
            + '<div class="qr--button-label">🍎果实之心</div>'
            + '<div class="qr--button-expander" title="Open context menu">⋮</div>';
        button.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
        host.appendChild(button);
        syntheticBarEntry = button;
    }
    function undressBarEntry() {
        for (const [node, original] of originalBarEntries) { node.style.display = original.display; if (original.title === null) node.removeAttribute('title'); else node.setAttribute('title', original.title); for (const [text, value] of original.texts) if (text.isConnected) text.nodeValue = value; }
        originalBarEntries.clear();
        for (const node of doc.querySelectorAll(`[data-fh-instance="${INSTANCE_ID}"][data-fh-cat="1"]`)) {
            if (node.dataset.fhSynthetic) { node.remove(); continue; }
            for (const mark of node.querySelectorAll('.fh-bar-cat')) mark.replaceWith(doc.createTextNode('🍎'));
            delete node.dataset.fhCat;
            delete node.dataset.fhInstance;
            delete node.dataset.fhCatTitle;
        }
        syntheticBarEntry = null;
    }
    // 统一快捷栏入口文案。只动文字节点，不重写 innerHTML ——
    // 那是酒馆自己的按钮，它随时会往里面塞东西，整个刷掉会把它的结构弄坏。
    function dressBarEntry() {
        if (!entryBar) return;
        for (const node of originalBarEntries.keys()) if (!node.isConnected) originalBarEntries.delete(node);
        for (const node of barEntryButtons()) {
            if (node.dataset.fhCat) continue;
            node.dataset.fhCat = '1';
            node.dataset.fhInstance = INSTANCE_ID;
            if (!node.getAttribute('title')) { node.dataset.fhCatTitle = ''; node.setAttribute('title', BUTTON_NAME); }
            const walker = doc.createTreeWalker(node, 4);   // 4 = NodeFilter.SHOW_TEXT，直接写数字省一个全局依赖
            let text = null;
            while (walker.nextNode()) { if (walker.currentNode.nodeValue.includes('🍎')) { text = walker.currentNode; break; } }
            if (!text) continue;
            text.nodeValue = text.nodeValue.replace(/🍎\s*(?:果实之心|快捷栏入口)?/, '🍎果实之心');
        }
    }
    const originalBarEntries = new Map();
    function sweepBarEntry() {
        if (entryBindingSuspended) return;
        ensureBarEntry();
        for (const node of originalBarEntries.keys()) if (!node.isConnected) originalBarEntries.delete(node);
        for (const node of barEntryButtons()) {
            if (!node.dataset.fhSynthetic && !originalBarEntries.has(node)) originalBarEntries.set(node, { display: node.style.display, title: node.getAttribute('title'), texts: [...(function* walk(n) { for (const child of n.childNodes) { if (child.nodeType === 3) yield [child, child.nodeValue]; else yield* walk(child); } })(node)] });
            node.style.display = entryBar ? '' : 'none';
        }
        dressBarEntry();
    }
    function clearEntryArtifacts() {
        entryBindingSuspended = true;
        close();
        undressBarEntry();
        jq(doc).off(`click${ENTRY_EVENT_NS}`);
        hideBall();
        hideWandEntry();
    }
    function bindPresetChangeEvents() {
        const on = resolveFunction('eventOn');
        const events = hostWindow.tavern_events || window.tavern_events;
        if (!on || !events) return;
        const names = [...new Set([events.OAI_PRESET_CHANGED_AFTER, events.PRESET_CHANGED].filter(Boolean))];
        for (const name of names) {
            try { listenHelper(on, name, clearEntryArtifacts); } catch {}
        }
    }
    function refreshEntryBinding() {
        const name = loadedName();
        if (!name || !boundPresetName || name === boundPresetName) return;
        boundPresetName = name;
        clearEntryArtifacts();
    }
    function bindEntry() {
        stopListeners(buttonEventStops);
        entryBindingSuspended = false;
        hideBall();
        sweepBarEntry();
        ensureWandEntry();
        jq(doc).off(`click${ENTRY_EVENT_NS}`);
        bindRoll();
        if (entryBar) {
            jq(doc).on(`click${ENTRY_EVENT_NS}`, QR_BARS, function (event) {
                if (isEntryButton(this)) { event.preventDefault(); event.stopPropagation(); open(); }
            });
            const getEvent = resolveFunction('getButtonEvent'); const on = resolveFunction('eventOn');
            if (getEvent && on) {
                for (const label of BUTTON_NAMES) {
                    const name = getEvent(label);
                    if (name) listenHelper(on, name, open, buttonEventStops);
                }
            }
        }
        // 两个入口完全独立：快捷栏开关只管快捷栏，悬浮猫咪开关只管猫咪。
        if (entryBall) showBall();
    }
