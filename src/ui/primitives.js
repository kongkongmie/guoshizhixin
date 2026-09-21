    function titleBlock(title, note = '') {
        return `<div class="fh-page-head"><div><h2>${h(title)}</h2>${note ? `<p>${h(note)}</p>` : ''}</div></div>`;
    }
    function sourceBadge(prompt) {
        return modelTags(prompt.name).map(tag => `<span class="fh-source"># ${h(tag)}</span>`).join('');
    }
    function navHtml() {
        return NAV_ITEMS.map(([id, icon, label]) => `<button class="fh-nav-item ${currentView === id ? 'on' : ''}" data-nav="${id}" title="${h(label)}"><b>${icon}</b><span>${h(label)}</span></button>`).join('');
    }
    function syncNav() {
        root.find('.fh-bottom-nav')[0].innerHTML = navHtml();
    }
