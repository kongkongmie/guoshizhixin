// 面板关着时，那个 2.5 秒的后台扫描一轮要抓几次整份预设
const fs=require('fs');
const os=require('os');
const path=require('path');
const probe=path.join(os.tmpdir(), `fruit-heart-sweep-probe-${process.pid}.js`);
const src=fs.readFileSync(process.argv[2],'utf8')
  .replace("    const entrySweepTimer = setInterval(", "    window.__SWEEP__ = () => { if (!doc.hidden) { refreshEntryBinding(); sweepBarEntry(); ensureWandEntry(); } };\n    const entrySweepTimer = setInterval(");
fs.writeFileSync(probe, src);
process.argv[2]=probe;
process.on('exit',()=>{ try { fs.unlinkSync(probe); } catch {} });
const H=require('./panel-harness.cjs');
setTimeout(()=>{
  const before=H.stats().calls;
  for(let i=0;i<10;i++) H.w.__SWEEP__();
  const per=(H.stats().calls-before)/10;
  console.log('面板关着，每轮后台扫描抓整份预设:', per, '次');
  console.log(per===0 ? '  ✓ 稳态下零读取' : '  ✗ 还在读');
  // 快捷栏 querySelectorAll 次数
  let qsa=0; const orig=H.w.document.querySelectorAll.bind(H.w.document);
  H.w.document.querySelectorAll=(sel)=>{ if(String(sel).includes('qr--')) qsa++; return orig(sel); };
  H.w.__SWEEP__();
  console.log('每轮扫快捷栏:', qsa, '次 querySelectorAll', qsa<=1?'  ✓':'  ✗');
  process.exit(0);
},80);
