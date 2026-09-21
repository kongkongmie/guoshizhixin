import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assemble } from '../scripts/assemble.mjs';

const reader = files => name => {
    if (!(name in files)) throw Error(`Not found: ${name}`);
    return files[name];
};
test('composition preserves source order, whitespace and literal dollar patterns', () => {
    const read = reader({ main: "start\n/* @include part */\nend", part: "__VALUE__\n" });
    assert.equal(assemble('main', { read, values: { __VALUE__: "$& $' $`" } }), "start\n$& $' $`\nend");
});
test('cycles, duplicates, missing fragments and escaping paths fail clearly', () => {
    assert.throws(() => assemble('a', { read: reader({ a: '/* @include b */', b: '/* @include a */' }) }), /Circular/);
    assert.throws(() => assemble('a', { read: reader({ a: '/* @include b *//* @include b */', b: 'x' }) }), /Duplicate/);
    assert.throws(() => assemble('a', { read: reader({ a: '/* @include absent */' }) }), /Not found/);
    assert.throws(() => assemble('../a', { read: reader({}) }), /Invalid source path/);
    assert.throws(() => assemble('a', { read: reader({ a: '' }), values: { __MISSING__: '' } }), /Missing build token/);
});
