import fs from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../src/model-link.js', import.meta.url), 'utf8');
const body = source.slice(source.indexOf('    function linkedModelTag'), source.indexOf('    async function syncConnectedModel'));
const resolve = new Function('allModelTags', 'tagFamily', body + '\nreturn linkedModelTag;')(
    preset => preset.tags, tag => tag.split(' ')[0]);
const standard = ['GEMINI', 'GEMINI 3.8F', 'GEMINI 3.1PRO', 'CLAUDE', 'DS'];
for (const [model, expected, tags = standard] of [
    ['google/gemini-3.8-flash-preview', 'GEMINI 3.8F'],
    ['google/gemini-3.1-pro-preview', 'GEMINI 3.1PRO'],
    ['gemini-2.5-flash', 'GEMINI 3.8F'],
    ['anthropic/claude-sonnet-4-6', 'CLAUDE'],
    ['deepseek-ai/DeepSeek-V4-Pro', 'DS'],
    ['unknown-model', ''],
    ['gpt-4.1', ''],
    ['claude-opus', '', ['GEMINI']],
    ['gemini-3.8-flash', 'GEMINI 3.8F', ['GEMINI 3.8F', 'GEMINI 3.7F']],
    ['gemini-3.9-flash', '', ['GEMINI 3.8F', 'GEMINI 3.7F']],
    ['gemini-3.1-pro', '', ['GEMINI 3.8F']],
    ['gemini-3.1-pro', 'GEMINI', ['GEMINI']],
]) test(`${model} -> ${expected || 'unchanged'} (${tags.join(',')})`, () => assert.equal(resolve(model, { tags }), expected));
