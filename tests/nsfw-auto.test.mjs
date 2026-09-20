import fs from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const source = fs.readFileSync(new URL('../src/nsfw-auto.js', import.meta.url), 'utf8');
const { nsfwMatch, createNsfwAutoController } = new Function(source + ';return {nsfwMatch,createNsfwAutoController};')();
function fixture(cooldown = 2) {
    const config = { enabled: true, words: '进入亲密, MODE ON', cooldown };
    const writes = [];
    let identity = 'chat/preset';
    const c = createNsfwAutoController({ identity: () => identity, settings: () => config,
        apply: async value => { writes.push(value); return true; }, status() {} });
    return { c, config, writes, switchChat: () => { identity = 'other'; } };
}
test('literal keywords, case folding, empty entries', () => {
    assert.equal(nsfwMatch('mode on', { words: ' MODE ON\n\n' }), 'mode on');
    assert.equal(nsfwMatch('axxb', { words: 'a.*b' }), '');
    assert.equal(nsfwMatch('anything', { words: '\n  ' }), '');
});
for (const cooldown of [1, 2]) test(`closes after ${cooldown} whole unmatched rounds`, async () => {
    const { c, writes } = fixture(cooldown);
    await c.begin('进入亲密'); await c.finish('ordinary');
    assert.deepEqual(writes, [true]);
    for (let n = 1; n <= cooldown; n++) {
        await c.begin('ordinary');
        assert.deepEqual(writes, [true]);
        await c.finish('ordinary');
        assert.deepEqual(writes, n === cooldown ? [true, false] : [true]);
    }
});
test('reply hit resets cooldown and repeated completion counts once', async () => {
    const { c, writes } = fixture();
    await c.begin('ordinary'); await c.finish('ordinary');
    await c.begin('ordinary'); await c.finish('进入亲密');
    await c.begin('ordinary'); await c.finish('ordinary'); await c.finish('ordinary');
    assert.deepEqual(writes, [true]);
    await c.begin('ordinary'); await c.finish('ordinary');
    assert.deepEqual(writes, [true, false]);
});
for (const change of ['chat', 'reset', 'destroy', 'disable', 'cancel']) test(`pending round discarded on ${change}`, async () => {
    const f = fixture(1);
    await f.c.begin('ordinary');
    if (change === 'chat') f.switchChat();
    if (change === 'reset') f.c.reset();
    if (change === 'destroy') f.c.destroy();
    if (change === 'disable') f.config.enabled = false;
    if (change === 'cancel') f.c.cancel();
    await f.c.finish('ordinary');
    assert.deepEqual(f.writes, []);
});
test('empty keywords disables decisions', async () => {
    const f = fixture(1); f.config.words = '';
    await f.c.begin('ordinary'); await f.c.finish('ordinary');
    assert.deepEqual(f.writes, []);
});
test('comma, Chinese comma, list comma, newline and semicolon are supported', () => {
    for (const word of ['甲','乙','丙','丁','戊','己']) assert.equal(nsfwMatch(word, { words: '甲,乙，丙、丁;戊\n己' }), word);
});
test('cancelled input write does not execute after cancellation', async () => {
    const f = fixture(); const pending = f.c.begin('进入亲密'); f.c.cancel(); await pending;
    assert.deepEqual(f.writes, []);
});
