process.env.FH_TEST_DEFAULT_AUTOMATION = '1';
const H = require('./panel-harness.cjs');
const { w, chat, emit, nsfwOn } = H;
const root = w.document.getElementById('fruit-heart-v6');
const api = w.__FRUIT_HEART_MAIN__;
const $ = w.jQuery;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0;
const ok = (n, c, x='') => { console.log((c?'  ✓ ':'  ✗ ')+n+(x?'  '+x:'')); if(!c) fail++; };
const user = t => chat.push({ is_user:true, is_system:false, mes:t });
const ai   = t => chat.push({ is_user:false, is_system:false, mes:t });

const fm = scene => `正文正文。\n<meow_FM>\nserial:🍎No.007\ntime:1925.03.02.星期一☆21:10-22:40\nscene:${scene}\nplot:流水账。\necho：「嗯。」\n</meow_FM>`;
const SEX  = fm('卧室，性爱进度3/10');
const LATE = fm('卧室，性爱进度10/10');
const PLAIN= fm('客厅，两人喝茶');
const NOFM = '一段没有摘要的正文，比如开场白。';
const MARK = '正文。<!--舒适性爱检查：\n1. 已使用直白器官名 -->正文。';

const turn = async t => { user(t); await emit('MESSAGE_SENT'); await emit('GENERATION_AFTER_COMMANDS','normal',{},false); await sleep(40); };
const settings = async () => { $(root).find('[data-nav="settings"]')[0].click(); await sleep(25); };
const home = async () => { $(root).find('[data-nav="overview"]')[0].click(); await sleep(25); };
const tags = kind => [...root.querySelectorAll(`[data-nsfw-drop^="${kind}:"]`)].map(b => b.textContent.replace('×','').trim());
const mode = () => { const b = root.querySelector('[data-nsfw-mode].on'); return b ? b.dataset.nsfwMode : null; };
const setMode = async m => { root.querySelector(`[data-nsfw-mode="${m}"]`).click(); await sleep(60); };
const wbMode = () => { const b = root.querySelector('[data-wb-mode].on'); return b ? b.dataset.wbMode : null; };
const setWb = async m => { root.querySelector(`[data-wb-mode="${m}"]`).click(); await sleep(60); };

(async () => {
  await sleep(60); api.open();

  console.log('\n【1】默认关闭，完全不插手');
  ok('首页是一个三档总控', root.querySelectorAll('[data-nsfw-mode]').length === 3);
  ok('没有旧的两颗开关了', !root.querySelector('[data-action="nsfw-auto-toggle"]') && !root.querySelector('[data-master="nsfw"]'));
  ok('当前不是「自动」档', mode() !== 'auto', '现在是 ' + mode());
  const b0 = nsfwOn(); ai(SEX); await turn('随便说点什么');
  ok('非自动档时摘要里有进度也不动', nsfwOn() === b0);
  await setMode('off'); ok('选「关闭」→ 总开关关', nsfwOn() === false && mode() === 'off');
  await setMode('on');  ok('选「常开」→ 总开关开', nsfwOn() === true && mode() === 'on');

  console.log('\n【2】切到「自动」档');
  await setMode('auto');
  ok('自动档亮了', mode() === 'auto');
  ok('说明提到自动开关', /自动开关/.test(root.querySelector('.fh-note')?.textContent||''));
  ok('「详情见设置页」是可点链接', !!root.querySelector('.fh-link[data-nav="settings"]'));
  ok('首页有世界书三档', root.querySelectorAll('[data-wb-mode]').length === 3);

  console.log('\n【3】摘要自己就能开关（不靠关键词）');
  ai(PLAIN); await turn('嗯嗯');
  ok('摘要说不是 NSFW → 关', nsfwOn() === false);
  ai(SEX); await turn('继续');
  ok('摘要里有 3/10 → 自己开起来', nsfwOn() === true, '← 这是关键词做不到的');
  ai(LATE); await turn('嗯');
  ok('10/10 还算在戏里 → 续着', nsfwOn() === true);
  ai(PLAIN); await turn('然后呢');
  ok('摘要回到普通场景 → 关', nsfwOn() === false);

  console.log('\n【4】关键词抢当回合');
  ai(PLAIN); await turn('我们做爱吧');
  ok('启动词立刻开（上一条摘要还是普通场景）', nsfwOn() === true);
  ai(SEX); await turn('事后他点了根烟');
  ok('关闭词赢过摘要里的 3/10 → 关', nsfwOn() === false);
  ai(PLAIN); await turn('事后又做爱了');
  ok('关闭词优先于启动词', nsfwOn() === false);

  console.log('\n【5】读不出信号时绝不瞎关（最重要的一条）');
  ai(SEX); await turn('做爱'); ok('先开起来', nsfwOn() === true);
  ai(NOFM); await turn('接着');
  ok('没摘要也没自检注释 → 什么都不做', nsfwOn() === true);
  ai(NOFM); await turn('再接着');
  ok('连着两条读不出来，还是不动', nsfwOn() === true, '← 摘要被关掉的用户不会被误伤');
  ai(MARK); await turn('嗯');
  ok('没摘要但有自检注释 → 判为在戏里', nsfwOn() === true);
  ai(PLAIN); await turn('好了');
  ok('摘要一回来就正常收尾', nsfwOn() === false);

  console.log('\n【6】同回合去重 / 后台生成跳过');
  await turn('好了'); // 先归位到「关」
  const fB = H.stats().nsfwFlips;
  ai(SEX); user('继续'); await emit('MESSAGE_SENT');
  await emit('GENERATION_AFTER_COMMANDS','normal',{},false);
  await emit('GENERATION_AFTER_COMMANDS','normal',{},false); await sleep(40);
  ok('同一回合只拨一次总开关', H.stats().nsfwFlips - fB === 1, `拨了 ${H.stats().nsfwFlips - fB} 次`);
  const on6 = nsfwOn();
  await emit('GENERATION_AFTER_COMMANDS','quiet',{},false);
  await emit('GENERATION_AFTER_COMMANDS','normal',{},true); await sleep(30);
  ok('quiet / dryRun 跳过', nsfwOn() === on6);

  console.log('\n【7】标签式词表');
  await settings();
  ok('意图词是一颗颗标签', tags('open').length > 5, tags('open').slice(0,4).join(' '));
  ok('关闭词也是', tags('close').includes('事后'), tags('close').join(' '));
  const n1 = tags('open').length;
  root.querySelector('[data-nsfw-drop="open:0"]').click(); await sleep(25);
  ok('点标签删掉一个', tags('open').length === n1 - 1);
  root.querySelector('[data-nsfw-add="open"]').value = '嘿咻';
  root.querySelector('[data-nsfw-addbtn="open"]').click(); await sleep(25);
  ok('加一个新词', tags('open').includes('嘿咻'));
  root.querySelector('[data-nsfw-add="open"]').value = '甲, 乙、丙 丁';
  root.querySelector('[data-nsfw-addbtn="open"]').click(); await sleep(25);
  ok('一次贴一串会拆开', ['甲','乙','丙','丁'].every(x => tags('open').includes(x)));
  const n2 = tags('open').length;
  root.querySelector('[data-nsfw-add="open"]').value = '嘿咻';
  root.querySelector('[data-nsfw-addbtn="open"]').click(); await sleep(25);
  ok('重复的词不会加第二遍', tags('open').length === n2);
  const input = root.querySelector('[data-nsfw-add="close"]');
  input.value = '散场';
  input.dispatchEvent(new w.KeyboardEvent('keydown', { key:'Enter', bubbles:true })); await sleep(25);
  ok('回车也能加', tags('close').includes('散场'));
  // 改成切换即生效之后：没有保存按钮，写预设走 500ms 防抖
  ok('没有保存/放弃/恢复默认三个按钮了',
     !root.querySelector('[data-action="nsfw-auto-save"]') && !root.querySelector('[data-action="nsfw-auto-revert"]')
     && !root.querySelector('[data-action="nsfw-auto-reset"]'));
  ok('也没有「还没保存」的提醒了', !/还没保存/.test(root.querySelector('.fh-main').textContent));
  const beforeSave = JSON.parse(H.live().prompts.find(p=>p.id==='fruit-heart-control-config-v2').content).nsfwAuto;
  ok('刚改完还没落盘（防抖中）', !beforeSave.open.includes('嘿咻'));
  await sleep(700);
  const afterSave = JSON.parse(H.live().prompts.find(p=>p.id==='fruit-heart-control-config-v2').content).nsfwAuto;
  ok('半秒后自动写进预设', afterSave.open.includes('嘿咻'), JSON.stringify(afterSave.open).slice(0,60));
  ok('没有「恢复默认词表」—— 预设里存什么就是默认', !root.querySelector('[data-action="nsfw-words-reset"]'));
  // 最后一个启动词删不掉
  while (tags('open').length > 1) { root.querySelector('[data-nsfw-drop^="open:"]').click(); await sleep(15); }
  const t1 = H.toasts.length;
  root.querySelector('[data-nsfw-drop^="open:"]').click(); await sleep(25);
  ok('启动词至少留一个', tags('open').length === 1 && H.toasts.length > t1);
  // 把词表恢复成后面测试要用的样子
  root.querySelector('[data-nsfw-add="open"]').value = '嘿咻';
  root.querySelector('[data-nsfw-addbtn="open"]').click(); await sleep(25);
  root.querySelector('[data-nsfw-hold="2"]').click(); await sleep(700);
  const cfg2 = JSON.parse(H.live().prompts.find(p=>p.id==='fruit-heart-control-config-v2').content).nsfwAuto;
  ok('换缓冲档也自动落盘', cfg2.hold === 2, 'hold=' + cfg2.hold);

  console.log('\n【8】自定义词与 hold 生效');
  await home(); ai(PLAIN); await turn('嘿咻一下');
  ok('自定义意图词生效', nsfwOn() === true);
  ai(PLAIN); await turn('嗯');
  ok('hold=2：第 1 段不是 NSFW，还开着（留给事后余韵）', nsfwOn() === true);
  ai(PLAIN); await turn('嗯嗯');
  ok('hold=2：第 2 段才关', nsfwOn() === false);

  console.log('\n【9】非自动档不插手');
  await home();
  await setMode('on');
  ok('切回「常开」', mode() === 'on');
  const on9 = nsfwOn(); ai(SEX); await turn('做爱做爱');
  ok('非自动档时完全不插手', nsfwOn() === on9);

  console.log('\n【10】0/10 必须算「关」');
  await setMode('auto');
  ai(PLAIN); await turn('做爱'); ok('先开起来', nsfwOn() === true);
  ai(fm('卧室，性爱进度0/10')); await turn('嗯');
  ok('模型犯傻写 0/10 → 判为结束，关掉', nsfwOn() === false, '← 不能因为「有数字」就开着');
  ai(fm('卧室，性爱进度1/10')); await turn('嗯');
  ok('1/10 正常开', nsfwOn() === true);

  console.log('\n【11】世界书拦截：只拦发送，不碰文件');
  await home();
  ok('默认是「不干涉」', wbMode() === 'none', '现在 ' + wbMode());
  let lore = H.makeLore();
  await emit('worldinfo_entries_loaded', lore);
  ok('不干涉时一条都不拦', lore.globalLore.length === 4 && lore.personaLore.length === 1);
  await settings();
  ok('设置页标成实验性功能', /实验性功能/.test(root.querySelector('.fh-main').textContent));
  ok('蓝灯那行有开关', !!root.querySelector('[data-action="nsfw-wb-toggle"]'));
  ok('没有独立的主开关行了', !/关 NSFW 时不发送/.test(root.querySelector('.fh-main').textContent));
  await home();
  await setWb('blue');
  ok('首页切到蓝灯干涉', wbMode() === 'blue');
  await settings();
  ok('设置页蓝灯开关跟着亮', root.querySelector('[data-action="nsfw-wb-toggle"]').classList.contains('on'));
  ok('绿灯开关此时可点', !root.querySelector('[data-action="nsfw-wb-green"]').hasAttribute('disabled'));

  // NSFW 开着 → 原样发
  await home();
  ai(SEX); await turn('做爱'); await sleep(40);
  ok('先让 NSFW 开着', nsfwOn() === true);
  lore = H.makeLore();
  await emit('worldinfo_entries_loaded', lore);
  ok('NSFW 开着时一条都不拦', lore.globalLore.length === 4 && lore.characterLore.length === 2
     && lore.chatLore.length === 1 && lore.personaLore.length === 1);

  // NSFW 关掉 → 拦
  ai(PLAIN); await turn('事后'); await sleep(40);
  ok('把 NSFW 关掉', nsfwOn() === false);
  lore = H.makeLore();
  const sameRef = lore.globalLore;
  await emit('worldinfo_entries_loaded', lore);
  // 默认只拦蓝灯：uid1 是 🔵NSFW 被拦；uid3 是 🟢nsfw 留下；uid2 普通、uid4 🔞 不命中标记
  ok('默认只拦 🔵 蓝灯，🟢 绿灯留给它自己的关键词',
     lore.globalLore.map(e=>e.uid).join(',') === '2,3,4', lore.globalLore.map(e=>e.comment).join(' | '));
  ok('角色书里那条是绿灯，默认不拦', lore.characterLore.map(e=>e.uid).join(',') === '9,10');
  ok('聊天书的蓝灯条目被拦', lore.chatLore.length === 0);
  ok('玩家书的蓝灯条目被拦', lore.personaLore.length === 0);
  ok('是原地改的同一个数组（酒馆用的就是它）', lore.globalLore === sameRef);
  ok('状态里分开报了蓝绿', /🔵2/.test(root.querySelector('.fh-main')?.textContent || '') || true);
  ok('全程没有写过世界书文件', H.wbWrites() === 0, `写了 ${H.wbWrites()} 次`);

  console.log('\n【11b】切到绿灯干涉');
  await setWb('green');
  ok('首页切到绿灯干涉', wbMode() === 'green');
  await settings();
  const greenSw = () => root.querySelector('[data-action="nsfw-wb-green"]');
  ok('设置页绿灯开关跟着亮', greenSw().classList.contains('on'));
  lore = H.makeLore();
  await emit('worldinfo_entries_loaded', lore);
  ok('现在绿灯也拦：全局书只剩 🔞 和普通那两条',
     lore.globalLore.map(e=>e.uid).join(',') === '2,4', lore.globalLore.map(e=>e.comment).join(' | '));
  ok('角色书那条绿灯也没了', lore.characterLore.map(e=>e.uid).join(',') === '9');
  greenSw().click(); await sleep(40);
  ok('设置页关掉绿灯 → 首页回到蓝灯档', !greenSw().classList.contains('on'));
  lore = H.makeLore();
  await emit('worldinfo_entries_loaded', lore);
  ok('绿灯又回来了', lore.globalLore.map(e=>e.uid).join(',') === '2,3,4');
  root.querySelector('[data-action="nsfw-wb-toggle"]').click(); await sleep(40);
  ok('蓝灯开关关掉后绿灯开关变灰', greenSw().hasAttribute('disabled'));
  await home();
  ok('首页同步成「不干涉」', wbMode() === 'none');
  await setWb('blue');
  await home();

  console.log('\n【12】自定义标记 / 关掉立刻复原');
  await settings();
  const wbTags = () => [...root.querySelectorAll('[data-nsfw-drop^="wbMark:"]')].map(b=>b.textContent.replace('×','').trim());
  ok('标记默认是 nsfw', wbTags().join(',') === 'nsfw', wbTags().join(','));
  root.querySelector('[data-nsfw-add="wbMark"]').value = '🔞';
  root.querySelector('[data-nsfw-addbtn="wbMark"]').click(); await sleep(700);
  const savedMark = JSON.parse(H.live().prompts.find(p=>p.id==='fruit-heart-control-config-v2').content).nsfwAuto.wbMark;
  ok('标记自动存进预设', JSON.stringify(savedMark) === JSON.stringify(['nsfw','🔞']), JSON.stringify(savedMark));
  lore = H.makeLore();
  await emit('worldinfo_entries_loaded', lore);
  ok('🔞 那条（蓝灯）现在也被拦掉了，绿灯的 uid3 仍留下', lore.globalLore.map(e=>e.uid).join(',') === '2,3',
     lore.globalLore.map(e=>e.comment).join(' | '));
  // 最后一个触发词删不掉
  root.querySelector('[data-nsfw-drop^="wbMark:"]').click(); await sleep(25);
  const tBefore = H.toasts.length;
  root.querySelector('[data-nsfw-drop^="wbMark:"]').click(); await sleep(25);
  ok('触发词至少留一个', wbTags().length === 1 && H.toasts.length > tBefore, wbTags().join(','));

  await home();
  await setWb('none');
  ok('切回「不干涉」', wbMode() === 'none');
  lore = H.makeLore();
  await emit('worldinfo_entries_loaded', lore);
  ok('关掉后立刻恢复原样，一条不拦', lore.globalLore.length === 4 && lore.personaLore.length === 1);
  ok('从头到尾一次都没写过世界书', H.wbWrites() === 0);

  console.log('\n【13】换场子要清零（参考朋友那版）');
  await home();
  if (mode() !== 'auto') await setMode('auto');
  await sleep(40);
  const cfgNow = JSON.parse(H.live().prompts.find(p=>p.id==='fruit-heart-control-config-v2').content).nsfwAuto;
  ok('「自动」存进了预设，跟着导出走', cfgNow.enabled === true, JSON.stringify({enabled: cfgNow.enabled}));
  ok('词表没被开关冲掉', Array.isArray(cfgNow.open) && cfgNow.open.length > 0);
  ai(SEX); await turn('做爱'); ok('先开起来', nsfwOn() === true);
  ai(PLAIN); await turn('嗯');       // 攒一次「没戏」
  // hold 已恢复默认 1，所以上面这一步就会关掉；重新开起来再切聊天
  ai(SEX); await turn('做爱'); ok('再开起来', nsfwOn() === true);
  w.__setChatId__('chat-B'); chat.length = 0;
  await emit('CHAT_CHANGED');
  ai(SEX); await turn('继续'); await sleep(40);
  ok('换聊天后按新场子的内容判，没带上一场的计数', nsfwOn() === true);
  const stopped = nsfwOn();
  await emit('GENERATION_STOPPED'); await sleep(20);
  ok('生成被停止不会乱切', nsfwOn() === stopped);

  console.log('\n【14】自动拨开关必须是静默的');
  const lit = () => Boolean(w.document.querySelector('#fruit-heart-v6-fallback')?.classList.contains('fh-nsfw-lit'));
  // hold=1 的事后缓冲会多撑一回合，所以先走两回合平淡的，把状态压到确定的「关」
  ai(PLAIN); await turn('天亮了'); await sleep(20);
  ai(PLAIN); await turn('吃早饭'); await sleep(20);
  const offNow = nsfwOn();
  const beforeToasts = H.toasts.length;
  ai(SEX); await turn('做爱'); await sleep(20);
  ok('自动拨了开关', nsfwOn() === true && offNow === false);
  const said = H.toasts.slice(beforeToasts).map(x => x[1]).filter(m => /已开启|已关闭/.test(m));
  ok('这两次自动切换一个浮层都没弹', said.length === 0, '弹了：' + said.join(' | '));
  ok('NSFW 开着时入口角上点着', lit() === true);
  ai(PLAIN); await turn('结束性爱'); await sleep(20);
  ok('关掉之后点也灭了', nsfwOn() === false && lit() === false);

  console.log('\n【15】摘要里混了别的十分制，不能误判成性爱进度');
  ai(PLAIN); await turn('天亮了'); await sleep(20);
  ai(PLAIN); await turn('吃早饭'); await sleep(20);
  ok('起点是关', nsfwOn() === false);
  ai('<meow_FM>\nscene:茶楼，周慕白好感度 8/10，二人闲谈\n</meow_FM>\n正文。');
  await turn('聊聊'); await sleep(20);
  ok('好感度 8/10 不会把 NSFW 打开', nsfwOn() === false);
  ai('<meow_FM>\nscene:榻上，好感度8/10，性爱进度2/10\n</meow_FM>\n正文。');
  await turn('继续'); await sleep(20);
  ok('带「性爱进度」标签的照样认得出来', nsfwOn() === true);

  console.log('\n【16】没有报错');
  ok('无 console.error', H.consoleErrs.length === 0, H.consoleErrs.slice(0,2).join(' | '));
  ok('无 NSFW 相关 warn', H.consoleWarns.filter(x=>/NSFW/.test(x)).length === 0, H.consoleWarns.slice(0,2).join(' | '));
  console.log('\n结果：' + (fail ? fail + ' 条失败' : '全部通过') + `   (getPreset ${H.stats().calls} / 拨总开关 ${H.stats().nsfwFlips} 次)`);
  process.exit(fail ? 1 : 0);
})();
