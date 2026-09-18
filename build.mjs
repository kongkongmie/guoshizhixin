import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n');
const history = JSON.parse(read('release-notes.json'));
const version = history[0].version;
if (!/^\d{8}\.\d+$/.test(version)) throw Error('Invalid release version');
// Isolated CommonJS wrapper for the vendored browser hash implementation; no globals are installed.
const hashCode = `    const hashScript = (() => {
        const module = { exports: {} };
        const process = undefined, window = {}, self = undefined, define = undefined;
${read('vendor/js-sha256.js')}
        return module.exports.sha256;
    })();`;
const script = read('src/fruit-heart.template.js')
    .replace('__HASH__', () => hashCode)
    .replace('__SCRIPT_VERSION__', JSON.stringify(version))
    .replace('__MODEL_LINK__', read('src/model-link.js'))
    .replace('__UPDATES__', read('src/updates.js').replace('__RELEASE_NOTES__', JSON.stringify(history)));
const output = path.join(root, 'releases', version, 'fruit-heart.js');
if (fs.existsSync(output) && fs.readFileSync(output, 'utf8') !== script) throw Error('Release already exists with different content. Increment the version.');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, script);
const sha256 = crypto.createHash('sha256').update(script).digest('hex');
fs.writeFileSync(path.join(root, 'release.json'), JSON.stringify({ version, sha256, history }, null, 2) + '\n');
const loader = read('src/loader.template.js').replace('__HASH__', () => hashCode);
fs.writeFileSync(path.join(root, 'loader.js'), loader);
fs.mkdirSync(path.join(root, 'install'), { recursive: true });
fs.writeFileSync(path.join(root, 'install', '20260918丨果实之心丨Git加载修复.json'), JSON.stringify({
    type: 'script', enabled: true, name: '20260918丨果实之心丨Git正式版（HTTP修复）',
    id: '7fdcd2d4-62c2-4df7-91bc-f39e6e62b004', content: loader,
    info: '先关闭旧 Git 版，再导入此脚本。修复普通 HTTP 酒馆下的加载校验；不含预设正文。',
    button: { enabled: true, buttons: [] }, data: {}, export_with: { data: true, button: true },
}, null, 2) + '\n');
console.log(`Built ${version}: ${sha256}`);
