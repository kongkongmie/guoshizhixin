const H=require('./panel-harness.cjs');
const {w}=H; const $=w.jQuery; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(n,c,x='')=>{console.log((c?'  ✓ ':'  ✗ ')+n+(x?'  '+x:''));if(!c)fail++;};
(async()=>{
  await sleep(60);
  const root=w.document.getElementById('fruit-heart-v6'); w.__FRUIT_HEART_MAIN__.open();
  const main=()=>root.querySelector('.fh-main');
  $(root).find('[data-nav="settings"]')[0].click(); await sleep(30);
  console.log('\n设置页「自动化」组的结构：');
  for (const sec of main().querySelectorAll('section.fh-card')) {
    const h3=sec.querySelector('h3'); if(!h3) { console.log('  ▪ （无标题卡：模型联动一行）'); continue; }
    console.log('  ▪ '+h3.textContent.trim());
    for (const m of sec.querySelectorAll('.fh-mech-head'))
      console.log('      '+m.querySelector('i').textContent+' · '+m.querySelector('b').textContent+'  ('+(m.querySelector('.fh-n')?.textContent||'')+')');
  }
  ok('模型联动压成一行（无 h3、有 small 说明）',
     !!main().querySelector('section.fh-card label.fh-toggle small') && main().querySelectorAll('section.fh-card')[0].querySelector('h3')===null);
  ok('预设NSFW模块总控有 3 条机制', main().querySelectorAll('section.fh-card')[1].querySelectorAll('.fh-mech').length===3);
  ok('没有保存/放弃/恢复默认', !main().querySelector('[data-action^="nsfw-auto-"]'));
  ok('世界书总控有 3 块', [...main().querySelectorAll('section.fh-card')].find(s=>/世界书/.test(s.querySelector('h3')?.textContent||'')).querySelectorAll('.fh-mech').length===3);
  ok('事后缓冲是 0/1/2 回合', [...main().querySelectorAll('[data-nsfw-hold]')].map(b=>b.textContent).join('|')==='0 回合|1 回合|2 回合',
     [...main().querySelectorAll('[data-nsfw-hold]')].map(b=>b.textContent).join('|'));
  ok('默认选中「0 回合」', main().querySelector('[data-nsfw-hold].on').dataset.nsfwHold==='1');
  ok('世界书卡是三段新说明', /对关闭的词条无效/.test(main().textContent) && /不会修改世界书/.test(main().textContent));
  ok('蓝灯那行带开关', !!main().querySelector('[data-action="nsfw-wb-toggle"]'));
  // 机制 2 的第一个词表框不该再有自己的小标题（机制名已经说明了它是什么）
  const boxes = [...main().querySelectorAll('.fh-mech')][1].querySelectorAll('.fh-tagbox');
  ok('启动词那栏没有多余标题行', boxes.length===2 && !boxes[0].querySelector('.fh-k'));
  ok('关闭词那栏保留标题', /关闭词（谨慎添加）/.test(boxes[1].textContent));
  // 长标签不能和按钮抢同一行
  const holdRow = main().querySelector('[data-nsfw-hold]').closest('.fh-row');
  ok('事后缓冲那行是标签独占一行', holdRow.classList.contains('fh-stack'));
  ok('没有「恢复默认词表」了', !main().querySelector('[data-action="nsfw-words-reset"]'));
  console.log('\n首页：');
  $(root).find('[data-nav="overview"]')[0].click(); await sleep(30);
  ok('NSFW 三档 OFF/ON/自动', [...main().querySelectorAll('[data-nsfw-mode]')].map(b=>b.textContent).join('|')==='OFF|ON|自动',
     [...main().querySelectorAll('[data-nsfw-mode]')].map(b=>b.textContent).join('|'));
  ok('世界书三档 不干涉/蓝灯干涉/绿灯干涉', [...main().querySelectorAll('[data-wb-mode]')].map(b=>b.textContent).join('|')==='不干涉|蓝灯干涉|绿灯干涉',
     [...main().querySelectorAll('[data-wb-mode]')].map(b=>b.textContent).join('|'));
  ok('标签是「NSFW一键总控」', /NSFW一键总控/.test(main().textContent));
  ok('世界书那行也是标签独占一行', main().querySelector('[data-wb-mode]').closest('.fh-row').classList.contains('fh-stack'));
  ok('没有「上一次：」「世界书拦截：」两行状态', !/上一次[:：]/.test(main().textContent) && !/世界书拦截[:：]/.test(main().textContent));
  ok('「详情见设置页」可点', !!main().querySelector('.fh-link[data-nav="settings"]'));
  main().querySelector('.fh-link[data-nav="settings"]').click(); await sleep(30);
  ok('点了真跳设置页', /预设NSFW模块总控/.test(main().textContent));
  $(root).find('[data-nav="settings"]')[0].click(); await sleep(20);

  console.log('\n更新记录：');
  $(root).find('[data-nav="updates"]')[0].click(); await sleep(30);
  const entries=()=>main().querySelectorAll('.fh-update-entry');
  ok('默认只画 5 条', entries().length===5, '画了 '+entries().length);
  ok('只有第一条是展开的', [...entries()].filter(e=>e.open).length===1);
  ok('有「展开」按钮', !!main().querySelector('[data-action="update-more"]'), main().querySelector('[data-action="update-more"]')?.textContent);
  main().querySelector('[data-action="update-more"]').click(); await sleep(30);
  ok('点了之后全画出来', entries().length>5, '现在 '+entries().length+' 条');
  ok('展开后没有「展开」按钮了', !main().querySelector('[data-action="update-more"]'));
  ok('无 console.error', H.consoleErrs.length===0, H.consoleErrs.slice(0,2).join(' | '));
  console.log(fail?`\n${fail} 条失败`:'\n全部通过');
  process.exit(fail?1:0);
})();
