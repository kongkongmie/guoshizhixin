// 导出小说页：首页入口 → 页面 → 勾选 → 预览 → 导出 → 接着上次
//   FH_PRESET=… node tests/export-page.test.cjs dev/fruit-heart.js
const H = require('./panel-harness.cjs');
const { w, chat } = H; const $ = w.jQuery; const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0; const ok = (n, c, x = '') => { console.log((c ? '  ✓ ' : '  ✗ ') + n + (x ? '  ' + x : '')); if (!c) fail++; };
const hdr = (n, t) => `<novel_header>\n[CHAP] ${n}\n[TITLE] ${t}\n</novel_header>\n`;
chat.push({ name: '江晦', is_user: false, mes: '开场白正文' });
for (let i = 1; i <= 6; i++) {
  chat.push({ name: '我', is_user: true, mes: `我的第${i}句` });
  chat.push({ name: '江晦', is_user: false, mes: `${hdr(i, '标题' + i)}<content>\n正文${i}。\n<imgthink>x</imgthink>\nimage###\nprompt###\n</content>\n<meow_FM>\nserial:${i}\n</meow_FM>\n<snow><details><summary>剧场${i}</summary><ccd>**戏**</ccd></details></snow>` });
}
// 抓下载
const blobs = []; let downloadName = '';
w.URL.createObjectURL = blob => { blobs.push(blob); return 'blob:x'; };
w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { downloadName = this.download; };
const lastBlobBytes = async () => new Uint8Array(await blobs.at(-1).arrayBuffer());
const ctx0 = w.SillyTavern.getContext; w.SillyTavern.getContext = () => ({ ...ctx0(), name2: '江晦' });

(async () => {
  await sleep(60);
  const root = w.document.getElementById('fruit-heart-v6');
  const main = () => root.querySelector('.fh-main');
  w.__FRUIT_HEART_MAIN__.open(); await sleep(20);
  const entry = main().querySelector('[data-nav="export"]');
  ok('首页有导出入口', !!entry);
  const cards = [...main().querySelectorAll('.fh-grp')].map(el => el.querySelector('[data-nav]')?.dataset.nav || '');
  ok('入口紧跟在 QR 后面', cards.indexOf('export') === cards.indexOf('qr') + 1, cards.join(','));
  entry.click(); await sleep(80);
  ok('进入导出页', /导出为 TXT 小说/.test(main().textContent));
  ok('范围默认全部 0–12', main().querySelector('[data-exp-from]').value === '0' && main().querySelector('[data-exp-to]').value === '12');
  const chips = [...main().querySelectorAll('[data-exp-keep]')].map(el => el.dataset.expKeep);
  ok('检测到 content / meow_FM / snow，且不列 novel_header', ['content', 'meow_FM', 'snow'].every(t => chips.includes(t)) && !chips.includes('novel_header'), chips.join(','));
  ok('默认只勾正文', main().querySelector('[data-exp-keep="content"]').classList.contains('on') && !main().querySelector('[data-exp-keep="snow"]').classList.contains('on'));
  await sleep(60);
  const preview = main().querySelector('[data-exp-preview]').textContent;
  ok('预览有书名页、序章和第1章', /^《江晦》/.test(preview) && /序章\n\n开场白正文/.test(preview) && /第1章　标题1/.test(preview), preview.slice(0, 80).replace(/\n/g, '⏎'));
  ok('预览不含生图/摘要', !/image###|imgthink|serial|prompt/.test(preview));
  ok('统计：13 层 6 章', /13<\/b> 层 · <b>6<\/b> 章/.test(main().querySelector('[data-exp-stat]').innerHTML), main().querySelector('[data-exp-stat]').textContent);

  // 省略我的发言 + 勾小剧场
  main().querySelector('[data-exp-set="user"][data-val="omit"]').click(); await sleep(30);
  main().querySelector('[data-exp-keep="snow"]').click(); await sleep(60);
  const p2 = main().querySelector('[data-exp-preview]').textContent;
  ok('省略我的发言生效', !/我的第1句/.test(p2));
  ok('小剧场出现且去了 **', /【小剧场】[\s\S]*剧场1[\s\S]*戏/.test(p2) && !/\*\*/.test(p2));
  ok('选项记进本机', JSON.parse(w.localStorage.getItem('fruit-heart-export-v1')).user === 'omit');

  // 改范围
  const to = main().querySelector('[data-exp-to]');
  to.value = '6'; $(to).trigger('change'); await sleep(60);
  ok('改结束楼层后统计变化', /7<\/b> 层|4<\/b> 层/.test(main().querySelector('[data-exp-stat]').innerHTML), main().querySelector('[data-exp-stat]').textContent);

  // 替换规则
  main().querySelector('[data-exp-fold]').click(); await sleep(20);
  main().querySelector('[data-exp-rf]').value = '正文';
  main().querySelector('[data-exp-rr]').value = '本文';
  main().querySelector('[data-exp-rule-save]').click(); await sleep(60);
  ok('添加替换规则', main().querySelectorAll('.fh-exp-rule').length === 1 && /本文1/.test(main().querySelector('[data-exp-preview]').textContent));

  // 导出
  ok('还没导出过时「接着上次」不可点', main().querySelector('[data-exp-range="resume"]').disabled);
  main().querySelector('[data-exp-do="download"]').click(); await sleep(80);
  const bytes = await lastBlobBytes();
  const text = new w.TextDecoder().decode(bytes);
  ok('下载了 txt，带 BOM 和 CRLF', bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf && /\r\n/.test(text) && /序章/.test(text));
  ok('文件名：书名_0-6楼_日期.txt', /^江晦_0-6楼_\d{8}\.txt$/.test(downloadName), downloadName);
  const resume = main().querySelector('[data-exp-range="resume"]');
  ok('导出后「接着上次」从 7 起', !resume.disabled && /7 起/.test(resume.textContent));
  resume.click(); await sleep(30);
  ok('点接着上次 → 7 至 12', main().querySelector('[data-exp-from]').value === '7' && main().querySelector('[data-exp-to]').value === '12');

  // 换聊天：范围重置
  w.__setChatId__('chat-B'); w.__FRUIT_HEART_MAIN__.open(); await sleep(20);
  main().querySelector('[data-nav="export"]').click(); await sleep(40);
  ok('换聊天后范围重置为全部', main().querySelector('[data-exp-from]').value === '0' && main().querySelector('[data-exp-to]').value === '12');
  ok('新聊天没有「上次」', main().querySelector('[data-exp-range="resume"]').disabled);

  // 空聊天
  chat.splice(0); w.__FRUIT_HEART_MAIN__.open(); await sleep(20);
  main().querySelector('[data-nav="export"]').click(); await sleep(40);
  ok('空聊天给提示不报错', /没有打开聊天/.test(main().textContent));
  ok('无 console.error', H.consoleErrs.length === 0, H.consoleErrs.slice(0, 2).join(' | '));
  console.log(fail ? `\n${fail} 条失败` : '\n导出小说页：全部通过');
  process.exit(fail ? 1 : 0);
})();
