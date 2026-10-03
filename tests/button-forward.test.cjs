// 让位的那一份要把自己身上的快捷栏按钮转给正在跑的那一份
//   node tests/button-forward.test.cjs dev/fruit-heart.js
// 场景（2026-10-03 V6.41）：「🍎 果实之心」按钮挂在本地版脚本上，本地版和 Git 版同版本都开着 → Git 版在跑、本地版让位。
// 酒馆助手的按钮 click.stop 后只 emit「本地版脚本 id + 按钮名」这个事件，以前没人听，点了没反应。
const { JSDOM } = require('jsdom');
const fs = require('fs');
const assert = require('node:assert/strict');
const target = process.argv[2] || 'dev/fruit-heart.js';
const code = fs.readFileSync(target, 'utf8');
if (!/const LOCAL_BUILD = true/.test(code)) throw new Error('要用本地版构建（node build.mjs --local）来测');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:8000/', runScripts: 'dangerously' });
const w = dom.window;
w.eval(fs.readFileSync('node_modules/jquery/dist/jquery.js', 'utf8'));
const handlers = {};
w.getButtonEvent = name => `script-b003:${name}`;
w.eventOn = (name, fn) => { (handlers[name] ||= []).push(fn); return { stop() {} }; };
w.__FRUIT_HEART_LOADER__ = { state: 'done' };
let opened = 0;
w.__FRUIT_HEART_MAIN__ = { version: '99999999.1', local: false, open() { opened++; }, destroy() { throw new Error('不该接管'); } };
w.eval(code);

setTimeout(() => {
  assert.equal(w.__FRUIT_HEART_MAIN__.version, '99999999.1', '本地版应当让位');
  const listened = Object.keys(handlers).filter(k => k.startsWith('script-b003:'));
  assert.ok(listened.includes('script-b003:🍎 果实之心') && listened.includes('script-b003:🍎果实之心'), '两种按钮名都要听：' + listened);
  for (const fn of handlers['script-b003:🍎 果实之心']) fn();
  assert.equal(opened, 1, '点按钮应当打开正在跑的那一份');
  // 正在跑的那一份换了（被重载），转发也要找新的，不能攥着旧的 open
  let openedNew = 0;
  w.__FRUIT_HEART_MAIN__ = { version: '99999999.2', local: false, open() { openedNew++; } };
  for (const fn of handlers['script-b003:🍎 果实之心']) fn();
  assert.equal(openedNew, 1);
  console.log('让位转发快捷栏按钮：全部通过');
  process.exit(0);
}, 200);
