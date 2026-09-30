import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';

// novel-export.js 是 IIFE 里的一段纯函数，直接拿出来跑
const src = fs.readFileSync(new URL('../src/core/novel-export.js', import.meta.url), 'utf8');
const nx = new Function(`${src}; return { nxRun, nxDetect, nxBlocks, nxApplyRules, nxClean, nxParas };`)();
const base = { keep: ['content'], user: 'keep', orphan: 'keep', hidden: true, chapter: 'number', para: 'blank',
    cleanMd: true, speaker: false, floorNo: false, cover: false, rules: [] };
const ai = mes => ({ name: '江晦', is_user: false, mes });
const me = mes => ({ name: '我', is_user: true, mes });
const header = (chap, title) => `<novel_header>\n[CHAP] ${chap}\n[TITLE] ${title}\n[CP] 某\n[PREFACE] 引子\n</novel_header>\n`;

test('只留正文：思维链、生图构思、生图提示词、注释、摘要、选项全去掉', () => {
    const mes = `想了很多\n</thinking>\n${header('001', '听风')}<content>\n第一段。\n<imgthink>\n自检\n</imgthink>\nimage###\nmasterpiece, 1girl###\n\n第二段<!-- 注释 -->。\n</content>\n<meow_FM>\nserial:1\n</meow_FM>\n<branches><details><summary>分支</summary>A. 走</details></branches>`;
    const r = nx.nxRun([ai(mes)], base);
    assert.equal(r.text, '第1章　听风\n\n第一段。\n\n第二段。');
    assert.equal(r.chars, 8);
});
test('自动编号不受模型乱写的章号影响；原章号模式照抄并把 001 读成第1章', () => {
    const chat = [ai(header('第八章', '甲') + '<content>一</content>'), me('推进'), ai(header('001', '乙') + '<content>二</content>')];
    assert.match(nx.nxRun(chat, base).text, /^第1章　甲[\s\S]*第2章　乙/);
    assert.match(nx.nxRun([ai('<content>开场</content>'), ...chat], base).text, /^序章\n\n开场[\s\S]*第1章　甲/);
    const src2 = nx.nxRun(chat, { ...base, chapter: 'source' }).text;
    assert.match(src2, /^第八章　甲[\s\S]*第1章　乙/);
    assert.doesNotMatch(nx.nxRun(chat, { ...base, chapter: 'none' }).text, /第.章/);
});
test('单行 novel_header 也能解析', () => {
    const r = nx.nxRun([ai('<novel_header>[CHAP] 3 [TITLE] 夜航 [CP] x</novel_header><content>正文</content>')], base);
    assert.match(r.text, /^第1章　夜航/);
});
test('AI 忘了写 <content>：保留其余文字 / 跳过这层', () => {
    const chat = [ai('正文在外面\n<meow_FM>摘要</meow_FM>')];
    assert.equal(nx.nxRun(chat, { ...base, chapter: 'none' }).text, '正文在外面');
    assert.equal(nx.nxRun(chat, { ...base, orphan: 'skip' }).floors, 0);
});
test('我的发言可省略；隐藏楼层可排除；范围倒着写也认', () => {
    const chat = [ai('<content>a</content>'), me('我说'), { ...ai('<content>藏</content>'), is_system: true }, ai('<content>b</content>')];
    assert.match(nx.nxRun(chat, base).text, /我说/);
    assert.doesNotMatch(nx.nxRun(chat, { ...base, user: 'omit' }).text, /我说/);
    assert.doesNotMatch(nx.nxRun(chat, { ...base, hidden: false }).text, /藏/);
    const r = nx.nxRun(chat, { ...base, from: 3, to: 1 });
    assert.deepEqual([r.first, r.last], [1, 3]);
});
test('勾选小剧场：带标签名、summary 成为标题行、Markdown 清掉', () => {
    const mes = '<content>正文</content>\n<snow>\n<!-- log -->\n<details><summary>——🍳 煲仔饭——</summary>\n<ccd>\n> 「引文」\n## 小标题\n**粗** *斜* ~~删~~ ||亮||\n* 列表\n---\n</ccd>\n</details>\n</snow>';
    const r = nx.nxRun([ai(mes)], { ...base, keep: ['content', 'snow'], chapter: 'none' });
    assert.equal(r.text, '正文\n\n【小剧场】\n\n——🍳 煲仔饭——\n\n「引文」\n\n小标题\n\n粗 斜 删 亮\n\n· 列表');
});
test('替换规则：普通文字、/正则/、导入的不带斜杠正则、{{match}}', () => {
    const rules = [{ find: 'a.b', replace: 'X' }, { find: '/(\\d+)号/g', replace: '第$1号' }, { find: '猫+', replace: '[{{match}}]', regex: true },
        { find: '删我', replace: '', on: true }, { find: '不动', replace: '动了', on: false }];
    assert.equal(nx.nxApplyRules('a.b axb 3号 猫猫 删我 不动', rules), 'X axb 第3号 [猫猫]  不动');
    assert.equal(nx.nxApplyRules('x', [{ find: '/(/g', replace: '' }]), 'x');   // 坏正则跳过，不炸
});
test('段落：首行缩进、原样；标注发言人和楼层号', () => {
    assert.equal(nx.nxParas('一\n\n\n二\n', 'indent'), '　　一\n　　二');
    assert.equal(nx.nxParas('一\n\n\n\n二', 'raw'), '一\n\n二');
    const r = nx.nxRun([me('你好')], { ...base, speaker: true, floorNo: true });
    assert.equal(r.text, '【我 · #0】\n\n你好');
});
test('书名页与统计；检测胶囊不含 novel_header 和思维链', () => {
    const chat = [ai(header('1', 'A') + '<content>一二三</content><thinking>x</thinking><time>12:00</time>'), me('嗯')];
    const r = nx.nxRun(chat, { ...base, cover: true, title: '书', meta: { character: '江晦', time: 't' } });
    assert.match(r.text, /^《书》\n\n角色：江晦\n楼层：0 – 1（共 2 层）\n字数：约 4 字/);
    const d = nx.nxDetect(chat, 0, 1, true);
    assert.deepEqual([...d.counts.keys()].sort(), ['content', 'time']);
    assert.equal(d.header, 1);
});
test('预览按字数截断', () => {
    const chat = Array.from({ length: 50 }, (_, i) => ai(`<content>${'字'.repeat(100)}${i}</content>`));
    const r = nx.nxRun(chat, base, 300);
    assert.ok(r.floors < 50 && r.truncated);
});
