import fs from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../src/model-link.js', import.meta.url), 'utf8');
const body = source.slice(source.indexOf('    function linkedModelTag'), source.indexOf('    async function syncConnectedModel'));
const template = fs.readFileSync(new URL('../src/core/presets.js', import.meta.url), 'utf8');
const grouping = template.slice(template.indexOf('    function modelGroup'), template.indexOf('    // ── 分区：'));
const { resolve, appliedTag, modelChoices, currentModel } = new Function('allModelTags', grouping + body + '\nreturn { resolve: linkedModelTag, appliedTag, modelChoices, currentModel };')(preset => preset.tags);
const standard = ['GEMINI', 'GEMINI 3.8F', 'GEMINI 3.1PRO', 'CLAUDE', 'DS'];
for (const [model, expected, tags = standard] of [
    ['google/gemini-3.8-flash-preview', 'GEMINI FLASH'],
    ['google/gemini-3.1-pro-preview', 'GEMINI PRO'],
    ['gemini-2.5-flash', 'GEMINI FLASH'],
    ['anthropic/claude-sonnet-4-6', 'CLAUDE'],
    ['deepseek-ai/DeepSeek-V4-Pro', 'DS'],
    ['glm-5', 'GLM', [...standard, 'GLM']],
    ['zai-org/GLM-4.6', 'GLM', [...standard, 'GLM']],
    ['glm-5', '', standard],
    ['unknown-model', ''],
    ['gpt-4.1', ''],
    ['claude-opus', '', ['GEMINI']],
    ['gemini-3.8-flash', 'GEMINI FLASH', ['GEMINI 3.8F', 'GEMINI 3.7F']],
    ['gemini-3.9-flash', 'GEMINI FLASH', ['GEMINI 3.8F', 'GEMINI 3.7F']],
    ['gemini-3.1-pro', '', ['GEMINI 3.8F']],
    ['gemini-3.1-pro', 'GEMINI', ['GEMINI']],
]) test(`${model} -> ${expected || 'unchanged'} (${tags.join(',')})`, () => assert.equal(resolve(model, { tags }), expected));

test('Flash aliases share one choice and retain original state keys', () => {
    const tags = ['GEMINI', 'GEMINI 3.8F', 'GEMINI 3.7F', 'GEMINI FLASH', 'gemini flash', 'GEMINI 3.1PRO', 'CLAUDE', 'DS'];
    const choices = modelChoices({ tags });
    assert.deepEqual(choices.map(x => x.label), ['Gemini Flash', 'Gemini Pro', 'Claude', 'DeepSeek']);
    for (const tag of tags.slice(1, 5)) {
        assert.equal(currentModel({activeTag:tag}, choices).label, 'Gemini Flash');
        assert.equal(appliedTag([tag], 'GEMINI FLASH'), tag);
        assert.equal(appliedTag([tag], 'GEMINI PRO'), '');
    }
    assert.equal(appliedTag(['GEMINI'], 'GEMINI FLASH'), 'GEMINI');
    assert.equal(resolve('gemini-3.7F', {tags}), 'GEMINI FLASH');
    assert.equal(resolve('gemini-FLASH', {tags}), 'GEMINI FLASH');
});
