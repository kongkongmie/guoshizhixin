    const root = jq(`<div id="${APP_ID}" role="dialog" aria-modal="true" aria-label="果实之心"><div class="fh-shell">
        <header class="fh-header"><span class="fh-brand-mark">${BALL_ICON}</span><div class="fh-brand"><div><strong>果实之心</strong><em>@KKM</em><button class="fh-update-badge" data-action="open-updates" hidden title="发现果实之心更新" aria-label="发现果实之心更新">🍎</button></div><small>${SUBTITLE}</small></div><div class="fh-header-meta"><button class="fh-theme" data-action="theme" aria-label="切换主题"></button><button class="fh-fullscreen" data-action="fullscreen" aria-label="面板全屏" aria-pressed="false">⛶</button><button class="fh-close" data-action="close" aria-label="关闭">×</button></div></header>
        <main class="fh-main"></main><nav class="fh-bottom-nav"></nav>
    </div></div>`).appendTo(doc.documentElement);
    const mainNode = root.find('.fh-main')[0];
    // jQuery.html() 会走 buildFragment + Sizzle，一次首页渲染能吃掉两三百毫秒。
    // 这里塞的全是静态 HTML，用原生 innerHTML 就够，快一个数量级。
    const main = { html: text => { mainNode.innerHTML = text; return main; },
        find: sel => jq(mainNode.querySelectorAll(sel)),
        scrollTop: v => { if (v === undefined) return mainNode.scrollTop; mainNode.scrollTop = v; return main; } };
    applyTheme();
    function syncViewport() {
        const v = hostWindow.visualViewport;
        const el = root[0];
        el.style.setProperty('--fh-vtop', `${v?.offsetTop || 0}px`);
        el.style.setProperty('--fh-vleft', `${v?.offsetLeft || 0}px`);
        el.style.setProperty('--fh-vwidth', `${v?.width || hostWindow.innerWidth}px`);
        el.style.setProperty('--fh-vheight', `${v?.height || hostWindow.innerHeight}px`);
    }
    hostWindow.visualViewport?.addEventListener('resize', syncViewport);
    hostWindow.visualViewport?.addEventListener('scroll', syncViewport);
    hostWindow.addEventListener('resize', syncViewport);
    syncViewport();

    // 「自动双语」用的是预设里本来就有的那条（🗣️ 双语对白），脚本只负责开关它；
    // 用户把它删了或改了名，这格就自己消失，不会凭空造条目。
