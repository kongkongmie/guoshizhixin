const H=require('./panel-harness.cjs');
const {w}=H; const $=w.jQuery; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0; const ok=(n,c,x='')=>{console.log((c?'  ✓ ':'  ✗ ')+n+(x?'  '+x:''));if(!c)fail++;};
(async()=>{
  await sleep(60);
  const root=w.document.getElementById('fruit-heart-v6');
  w.__FRUIT_HEART_MAIN__.open();
  $(root).find('[data-nav="settings"]')[0].click(); await sleep(30);
  const main=()=>root.querySelector('.fh-main');
  // 每个 data-action 都要能找到节点
  const want=['toggle-model-link','nsfw-wb-toggle','nsfw-wb-green',
    'ecot-save-tags','ecot-reset-tags','ecot-apply','ecot-scan','profile-save','profile-export','profile-import','profile-delete',
    'sections-sync','sections-all','sections-none','fullscreen','clear-panel-cache','restore-params','reset-prompt-states','kill-script'];
  const missing=want.filter(a=>!main().querySelector(`[data-action="${a}"]`));
  ok(want.length + ' 个动作按钮一个不少', missing.length===0, missing.join(' '));
  ok('保存/放弃/恢复默认已移除', !main().querySelector('[data-action^="nsfw-auto-"]'));
  for (const sel of ['[data-nav="updates"]','[data-home-sort]','[data-sort-id]','[data-home-open]','[data-section-show]',
      '[data-theme-set="day"]','[data-skin-set]','[data-pick-font]','[data-ball-size]','[data-entry-toggle="bar"]',
      '[data-entry-toggle="ball"]','[data-entry-toggle="jump"]','[data-nsfw-hold]','#fh-ecot-end-tags',
      '[data-nsfw-add="open"]','[data-nsfw-add="close"]','[data-nsfw-add="wbMark"]',
      '[data-nsfw-addbtn="open"]','[data-nsfw-addbtn="close"]','[data-nsfw-addbtn="wbMark"]'])
    ok('还在：'+sel, !!main().querySelector(sel));
  // 折叠能点开
  const d=main().querySelector('.fh-doc'); d.querySelector('summary').click(); await sleep(20);
  ok('折叠说明点得开', d.open || d.hasAttribute('open'));
  // 拖拽还绑着
  const list=main().querySelector('[data-home-sort]');
  const rows=[...list.querySelectorAll('.fh-sortrow')];
  const before=rows.map(r=>r.dataset.sortId).join(',');
  const ev=(t,y)=>new w.PointerEvent(t,{bubbles:true,clientY:y,pointerId:1});
  rows[0].dispatchEvent(ev('pointerdown',10));
  Object.defineProperty(rows[1],'getBoundingClientRect',{value:()=>({top:20,bottom:40,height:20}),configurable:true});
  list.dispatchEvent(ev('pointermove',35)); list.dispatchEvent(ev('pointerup',35)); await sleep(60);
  ok('首页栏目拖拽还能用', [...list.querySelectorAll('.fh-sortrow')].map(r=>r.dataset.sortId).join(',')!==before);
  // 主题 / 皮肤 / 分区显隐
  main().querySelector('[data-theme-set="night"]').click(); await sleep(30);
  ok('切夜间主题', root.getAttribute('data-theme')==='night');
  main().querySelector('[data-skin-set]').click(); await sleep(30);
  ok('切皮肤不报错', true);
  const chip=main().querySelector('[data-section-show]'); const was=chip.classList.contains('on');
  chip.click(); await sleep(60);
  ok('分区显隐还能点', main().querySelector('[data-section-show]').classList.contains('on')!==was);
  ok('无 console.error', H.consoleErrs.length===0, H.consoleErrs.slice(0,2).join(' | '));
  console.log(fail?`\n${fail} 条失败`:'\n设置页交互全部完好');
  process.exit(fail?1:0);
})();
