    const QR_BUTTONS = /\/buttons\s+labels=\[[^\]]*\][^|]*/;
    function qrCommandFor(label, command) {
        if (!label) return command;
        return String(command).replace(QR_BUTTONS, `/pass "${label.replace(/"/g, '')}" `);
    }
    // ── QR 集：数据存在预设里，出厂内容来自 @喵喵电波MoM 的 QR 文件 ──
    // 每张卡就是酒馆 QR 里的一条指令：/buttons 出二级菜单，下面一堆 /if 分支接住。
    // 面板只在原文上做「外科手术」（改 labels 数组、改某个 /if 分支），其余一个字不动，
    // 所以导出去还是一份能被酒馆直接读的 QR 集，不装果实之心的人照样能用。
    const QR_SET_NAME = '🌟喵喵电波MoM快速回复QR（0622）';
    const QR_ENTRY = { label: '🌟喵喵电波QR(0201)', title: 'MoM 系预设配套 QR 工具，内含剧情控制、括号大法、大总结、大纲编写、写卡模式和提示词工程等功能' };
    const QR_NOTES = { 剧情控制: '推进 · 加速 · 减缓 · 换线，写进输入框不发送', 括号大法: '22 条括号提醒，写进输入框不发送', 总结模式: '总结后记得隐藏上文楼层', 大纲模式: '最终版留在聊天记录里', 写卡模式: '建议空卡对话，只留破限', 提示词工程: '把你的反馈变成改稿建议', 隐藏楼层: '输入范围，例如 0-10', 取消隐藏: '一般保留最近 5-10 楼', 自动继续: '直接发送「继续推进剧情」，不经过输入框' };
    const BRANCH_HEAD = /\/if\s+left=(?:option|mode)\s+rule=eq\s+right="([^"]*)"\s*\{:/g;
    const REQUEST_BODY = /^\s*\/setvar\s+key=final_message\s+"<!--\s*Request:([\s\S]*?)--!>"\s*$/;
    const ASK_MARK = /\{\{\s*输入\s*\}\}/;
    const ASK_MARK_G = /\{\{\s*输入\s*\}\}/g;
    const ASK_VAR = '{{getvar::fh_ask}}';

    // 「切换到IF线」的正文。默认 QR 集（fruit-heart-qr.json）里也是这一段，两边别改岔了。
    // 写法照抄隔壁那几条（推进剧情 / 切换其他故事线）：一条 /setvar，末尾挂 {{getvar::order}}。
    // 别再用 /if left={{getvar::order}} —— 那是把变量的值展开成参数，用户输入里有空格就断了。
    // 「自动继续」＝推进剧情，但不写输入框、直接发出去。做成独立大类而不是剧情控制里的一个标签：
    // 首页那排按钮是整条指令跑完，剧情控制开头有 /input，当标签用会先弹个输入框，就不"一键"了。
    const QR_AUTO_CARD = `/setvar key=final_message "<!-- Request:请在当前剧情的基础上继续推进剧情。维持已有节奏基础上，合理发展故事。 --!>" ||
/send {{getvar::final_message}} ||
/flushvar final_message ||
/trigger`;
    // v4 那版把它做成了剧情控制里的标签，还改了那张卡的尾部。这里把改动原样退回去。
    function undoAutoBranch(card) {
        let text = String(card.message);
        if (!text.includes('left=auto')) return text;
        text = dropBranch(text, '自动继续');
        const echo = /\/if left=auto rule=neq right="1" \{: \/setinput \{\{getvar::final_message\}\}(?: \| \/echo ([^:]*?))? :\} \|\|/.exec(text);
        text = text.replace(/\/if left=auto rule=eq right="1" \{: \/send \{\{getvar::final_message\}\} \| \/trigger :\} \|\|\n/, '');
        if (echo) text = text.replace(echo[0], '/setinput {{getvar::final_message}} ||' + (echo[1] ? '\n/echo ' + echo[1].trim() + ' ||' : ''));
        return text.replace(/\/flushvar auto \|\|\n/, '');
    }
    const QR_IF_BRANCH = `
  /setvar key=final_message "<!-- Request:开一条 IF 线。以当前这一幕为分叉点，假设一种不同的可能，并从这个假设出发重写接下来的发展；若下面没有写明假设，就由你挑一个有意思的分叉点（某个关键选择反过来、某个人没有出现、某件事早发生一天）。保留世界观、人物性格和既有关系，只改动这个假设直接波及的部分；人物的身份、年龄、所处时空若因此改变，要前后自洽。这是与主线并行的支线，不覆盖主线已经发生的事。{{getvar::order}} --!>"
`;
    function qrSeed() {
        return {
            name: QR_SET_NAME,
            entry: { ...QR_ENTRY },
            cards: QR_ORDER.map((label, index) => ({
                id: 'qr-seed-' + index, label, title: QR_NOTES[label] || '', message: QR_COMMANDS[label],
            })),
        };
    }
    // 她的 QR 集是导进来的（存在 config.qr 里），所以改默认的 QR_COMMANDS 到不了她那边。
    // 这里放后来新增的按钮，开面板时补一次，补过就记下版本号不再动 ——
    // 她要是自己把按钮删了，版本号已经涨过，不会又给她塞回去。
    const QR_SEED_VERSION = 5;
    const QR_PATCHES = [
        { since: 3, card: '剧情控制', label: '切换到IF线', body: QR_IF_BRANCH },

    ];
    async function upgradeQr() {
        const config = readConfig();
        if ((Number(config.qrSeedVersion) || 0) >= QR_SEED_VERSION) return;
        const set = config.qr;
        let touched = false;
        if (set && Array.isArray(set.cards)) {
            // 旧版 addBranch 插错位置，凡是在面板里加过标签的大类，分隔符都被偷掉了。
            // 全部卡都过一遍修回来；旧的「切换到IF线」写法也不对，摘掉重装。
            if ((Number(config.qrSeedVersion) || 0) < 3) {
                for (const card of set.cards) {
                    const fixed = normalizeQr(card.message);
                    const next = branchOf(fixed, '切换到IF线') ? dropBranch(fixed, '切换到IF线') : fixed;
                    if (next !== card.message) { card.message = next; touched = true; }
                }
            }
            // v4 把「自动继续」做成了剧情控制里的标签，现在改成独立大类，先把那一版退干净
            for (const card of set.cards) {
                const next = undoAutoBranch(card);
                if (next !== card.message) { card.message = next; touched = true; }
            }
            if ((Number(config.qrSeedVersion) || 0) < 5 && !set.cards.some(item => item.label === '自动继续')) {
                set.cards.push({ id: 'qr-auto-' + Date.now().toString(36), label: '自动继续',
                    title: '直接发送「继续推进剧情」，不经过输入框', message: QR_AUTO_CARD });
                touched = true;
            }
            for (const patch of QR_PATCHES) {
                if ((Number(config.qrSeedVersion) || 0) >= patch.since) continue;
                const card = set.cards.find(item => item.label === patch.card);
                if (!card || qrLabels(card.message).includes(patch.label)) continue;
                card.message = addBranch(card.message, patch.label, patch.body);
                if (patch.after) {            // 标签顺序＝菜单顺序，挪到指定的那个后面
                    const list = qrLabels(card.message).filter(x => x !== patch.label);
                    const at = list.indexOf(patch.after);
                    list.splice(at < 0 ? list.length : at + 1, 0, patch.label);
                    card.message = writeLabels(card.message, list);
                }
                touched = true;
            }
        }
        await updateBoth(preset => {
            const cfg = readConfig(preset);
            if (touched) cfg.qr = set;
            cfg.qrSeedVersion = QR_SEED_VERSION;
            writeConfig(preset, cfg);
            return preset;
        });
        if (touched) toast('success', '快捷指令已更新：剧情控制 → 切换到IF线');
    }
    function qrSet(config) {
        const set = config.qr;
        if (!set || !Array.isArray(set.cards) || !set.cards.length) return qrSeed();
        return set;
    }
    function qrSends(message) { return /(^|\n)\s*\/(?:send|trigger)\b/.test(String(message || '')); }

    // /buttons labels=[...] 那一段：只换数组，说明文字和后面的管道全留着
    function qrLabels(command) {
        const m = QR_BUTTONS.exec(String(command || ''));
        QR_BUTTONS.lastIndex = 0;
        if (!m) return [];
        const list = /labels=\[([^\]]*)\]/.exec(m[0]);
        return list ? [...list[1].matchAll(/"([^"]*)"/g)].map(x => x[1]) : [];
    }
    // /buttons labels=[...] 后面那一段，是酒馆弹出菜单时显示在顶上的说明。
    // 她原来的 QR 把用法和 @署名 都写在这儿（大纲模式那条谢的是 @Nanimo_Nai），
    // 面板之前只显示自己那句短 title，等于把作者写的说明和署名吞了。
    function qrDesc(message) {
        const m = QR_BUTTONS.exec(String(message || ''));
        QR_BUTTONS.lastIndex = 0;
        if (!m) return '';
        return m[0].replace(/^\/buttons\s+labels=\[[^\]]*\]/, '').trim();
    }
    function writeDesc(message, text) {
        const m = QR_BUTTONS.exec(String(message || ''));
        QR_BUTTONS.lastIndex = 0;
        if (!m) return String(message);
        const head = m[0].replace(/^(\/buttons\s+labels=\[[^\]]*\])[\s\S]*$/, '$1');
        const body = String(text || '').replace(/[|\n]/g, ' ').trim();
        return String(message).slice(0, m.index) + head + (body ? ' ' + body : '') + ' ' + String(message).slice(m.index + m[0].length);
    }
    function writeLabels(message, labels) {
        return String(message).replace(/labels=\[[^\]]*\]/, 'labels=[' + labels.map(x => `"${String(x).replace(/"/g, '')}"`).join(',') + ']');
    }
    // /if ... right="X" {: 正文 :} —— 正文里还能再套 {: :}，所以得数括号，不能光靠正则
    function qrBranches(message) {
        const text = String(message || '');
        const out = [];
        BRANCH_HEAD.lastIndex = 0;
        let hit;
        while ((hit = BRANCH_HEAD.exec(text))) {
            const bodyFrom = hit.index + hit[0].length;
            let depth = 1, cursor = bodyFrom;
            while (cursor < text.length && depth) {
                if (text.startsWith('{:', cursor)) { depth += 1; cursor += 2; }
                else if (text.startsWith(':}', cursor)) { depth -= 1; cursor += 2; }
                else cursor += 1;
            }
            if (hit[1]) out.push({ label: hit[1], head: hit.index, bodyFrom, bodyTo: cursor - 2, end: cursor });
            BRANCH_HEAD.lastIndex = cursor;
        }
        return out;
    }
    function branchOf(message, label) { return qrBranches(message).find(item => item.label === label) || null; }
    function branchBody(message, label) {
        const hit = branchOf(message, label);
        return hit ? String(message).slice(hit.bodyFrom, hit.bodyTo) : '';
    }
    function requestText(body) {
        const hit = REQUEST_BODY.exec(String(body || '').replace(/\/input[\s\S]*?\/if[^\n]*\n/, ''));
        return hit ? hit[1].trim() : null;
    }
    function makeBody(text, hint) {
        const ask = ASK_MARK.test(text);
        const filled = String(text).replace(ASK_MARK_G, ASK_VAR).replace(/"/g, '');
        const request = `\n  /setvar key=final_message "<!-- Request:${filled} --!>" \n`;
        if (!ask) return request;
        return `\n  /input okButton="确定" cancelButton="取消" ${String(hint || '想补一句什么？').replace(/[|{}"]/g, ' ')} |`
            + '\n  /setvar key=fh_ask {{pipe}} ||'
            + '\n  /if left={{getvar::fh_ask}} right="" rule=eq {: /flushvar fh_ask | /abort :} ||'
            + request;
    }
    function askHint(body) {
        const hit = /\/input\s+okButton="[^"]*"\s+cancelButton="[^"]*"\s+([^\n|]*)/.exec(String(body || ''));
        return hit ? hit[1].trim() : '';
    }
    function friendlyText(body) {
        const text = requestText(body);
        return text === null ? null : text.split(ASK_VAR).join('{{输入}}');
    }
    function saveBranch(message, label, body) {
        const hit = branchOf(message, label);
        if (!hit) return message;
        return String(message).slice(0, hit.bodyFrom) + body + String(message).slice(hit.bodyTo);
    }
    function renameBranch(message, from, to) {
        const hit = branchOf(message, from);
        if (!hit) return message;
        const text = String(message);
        const head = text.slice(hit.head, hit.bodyFrom).replace(`right="${from}"`, `right="${to}"`);
        const next = text.slice(0, hit.head) + head + text.slice(hit.bodyFrom);
        return writeLabels(next, qrLabels(next).map(x => (x === from ? to : x)));
    }
    // qrBranches 的 end 停在 :} 上，但 :} 后面那个 || 是这条分支的分隔符，属于它。
    // 插入必须插在 || 之后 —— 插在中间就等于把上一条分支的 || 偷走，上一条断链，
    // 整条命令在酒馆里解析失败，表现是「点完输入框就没反应了」。
    function branchTail(text, hit) {
        const pipe = /^[ \t]*\|\|/.exec(String(text).slice(hit.end));
        return hit.end + (pipe ? pipe[0].length : 0);
    }
    // 分支之间的分隔符是 `:} ||`。旧版 addBranch 插错了位置，每加一个标签就把上一条的 ||
    // 偷走一个 —— 上一条以 :} 结尾、链断在那儿，最后一条屁股后面攒一串 || || ||。
    // 酒馆解析到断点就整条放弃，表现就是「点完输入框没反应」。这里把 || 还回去。
    function normalizeQr(message) {
        let text = String(message).replace(/\|\|(?:[ \t]*\|\|)+/g, '||');
        const list = qrBranches(text);
        for (let i = list.length - 1; i >= 0; i -= 1) {      // 从后往前补，前面的下标才不会错位
            const hit = list[i];
            if (/^[ \t]*\|\|/.test(text.slice(hit.end))) continue;
            text = text.slice(0, hit.end) + ' ||' + text.slice(hit.end);
        }
        return text;
    }
    function addBranch(message, label, body) {
        const list = qrBranches(message);
        const at = list.length ? branchTail(message, list[list.length - 1]) : String(message).indexOf('\n', String(message).indexOf('/setvar key=option')) + 1;
        const text = writeLabels(message, [...qrLabels(message), label]);
        const cut = at + (text.length - String(message).length);   // labels 数组永远在分支前面，整体后移这么多
        return normalizeQr(text.slice(0, cut) + `\n\n/if left=option rule=eq right="${label}" {: ${body}:} ||` + text.slice(cut));
    }
    function dropBranch(message, label) {
        const hit = branchOf(message, label);
        const text = writeLabels(message, qrLabels(message).filter(x => x !== label));
        if (!hit) return text;
        const shift = text.length - String(message).length;
        return text.slice(0, hit.head + shift) + text.slice(hit.end + shift).replace(/^\s*\|\|/, '');
    }
    const NEW_CARD_BODY = message => `/buttons labels=["新标签"] ${message} |
/setvar key=option ||

/if left=option rule=eq right="" {: /flushvar option | /abort :} ||

/if left=option rule=eq right="新标签" {: 
  /setvar key=final_message "<!-- Request:  --!>" 
:} ||

/setvar key=origin_input {{input}} ||
/setvar key=merged_input "{{getvar::origin_input}}{{getvar::final_message}}" ||
/setinput {{getvar::merged_input}} ||
/echo 指令已填进输入框，可自行修改 ||

/flushvar option ||
/flushvar final_message ||`;

    // ── 导出：拼一份酒馆能直接读的 QR 集 ──
    // /run 认标签，而且是【在所有启用的 QR 集里从头找第一个同名的】（酒馆
    // executeQuickReplyByName 的实现）。她原来那套 0622 还开着，里面也有一条叫「剧情控制」，
    // 于是导入新集之后点进去跑的还是旧的那条 —— 新加的按钮当然不显示。
    // 写成 `集名.标签` 走酒馆的限定查找，就只会命中本集自己的那条。
    function qrExport(set) {
        const entryLabels = set.cards.map(card => card.label);
        // 名字里没有空格就别加引号 —— 原来那句 `/run 剧情控制` 就是不带引号的，照着来最稳
        const scoped = label => {
            const full = `${String(set.name).replace(/"/g, '')}.${String(label).replace(/"/g, '')}`;
            return /\s/.test(full) ? `"${full}"` : full;
        };
        const dispatch = `/buttons labels=[${entryLabels.map(x => `"${x.replace(/"/g, '')}"`).join(',')}] ${set.entry.title || set.name} |\n`
            + '/setvar key=option ||\n/if left=option rule=eq right="" {: /flushvar option | /abort :} ||\n'
            + entryLabels.map(x => `/if left=option rule=eq right="${x}" {: /flushvar option | /run ${scoped(x)} :} ||`).join('\n') + '\n';
        const item = (extra, index) => ({
            id: index * 2 + 2, showLabel: false, label: '', title: '', message: '', contextList: [],
            preventAutoExecute: true, isHidden: true, executeOnStartup: false, executeOnUser: false,
            executeOnAi: false, executeOnChatChange: false, executeOnGroupMemberDraft: false,
            executeOnNewChat: false, executeBeforeGeneration: false, automationId: '', ...extra,
        });
        const list = [item({ showLabel: true, isHidden: false, label: set.entry.label, title: set.entry.title, message: dispatch }, 0)]
            .concat(set.cards.map((card, index) => item({ label: card.label, title: card.title || '', message: card.message }, index + 1)));
        return {
            version: 2, name: set.name, disableSend: false, placeBeforeInput: false, injectInput: false,
            color: 'rgba(0, 0, 0, 0)', onlyBorderColor: true, qrList: list,
            idIndex: list.length * 2 + 2,   // 下一个可用 id，不能等于已经用掉的最大 id
        };
    }
    function qrImport(raw) {
        const box = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const list = Array.isArray(box?.qrList) ? box.qrList : null;
        if (!list || !list.length) throw new Error('这不像一份酒馆 QR 集');
        const visible = list.find(item => item.isHidden === false || item.showLabel === true);
        const rest = list.filter(item => item !== visible);
        const cards = (rest.length ? rest : list).filter(item => String(item.label || '').trim()).map((item, index) => ({
            id: 'qr-in-' + Date.now().toString(36) + '-' + index,
            label: String(item.label), title: String(item.title || ''), message: String(item.message || ''),
        }));
        if (!cards.length) throw new Error('这份 QR 集里没有可用的指令');
        return {
            name: String(box.name || QR_SET_NAME),
            entry: { label: String(visible?.label || QR_ENTRY.label), title: String(visible?.title || '') },
            cards,
        };
    }
    async function writeQr(mutate) {
        await updateBoth(preset => {
            const config = readConfig(preset);
            const set = JSON.parse(JSON.stringify(qrSet(config)));
            config.qr = mutate(set) || set;
            writeConfig(preset, config);
            return preset;
        });
    }
