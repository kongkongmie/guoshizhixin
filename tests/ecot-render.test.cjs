// ECoT 改完消息后要让酒馆助手重新渲染前端代码块
//   node tests/ecot-render.test.cjs <ECoT 模块路径>
// 2026-10-03：新回复里美化正则的 ```html 代码块经常停在裸代码上。
// 根因：ECoT 拆思维链 / 清 [语言检定] 后 updateMessageBlock 重画了整条消息，但没广播 MESSAGE_UPDATED；
// 酒馆助手记着「这一楼渲染过了」，只在 MESSAGE_UPDATED / *_RENDERED 时才重新渲染。
// 这里用一个按酒馆助手逻辑写的假渲染器：重画会把这一楼打回裸代码，听到事件才重新渲染。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const source = process.argv[2];
if (!source) throw new Error('用法：node tests/ecot-render.test.cjs <ECoT 模块路径>');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:8000/', runScripts: 'dangerously' });
const w = dom.window;
w.setTimeout = () => 0;            // 不跑启动时的 rescan，下面手动触发

const handlers = {};
const emitted = [];
const eventSource = {
  on(name, fn) { (handlers[name] ||= []).push(fn); },
  async emit(name, ...args) { emitted.push([name, ...args]); for (const fn of handlers[name] || []) await fn(...args); },
};
const event_types = { MESSAGE_RECEIVED: 'message_received', CHARACTER_MESSAGE_RENDERED: 'character_message_rendered',
  MESSAGE_UPDATED: 'message_updated', MESSAGE_SWIPED: 'message_swiped', GENERATION_ENDED: 'generation_ended' };
// 假酒馆助手：rendered 记哪些楼渲染成了前端界面
const rendered = new Set();
for (const name of [event_types.CHARACTER_MESSAGE_RENDERED, event_types.MESSAGE_UPDATED, event_types.MESSAGE_SWIPED]) {
  eventSource.on(name, id => { rendered.add(Number(id)); });
}
let redraws = 0, saves = 0;
const chat = [
  { is_user: true, mes: '你好' },
  { is_user: false, mes: '<content>正文</content>\n```html\n<html><body>状态栏</body></html>\n```', extra: {} },
];
const ctx = { chat, eventSource, event_types,
  updateMessageBlock(id) { redraws++; rendered.delete(Number(id)); },   // 重画 = 代码块变回裸代码
  async saveChat() { saves++; } };
w.SillyTavern = { getContext: () => ctx };
w.eval(fs.readFileSync(source, 'utf8'));
const api = w.FruitHeartECoT;
assert.ok(api, 'ECoT API 应当装上');

(async () => {
  // 真实顺序：新回复到达（此时还没推理）→ 酒馆原生解析晚一步写进推理（带 [语言检定] 之前的废话）
  // → CHARACTER_MESSAGE_RENDERED：酒馆助手先注册，先渲染成前端；ECoT 后到，清理推理并重画整条消息
  await eventSource.emit(event_types.MESSAGE_RECEIVED, 1);
  chat[1].extra.reasoning = '先嘀咕两句\n[语言检定]\n中文';
  await eventSource.emit(event_types.CHARACTER_MESSAGE_RENDERED, 1);
  for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r));
  await api.extract(1);            // 等队列清空
  assert.equal(chat[1].extra.reasoning, '[语言检定]\n中文', 'ECoT 应当清掉 [语言检定] 之前的内容');
  assert.ok(redraws >= 1, 'ECoT 改了消息，应当重画过');
  assert.ok(rendered.has(1), '重画之后必须重新渲染成前端界面（旧版在这里失败：停在裸代码）');
  const updates = emitted.filter(e => e[0] === event_types.MESSAGE_UPDATED).length;
  assert.ok(updates >= 1 && updates <= 3, `MESSAGE_UPDATED 不该绕圈：${updates} 次`);
  // 再来一遍什么都不该动
  const before = [redraws, saves];
  await eventSource.emit(event_types.MESSAGE_UPDATED, 1);
  await api.extract(1);
  assert.deepEqual([redraws, saves], before, '已经处理过的楼不该再重画');
  console.log(`ECoT 重画后通知重新渲染：全部通过（${api.version}）`);
  process.exit(0);
})().catch(error => { console.error(error); process.exit(1); });
