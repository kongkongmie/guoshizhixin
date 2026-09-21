    const PLACEHOLDER_IDS = new Set(['worldInfoBefore', 'personaDescription', 'charDescription', 'charPersonality', 'scenario', 'worldInfoAfter', 'dialogueExamples', 'chatHistory']);
    const hostWindow = (() => {
        let current = window;
        try {
            while (current.parent && current.parent !== current) current = current.parent;
        } catch {}
        return current;
    })();
    const doc = hostWindow.document || document;
    const jq = hostWindow.jQuery || window.jQuery;
    if (!jq) return console.error('[果实之心] 未找到 jQuery');

    try { if (hostWindow.localStorage.getItem('fruit-heart-disabled') === 'true') { hostWindow.localStorage.removeItem('fruit-heart-disabled'); return; } } catch {}

    const old = hostWindow.__FRUIT_HEART_MAIN__;
    if (old && typeof old.destroy === 'function') old.destroy();
    const INSTANCE_ID = `fh${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    const ENTRY_EVENT_NS = `.fruitHeartEntry_${INSTANCE_ID}`;
    const KEY_EVENT_NS = `.fruitHeartKeys_${INSTANCE_ID}`;
    const BALL_EVENT_NS = `.fruitHeartBall_${INSTANCE_ID}`;
    let destroyed = false;
    const helperEventStops = [];
    const buttonEventStops = [];
    function listenHelper(on, name, handler, bucket = helperEventStops) {
        const stop = on(name, (...args) => { if (!destroyed) return handler(...args); });
        if (stop?.stop) bucket.push(() => stop.stop());
    }
    function stopListeners(bucket) {
        for (const stop of bucket.splice(0)) { try { stop(); } catch (error) { console.warn('[果实之心] 事件清理失败', error); } }
    }

    let busy = false;
    let currentView = 'overview';
    let selectedTagFamily = '';
    let selectedMajor = 'all';
    let selectedMinor = '';
    let entryQuery = '';
    let entriesOnOnly = false;
    let nsfwOpen = false;
    let theatreOpen = false;
    let qrEdit = false;          // QR 编辑模式
    let qrCardEdit = '';         // 正在改名的大类 id
    let qrTag = null;            // { card, label?, text, hint, kind, exists }
    let forceSection = '';
    let sortSections = false;
    const openSections = new Set();
    const readFlag = (key, fallback) => { try { const v = hostWindow.localStorage.getItem(key); return v === null ? fallback : v === 'true'; } catch { return fallback; } };
    // 楼层跳转默认开；尾巴和身子只在悬浮猫咪显示时一起出现。
    // 向上是竖起来的猫尾巴，向下是猫的身子 —— 跟猫头同一套扁平剪影，都走 currentColor 跟着皮肤变色。
    const TAIL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">'
        + '<path d="M8.7 22.3c-.4-5.6.1-9.7 1.5-12.6C12 6 16.8 5 19 7.8c2 2.5.7 6-2.4 6.4'
        + '-2 .2-3.5-1.2-3.3-2.8.1-1.3 1.3-2.1 2.4-1.7-.8-1.1-2.5-.8-3.4.7-1.1 1.9-1.5 5.7-1.2 12Z"/></svg>';
    // 身子是宽平顶、往外扩、再收成两只脚，中间一道窄缝。CSS 里用负 margin 把它顶到下巴底下，
    // 尾巴 / 头 / 身子叠起来要看着是一只猫，不是三个零件。
    const BODY_ICON = '<svg viewBox="0 0 26 20" aria-hidden="true" fill="currentColor">'
        + '<path d="M4.4 1h17.2c1.6 0 2.7 1.3 2.6 2.9-.3 4.6-1.5 10.4-3.2 13.6'
        + '-.8 1.5-2 2.4-3.3 2.4-1.5 0-2.6-1.2-2.6-2.8v-5c0-1.4-1-2.4-2.1-2.4s-2.1 1-2.1 2.4v5'
        + 'c0 1.6-1.1 2.8-2.6 2.8-1.3 0-2.5-.9-3.3-2.4C3.3 14.3 2.1 8.5 1.8 3.9 1.7 2.3 2.8 1 4.4 1Z"/></svg>';
    // .11-.13 曾让两个入口互相误伤。升级到本版时只恢复一次，避免旧的 false 让用户重载后彻底找不到入口。
    const ENTRY_DEFAULTS_KEY = 'fruit-heart-entry-defaults-v20260919-14';
    try {
        if (hostWindow.localStorage.getItem(ENTRY_DEFAULTS_KEY) !== '1') {
            // 只救本机真存过旧值的人。新用户这里什么都不写，才轮得到预设里的「开局默认」。
            for (const key of ['fruit-heart-entry-bar', 'fruit-heart-entry-ball']) {
                if (hostWindow.localStorage.getItem(key) !== null) hostWindow.localStorage.setItem(key, 'true');
            }
            hostWindow.localStorage.setItem(ENTRY_DEFAULTS_KEY, '1');
        }
    } catch { /* 无痕模式用下面的默认值 */ }
    let entryBar = readFlag('fruit-heart-entry-bar', true);
    let entryBall = readFlag('fruit-heart-entry-ball', true);
    // 猫的大小。原来 32px 在手机上太容易误触（旁边就是酒馆自己的按钮），默认往上提一档。
    // 尺寸全走 --dock 这个倍数，点击区和图形一起放大，不是 transform 缩放 —— 那样点击区会和看到的对不上。
    const BALL_SIZES = [['s', '小', 1], ['m', '中', 1.25], ['l', '大', 1.55], ['xl', '特大', 1.9]];
    const ballSizeKey = 'fruit-heart-ball-size';
    let ballSize = hostWindow.localStorage.getItem(ballSizeKey) || 'm';
    if (!BALL_SIZES.some(item => item[0] === ballSize)) ballSize = 'm';
    function ballScale() { return (BALL_SIZES.find(item => item[0] === ballSize) || BALL_SIZES[1])[2]; }
    function applyBallSize() {
        if (!ballDock) return;
        ballDock[0].style.setProperty('--dock', String(ballScale()));
        const box = ballDock[0].getBoundingClientRect();     // 放大后可能顶出屏幕，重新夹一次
        placeBall(ballDock[0], box.left, box.top);
    }
    let jumpNav = readFlag('fruit-heart-jump-nav', true);
    const CATEGORY_PAGE_SIZE = 24;
    let searchTimer = null;
    let syncTimer = null;
    let renderedFingerprint = '';
    let fallbackButton = null;
    let ballDock = null;

    function h(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }
    function promptId(prompt) { return String(prompt?.id ?? ''); }
    function toast(type, message) {
        const api = hostWindow.toastr || window.toastr;
        if (api && typeof api[type] === 'function') api[type](message);
        else console[type === 'error' ? 'error' : 'log']('[果实之心]', message);
    }
