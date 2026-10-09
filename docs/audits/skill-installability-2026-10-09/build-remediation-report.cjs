'use strict';
const fs = require('node:fs');
const path = require('node:path');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const status = read('remediation-status.json');
const verification = fs.existsSync(path.join(__dirname, 'remediation-verification.json')) ? read('remediation-verification.json') : { status: 'pending', checks: [] };
const payload = { stats: status.stats, packages: status.packages, resolutions: status.resolutions, verification };
const data = JSON.stringify(payload).replace(/</g, '\\u003c');
const html = `<!doctype html>
<html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Skill 修訂清單與安裝規則 · CraftRoster</title>
<style>
:root{color-scheme:light;font:15px/1.6 system-ui,"Microsoft JhengHei",sans-serif;color:#203042;background:#f5f7fb}*{box-sizing:border-box}body{margin:0}main{max-width:1280px;margin:32px auto;padding:0 24px}h1{font-size:29px;line-height:1.3;margin:8px 0}h2{font-size:20px}p{margin:10px 0}.muted{color:#5e6a7a}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.card,.panel{background:white;border:1px solid #dce3ed;border-radius:12px;padding:18px}.card strong{display:block;font-size:30px;color:#14565f}.controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center}input,select,button{font:inherit;border:1px solid #c5d1df;border-radius:6px;padding:8px;background:white}input[type=search]{flex:1;min-width:220px}button{cursor:pointer;color:#14565f;text-align:left}button:hover{background:#e9f6f4}.table-wrap{overflow:auto;margin-top:18px}table{border-collapse:collapse;width:100%;background:white}th,td{text-align:left;border-bottom:1px solid #e1e6ee;padding:11px 14px;vertical-align:top}th{background:#eef3f9;font-size:13px}td:first-child{min-width:220px}code{overflow-wrap:anywhere;color:#284c69}a{color:#146169}.badge{display:inline-block;border-radius:4px;background:#e4f3ef;color:#246152;padding:1px 6px;font-size:12px}.warning{border-left:4px solid #ae7735;padding-left:15px}.detail{margin-top:20px}.detail li{margin:6px 0}.checks{font-size:14px}.check-pass{color:#256642}#detail[hidden]{display:none}@media(max-width:750px){main{padding:0 14px}.cards{grid-template-columns:1fr 1fr}h1{font-size:24px}}
</style><main>
<p class="muted">CraftRoster · 2026-10-09 · 修訂結果</p>
<h1>Skill 修訂清單與安裝規則</h1>
<p>核心配套、條件分支、共用文件與替代主責已分開記錄。這份頁面顯示修後 catalog；<a href="skill-installability-report.html">原研究報告</a>保留修前快照。</p>
<div class="cards" id="cards"></div>
<div class="panel"><strong>安裝規則</strong><p><code>required</code> 遞迴補齊並去重。<code>conditional</code> 與 <code>optional</code> 需按任務另選；<code>routes</code> 不加入安裝。共用資源只供讀取，不啟用提供套件的入口流程。</p><p class="warning">本輪修正分類安裝的規則基礎。既有安裝器已支援名稱或單一分類；新的互動式多選介面仍屬後續工作。模型任務與外部工具執行不因靜態檢查通過而視為已驗證。</p></div>
<h2>逐項查看</h2><div class="controls"><input id="search" type="search" placeholder="搜尋 Skill、修正事項或依賴"><select id="category"><option value="">全部分類</option></select><label><input type="checkbox" id="findings">只看原清單有修正事項</label></div>
<p id="count" class="muted"></p><div id="category-plan" class="muted"></div>
<div class="table-wrap"><table><thead><tr><th>Skill</th><th>分類</th><th>修正項目</th><th>修前 → 修後最小套件數</th><th>必要／條件／可選／路由</th></tr></thead><tbody id="rows"></tbody></table></div>
<section id="detail" class="panel detail" hidden></section>
<h2>已執行檢查</h2><div id="checks" class="panel checks"></div>
<p class="muted">完整逐項處置：<a href="remediation-status.json">remediation-status.json</a> · 驗證紀錄：<a href="remediation-verification.json">remediation-verification.json</a></p>
</main><script id="data" type="application/json">${data}</script><script>
'use strict';
const data=JSON.parse(document.getElementById('data').textContent);
const byName=new Map(data.packages.map(p=>[p.name,p]));
const issues=new Map();for(const item of data.resolutions){if(!issues.has(item.source))issues.set(item.source,[]);issues.get(item.source).push(item)}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.getElementById('cards').innerHTML=[['已核對 Skills',data.stats.skills],['原清單已處置',data.stats.resolvedBacklogItems],['必要依賴',data.stats.required],['共用資源依賴',data.stats.resourceDependencies]].map(([label,n])=>'<div class="card"><strong>'+n+'</strong>'+label+'</div>').join('');
const category=document.getElementById('category'), search=document.getElementById('search'), findings=document.getElementById('findings');
for(const name of [...new Set(data.packages.map(p=>p.category))].sort()){const option=document.createElement('option');option.value=name;option.textContent=name;category.append(option)}
function counts(p){return ['required','conditional','optional'].map(kind=>p.dependencies.filter(d=>d.kind===kind).length).concat(p.routes.length)}
function render(){const query=search.value.trim().toLowerCase();const selected=data.packages.filter(p=>(!category.value||p.category===category.value)&&(!findings.checked||issues.has(p.name))&&(!query||JSON.stringify([p.name,p.dependencies,p.routes,issues.get(p.name)]).toLowerCase().includes(query)));document.getElementById('count').textContent=selected.length+' / '+data.packages.length+' Skills；點選名稱查看配套與修正。';document.getElementById('rows').innerHTML=selected.map(p=>'<tr><td><button data-name="'+escape(p.name)+'">'+escape(p.name)+'</button>'+(p.after.length===1?' <span class="badge">可單裝</span>':'')+'</td><td>'+escape(p.category)+'</td><td>'+(issues.get(p.name)||[]).length+'</td><td>'+p.before.length+' → '+p.after.length+'</td><td>'+counts(p).join(' / ')+'</td></tr>').join('');const plan=document.getElementById('category-plan');if(category.value){const seeds=data.packages.filter(p=>p.category===category.value);const seedNames=new Set(seeds.map(p=>p.name));const closure=[...new Set(seeds.flatMap(p=>p.after))].sort();const extra=closure.filter(name=>!seedNames.has(name));plan.textContent='選取整個分類：'+seeds.length+' 個指定套件 + '+extra.length+' 個跨分類必要配套 = '+closure.length+' 個去重套件。'+(extra.length?' 跨分類配套：'+extra.join(', '):'')}else plan.textContent=''}
function list(items,fn){return items.length?'<ul>'+items.map(item=>'<li>'+fn(item)+'</li>').join('')+'</ul>':'<p class="muted">無</p>'}
function show(name){const p=byName.get(name),detail=document.getElementById('detail');detail.hidden=false;detail.innerHTML='<button id="close">收起</button><h2>'+escape(name)+'</h2><p>修後最小安裝：'+p.after.map(escape).join(', ')+'</p><p>只安裝套件不代表每個入口已啟用或通過任務驗證。</p><h3>必要與條件配套</h3>'+list(p.dependencies,d=>'<code>'+escape(d.name)+'</code> · '+escape(d.kind)+(d.usage==='resource'?' · 共用資源，不啟用入口':'')+(d.when?' — '+escape(d.when):''))+'<h3>替代與相關能力</h3>'+list(p.routes,r=>'<code>'+escape(r.name)+'</code> · '+escape(r.kind)+' — '+escape(r.when))+'<h3>原清單的處置</h3>'+list(issues.get(name)||[],item=>'<strong>'+escape(item.title)+'</strong><br>'+escape(item.resolution||((item.disposition==='excluded'?'移除：':item.disposition==='route'?'分為路由：':'對齊依賴：')+JSON.stringify(item.current))))+'<p>查詢命令：<code>node craftroster-cli.js info '+escape(name)+'</code></p>';document.getElementById('close').onclick=()=>detail.hidden=true;detail.scrollIntoView({behavior:'smooth',block:'start'})}
document.getElementById('rows').onclick=event=>{const button=event.target.closest('button[data-name]');if(button)show(button.dataset.name)};search.oninput=render;category.onchange=render;findings.onchange=render;render();
document.getElementById('checks').innerHTML='<p>紀錄狀態：'+escape(data.verification.status)+'</p>'+list(data.verification.checks||[],check=>'<span class="'+(check.exitCode===0?'check-pass':'')+'">'+escape(check.label)+' · exit '+escape(check.exitCode)+'</span>')+'<p class="muted">模型行為：not_run；未使用外部帳號或影片／影像 API 產生實際成果。</p>';
</script></html>`;
fs.writeFileSync(path.join(__dirname, 'remediation-report.html'), html);
const originalReport = path.join(__dirname, 'skill-installability-report.html');
const original = fs.readFileSync(originalReport, 'utf8');
const header = '<h1>每個 Skill 能否獨立使用，需要搭配誰？</h1>';
if (!original.includes('修前研究快照。')) {
  if (!original.includes(header)) throw new Error('Unknown historical report header');
  fs.writeFileSync(originalReport, original.replace(header, header + '\n<p><strong>修前研究快照。</strong>此頁保留研究當時的分類與行號；目前修訂結果請看<a href="remediation-report.html">修正清單與安裝規則</a>。來源檔已修訂，舊行號需對照研究快照。</p>'));
}
console.log(`Generated remediation report for ${status.stats.skills} Skills`);
