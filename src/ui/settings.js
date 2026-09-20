    function renderSettings() {
        const preset = activePreset();
        const config = readConfig(preset);
        const names = Object.keys(config.profiles || {});
        const data = sectionData(preset);
        const hidden = new Set(config.hiddenSections || []);
        let plan; try { plan = sectionPlan(preset); } catch { plan = { total: 0, adds: [], moves: [], newHeads: [] }; }
        const homeList = homeOrder(config);
        main.html(`${titleBlock('设置', '本脚本功能和结构借鉴了 @电波系 的日月西预设脚本、@NUE 的脚本。')}
          <section class="fh-card"><div class="fh-card-head"><h3>模型联动</h3><p>跟随插头处的连接模型切换预设模型组。无法识别时保留当前选择；此设置保存在本浏览器。</p></div>
            <label class="fh-toggle"><span>跟随连接模型</span><button class="fh-sw ${modelLinkEnabled ? 'on' : ''}" data-action="toggle-model-link" role="switch" aria-label="跟随连接模型" aria-checked="${modelLinkEnabled}"></button></label></section>
          ${nsfwAutoCard(preset)}
          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>脚本更新</h3><p>当前版本 v${h(SCRIPT_VERSION)}</p></div><div class="fh-card-actions"><button class="fh-btn" data-nav="updates">查看更新记录</button></div></section>
          <section class="fh-card"><div class="fh-card-head"><h3>面板显示</h3><p>全屏铺满当前网页可视区域。清理仅重置显示偏好、悬浮球位置和面板索引，不删除预设、聊天、方案或思维链设置。</p></div><div class="fh-card-actions"><button class="fh-btn" data-action="fullscreen">切换面板全屏</button><button class="fh-btn" data-action="clear-panel-cache">清理面板缓存</button></div></section>
          <section class="fh-card"><div class="fh-card-head"><h3>方案</h3><p>整套开关组合。存在预设里，分享预设时跟着走。</p></div>
            <div class="fh-pad">${names.length ? names.map(name => `<button class="fh-btn ${config.activeProfile === name ? 'on' : ''}" data-profile="${h(name)}">${h(name)}</button>`).join('') : '<span class="fh-dim">还没有保存过方案</span>'}</div>
            <div class="fh-card-actions"><button class="fh-btn primary" data-action="profile-save">保存当前为方案</button>
              <button class="fh-btn" data-action="profile-export" ${names.length ? '' : 'disabled'}>导出</button>
              <button class="fh-btn" data-action="profile-import">导入</button>
              <button class="fh-btn" data-action="profile-delete" ${names.length ? '' : 'disabled'}>删除当前方案</button></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>思维链折叠设置</h3>
            <p>在下方写入思维链的结束标签，例如 <code>&lt;/thinking&gt;</code>，可自动把思考内容折叠进酒馆原生的自动解析。支持多个标签同时出现，也支持手动添加新标签。</p></div>
            <textarea id="fh-ecot-end-tags" rows="4" spellcheck="false">${h(ecotEndTags().join('\n'))}</textarea>
            <div class="fh-card-actions"><button class="fh-btn primary" data-action="ecot-save-tags">保存</button><button class="fh-btn" data-action="ecot-reset-tags">恢复默认</button>
              <button class="fh-btn" data-action="ecot-apply">重新配置酒馆解析</button><button class="fh-btn" data-action="ecot-scan">整理历史消息</button>
              <span class="fh-dim">${h(ecotStatus())}</span></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>同步条目变化</h3>
            <p>你在酒馆里往区里加了新条目、或者把条目拖去了别的区，点一下这里，脚本就按前台顺序重新认一遍：每条归到它上面最近的那条区头。不改开关、不改正文。</p>
            <p class="fh-mt"><b>横线怎么分：</b><code>━━ 名字 ━━</code> 和 <code>——名字——</code> 都是<b>大区</b>，各自独立成一个分区；<code>--名字--</code>（两个半角连字符）是<b>小区</b>，只是区内的小标题，下面的条目仍算上一个大区的。</p></div>
            <div class="fh-pad">${plan.total ? `<span class="fh-dim">${plan.adds.length ? '新条目 ' + plan.adds.length + ' 条　' : ''}${plan.moves.length ? '挪了区 ' + plan.moves.length + ' 条　' : ''}${plan.newHeads.length ? '新区 ' + plan.newHeads.length + ' 个' : ''}</span>` : '<span class="fh-dim">都对得上，没有要同步的</span>'}</div>
            ${plan.total ? `<div class="fh-chips">${[...plan.adds, ...plan.moves].slice(0, 10).map(x => `<i class="fh-g">${h(syncLabel(x.name))} → ${h(plan.nameOf(x.to))}</i>`).join('')}${plan.total > 10 ? `<i class="fh-g">…等 ${plan.total} 处</i>` : ''}</div>` : ''}
            <div class="fh-card-actions"><button class="fh-btn primary" data-action="sections-sync" ${plan.total ? '' : 'disabled'}>同步进脚本</button></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>首页栏目</h3>
            <p>按住 ⠿ 上下拖排顺序；右边的开关决定这一栏默认是展开还是收起。跟着方案存进预设。</p></div>
            <div class="fh-pad"><div class="fh-sortlist" data-home-sort>${homeList.map(id => {
              const item = HOME_CARDS.find(x => x[0] === id) || [id, id, false];
              const open = (config.homeOpen || {})[id] !== false;
              return `<div class="fh-sortrow" data-sort-id="${h(id)}"><i class="fh-grip">⠿</i><b>${h(item[1])}</b>
                ${item[2] ? `<button class="fh-sw ${open ? 'on' : ''}" data-home-open="${h(id)}" role="switch" aria-checked="${open}" aria-label="默认展开"></button>`
                  : '<span class="fh-dim">常驻</span>'}</div>`;
            }).join('')}</div></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>条目页显示哪些区</h3><p>勾上的才会出现在「条目」里。不影响预设本身，只是少往下翻。</p></div>
            <div class="fh-chips">${data.groups.map(g => `<button class="fh-chip ${hidden.has(g.id) ? '' : 'on'}" data-section-show="${h(g.id)}">${h(g.name)}</button>`).join('')}</div>
            <div class="fh-card-actions"><button class="fh-btn" data-action="sections-all">全选</button><button class="fh-btn" data-action="sections-none">全不选</button></div></section>

          <section class="fh-card fh-mt"><div class="fh-card-head"><h3>外观与入口</h3></div>
            <div class="fh-row"><span class="fh-k">主题</span><span class="fh-seg">
              <button class="${theme === 'day' ? 'on' : ''}" data-theme-set="day">日间</button>
              <button class="${theme === 'night' ? 'on' : ''}" data-theme-set="night">夜间</button>
              <button class="${theme === 'system' ? 'on' : ''}" data-theme-set="system">跟随系统</button></span></div>
            <div class="fh-row"><span class="fh-k">皮肤</span><span class="fh-seg">
              ${SKINS.map(([id, label]) => `<button class="${skin === id ? 'on' : ''}" data-skin-set="${id}">${h(label)}</button>`).join('')}</span></div>
            <div class="fh-row"><span class="fh-k">字体</span><div class="fh-v">
              <button class="fh-sel on" data-pick-font aria-label="字体">${h(currentFont().label)}<i>▾</i></button></div></div>
            <label class="fh-toggle fh-mt"><span>快捷回复栏入口</span><button class="fh-sw ${entryBar ? 'on' : ''}" data-entry-toggle="bar" role="switch" aria-checked="${entryBar}"></button></label>
            <div class="fh-row"><span class="fh-k">悬浮猫大小</span><span class="fh-seg">${BALL_SIZES
              .map(([id, label]) => `<button class="${ballSize === id ? 'on' : ''}" data-ball-size="${id}">${label}</button>`).join('')}</span></div>
            <label class="fh-toggle"><span>🐱悬浮猫咪</span><button class="fh-sw ${entryBall ? 'on' : ''}" data-entry-toggle="ball" role="switch" aria-checked="${entryBall}"></button></label>
            <label class="fh-toggle"><span>楼层跳转｜尾巴与爪子<small>球上面是尾巴、下面是身子：点一下本层顶/底，再点一下上/下一层</small></span><button class="fh-sw ${jumpNav ? 'on' : ''}" data-entry-toggle="jump" role="switch" aria-checked="${jumpNav}"></button></label>
            <div class="fh-card-actions"><button class="fh-btn danger" data-action="kill-script">彻底关闭脚本</button></div></section>

          <section class="fh-card fh-mt danger"><div class="fh-card-head"><h3>脚本与预设重置</h3>
            <p>⚠️ 危险操作，本操作会初始化到脚本原始状态，请注意保存导出。</p></div>
            <div class="fh-card-actions"><button class="fh-btn" data-action="restore-params">恢复预设初始参数</button>
              <button class="fh-btn danger" data-action="reset-prompt-states">重置全部开关</button></div></section>`);
        bindHomeSort();
    }

