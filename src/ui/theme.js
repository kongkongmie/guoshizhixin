    const themeKey = 'fruit-heart-theme';
    const systemTheme = hostWindow.matchMedia('(prefers-color-scheme: dark)');
    let theme = hostWindow.localStorage.getItem(themeKey) || 'system';
    function resolvedTheme() { return theme === 'system' ? (systemTheme.matches ? 'night' : 'day') : theme; }
    // 皮肤：换的是整套质感（纸纹、卡片形状、勾的画法、字体），不只是色号
    const SKINS = [['paper', '暖纸'], ['journal', '果园手账'], ['glass', '黑金玻璃']];
    const skinKey = 'fruit-heart-skin';
    let skin = hostWindow.localStorage.getItem(skinKey) || 'paper';
    if (!SKINS.some(item => item[0] === skin)) skin = 'paper';
    // 字体：皮肤自带一套（暖纸＝黑体、手账＝文楷），这里允许单独覆盖。
    // 系统那几个是零加载；网络字体走 jsDelivr 的中文分包，按 unicode-range 切片，
    // 用到哪几个字才下哪几片，不是一次拖几 MB。关掉网也只是退回系统字体，不会白板。
    const FONTS = [
        { id: 'skin', label: '跟随皮肤', note: '暖纸＝黑体，手账＝文楷' },
        { id: 'sans', label: '系统黑体', css: 'var(--font-sans)', note: '苹方 / 微软雅黑 · 零加载' },
        { id: 'song', label: '系统宋体', css: '"Songti SC",STSong,SimSun,"Noto Serif CJK SC",serif', note: '零加载' },
        { id: 'kai', label: '系统楷体', css: '"Kaiti SC",STKaiti,KaiTi,"Noto Serif CJK SC",serif', note: '零加载' },
        { id: 'yuan', label: '系统圆体', css: '"Yuanti SC","Hiragino Maru Gothic ProN",YouYuan,sans-serif', note: '苹果系统有，安卓多半没有' },
        { id: 'mono', label: '等宽', css: 'ui-monospace,"Sarasa Mono SC",Consolas,monospace', note: '零加载' },
        { id: 'wenkai', label: '霞鹜文楷', css: '"LXGW WenKai Screen",var(--font-sans)', pkg: 'cn-fontsource-lxgw-wen-kai-screen', note: '手写楷 · 需联网' },
        { id: 'xiaolai', label: '小赖字体', css: '"Xiaolai SC",var(--font-sans)', pkg: 'cn-fontsource-xiaolai-sc-regular', note: '圆润手写 · 需联网' },
        { id: 'yozai', label: '悠哉字体', css: '"Yozai",var(--font-sans)', pkg: 'cn-fontsource-yozai-regular', note: '随性手写 · 需联网' },
        { id: 'smiley', label: '得意黑', css: '"Smiley Sans Oblique",var(--font-sans)', pkg: 'cn-fontsource-smiley-sans-oblique-regular', note: '斜体黑 · 需联网' },
        { id: 'songti', label: '思源宋体', css: '"Source Han Serif SC VF",var(--font-sans)', pkg: 'cn-fontsource-source-han-serif-sc-vf-regular', note: '正经宋 · 需联网' },
        { id: 'fzkai', label: '方正楷体', css: '"FZKai-Z03",var(--font-sans)', pkg: 'cn-fontsource-fz-kai-z-03-regular', note: '标准楷 · 需联网' },
    ];
    const fontKey = 'fruit-heart-font';
    let font = hostWindow.localStorage.getItem(fontKey) || 'skin';
    if (!FONTS.some(item => item.id === font)) font = 'skin';
    const fontLoaded = {};
    function loadFont(pkg) {
        if (!pkg || fontLoaded[pkg]) return;
        fontLoaded[pkg] = true;
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fastly.jsdelivr.net/npm/' + pkg + '/font.css';
        // fastly 那条线偶尔不通，掉回主域再试一次；两条都不通就是退回系统字体，界面照样能用
        link.onerror = () => { link.onerror = null; link.href = 'https://cdn.jsdelivr.net/npm/' + pkg + '/font.css'; };
        doc.head.appendChild(link);
    }
    function currentFont() { return FONTS.find(item => item.id === font) || FONTS[0]; }
    function applyFont() {
        const item = currentFont();
        if (item.pkg) loadFont(item.pkg);
        if (item.css) root[0].style.setProperty('--font', item.css);
        else root[0].style.removeProperty('--font');
    }
    function applyTheme() {
        root.attr('data-theme', resolvedTheme());
        root.attr('data-skin', skin);
        applyFont();
        root.find('.fh-theme').text(resolvedTheme() === 'night' ? '☀' : '☾').attr('aria-label', resolvedTheme() === 'night' ? '切换日间主题' : '切换夜间主题');
    }
