import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const source = fs.readFileSync(new URL('../src/updates.js', import.meta.url), 'utf8').replace('__RELEASE_NOTES__', '[]');
test('destroy cancels an in-flight update without rendering or writing cache', async () => {
    let requestSignal, renders = 0, writes = 0;
    const context = vm.createContext({ AbortController, AbortSignal, setTimeout, clearTimeout,
        destroyed: false, LOCAL_BUILD: false, SCRIPT_VERSION: '20260919.15', currentView: 'overview',
        root: { find() { renders++; return []; } }, localStorage: { setItem() { writes++; }, removeItem() { writes++; } },
        fetch: (_url, options) => new Promise((_resolve, reject) => {
            requestSignal = options.signal;
            options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
        }),
    });
    vm.runInContext(source, context);
    const pending = vm.runInContext('checkScriptUpdate(true)', context);
    vm.runInContext('destroyed = true; updateAbortController.abort();', context);
    await pending;
    assert.equal(requestSignal.aborted, true);
    assert.equal(renders, 0);
    assert.equal(writes, 0);
});
test('local build never schedules or downloads upstream updates', async () => {
    let external = 0;
    const context = vm.createContext({ LOCAL_BUILD: true, currentView: 'overview',
        setTimeout() { external++; }, fetch() { external++; } });
    vm.runInContext(source, context);
    await vm.runInContext('scheduleUpdateCheck(); checkScriptUpdate(true);', context);
    assert.equal(external, 0);
});

for (const kind of ['panel', 'loader']) test(`${kind} cache write failure restores previous offline version`, () => {
    let cache = 'old-version';
    const localStorage = { getItem: () => cache, removeItem: () => { cache = null; },
        setItem(_key, value) { if (value !== 'old-version') throw Error('QuotaExceeded'); cache = value; } };
    const context = vm.createContext({ localStorage, console: { warn() {} } });
    if (kind === 'panel') {
        vm.runInContext(source, context);
        assert.throws(() => vm.runInContext("saveReleasedScript({code:'new-version'})", context));
    } else {
        const loader = fs.readFileSync(new URL('../src/loader.template.js', import.meta.url), 'utf8');
        const save = loader.slice(loader.indexOf('    function save(entry)'), loader.indexOf('    async function run(entry)'));
        vm.runInContext("const CACHE='test';" + save + ";save({code:'new-version'});", context);
    }
    assert.equal(cache, 'old-version');
});
