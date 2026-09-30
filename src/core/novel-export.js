    // ── 导出小说：纯文本处理。不碰 DOM、不碰预设、不改聊天 ──
    // 这一段只收 chat 数组和选项，吐出字符串；测试直接把这个文件拿出来跑。
    // 标签名 → 显示名。认不出来的标签（角色卡自带的状态栏 <time> <coffee> 之类）按原名显示。
    const NX_LABELS = { content: '正文', snow: '小剧场', meow_FM: '摘要', branches: '选项', easter_egg: '彩蛋',
        prologue: '序言', profile: '角色表', char_date: '角色表', tableEdit: '表格', UpdateVariable: '变量',
        update_variable: '变量', online: '线上', emoji: '表情包', details: '折叠块', center: '居中标题' };
    // 这些永远不进小说：思维链、生图构思、结束标记。novel_header 不算内容，它拿去做章节名。
    const NX_DROP = /^(?:thinking|think|ecot|imgthink|finish|disclaimer|structure_sample|output_structure_sample)$/i;
    const NX_HEADER = 'novel_header';
    const NX_OPEN = /<([A-Za-z_一-鿿][\w一-鿿-]*)(?:\s[^<>]*)?>/g;
    function nxEscape(text) { return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    // 只拆最外层的 <tag>…</tag>。没有闭合的（<br>）当普通文字；同名嵌套会数层数。
    function nxBlocks(text) {
        const blocks = [];
        let outside = '', pos = 0;
        NX_OPEN.lastIndex = 0;
        let m;
        while ((m = NX_OPEN.exec(text))) {
            const name = m[1];
            const scan = new RegExp(`<(/?)${nxEscape(name)}(?:\\s[^<>]*)?>`, 'gi');
            scan.lastIndex = m.index + m[0].length;
            let depth = 1, hit;
            while (depth && (hit = scan.exec(text))) depth += hit[1] ? -1 : 1;
            if (depth) continue;                       // 找不到闭合：不是块，接着往后扫
            outside += text.slice(pos, m.index);
            blocks.push({ tag: name, inner: text.slice(m.index + m[0].length, hit.index) });
            pos = scan.lastIndex;
            NX_OPEN.lastIndex = pos;
        }
        outside += text.slice(pos);
        return { blocks, outside };
    }
    // 整条消息先过一遍：HTML 注释、没自动解析掉的思维链（开头一路到 </thinking>）、[finire] 之前的东西
    // 只有「没有开标签的思维链」才整段砍掉开头；成对的 <thinking>…</thinking> 交给 nxBlocks 当块丢掉，
    // 否则思维链写在正文后面时会把正文一起砍没。
    function nxPrepare(mes) {
        let text = String(mes || '').replace(/<!--[\s\S]*?-->/g, '');
        const close = /<\/(thinking|think|ecot)>/gi;
        let m, cut = -1;
        while ((m = close.exec(text))) {
            if (!new RegExp(`<${m[1]}(?:\\s[^<>]*)?>`, 'i').test(text.slice(0, m.index))) cut = close.lastIndex;
        }
        if (cut >= 0) text = text.slice(cut);
        return text.replace(/^[\s\S]*\[finire\]/i, '');
    }
    function nxHeader(inner) {
        const field = key => (new RegExp(`\\[${key}\\]\\s*([\\s\\S]*?)\\s*(?=\\[[A-Z]+\\]|$)`).exec(inner) || [])[1] || '';
        return { chap: field('CHAP').trim(), title: field('TITLE').trim() };
    }
    function nxChapterName(mode, index, header) {
        const title = header?.title || '';
        let head = `第${index}章`;
        if (mode === 'source' && header?.chap) head = /^\d+$/.test(header.chap) ? `第${Number(header.chap)}章` : header.chap;
        return title ? `${head}　${title}` : head;
    }
    // 酒馆正则写法 /…/flags 照认；导入的不带斜杠也当正则（和酒馆一样），面板里手打的不带斜杠当普通文字。
    function nxRule(rule) {
        const find = String(rule.find || '');
        if (!find) return null;
        const slash = /^\/([\s\S]+)\/([dgimsuvy]*)$/.exec(find);
        try {
            if (slash) return new RegExp(slash[1], slash[2].includes('g') ? slash[2] : slash[2] + 'g');
            return new RegExp(rule.regex ? find : nxEscape(find), 'g');
        } catch { return null; }
    }
    function nxApplyRules(text, rules) {
        for (const rule of rules || []) {
            if (!rule || rule.on === false) continue;
            const re = nxRule(rule);
            if (!re) continue;
            const literal = !rule.regex && !/^\/[\s\S]+\/[a-z]*$/.test(String(rule.find));
            const to = String(rule.replace ?? '');
            text = literal ? text.replace(re, () => to) : text.replace(re, to.replace(/\{\{match\}\}/gi, '$$&'));
        }
        return text;
    }
    const NX_ENTITIES = { nbsp: ' ', lt: '<', gt: '>', amp: '&', quot: '"', '#39': "'", apos: "'" };
    function nxClean(text, cleanMd) {
        text = text
            .replace(/<imgthink>[\s\S]*?<\/imgthink>/gi, '')
            .replace(/image###[\s\S]*?###/g, '')
            .replace(/<summary[^>]*>([\s\S]*?)<\/summary>/gi, '\n$1\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?(?:p|div|details|center|li|ul|ol|tr|h[1-6])(?:\s[^<>]*)?>/gi, '\n')
            .replace(/<\/?[A-Za-z_一-鿿][\w一-鿿-]*(?:\s[^<>]*)?\/?>/g, '')
            .replace(/&(nbsp|lt|gt|amp|quot|#39|apos);/g, (_, k) => NX_ENTITIES[k]);
        if (cleanMd) {
            text = text.split('\n').map(line => line
                .replace(/^\s*```.*$/, '')
                .replace(/^\s*#{1,6}\s+/, '')
                .replace(/^\s*>\s?/, '')
                .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/, '')
                .replace(/^(\s*)[-*+]\s+/, '$1· ')
                .replace(/\*+|__|~~|\|\||`/g, ''))
                .join('\n');
        }
        return text;
    }
    function nxParas(text, mode) {
        if (mode === 'raw') return text.replace(/\n{3,}/g, '\n\n').trim();
        const lines = text.split('\n').map(line => line.replace(/^[\s　]+|[\s　]+$/g, '')).filter(Boolean);
        if (mode === 'indent') return lines.map(line => '　　' + line).join('\n');
        return lines.join('\n\n');
    }
    function nxCountChars(text) { return (String(text).match(/[^\s　]/g) || []).length; }
    function nxRange(chat, from, to) {
        const last = chat.length - 1;
        let a = Math.max(0, Math.min(last, Number.isFinite(+from) ? Math.floor(+from) : 0));
        let b = Math.max(0, Math.min(last, Number.isFinite(+to) && String(to) !== '' ? Math.floor(+to) : last));
        if (a > b) [a, b] = [b, a];
        return [a, b];
    }
    // 范围里出现过哪些块、各在几层里出现 —— 给「保留哪些内容」那排胶囊用
    function nxDetect(chat, from, to, hidden) {
        const counts = new Map();
        let header = 0, users = 0, floors = 0;
        const [a, b] = nxRange(chat, from, to);
        for (let i = a; i <= b && chat.length; i++) {
            const m = chat[i];
            if (!m || (m.is_system && !hidden)) continue;
            floors++;
            if (m.is_user) users++;
            const seen = new Set();
            for (const block of nxBlocks(nxPrepare(m.mes)).blocks) {
                if (block.tag === NX_HEADER) { if (!seen.has(NX_HEADER)) header++; seen.add(NX_HEADER); continue; }
                if (NX_DROP.test(block.tag) || seen.has(block.tag)) continue;
                seen.add(block.tag);
                counts.set(block.tag, (counts.get(block.tag) || 0) + 1);
            }
        }
        return { counts, header, users, floors, range: [a, b] };
    }
    // limit：只要前多少字（预览用），够了就停
    function nxRun(chat, opt, limit = Infinity) {
        const keep = new Set(opt.keep || []);
        const [a, b] = nxRange(chat, opt.from, opt.to);
        const parts = [];
        let length = 0, floors = 0, chapters = 0, chars = 0, first = -1, last = -1, truncated = false;
        for (let i = a; i <= b && chat.length; i++) {
            const m = chat[i];
            if (!m || (m.is_system && !opt.hidden) || (m.is_user && opt.user === 'omit')) continue;
            const { blocks, outside } = nxBlocks(nxPrepare(m.mes));
            const headerBlock = blocks.find(block => block.tag === NX_HEADER);
            const kept = blocks.filter(block => keep.has(block.tag) && !NX_DROP.test(block.tag) && block.tag !== NX_HEADER);
            let raw;
            if (kept.length) raw = kept.map(block => block.tag === 'content' ? block.inner : `【${NX_LABELS[block.tag] || block.tag}】\n${block.inner}`).join('\n\n');
            else if (opt.orphan !== 'skip') raw = outside;
            else continue;
            let body = nxParas(nxClean(nxApplyRules(raw, opt.rules), opt.cleanMd !== false), opt.para);
            if (!body) continue;
            const head = [];
            if (!m.is_user && opt.chapter && opt.chapter !== 'none') {
                // 第 0 楼是开场白：没写小说标题就叫「序章」，不占章号
                if (i === 0 && !headerBlock) head.push('序章');
                else { chapters++; head.push(nxChapterName(opt.chapter, chapters, headerBlock ? nxHeader(headerBlock.inner) : null)); }
            }
            const who = [opt.speaker ? String(m.name || (m.is_user ? '我' : '')) : '', opt.floorNo ? `#${i}` : ''].filter(Boolean).join(' · ');
            if (who) head.push(`【${who}】`);
            const piece = (head.length ? head.join('\n\n') + '\n\n' : '') + body;
            parts.push(piece);
            floors++; chars += nxCountChars(body);
            if (first < 0) first = i;
            last = i;
            length += piece.length;
            if (length >= limit) { truncated = i < b; break; }
        }
        let cover = '';
        if (opt.cover) {
            const lines = [`《${opt.title || '未命名'}》`, ''];
            if (opt.meta?.character) lines.push(`角色：${opt.meta.character}`);
            if (first >= 0) lines.push(`楼层：${first} – ${last}（共 ${floors} 层）`);
            lines.push(`字数：约 ${chars.toLocaleString('zh-CN')} 字`);
            if (opt.meta?.time) lines.push(`导出：${opt.meta.time}`);
            lines.push('', '————————————');
            cover = lines.join('\n') + '\n\n\n';
        }
        return { text: cover + parts.join('\n\n\n'), floors, chapters, chars, first, last, truncated, range: [a, b] };
    }
