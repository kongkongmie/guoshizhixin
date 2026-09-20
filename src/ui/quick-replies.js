    function qrTagForm(state) {
        const friendly = state.kind !== 'raw';
        const sends = qrSends(state.raw || '');
        return `<div class="fh-qr-form">
          ${friendly ? `<p class="fh-qr-tip">点这个按钮时：把下面这段话${sends ? '<b>直接发出去</b>，立刻开始生成。' : '<b>写进输入框</b>，你看过再发。'}<br>
            句子中间要留个空、每次临时填？在那个位置写 <code>{{输入}}</code> —— 点的时候会先问你，填的字就插在那儿。</p>` : ''}
          <input type="text" data-qr-name maxlength="24" placeholder="标签名" value="${h(state.label || '')}">
          <textarea data-qr-text rows="${friendly ? 4 : 8}" spellcheck="false" class="${friendly ? '' : 'mono'}"
            placeholder="${friendly ? '写进输入框的要求，例如：这一回合不要出现眼泪。' : '这一条是原始 Slash 指令，整段照改。'}">${h(state.text || '')}</textarea>
          ${friendly ? `<input type="text" data-qr-hint maxlength="30" ${ASK_MARK.test(state.text || '') ? '' : 'hidden'}
            placeholder="点它时问你什么？（选填）" value="${h(state.hint || '')}">` : `<p class="fh-qr-tip">这条的写法面板读不懂（多半是直接发送、或者带了别的酒馆指令），所以整段原文给你改。<br>
            <b>只改文字、别动斜杠开头的那些行和行尾的 <code>|</code> <code>||</code></b> —— 那些是酒馆的断句符号，少一个整条就不灵了。</p>`}
          <button class="fh-btn primary" data-action="qr-tag-save">保存</button>
          <button class="fh-btn" data-action="qr-tag-cancel">取消</button>
          ${state.exists ? '<button class="fh-btn danger" data-action="qr-tag-delete">删掉</button>' : ''}</div>`;
    }
    function qrCardForm(card) {
        return `<div class="fh-qr-form">
          <input type="text" data-card-label maxlength="20" placeholder="大类名，例如 剧情控制" value="${h(card.label)}">
          <input type="text" data-card-title maxlength="60" placeholder="这一类是干嘛的，一句话" value="${h(card.title || '')}">
          ${QR_BUTTONS.test(card.message) ? `<textarea data-card-desc rows="3" maxlength="400" spellcheck="false"
            placeholder="点开这一类时，菜单顶上显示的说明。用法、注意事项、@谁的灵感，都写这儿 —— 导出后酒馆原生也照样显示。">${h(qrDesc(card.message))}</textarea>` : ''}
          <button class="fh-btn primary" data-action="qr-card-save">保存</button>
          <button class="fh-btn" data-action="qr-card-cancel">取消</button>
          <button class="fh-btn danger" data-action="qr-card-delete">删掉整个大类</button></div>`;
    }
    function renderQr() {
        const config = readConfig();
        const set = qrSet(config);
        const edit = qrEdit;
        main.html(`${titleBlock('快捷指令 QR', edit ? '改完记得导出，这份文件酒馆能直接当 QR 集读回去，不装果实之心的人也能用。' : '出厂内容来自 @喵喵电波MoM 的 QR 集；这里把二级菜单摊开了。')}
          <div class="fh-toolbar">
            ${edit ? `<div class="fh-search"><input data-qr-setname type="text" value="${h(set.name)}" placeholder="这套 QR 叫什么"></div>` : `<span class="fh-dim" style="flex:1">${h(set.name)} · ${set.cards.length} 类</span>`}
            <button class="fh-btn ${edit ? 'on' : 'solid'}" data-action="qr-edit">${edit ? '完成编辑' : '编辑指令'}</button></div>
          ${edit ? `<div class="fh-pad fh-mt"><button class="fh-btn" data-action="qr-export">导出给别人</button>
            <button class="fh-btn" data-action="qr-import">导入 QR 集</button>
            <button class="fh-btn danger" data-action="qr-reset">恢复出厂</button></div>` : ''}
          <div class="fh-qr-list fh-mt">${set.cards.map(card => {
            const labels = qrLabels(card.message);
            const sends = qrSends(card.message);
            const editingCard = edit && qrCardEdit === card.id;
            const tag = qrTag && qrTag.card === card.id ? qrTag : null;
            return `<section class="fh-qr-card"><div class="fh-qr-head"><strong>${h(card.label)}</strong>
                ${sends ? '<span class="fh-tag">会触发生成</span>' : '<span class="fh-tag quiet">只写输入框</span>'}
                ${edit ? `<button class="fh-x" data-card-edit="${h(card.id)}" title="改大类名和说明">✎</button>` : ''}</div>
              <p>${h(card.title || '')}</p>
              ${qrDesc(card.message) ? `<p class="fh-qr-desc">${h(qrDesc(card.message))}</p>` : ''}
              ${editingCard ? qrCardForm(card) : ''}
              <div class="fh-qr-acts ${labels.length > 8 ? 'dense' : ''}">${labels.length
                ? labels.map(item => `<button class="fh-btn ${edit ? 'mine' : ''}" data-qr="${h(card.id)}" data-qr-label="${h(item)}">${h(item)}${branchBody(card.message, item).includes('/input ') ? ' …' : ''}</button>`).join('')
                : `<button class="fh-btn ${edit ? 'mine' : 'primary'}" data-qr="${h(card.id)}">${edit ? '改这条指令' : '执行'}</button>`}
                ${edit && labels.length ? `<button class="fh-btn add" data-qr-add="${h(card.id)}">+ 自定义指令</button>` : ''}</div>
              ${tag ? qrTagForm(tag) : ''}</section>`;
          }).join('')}
          ${edit ? '<button class="fh-btn add fh-mt" data-action="qr-card-new">+ 新建大类</button>' : ''}</div>`);
    }

