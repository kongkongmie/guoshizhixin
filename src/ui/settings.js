    // 设置页分四组，按「这条设置影响谁」排：
    //   自动化＝脚本替你做的事 / 预设＝会跟着预设分享出去 / 面板＝只影响你自己看到的 / 关于与重置
    // 每张卡正文只留一句话，细节收进 <details>，手机上不刷屏。
    function settingsGroup(title, note, body) {
        return `<div class="fh-sect"><b>${h(title)}</b>${note ? `<span>${h(note)}</span>` : ''}</div>${body}`;
    }
    function settingsDoc(summary, body) {
        return `<details class="fh-doc"><summary>${h(summary)}</summary><div>${body}</div></details>`;
    }
    function renderSettings() {
        const preset = activePreset();
        const config = readConfig(preset);
        const draft = nsfwEditStart(config);
        const names = Object.keys(config.profiles || {});
        const data = sectionData(preset);
        const hidden = new Set(config.hiddenSections || []);
        let plan; try { plan = sectionPlan(preset); } catch { plan = { total: 0, adds: [], moves: [], newHeads: [] }; }
        const homeList = homeOrder(config);
        const tagBox = (kind, label, note, placeholder) => `<div class="fh-tagbox">
            ${label || note ? `<div class="fh-row"><span class="fh-k">${h(label)}</span><span class="fh-n">${h(note)}</span></div>` : ''}
            <div class="fh-tags">${nsfwTags(kind, draft[kind])}</div>
            <div class="fh-tagadd"><input data-nsfw-add="${kind}" type="text" placeholder="${h(placeholder)}"><button class="fh-btn" data-nsfw-addbtn="${kind}">加</button></div></div>`;

        const auto = `
          <section class="fh-card"><label class="fh-toggle"><span>插头模型自动跟随<small>自动识别插头选取模型，跟随切换预设对应词条。识别失败将保持预设不动。</small></span>
            <button class="fh-sw ${modelLinkEnabled ? 'on' : ''}" data-action="toggle-model-link" role="switch" aria-label="跟随连接模型" aria-checked="${modelLinkEnabled}"></button></label></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>预设NSFW模块总控</h3>
            <p>首页「自动」NSFW 的判定机制：</p></div>

            <div class="fh-mech"><div class="fh-mech-head"><i>机制 1</i><b>发送前读取摘要内的NSFW进度</b><span class="fh-n">默认内置</span></div>
              <p class="fh-note">发送前读取 <b>📌 摘要</b> 里的 NSFW 进度，处于 NSFW 场景则打开 NSFW 模块，否则关闭。</p></div>

            <div class="fh-mech"><div class="fh-mech-head"><i>机制 2</i><b>检测用户最新输入</b><span class="fh-n">命中任一词汇均生效</span></div>
              ${tagBox('open', '', '', '加一个词，回车')}
              <p class="fh-note fh-pad">默认扫描用户最新输入；当摘要被关闭时，同时扫描<b>上一回合正文</b>兜底。</p>
              ${tagBox('close', '关闭词（谨慎添加）', 'NSFW 结束信号，命中立刻生效，优先于启动词', '加一个词，回车')}</div>

            <div class="fh-mech"><div class="fh-mech-head"><i>机制 3</i><b>事后缓冲</b><span class="fh-n">按回合生效</span></div>
              <div class="fh-row fh-stack"><span class="fh-k">控制摘要脱离 NSFW 后，NSFW 指导继续生效几回合</span><div class="fh-v"><span class="fh-seg">${[0, 1, 2]
                .map(n => `<button class="${draft.hold === n + 1 ? 'on' : ''}" data-nsfw-hold="${n + 1}" title="NSFW 场景结束${n ? ' + ' + n + ' 回合' : ''}后关闭 NSFW 模块">${n} 回合</button>`).join('')}</span></div></div></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>世界书 NSFW 词条总控 <i class="fh-g">实验性功能</i></h3>
            <p>⚠️ 本功能自动识别<b>已打开</b>的 ① 角色世界书和 ② 挂在全局的世界书中带有标记词（如 NSFW）的词条，控制它们是否被发送。</p>
            <p class="fh-mt">❗️ 对关闭的词条无效。</p>
            <p class="fh-mt">❓️ 本功能不会修改世界书，通过发送拦截实现控制功能，所以需要控制的条目必须打开。</p></div>
            ${wbAvailable() ? '' : '<p class="fh-note fh-pad">你的酒馆版本或酒馆助手版本过低，不支持该功能，请升级后重试。</p>'}

            <div class="fh-mech"><div class="fh-mech-head"><i>机制 1</i><b>🔵 蓝灯条目</b><span class="fh-n">自动控制</span></div>
              <label class="fh-toggle"><span>控制蓝灯条目</span><button class="fh-sw ${wbEnabled ? 'on' : ''}" data-action="nsfw-wb-toggle"
                role="switch" aria-label="控制蓝灯条目" aria-checked="${wbEnabled}" ${wbAvailable() ? '' : 'disabled'}></button></label>
              <p class="fh-note fh-pad">打开开关，脚本将自动判断 NSFW 决定是否发送 NSFW 设定给模型，可节省 token 稳定人设。</p></div>

            <div class="fh-mech"><div class="fh-mech-head"><i>机制 2</i><b>🟢 绿灯条目</b><span class="fh-n">自动控制 ⚠️谨慎开关</span></div>
              <label class="fh-toggle"><span>连绿灯一起拦</span><button class="fh-sw ${wbGreen ? 'on' : ''}" data-action="nsfw-wb-green"
                role="switch" aria-label="连绿灯一起拦" aria-checked="${wbGreen}" ${wbEnabled && wbAvailable() ? '' : 'disabled'}></button></label>
              <p class="fh-note fh-pad">NSFW 开启时，绿灯条目照常按关键词触发；<b>NSFW 关闭时，带触发词的绿灯条目一律不发送</b>，即使关键词命中。</p></div>

            <div class="fh-mech"><div class="fh-mech-head"><i>触发词</i><b>看条目名称是否含有以下词汇</b><span class="fh-n">不分大小写</span></div>
              ${tagBox('wbMark', '条目名带这些词汇', '将被脚本自动控制是否发送', '比如 🔞 或 涩涩，回车')}</div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>思维链折叠</h3>
            <p>写上思维链的结束标签，思考内容就能折进酒馆原生的自动解析。一行一个。</p></div>
            <textarea id="fh-ecot-end-tags" rows="4" spellcheck="false">${h(ecotEndTags().join('\n'))}</textarea>
            <div class="fh-card-actions"><button class="fh-btn primary" data-action="ecot-save-tags">保存</button><button class="fh-btn" data-action="ecot-reset-tags">恢复默认</button>
              <button class="fh-btn" data-action="ecot-apply">重新配置酒馆解析</button><button class="fh-btn" data-action="ecot-scan">整理历史消息</button></div>
            <p class="fh-note fh-pad">${h(ecotStatus())}</p></section>`;

        const presetPart = `
          <section class="fh-card"><div class="fh-card-head"><h3>方案</h3>
            <p>把整套开关组合存下来。存在预设里，分享预设时跟着走。</p></div>
            <div class="fh-pad">${names.length ? names.map(name => `<button class="fh-btn ${config.activeProfile === name ? 'on' : ''}" data-profile="${h(name)}">${h(name)}</button>`).join('') : '<span class="fh-dim">还没有保存过方案</span>'}</div>
            <div class="fh-card-actions"><button class="fh-btn primary" data-action="profile-save">保存当前为方案</button>
              <button class="fh-btn" data-action="profile-export" ${names.length ? '' : 'disabled'}>导出</button>
              <button class="fh-btn" data-action="profile-import">导入</button>
              <button class="fh-btn" data-action="profile-delete" ${names.length ? '' : 'disabled'}>删除当前方案</button></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>同步条目变化</h3>
            <p>你在酒馆里加了条目、或把条目拖去别的区之后，点一下这里让脚本重新认一遍。</p></div>
            <div class="fh-pad">${plan.total ? `<span class="fh-dim">${plan.adds.length ? '新条目 ' + plan.adds.length + ' 条　' : ''}${plan.moves.length ? '挪了区 ' + plan.moves.length + ' 条　' : ''}${plan.newHeads.length ? '新区 ' + plan.newHeads.length + ' 个' : ''}</span>` : '<span class="fh-dim">都对得上，没有要同步的</span>'}</div>
            ${plan.total ? `<div class="fh-chips">${[...plan.adds, ...plan.moves].slice(0, 10).map(x => `<i class="fh-g">${h(syncLabel(x.name))} → ${h(plan.nameOf(x.to))}</i>`).join('')}${plan.total > 10 ? `<i class="fh-g">…等 ${plan.total} 处</i>` : ''}</div>` : ''}
            ${settingsDoc('它按什么认区',
              '<p>每条归到它上面最近的那条区头。<b>不改开关、不改正文。</b></p>'
              + '<p><code>━━ 名字 ━━</code> 和 <code>——名字——</code> 都是<b>大区</b>，各自独立成一个分区；'
              + '<code>--名字--</code>（两个半角连字符）是<b>小区</b>，只是区内的小标题，下面的条目仍算上一个大区的。</p>')}
            <div class="fh-card-actions"><button class="fh-btn primary" data-action="sections-sync" ${plan.total ? '' : 'disabled'}>同步进脚本</button></div></section>`;

        const panel = `
          <section class="fh-card"><div class="fh-card-head"><h3>首页栏目</h3>
            <p>按住 ⠿ 拖排顺序；右边的开关决定这一栏默认展开还是收起。</p></div>
            <div class="fh-pad"><div class="fh-sortlist" data-home-sort>${homeList.map(id => {
              const item = HOME_CARDS.find(x => x[0] === id) || [id, id, false];
              const open = (config.homeOpen || {})[id] !== false;
              return `<div class="fh-sortrow" data-sort-id="${h(id)}"><i class="fh-grip">⠿</i><b>${h(item[1])}</b>
                ${item[2] ? `<button class="fh-sw ${open ? 'on' : ''}" data-home-open="${h(id)}" role="switch" aria-checked="${open}" aria-label="默认展开"></button>`
                  : '<span class="fh-dim">常驻</span>'}</div>`;
            }).join('')}</div></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>条目页显示哪些区</h3>
            <p>勾上的才会出现在「条目」里。不影响预设本身，只是少往下翻。</p></div>
            <div class="fh-chips">${data.groups.map(g => `<button class="fh-chip ${hidden.has(g.id) ? '' : 'on'}" data-section-show="${h(g.id)}">${h(g.name)}</button>`).join('')}</div>
            <div class="fh-card-actions"><button class="fh-btn" data-action="sections-all">全选</button><button class="fh-btn" data-action="sections-none">全不选</button></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>外观</h3></div>
            <div class="fh-row"><span class="fh-k">主题</span><span class="fh-seg">
              <button class="${theme === 'day' ? 'on' : ''}" data-theme-set="day">日间</button>
              <button class="${theme === 'night' ? 'on' : ''}" data-theme-set="night">夜间</button>
              <button class="${theme === 'system' ? 'on' : ''}" data-theme-set="system">跟随系统</button></span></div>
            <div class="fh-row"><span class="fh-k">皮肤</span><span class="fh-seg">
              ${SKINS.map(([id, label]) => `<button class="${skin === id ? 'on' : ''}" data-skin-set="${id}">${h(label)}</button>`).join('')}</span></div>
            <div class="fh-row"><span class="fh-k">字体</span><div class="fh-v">
              <button class="fh-sel on" data-pick-font aria-label="字体">${h(currentFont().label)}<i>▾</i></button></div></div>
            <div class="fh-card-actions"><button class="fh-btn" data-action="fullscreen">切换面板全屏</button></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>打开面板的入口</h3>
            <p>两个入口各管各的，都关掉也能从左下角魔杖菜单进。</p></div>
            <label class="fh-toggle"><span>快捷回复栏入口</span><button class="fh-sw ${entryBar ? 'on' : ''}" data-entry-toggle="bar" role="switch" aria-checked="${entryBar}"></button></label>
            <label class="fh-toggle"><span>🐱 悬浮猫咪</span><button class="fh-sw ${entryBall ? 'on' : ''}" data-entry-toggle="ball" role="switch" aria-checked="${entryBall}"></button></label>
            <div class="fh-row"><span class="fh-k">悬浮猫大小</span><span class="fh-seg">${BALL_SIZES
              .map(([id, label]) => `<button class="${ballSize === id ? 'on' : ''}" data-ball-size="${id}">${label}</button>`).join('')}</span></div>
            <label class="fh-toggle"><span>楼层跳转｜尾巴与爪子<small>球上面是尾巴、下面是身子：点一下本层顶/底，再点一下上/下一层</small></span><button class="fh-sw ${jumpNav ? 'on' : ''}" data-entry-toggle="jump" role="switch" aria-checked="${jumpNav}"></button></label></section>`;

        const about = `
          <section class="fh-card"><div class="fh-card-head"><h3>脚本更新</h3>
            <p>当前版本 v${h(SCRIPT_VERSION)}</p></div>
            <div class="fh-card-actions"><button class="fh-btn" data-nav="updates">查看更新记录</button></div></section>

          <section class="fh-card fh-mt danger"><div class="fh-card-head"><h3>重置与关闭</h3>
            <p>⚠️ 下面几项会改动现状，动手前先把方案导出。</p></div>
            ${settingsDoc('每一项分别做什么',
              '<p><b>清理面板缓存</b>：只重置显示偏好、悬浮球位置和面板索引。不删预设、聊天、方案和思维链设置。</p>'
              + '<p><b>恢复预设初始参数</b>：把采样参数等读回具名预设文件里存的那一份。</p>'
              + '<p><b>重置全部开关</b>：把所有条目恢复到预设作者定的出厂组合。</p>'
              + '<p><b>彻底关闭脚本</b>：移除面板和所有入口，直到下次重新载入预设。</p>')}
            <div class="fh-card-actions"><button class="fh-btn" data-action="clear-panel-cache">清理面板缓存</button>
              <button class="fh-btn" data-action="restore-params">恢复预设初始参数</button>
              <button class="fh-btn danger" data-action="reset-prompt-states">重置全部开关</button>
              <button class="fh-btn danger" data-action="kill-script">彻底关闭脚本</button></div></section>`;

        main.html(`${titleBlock('设置', '功能与结构借鉴 @电波系 的日月西预设脚本、@NUE 的脚本。')}
          ${settingsGroup('自动化', '果实之心可以自动控制的功能', auto)}
          ${settingsGroup('预设', '跟随预设保存', presetPart)}
          ${settingsGroup('面板', '你选的会成为这份预设的开局默认', panel)}
          ${settingsGroup('关于与重置', '', about)}`);
        bindHomeSort();
    }
