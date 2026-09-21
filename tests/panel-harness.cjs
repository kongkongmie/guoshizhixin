const { JSDOM } = require('jsdom');
const fs = require('fs');
const target = process.argv[2];
// jsdom 版面板测试。需要 npm i -D jsdom jquery，并用环境变量指向一份真实预设：
//   FH_PRESET="H:/sillytavern/.../【MoM】果实V6.14丨果实之心@KKM.json" \
//     node tests/nsfw-auto.test.cjs dev/fruit-heart.js
const preset = JSON.parse(fs.readFileSync(process.env.FH_PRESET, 'utf8'));
if (process.env.FH_TEST_DEFAULT_AUTOMATION === '1') {
  const prompt = preset.prompts.find(item => item.identifier === 'fruit-heart-control-config-v2');
  if (!prompt) throw new Error('测试预设缺少 fruit-heart-control-config-v2');
  const config = JSON.parse(prompt.content);
  config.nsfwAuto = {
    ...(config.nsfwAuto || {}),
    enabled: false,
    worldbook: 'none',
    wbMark: ['nsfw'],
    hold: 0,
  };
  prompt.content = JSON.stringify(config);
}

const dom = new JSDOM(`<!doctype html><html><body>
  <div id="extensionsMenu"></div>
  <div id="qr--bar"><div class="qr--buttons"><div class="qr--button"><div class="qr--button-label">🍎果实之心</div></div></div></div>
</body></html>`, { url:'http://localhost:8000/', pretendToBeVisual:true, runScripts:'dangerously' });
const w = dom.window;
w.eval(fs.readFileSync('node_modules/jquery/dist/jquery.js','utf8'));

const clone = o => JSON.parse(JSON.stringify(o));
function toHelper(raw) {
  const order = raw.prompt_order.at(-1).order;
  const rank = new Map(order.map((o,i)=>[o.identifier,i]));
  const state = new Map(order.map(o=>[o.identifier, Boolean(o.enabled)]));
  const prompts=[], unused=[];
  for (const x of raw.prompts) {
    const item = { ...x, id:x.identifier, enabled: state.get(x.identifier) ?? false };
    (rank.has(x.identifier)?prompts:unused).push(item);
  }
  prompts.sort((a,b)=>rank.get(a.id)-rank.get(b.id));
  const { prompts:_p, prompt_order:_o, extensions, ...settings } = raw;
  return { settings, prompts, prompts_unused: unused, extensions: clone(extensions) };
}
let live = toHelper(preset), calls = 0, writes = 0;
w.getPreset = () => { calls++; return clone(live); };
const nsfwOf = pr => { const p = pr.find(x => /\{\{setglobalvar::NSFW::/.test(x.content||'') && !/\{\{trim\}\}/.test(x.content||'')); return p ? p.enabled : null; };
let nsfwFlips = 0;
w.updatePresetWith = async (which, fn) => {
  const next = await fn(clone(live));
  if (which==='in_use'){ if (nsfwOf(next.prompts) !== nsfwOf(live.prompts)) nsfwFlips++; live=clone(next); writes++; }
  return live;
};
w.getLoadedPresetName = () => '【MoM】果实V6.14丨果实之心@KKM';

// 聊天记录 + 事件总线
const chat = [];
let chatId = 'chat-A';
w.__setChatId__ = v => { chatId = v; };
w.SillyTavern = { getContext: () => ({ chat, getCurrentChatId: () => chatId, chatCompletionSettings:{ chat_completion_source:'makersuite', google_model:'gemini-3.8-flash' } }) };
// ── 假世界书：酒馆原始格式（comment 名字 / disable 开关 / constant 蓝灯）
// 写接口留着，但测试要断言它【一次都没被调用】—— 新做法不碰世界书文件
const makeLore = () => ({
  globalLore: [
    { uid:1, world:'全局甲', comment:'NSFW 姿势库', disable:false, constant:true },
    { uid:2, world:'全局甲', comment:'日常礼仪',    disable:false, constant:true },
    { uid:3, world:'全局甲', comment:'nsfw 台词',   disable:false, constant:false },
    { uid:4, world:'全局甲', comment:'🔞 特殊癖好',  disable:false, constant:true },
  ],
  characterLore: [
    { uid:9,  world:'角色乙', comment:'人物关系',        disable:false, constant:true },
    { uid:10, world:'角色乙', comment:'某某的 NsFw 癖好', disable:false, constant:false },
  ],
  chatLore:    [ { uid:20, world:'聊天丙', comment:'本场 NSFW 约定', disable:false, constant:true } ],
  personaLore: [ { uid:30, world:'玩家丁', comment:'user 的 nsfw 设定', disable:false, constant:true } ],
});
let wbWrites = 0;
w.TavernHelper = {
  getGlobalWorldbookNames: () => ['全局甲'],
  getCharWorldbookNames: () => ({ primary:'角色乙', additional:[] }),
  getWorldbook: () => [],
  replaceWorldbook: () => { wbWrites++; },
};
const handlers = {};
w.eventOn = (name, fn) => { (handlers[name] ||= []).push(fn); };
w.tavern_events = { MESSAGE_SENT:'MESSAGE_SENT', GENERATION_AFTER_COMMANDS:'GENERATION_AFTER_COMMANDS', WORLDINFO_ENTRIES_LOADED:'worldinfo_entries_loaded', GENERATION_STOPPED:'GENERATION_STOPPED', CHAT_CHANGED:'CHAT_CHANGED', OAI_PRESET_CHANGED_AFTER:'p1', PRESET_CHANGED:'p2' };
const emit = async (name, ...args) => { for (const fn of handlers[name]||[]) await fn(...args); };

const toasts = [];
w.toastr = { success(m){toasts.push(['ok',m]);}, error(m){toasts.push(['err',m]);}, info(m){toasts.push(['info',m]);}, log(){}, warning(){} };
w.fetch = () => Promise.reject(new Error('harness: no network'));
if (!w.AbortSignal.timeout) w.AbortSignal.timeout = () => undefined;
w.setInterval = () => 0;
w.matchMedia = q => ({ matches:false, media:q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
w.requestAnimationFrame = f => { f(0); return 0; };
w.HTMLElement.prototype.setPointerCapture = function(){};
w.HTMLElement.prototype.releasePointerCapture = function(){};
w.HTMLElement.prototype.scrollIntoView = function(){};
w.confirm = () => true;
const consoleErrs=[]; const origErr=console.error; console.error=(...a)=>consoleErrs.push(a.map(String).join(' '));
const consoleWarns=[]; const origWarn=console.warn; console.warn=(...a)=>consoleWarns.push(a.map(String).join(' '));

w.eval(fs.readFileSync(target,'utf8'));
module.exports = { w, live: () => live, chat, emit, toasts, makeLore, wbWrites: () => wbWrites,
  stats: () => ({calls, writes, nsfwFlips}), consoleErrs, consoleWarns,
  nsfwOn: () => { const p = live.prompts.find(x => /\{\{setglobalvar::NSFW::/.test(x.content||'') && !/\{\{trim\}\}/.test(x.content||'')); return p ? p.enabled : null; } };
