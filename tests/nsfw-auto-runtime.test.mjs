import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const read = file => fs.readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
function fixture() {
    const handlers = new Map(), writes = [], status = [];
    const preset = { prompts: [{ id: 'chosen', name: 'Selected', enabled: false }, { id: 'other', name: 'Other', enabled: true }] };
    let message = null, input = '', chatId = 'chat';
    const events = Object.fromEntries(['GENERATION_AFTER_COMMANDS', 'GENERATION_ENDED', 'GENERATION_STOPPED', 'CHAT_CHANGED'].map(x => [x, x]));
    const config = { version: 2, enabled: true, words: 'trigger', cooldown: 2, ids: ['chosen'] };
    const api = {
        eventOn(name, fn) { handlers.set(name, fn); return { stop() { handlers.delete(name); } }; },
        getChatMessages() { return message ? [message] : []; },
        async updatePresetWith(name, callback) { writes.push(name); return callback(preset); },
    };
    const context = vm.createContext({ console, setTimeout, Date, JSON, Set,
        window: { tavern_events: events, SillyTavern: { getContext: () => ({ getCurrentChatId: () => chatId }) } },
        hostWindow: { localStorage: { getItem: () => JSON.stringify(config) } },
        doc: { querySelector: () => ({ value: input }) }, loadedName: () => 'preset',
        activePreset: () => preset, nsfwMaster: p => p.prompts.find(x => x.id === 'chosen'),
        resolveFunction: name => api[name], promptId: p => p.id, CONFIG_ID: 'config', PLACEHOLDER_IDS: new Set(),
        isDivider: () => false, readConfig: () => ({}), captureManualChanges() {}, rememberAppliedStates() {}, writeConfig() {},
        root: { hasClass: () => false, find: () => ({ text: x => status.push(x) }) }, render() {},
        destroyed: false, busy: false,
    });
    vm.runInContext(read('nsfw-auto.js') + read('nsfw-auto-runtime.js') + '\nbindNsfwAuto();', context);
    return { config, preset, writes, handlers, status, settings: () => vm.runInContext('nsfwAutoSettings()', context),
        begin: async (text, type = 'normal') => { input = text; await handlers.get(events.GENERATION_AFTER_COMMANDS)(type, {}, false); },
        finish: async text => { message = { message_id: (message?.message_id || 0) + 1, role: 'assistant', message: text }; await handlers.get(events.GENERATION_ENDED)(); },
        stop: () => handlers.get(events.GENERATION_STOPPED)(),
        switchChat: () => { chatId = 'next'; handlers.get(events.CHAT_CHANGED)(); },
        destroy: () => vm.runInContext('nsfwAutoController.destroy(); for (const stop of nsfwAutoStops.splice(0)) stop();', context),
    };
}
test('input toggles before generation; output cooldown changes existing NSFW master only', async () => {
    const f = fixture();
    await f.begin('trigger');
    assert.equal(f.preset.prompts[0].enabled, true);
    await f.finish('ordinary');
    await f.begin('ordinary'); await f.finish('ordinary');
    assert.equal(f.preset.prompts[0].enabled, true);
    await f.begin('ordinary'); await f.finish('ordinary');
    assert.equal(f.preset.prompts[0].enabled, false);
    assert.equal(f.preset.prompts[1].enabled, true);
    assert.ok(f.writes.every(name => name === 'in_use'));
});
test('reply hit opens existing NSFW master; regeneration and cancelled rounds do not close it', async () => {
    const f = fixture(); f.config.cooldown = 1;
    await f.begin('ordinary'); await f.finish('trigger');
    assert.equal(f.preset.prompts[0].enabled, true);
    await f.begin('', 'regenerate'); await f.finish('ordinary');
    await f.begin('ordinary'); f.stop(); await f.finish('ordinary');
    assert.equal(f.preset.prompts[0].enabled, true);
});
test('chat switch discards old completion and destroy removes listeners', async () => {
    const f = fixture(); f.config.cooldown = 1;
    await f.begin('ordinary'); f.switchChat(); await f.finish('trigger');
    assert.equal(f.writes.length, 0);
    f.destroy();
    assert.equal(f.handlers.size, 0);
});

test('legacy rules merge defaults and custom words; v2 explicit empty remains empty', () => {
    const f = fixture(); f.config.version = 1; f.config.words = '自定义词';
    assert.ok(f.settings().words.includes('自定义词'));
    assert.ok(f.settings().words.includes('亲密'));
    f.config.version = 2; f.config.words = '';
    assert.equal(f.settings().words, '');
});
test('already enabled master is not repeatedly written', async () => {
    const f = fixture(); f.preset.prompts[0].enabled = true;
    await f.begin('trigger'); await f.finish('trigger');
    assert.equal(f.writes.length, 0);
});
test('missing master reports a problem without changing unrelated entries', async () => {
    const f = fixture(); f.preset.prompts.shift();
    await f.begin('trigger');
    assert.equal(f.writes.length, 0);
    assert.equal(f.preset.prompts[0].enabled, true);
    assert.ok(f.status.some(x => x.includes('未找到')));
});
