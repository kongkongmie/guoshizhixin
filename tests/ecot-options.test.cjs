const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const source = process.argv[2] || 'H:/果实预设开发/fruit-heart-ecot.js';
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:8000/',
  pretendToBeVisual: true,
  runScripts: 'dangerously',
});
const w = dom.window;
w.setTimeout = () => 0;
w.getLoadedPresetName = () => '【MoM】果实V6.14丨果实之心@KKM';
w.SillyTavern = {
  getContext: () => ({ chat: [], eventSource: { on() {} }, event_types: {} }),
};
w.eval(fs.readFileSync(source, 'utf8'));

const api = w.FruitHeartECoT;
assert.ok(api, 'ECoT API should be installed');
assert.equal(api.getAutoParse(), true, 'auto parse defaults to on');
assert.equal(api.getTrimBeforeLanguageCheck(), true, 'language trim defaults to on');
assert.deepEqual(Array.from(api.getEndTags()), [
  '</ECoT>', '</thinking>', '</think>', '<!-- End of The ECoT -->', '<!-- End the ECoT -->',
]);

const sourceText = '旧前缀\n[语言检定]\n正文思考\n</ECoT>\n可见正文';
assert.equal(api.splitReasoning(sourceText).reasoning, '[语言检定]\n正文思考');
api.setTrimBeforeLanguageCheck(false);
assert.equal(api.splitReasoning(sourceText).reasoning, '旧前缀\n[语言检定]\n正文思考');
api.setAutoParse(false);
assert.equal(api.getAutoParse(), false);
api.setTrimBeforeLanguageCheck(true);
assert.equal(api.getTrimBeforeLanguageCheck(), true);
console.log('ECoT toggles and split behavior pass');
