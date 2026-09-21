// 设置跟着预设走：作者设好 → 存进预设 → 别人（新设备、空的本机存储）打开就是这个状态；
// 外观类只当开局默认，别人改了记在自己本机，作者更新预设也冲不掉。
const fs = require('fs');
const H = require('./panel-harness.cjs');
const { w } = H; const $ = w.jQuery; const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0; const ok = (n, c, x = '') => { console.log((c ? '  ✓ ' : '  ✗ ') + n + (x ? '  ' + x : '')); if (!c) fail++; };
const CFG_ID = 'fruit-heart-control-config-v2';
const cfg = () => JSON.parse(H.live().prompts.find(p => p.id === CFG_ID).content);
const root = () => w.document.getElementById('fruit-heart-v6');
const main = () => root().querySelector('.fh-main');
const go = async view => { $(root()).find(`[data-nav="${view}"]`)[0].click(); await sleep(30); };
// 换一台新设备：本机存储清空，脚本重新加载（旧实例会被自己的 destroy 收掉）
const freshDevice = async (keepLocal = false) => {
  if (!keepLocal) w.localStorage.clear();
  w.eval(fs.readFileSync(process.argv[2], 'utf8'));
  await sleep(80);
  w.__FRUIT_HEART_MAIN__.open(); await sleep(30);
};

(async () => {
  await sleep(60);
  w.__FRUIT_HEART_MAIN__.open(); await sleep(30);

  console.log('【1】作者在面板上设好');
  await go('overview');
  main().querySelector('[data-nsfw-mode="auto"]').click(); await sleep(40);
  main().querySelector('[data-wb-mode="blue"]').click(); await sleep(40);
  await go('settings');
  main().querySelector('[data-action="toggle-model-link"]').click(); await sleep(40);   // 默认开 → 关
  main().querySelector('[data-skin-set="journal"]').click(); await sleep(40);
  main().querySelector('[data-theme-set="night"]').click(); await sleep(40);
  main().querySelector('[data-ball-size="l"]').click(); await sleep(40);
  main().querySelector('[data-entry-toggle="jump"]').click(); await sleep(40);        // 默认开 → 关
  const input = main().querySelector('[data-nsfw-add="open"]');
  input.value = '云雨'; main().querySelector('[data-nsfw-addbtn="open"]').click(); await sleep(700);

  const c1 = cfg();
  ok('NSFW 自动 → 预设', c1.nsfwAuto.enabled === true);
  ok('世界书蓝灯 → 预设', c1.nsfwAuto.worldbook === 'blue');
  ok('插头模型跟随关 → 预设', c1.modelLink === false);
  ok('新加的启动词 → 预设', c1.nsfwAuto.open.includes('云雨'));
  ok('存词表没把开关冲掉', c1.nsfwAuto.enabled === true && c1.nsfwAuto.worldbook === 'blue');
  const pd = c1.panelDefaults || {};
  ok('皮肤 / 日夜 / 猫大小 / 楼层跳转 → 预设的开局默认',
     pd.skin === 'journal' && pd.theme === 'night' && pd.ballSize === 'l' && pd.jumpNav === false, JSON.stringify(pd));

  console.log('\n【2】别人拿到这份预设，第一次在新设备上打开');
  await freshDevice();
  ok('皮肤是作者选的', root().getAttribute('data-skin') === 'journal', root().getAttribute('data-skin'));
  ok('日夜是作者选的', root().getAttribute('data-theme') === 'night', root().getAttribute('data-theme'));
  await go('overview');
  const on = sel => main().querySelector(sel)?.classList.contains('on');
  ok('NSFW 三档停在「自动」', on('[data-nsfw-mode="auto"]'));
  ok('世界书三档停在「蓝灯干涉」', on('[data-wb-mode="blue"]'));
  await go('settings');
  ok('插头模型跟随是关的', main().querySelector('[data-action="toggle-model-link"]').getAttribute('aria-checked') === 'false');
  ok('词表里有作者加的「云雨」', [...main().querySelectorAll('[data-nsfw-drop^="open:"]')].some(b => b.textContent.includes('云雨')));

  console.log('\n【3】别人把皮肤改成自己喜欢的');
  main().querySelector('[data-skin-set="glass"]').click(); await sleep(40);
  ok('本机记下了', w.localStorage.getItem('fruit-heart-skin') === 'glass');

  console.log('\n【4】作者出了新版预设（开局默认换成暖纸），别人更新');
  const next = cfg(); next.panelDefaults.skin = 'paper';
  H.live().prompts.find(p => p.id === CFG_ID).content = JSON.stringify(next);
  await freshDevice(true);                        // 同一台设备：本机存储还在
  ok('别人自己选的玻璃没被冲掉', root().getAttribute('data-skin') === 'glass', root().getAttribute('data-skin'));
  ok('但没动过的日夜还是跟作者', root().getAttribute('data-theme') === 'night');

  console.log('\n【5】老用户升级：设置原来在浏览器里，预设里还没有');
  const old = cfg();
  delete old.nsfwAuto.enabled; delete old.nsfwAuto.worldbook; delete old.modelLink; delete old.panelDefaults;
  H.live().prompts.find(p => p.id === CFG_ID).content = JSON.stringify(old);
  w.localStorage.clear();
  w.localStorage.setItem('fruit-heart-nsfw-auto:【MoM】果实V6.14丨果实之心@KKM', 'true');
  w.localStorage.setItem('fruit-heart-nsfw-wb', 'true');
  w.localStorage.setItem('fruit-heart-nsfw-wb-green', 'true');
  w.localStorage.setItem('fruit-heart-skin', 'journal');
  await freshDevice(true); await sleep(80);
  const c5 = cfg();
  ok('浏览器里的「自动」接过来并补写进预设', c5.nsfwAuto.enabled === true);
  ok('浏览器里的「绿灯干涉」接过来并补写进预设', c5.nsfwAuto.worldbook === 'green');
  ok('浏览器里的皮肤补成预设的开局默认', c5.panelDefaults?.skin === 'journal', JSON.stringify(c5.panelDefaults));
  ok('词表还在', Array.isArray(c5.nsfwAuto.open) && c5.nsfwAuto.open.includes('云雨'));

  console.log('\n【6】同一个页面里换到另一份预设');
  const other = cfg(); other.nsfwAuto.enabled = false; other.nsfwAuto.worldbook = 'none';
  H.live().prompts.find(p => p.id === CFG_ID).content = JSON.stringify(other);
  await H.emit(w.tavern_events.OAI_PRESET_CHANGED_AFTER); await sleep(40);
  await go('overview');
  ok('换成那份预设自己的 NSFW 设置', !main().querySelector('[data-nsfw-mode="auto"]').classList.contains('on'));
  ok('换成那份预设自己的世界书设置', main().querySelector('[data-wb-mode="none"]').classList.contains('on'));

  console.log('\n【7】没有报错');
  ok('无 console.error', H.consoleErrs.length === 0, H.consoleErrs.slice(0, 2).join(' | '));
  ok('没有「设置没能写进预设」', !H.toasts.some(t => /没能写进预设/.test(t[1])));
  console.log('\n' + (fail ? fail + ' 条失败' : '设置跟着预设走：全部通过'));
  process.exit(fail ? 1 : 0);
})();
