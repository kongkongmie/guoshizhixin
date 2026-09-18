import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n');
const history = JSON.parse(read('release-notes.json'));
const version = history[0].version;
if (!/^\d{8}\.\d+$/.test(version)) throw Error('Invalid release version');
const script = read('src/fruit-heart.template.js')
    .replace('__SCRIPT_VERSION__', JSON.stringify(version))
    .replace('__MODEL_LINK__', read('src/model-link.js'))
    .replace('__UPDATES__', read('src/updates.js').replace('__RELEASE_NOTES__', JSON.stringify(history)));
const output = path.join(root, 'releases', version, 'fruit-heart.js');
if (fs.existsSync(output) && fs.readFileSync(output, 'utf8') !== script) throw Error('Release already exists with different content. Increment the version.');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, script);
const sha256 = crypto.createHash('sha256').update(script).digest('hex');
fs.writeFileSync(path.join(root, 'release.json'), JSON.stringify({ version, sha256, history }, null, 2) + '\n');
console.log(`Built ${version}: ${sha256}`);
