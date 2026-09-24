import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assemble } from './scripts/assemble.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n');
const history = JSON.parse(read('release-notes.json'));
const version = history[0].version;
if (!/^\d{8}\.\d+$/.test(version)) throw Error('Invalid release version');
// Isolated CommonJS wrapper for the vendored browser hash implementation; no globals are installed.
const hashCode = `    const hashScript = (() => {
        const module = { exports: {} };
        const process = undefined, window = {}, self = undefined, define = undefined, require = undefined;
${read('vendor/js-sha256.js')}
        return module.exports.sha256;
    })();`;
const script = assemble('src/fruit-heart.template.js', { read, values: {
    __HASH__: hashCode,
    __SCRIPT_VERSION__: JSON.stringify(version),
    __LOCAL_BUILD__: String(process.argv.includes('--local')),
    __MODEL_LINK__: read('src/model-link.js'),
    __PANEL_CSS__: JSON.stringify(['panel.css', 'themes.css', 'overrides.css'].map(name => read('src/styles/' + name)).join('')),
    __UPDATES__: read('src/updates.js').replace('__RELEASE_NOTES__', () => JSON.stringify(history)),
} });
if (process.argv.includes('--local')) {
    const dir = path.join(root, 'dev');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'fruit-heart.js'), script);
    fs.writeFileSync(path.join(dir, 'fruit-heart-local.json'), JSON.stringify({
        type: 'script', enabled: false, name: '果实之心丨本地测试版',
        id: 'b1772083-57d1-4718-93bd-7e5793a0ea10', content: script,
        info: '先停用原果实之心脚本，再导入并启用此本地测试版。',
        button: { enabled: true, buttons: [] }, data: {}, export_with: { data: true, button: true },
    }, null, 2) + '\n');
    console.log('Built local test script: dev/fruit-heart-local.json (disabled by default)');
} else {
    const output = path.join(root, 'releases', version, 'fruit-heart.js');
    if (fs.existsSync(output) && fs.readFileSync(output, 'utf8') !== script) throw Error('Release already exists with different content. Increment the version.');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, script);
    const sha256 = crypto.createHash('sha256').update(script).digest('hex');
    fs.writeFileSync(path.join(root, 'release.json'), JSON.stringify({ version, sha256, history }, null, 2) + '\n');
    const loader = read('src/loader.template.js')
        .replace('__HASH__', () => hashCode)
        .replace('__LOADER_VERSION__', JSON.stringify(version));
    fs.writeFileSync(path.join(root, 'loader.js'), loader);
    fs.mkdirSync(path.join(root, 'install'), { recursive: true });
    fs.writeFileSync(path.join(root, 'install', '20260918丨果实之心丨Git加载修复.json'), JSON.stringify({
        type: 'script', enabled: true, name: '20260918丨果实之心丨Git正式版（HTTP修复）',
        id: '7fdcd2d4-62c2-4df7-91bc-f39e6e62b004', content: loader,
        info: '先关闭旧 Git 版，再导入此脚本。修复普通 HTTP 酒馆下的加载校验；不含预设正文。',
        button: { enabled: true, buttons: [] }, data: {}, export_with: { data: true, button: true },
    }, null, 2) + '\n');
    console.log(`Built ${version}: ${sha256}`);

}
