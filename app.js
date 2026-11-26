'use strict';
const industries=[{name:'Packaging',icon:'▣',idea:'Protective packaging & industrial liners'},{name:'Agriculture',icon:'♧',idea:'HDPE nursery pots & reusable harvest bins; LDPE irrigation tubing & agricultural film. Blend suitability requires testing.'},{name:'Construction',icon:'▱',idea:'Non-structural panels & protective products'},{name:'Manufacturing',icon:'⚙',idea:'Reusable bins & molded components'},{name:'Recycling',icon:'♲',idea:'HDPE collection bins & LDPE collection liners; recovered HDPE/LDPE feedstock for non-food-contact products. Validate sorting, contamination & blend specifications.'}];
const seed=[['Aster Packaging Works','Packaging','Qualified','2026-11-02','2026-11-05'],['Meadowline Growers','Agriculture','Contacted','2026-11-01','2026-11-04'],['Ridgeform Materials','Construction','New','',''],['Northvale Industrial','Manufacturing','Proposal','2026-11-03','2026-11-09'],['Willow Wrap Concepts','Packaging','Contacted','2026-10-29','2026-11-05'],['Fieldcrest Nursery Supply','Agriculture','Qualified','2026-11-02','2026-11-06'],['Cobalt Container Studio','Packaging','New','',''],['Canyon Panel Works','Construction','Contacted','2026-10-28','2026-11-03'],['Oakfern Farm Products','Agriculture','New','',''],['Lumen Molded Goods','Manufacturing','Qualified','2026-11-04','2026-11-10'],['Clover Protective Pack','Packaging','Proposal','2026-11-01','2026-11-04'],['Sage Parcel Systems','Packaging','Closed','2026-10-24','']].map((r,i)=>({id:String(i),company:r[0],industry:r[1],status:r[2],contact:r[3],follow:r[4]}));
// Optional CRM fields preserve the existing v1 browser-storage format.
const crmDefaults={contactName:'',email:'',phone:'',notes:'',productInterest:'',opportunityValue:''};
function normalize(r){return {...crmDefaults,...r}}
const sampleNames=['Alex Sample','Jamie Example','Taylor Demo','Morgan Sample'];
seed.forEach((r,i)=>Object.assign(r,crmDefaults,{contactName:sampleNames[i%4],email:`sample${i+1}@example.com`,phone:`202-555-${String(100+i).padStart(4,'0')}`,productInterest:r.industry==='Agriculture'?'Nursery containers & agricultural components':industries.find(x=>x.name===r.industry).idea,opportunityValue:String((i+1)*500),notes:'Fictional interaction: discussed a possible application. Next step: validate material specifications. Not approved by Domino Plastics.'}));
// Stable IDs allow this sample update to be appended without replacing saved leads.
const recyclingSamples=[
 ['sample-recycling-1','Loopfern Recovery Works','New','HDPE collection bins',''],
 ['sample-recycling-2','Cedarcycle Film Recovery','Contacted','LDPE collection liners',''],
 ['sample-recycling-3','Fieldloop Polymer Reclaim','Qualified','Recovered HDPE/LDPE blend feedstock','2500'],
 ['sample-recycling-4','Greenarc Materials Sorting','Proposal','Non-food-contact recycled plastic components','4000']
].map((r,i)=>({...crmDefaults,id:r[0],company:r[1],industry:'Recycling',status:r[2],contact:r[2]==='New'?'':'2026-11-12',follow:r[2]==='New'?'':'2026-11-20',contactName:['Casey Sample','Riley Example','Jordan Demo','Avery Sample'][i],email:`recycling${i+1}@example.com`,phone:`202-555-01${20+i}`,productInterest:r[3],opportunityValue:r[4],notes:'Fictional prospect. Next step: discuss feedstock consistency, contamination limits and application testing. Product suitability is unverified.'}));
seed.push(...recyclingSamples);
const $=id=>document.getElementById(id),key='polymer-prospect-v1';let leads=structuredClone(seed),editing=null;const statuses=['New','Contacted','Qualified','Proposal','Closed'];
const calendarStatusOptions=statuses.filter(status=>status!=='Closed');
const calendarStatuses=new Set(calendarStatusOptions);
let calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
function valid(r){return r&&Object.keys(crmDefaults).every(k=>r[k]===undefined||typeof r[k]==='string')&&typeof r.id==='string'&&typeof r.company==='string'&&industries.some(i=>i.name===r.industry)&&statuses.includes(r.status)&&['contact','follow'].every(k=>typeof r[k]==='string'&&(!r[k]||/^\d{4}-\d{2}-\d{2}$/.test(r[k])))}
try{
 const raw=localStorage.getItem(key),saved=JSON.parse(raw);
 if(raw!==null&&(!Array.isArray(saved)||!saved.every(valid)))throw new Error('Invalid saved records');
 if(Array.isArray(saved))leads=saved.map(normalize);
 const updateKey=key+'-recycling-samples-1';
 if(localStorage.getItem(updateKey)!=='done'){
  const occupied=new Set(leads.map(r=>r.id));
  for(const sample of recyclingSamples)if(!occupied.has(sample.id)){leads.push(structuredClone(sample));occupied.add(sample.id)}
  // Store records before the marker; stable IDs prevent duplicates if interrupted.
  localStorage.setItem(key,JSON.stringify(leads));
  localStorage.setItem(updateKey,'done');
 }
}catch(e){$('storage-message').textContent='Browser storage unavailable or invalid. Existing stored data was not replaced. Export any displayed changes before leaving.'}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const isDue=r=>r.status!=='Closed'&&r.follow&&r.follow<=today();
const date=s=>s?new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
// Pipeline observations are stored separately; existing lead records are not migrated.
const pipelineKey=key+'-pipeline-history-v1';
let pipelineHistory=null,pipelineWarning='';
function validPipeline(value){
 return value&&value.version===1&&Number.isFinite(Date.parse(value.startedAt))&&Array.isArray(value.events)&&value.events.every(e=>e&&typeof e.leadId==='string'&&typeof e.company==='string'&&Number.isFinite(Date.parse(e.at))&&['baseline','added','moved','removed','reset','sync'].includes(e.kind)&&(e.from===null||statuses.includes(e.from))&&(e.to===null||statuses.includes(e.to)));
}
function storePipeline(){
 try{localStorage.setItem(pipelineKey,JSON.stringify(pipelineHistory));pipelineWarning=''}
 catch(e){pipelineWarning='Pipeline history could not be saved. This session’s activity may be lost when you leave.'}
}
function latestPipelineEvents(){
 const latest=new Map();
 for(const event of pipelineHistory?.events||[])latest.set(event.leadId,event);
 return latest;
}
function recordPipeline(reason){
 if(!pipelineHistory)return;
 // Reload the separate log before appending so another tab’s saved events survive.
 try{
  const raw=localStorage.getItem(pipelineKey);
  if(raw!==null){const stored=JSON.parse(raw);if(!validPipeline(stored))throw new Error('Invalid history');pipelineHistory=stored}
 }catch(e){pipelineWarning='Existing pipeline history could not be read. It was left unchanged; history recording is paused.';pipelineHistory=null;return}
 const latest=latestPipelineEvents(),now=new Date().toISOString();
 const current=new Set(leads.map(r=>r.id));
 let changed=false;
 for(const lead of leads){
  const prior=latest.get(lead.id);
  if(prior?.to===lead.status)continue;
  const kind=reason==='reset'?'reset':reason==='baseline'?'baseline':reason==='sync'?'sync':!prior||prior.to===null?'added':'moved';
  pipelineHistory.events.push({leadId:lead.id,company:lead.company,from:prior?.to??null,to:lead.status,at:now,kind});changed=true;
 }
 for(const [id,prior] of latest)if(prior.to!==null&&!current.has(id)){
  pipelineHistory.events.push({leadId:id,company:prior.company,from:prior.to,to:null,at:now,kind:reason==='reset'?'reset':reason==='sync'?'sync':'removed'});changed=true;
 }
 if(changed||reason==='baseline')storePipeline();
}
try{
 const raw=localStorage.getItem(pipelineKey);
 if(raw===null){pipelineHistory={version:1,startedAt:new Date().toISOString(),events:[]};recordPipeline('baseline')}
 else{const stored=JSON.parse(raw);if(!validPipeline(stored))throw new Error('Invalid history');pipelineHistory=stored;recordPipeline('sync')}
}catch(e){pipelineWarning='Pipeline history is unavailable or invalid. Existing stored data was left unchanged; history recording is paused.';pipelineHistory=null}
// Fictional preview data exists in memory only and never enters saved lead/log keys.
function pipelineDemoData(){
 const now=new Date(),prospects=[],events=[],entries=[];
 const companies=['Aster Packaging Works','Meadowline Growers','Ridgeform Materials','Northvale Industrial','Fieldcrest Nursery Supply','Loopfern Recovery Works','Cedarcycle Film Recovery'];
 const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 for(let offset=6;offset>=0;offset--){
  const month=new Date(now.getFullYear(),now.getMonth()-offset,1);
  const monthLabel=month.toLocaleDateString('en-US',{month:'short',year:'numeric'});
  const when=day=>new Date(Math.min(new Date(month.getFullYear(),month.getMonth(),offset===0?Math.min(day,now.getDate()):day,10).getTime(),now.getTime()));
  for(let i=0;i<5+offset%3;i++){
   const lead={id:`demo-${month.getFullYear()}-${month.getMonth()+1}-${i}`,company:`${companies[i]} · ${monthLabel} (demo)`};
   prospects.push(lead);
   const finalStage=(i+offset)%statuses.length;
   for(let stage=0;stage<=finalStage;stage++){
    const at=when(2+stage*5),hundredths=50+25*((i+stage+offset)%7);
    events.push({leadId:lead.id,company:lead.company,from:stage?statuses[stage-1]:null,to:statuses[stage],at:at.toISOString(),kind:stage?'moved':'added'});
    entries.push({id:`${lead.id}-time-${stage}`,leadId:lead.id,company:lead.company,date:iso(at),hundredths,createdAt:at.toISOString()});
   }
  }
 }
 events.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 return {prospects,history:{version:1,startedAt:new Date(now.getFullYear(),now.getMonth()-6,1).toISOString(),events},entries};
}
function showingPipelineDemo(){return $('pipeline-demo').checked}

// Actual work time is entered explicitly and saved separately from leads/history.
const timeLogKey=key+'-work-hours-v1';
let timeLog={version:1,entries:[]},timeLogWarning='';
function validWorkDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [year,month,day]=value.split('-').map(Number),d=new Date(year,month-1,day);
 return year>=1000&&d.getFullYear()===year&&d.getMonth()===month-1&&d.getDate()===day;
}
function validTimeLog(value){
 return value&&value.version===1&&Array.isArray(value.entries)&&value.entries.every(e=>e&&typeof e.id==='string'&&typeof e.leadId==='string'&&typeof e.company==='string'&&validWorkDate(e.date)&&Number.isInteger(e.hundredths)&&e.hundredths>0&&e.hundredths<=2400&&Number.isFinite(Date.parse(e.createdAt)));
}
try{
 const raw=localStorage.getItem(timeLogKey);
 if(raw!==null){const stored=JSON.parse(raw);if(!validTimeLog(stored))throw new Error('Invalid time log');timeLog=stored}
}catch(e){timeLog=null;timeLogWarning='Existing time logs could not be read. They were left unchanged; new entries are paused.'}
$('pipeline-demo').checked=!!pipelineHistory&&!!timeLog&&!timeLog.entries.length&&!(pipelineHistory?.events||[]).some(e=>e.kind==='moved'||e.kind==='added');
$('pipeline-demo').addEventListener('change',renderPipeline);
$('time-date').value=today();
$('time-date').max=today();
function renderProspectTime(start,end){
 const demo=showingPipelineDemo(),sample=demo?pipelineDemoData():null;
 const entries=demo?sample.entries:timeLog?.entries||[],names=new Map(entries.map(e=>[e.leadId,e.company]));
 const displayedLeads=demo?sample.prospects:leads;
 for(const lead of displayedLeads)names.set(lead.id,lead.company);
 const selected=$('time-lead').value;
 $('time-lead').innerHTML='<option value="">Choose a prospect</option>'+[...leads].sort((a,b)=>a.company.localeCompare(b.company)).map(lead=>`<option value="${esc(lead.id)}">${esc(lead.company)}</option>`).join('');
 if(leads.some(lead=>lead.id===selected))$('time-lead').value=selected;
 $('time-date').max=today();
 $('time-entry-form').hidden=demo;
 $('time-entry-form').querySelector('button').disabled=demo||!timeLog;
 $('time-storage-message').textContent=demo?'Fictional example hours. Switch off demo data to log your own time.':timeLogWarning;
 const inPeriod=entries.filter(e=>{const [y,m,d]=e.date.split('-').map(Number),at=new Date(y,m-1,d).getTime();return at>=start.getTime()&&at<end.getTime()});
 const totals=new Map(),periodTotals=new Map();
 for(const e of entries)totals.set(e.leadId,(totals.get(e.leadId)||0)+e.hundredths);
 for(const e of inPeriod)periodTotals.set(e.leadId,(periodTotals.get(e.leadId)||0)+e.hundredths);
 const total=inPeriod.reduce((sum,e)=>sum+e.hundredths,0),count=periodTotals.size;
 const hours=value=>(value/100).toFixed(2);
 $('prospect-time-metrics').innerHTML=[['Total hours this period',(demo||timeLog)?hours(total):'—'],['Prospects with logged time',(demo||timeLog)?count:'—'],['Average hours / prospect',(demo||timeLog)&&count?hours(total/count):'—']].map(([label,value])=>`<div>${label}<strong>${value}</strong></div>`).join('');
 $('time-average-definition').textContent=count?`Average = ${hours(total)} hours ÷ ${count} prospect${count===1?'':'s'} with logged time in this period. Prospects without logs are excluded.`:'No work hours logged for this period. Log actual hours to calculate an average; no hours are inferred from stage history.';
 const ids=[...names.keys()].sort((a,b)=>(periodTotals.get(b)||0)-(periodTotals.get(a)||0)||names.get(a).localeCompare(names.get(b)));
 $('prospect-time-rows').innerHTML=ids.map(id=>`<tr><td>${esc(names.get(id))}${displayedLeads.some(r=>r.id===id)?'':' (deleted)'}</td><td>${periodTotals.has(id)?hours(periodTotals.get(id)):'—'}</td><td>${totals.has(id)?hours(totals.get(id)):'—'}</td></tr>`).join('')||'<tr><td colspan="3">No prospects or logged time yet.</td></tr>';
 $('time-entry-rows').innerHTML=[...inPeriod].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)).map(e=>`<tr><td>${date(e.date)}</td><td>${esc(names.get(e.leadId)||e.company)}</td><td>${hours(e.hundredths)}</td></tr>`).join('')||'<tr><td colspan="3">No time entries in this period.</td></tr>';
}
$('time-date').oninput=()=>$('time-date').setCustomValidity('');
$('time-hours').oninput=()=>$('time-hours').setCustomValidity('');
$('time-entry-form').onsubmit=e=>{
 e.preventDefault();
 if(showingPipelineDemo()||!timeLog)return;
 const lead=leads.find(r=>r.id===$('time-lead').value),workDate=$('time-date').value,hours=Number($('time-hours').value),hundredths=Math.round(hours*100);
 if(!lead)return;
 if(!validWorkDate(workDate)||workDate>today()){$('time-date').setCustomValidity('Choose a valid work date on or before today.');$('time-date').reportValidity();return}
 if(!Number.isFinite(hours)||hundredths<1||hundredths>2400||Math.abs(hours*100-hundredths)>0.000001){$('time-hours').setCustomValidity('Enter 0.01 to 24 hours, with up to two decimal places.');$('time-hours').reportValidity();return}
 try{
  const raw=localStorage.getItem(timeLogKey),stored=raw===null?{version:1,entries:[]}:JSON.parse(raw);
  if(!validTimeLog(stored))throw new Error('Existing log is invalid');
  const updated={...stored,entries:[...stored.entries,{id:crypto.randomUUID(),leadId:lead.id,company:lead.company,date:workDate,hundredths,createdAt:new Date().toISOString()}]};
  localStorage.setItem(timeLogKey,JSON.stringify(updated));timeLog=updated;
  $('time-hours').value='';timeLogWarning='Time entry saved. Existing entries and lead data were preserved.';
 }catch(error){timeLogWarning='Time entry was not saved. Existing stored records were left unchanged; check browser storage before trying again.'}
 renderPipeline();
};

$('pipeline-month').value=today().slice(0,7);
function pipelinePeriod(){
 const selected=$('pipeline-month').value||today().slice(0,7);
 const [year,month]=selected.split('-').map(Number);
 return {start:new Date(year,month-1,1),end:new Date(year,month,1)};
}
function renderPipeline(){
 const demo=showingPipelineDemo(),history=demo?pipelineDemoData().history:pipelineHistory,events=history?.events||[];
 $('pipeline-demo-months').hidden=!demo;
 const current=new Date();
 $('pipeline-demo-months').innerHTML='<span>Example months:</span>'+Array.from({length:7},(_,i)=>{
  const d=new Date(current.getFullYear(),current.getMonth()-6+i,1),value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  return `<button type="button" data-demo-month="${value}" aria-pressed="${value===$('pipeline-month').value}">${d.toLocaleDateString('en-US',{month:'short',year:'numeric'})}</button>`;
 }).join('');
 const names=new Map(events.map(e=>[e.leadId,e.company]));
 if(!demo)for(const lead of leads)names.set(lead.id,lead.company);
 const {start,end}=pipelinePeriod(),fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 const relevant=events.filter(e=>Date.parse(e.at)>=start.getTime()&&Date.parse(e.at)<end.getTime());
 const entries=relevant.filter(e=>e.kind==='moved'||e.kind==='added');
 const covered=history&&start.getTime()>=Date.parse(history.startedAt);
 $('pipeline-range').textContent=`${fmt(start)} – ${fmt(new Date(end.getTime()-1))} • Local timezone${covered?'':' • Partial or unavailable history before tracking began'}`;
 $('pipeline-notice').classList.toggle('is-demo',demo);
 $('pipeline-notice').textContent=demo?'FICTIONAL DEMO — These stage changes and hours are made up to demonstrate the dashboard. They are not company results and are never saved into your records.':pipelineWarning||(history?`Tracking began ${new Date(history.startedAt).toLocaleString()}. Earlier stage dates are unknown. Starting records are observations, not conversions. History stays in this browser; keep the same file location/origin. Closed does not distinguish a won sale from a lost lead.`:'History is unavailable.');
 const counts=statuses.map(status=>new Set(entries.filter(e=>e.to===status).map(e=>e.leadId)).size);
 $('pipeline-chart').innerHTML=statuses.map((status,i)=>`<div class="bar-row" data-lead-status="${status}"><span>${status}</span><div class="track"><div class="bar" style="width:${counts[i]/Math.max(1,...counts)*100}%"></div></div><strong>${counts[i]}</strong></div>`).join('');
 $('pipeline-chart').setAttribute('aria-label',statuses.map((status,i)=>`${status}: ${counts[i]} prospects entered this month`).join(', '));
 renderProspectTime(start,end);
 const activity={baseline:'First observed; earlier stage start unknown',sync:'Observed after reopening; exact change time unknown',reset:'Sample reset; not a sales movement',added:'Lead added',moved:'Status changed',removed:'Lead deleted; history retained'};
 $('pipeline-events').innerHTML=[...relevant].reverse().map(e=>`<tr><td>${esc(new Date(e.at).toLocaleString())}</td><td>${esc(names.get(e.leadId)||e.company)}</td><td>${e.from||'—'}</td><td>${e.to||'—'}</td><td>${activity[e.kind]}</td></tr>`).join('')||'<tr><td colspan="5">No recorded activity across prospects for this period. Earlier activity may be unknown.</td></tr>';
}
$('pipeline-month').addEventListener('change',renderPipeline);
$('pipeline-demo-months').onclick=e=>{
 const button=e.target.closest('button[data-demo-month]');if(!button)return;
 const value=button.dataset.demoMonth;$('pipeline-month').value=value;renderPipeline();
 $('pipeline-demo-months').querySelector(`[data-demo-month="${value}"]`).focus({preventScroll:true});
};

function save(reason='save'){try{localStorage.setItem(key,JSON.stringify(leads));recordPipeline(reason)}catch(e){$('storage-message').textContent='Could not save to this browser. Export your leads before leaving.'}render()}
function filtered(){return leads.filter(r=>(!$('search').value||r.company.toLowerCase().includes($('search').value.toLowerCase()))&&(!$('industry').value||r.industry===$('industry').value)&&(!$('status').value||r.status===$('status').value)&&(!$('due').checked||isDue(r)))}
function render(){const counts=industries.map(i=>leads.filter(r=>r.industry===i.name).length);const stats=[['Potential leads',leads.length,'Fictional business prospects','▤'],['Industries targeted',counts.filter(Boolean).length,'Represented in the lead list','◈'],['Active opportunities',leads.filter(r=>['Qualified','Proposal'].includes(r.status)).length,'Qualified or proposal stage','↗'],['Follow-ups needed',leads.filter(isDue).length,'Due today or overdue','◷']];$('stats').innerHTML=stats.map(s=>`<div class="stat"><div class="stat-top">${s[0]}<span class="stat-icon">${s[3]}</span></div><strong>${s[1].toString().padStart(2,'0')}</strong><small>${s[2]}</small></div>`).join('');$('chart').innerHTML=industries.map((i,n)=>`<div class="bar-row"><span>${i.name}</span><div class="track"><div class="bar" style="width:${counts[n]/Math.max(1,...counts)*100}%"></div></div><strong>${counts[n]}</strong></div>`).join('');$('chart').setAttribute('aria-label',industries.map((i,n)=>`${i.name}: ${counts[n]} leads`).join(', '));$('total-badge').textContent=leads.length;const list=filtered();$('rows').innerHTML=list.map(r=>`<tr><td><div class="company"><span class="avatar" aria-hidden="true">${esc(r.company.split(' ').map(w=>w[0]).slice(0,2).join(''))}</span>${esc(r.company)}</div></td><td>${esc(r.industry)}</td><td><span class="pill ${r.status}">${r.status}</span></td><td>${date(r.contact)}</td><td class="${isDue(r)?'due':''}">${date(r.follow)}${isDue(r)?' • Due':''}</td><td><button class="edit" data-id="${esc(r.id)}" aria-label="Edit ${esc(r.company)}">Edit ↗</button></td></tr>`).join('')||'<tr><td colspan="6">No leads match these filters. Try clearing them.</td></tr>';$('showing').textContent=`Showing ${list.length} of ${leads.length} fictional leads`;renderLeadViews()}
const priorityIndustries=['Agriculture','Recycling'];
$('targets').innerHTML=[...industries.filter(i=>priorityIndustries.includes(i.name)),...industries.filter(i=>!priorityIndustries.includes(i.name))].map(i=>`<div class="target"><div class="target-icon" aria-hidden="true">${i.icon}</div><div><strong>${i.name}${priorityIndustries.includes(i.name)?' · Priority focus':''}</strong><p>${i.idea}</p></div></div>`).join('');
for(const i of industries){$('industry').add(new Option(i.name,i.name));$('industry-field').add(new Option(i.name,i.name))}
for(const id of ['search','industry','status','due'])$(id).addEventListener('input',render);
$('clear').onclick=()=>{$('search').value='';$('industry').value='';$('status').value='';$('due').checked=false;render()};
function openEditor(r){editing=r?.id??null;$('dialog-title').textContent=r?'Edit fictional lead':'Add fictional lead';$('company-field').value=r?.company||'';$('industry-field').value=r?.industry||industries[0].name;$('status-field').value=r?.status||'New';$('contact-field').value=r?.contact||'';$('contact-field').max=today();$('follow-field').value=r?.follow||'';for(const k of Object.keys(crmDefaults))$(k+'-field').value=r?.[k]??'';$('delete').hidden=!r;$('editor').showModal();$('company-field').focus()}
$('add').onclick=()=>openEditor();$('add-customer').onclick=()=>openEditor();$('close').onclick=()=>$('editor').close();$('rows').onclick=e=>{const b=e.target.closest('button[data-id]');if(b)openEditor(leads.find(r=>r.id===b.dataset.id))};
$('form').onsubmit=e=>{e.preventDefault();const company=$('company-field').value.trim();if(!company){$('company-field').setCustomValidity('Enter a company name.');$('company-field').reportValidity();return}const value=$('opportunityValue-field').value;if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<0))return;const r={...(leads.find(x=>x.id===editing)||{}),id:editing??crypto.randomUUID(),company,industry:$('industry-field').value,status:$('status-field').value,contact:$('contact-field').value,follow:$('follow-field').value,...Object.fromEntries(Object.keys(crmDefaults).map(k=>[k,$(k+'-field').value.trim()]))};if(editing!==null)leads=leads.map(x=>x.id===editing?r:x);else leads.push(r);save();$('editor').close()};$('company-field').oninput=()=>$('company-field').setCustomValidity('');
$('delete').onclick=()=>{if(confirm('Delete this fictional lead?')){leads=leads.filter(r=>r.id!==editing);save();$('editor').close()}};
$('reset').onclick=()=>{if(confirm('Replace browser changes with the original fictional sample data?')){leads=structuredClone(seed);save('reset')}};
$('export').onclick=()=>{const cell=v=>'"'+String(/^[=+\-@\t\r]/.test(v)?"'"+v:v).replaceAll('"','""')+'"';const text=[['FICTIONAL SAMPLE DATA - NOT DOMINO PLASTICS RECORDS'],['Company','Industry','Status','Last contact','Next follow-up','Contact name','Email','Phone','Interaction notes and next steps','Product interest (unverified)','Estimated opportunity value (USD, fictional)'],...filtered().map(r=>[r.company,r.industry,r.status,r.contact,r.follow,...Object.keys(crmDefaults).map(k=>r[k]??'')])].map(r=>r.map(cell).join(',')).join('\r\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='fictional-marketing-leads.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
function renderLeadViews(){
 const counts=statuses.map(status=>leads.filter(r=>r.status===status).length);
 $('status-chart').innerHTML=statuses.map((status,i)=>`<div class="bar-row" data-lead-status="${status}"><span>${status}</span><div class="track"><div class="bar" style="width:${counts[i]/Math.max(1,...counts)*100}%"></div></div><strong>${counts[i]}</strong></div>`).join('');
 $('status-chart').setAttribute('aria-label',statuses.map((status,i)=>`${status}: ${counts[i]} leads`).join(', '));
 $('status-summary').textContent=`${leads.length} total leads • Chart uses all leads. Calendar has its own status filters; filters below apply to the table and CSV.`;
 renderCalendar();
 renderPipeline();
}
function renderCalendar(){
 const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();
 const label=calendarMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'});
 $('calendar-month').textContent=label;
 $('follow-calendar').setAttribute('aria-label',`Follow-ups for ${label}`);
 const prefix=`${year}-${String(month+1).padStart(2,'0')}-`;
 const scheduled=leads.filter(r=>calendarStatuses.has(r.status)&&r.follow.startsWith(prefix));
 for(const button of $('calendar-status-filters').querySelectorAll('button')){
  const status=button.dataset.calendarStatus;
  const total=status==='all'?leads.filter(r=>calendarStatusOptions.includes(r.status)).length:leads.filter(r=>r.status===status).length;
  const selected=status==='all'?calendarStatuses.size===calendarStatusOptions.length:calendarStatuses.has(status);
  const count=button.querySelector('.calendar-status-count');
  count.textContent=total;
  count.hidden=!selected;
  button.setAttribute('aria-label',`${status==='all'?'All open statuses':status}${selected?`: ${total} total leads, all dates`:''}`);
  button.setAttribute('aria-pressed',String(selected));
 }
 const selectedTotal=leads.filter(r=>calendarStatuses.has(r.status)).length;
 $('calendar-selection-total').innerHTML=`<strong>Selected total: ${selectedTotal} lead${selectedTotal===1?'':'s'}</strong><span>All dates, including leads without a follow-up date • ${scheduled.length} follow-up${scheduled.length===1?'':'s'} this month.</span>`;
 const byDate=new Map();
 for(const lead of scheduled){if(!byDate.has(lead.follow))byDate.set(lead.follow,[]);byDate.get(lead.follow).push(lead)}
 const days=new Date(year,month+1,0).getDate(),offset=new Date(year,month,1).getDay();
 let html=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="calendar-weekday">${d}</div>`).join('');
 for(let i=0;i<Math.ceil((offset+days)/7)*7;i++){
  const day=i-offset+1;
  if(day<1||day>days){html+='<div class="calendar-day empty" aria-hidden="true"></div>';continue}
  const iso=prefix+String(day).padStart(2,'0');
  const events=(byDate.get(iso)||[]).sort((a,b)=>a.company.localeCompare(b.company));
  html+=`<div class="calendar-day${iso===today()?' is-today':''}"><time class="calendar-date" datetime="${iso}"${iso===today()?' aria-current="date"':''}>${day}</time>${events.map(r=>`<button class="calendar-event${isDue(r)?' overdue':''}" data-lead-id="${esc(r.id)}" data-lead-status="${r.status}" aria-label="${esc(r.company)} — ${r.status}, follow-up ${date(iso)}${isDue(r)?', due or overdue':''}">${esc(r.company)}<span class="calendar-event-status">${r.status}${isDue(r)?' · Due / overdue':''}</span></button>`).join('')}</div>`;
 }
 $('follow-calendar').innerHTML=html;
 const unscheduled=leads.filter(r=>calendarStatuses.has(r.status)&&!r.follow).length;
 const selection=calendarStatuses.size===calendarStatusOptions.length?'All open statuses':calendarStatuses.size?[...calendarStatuses].join(', '):'No statuses selected';
 $('calendar-summary').textContent=`${scheduled.length?`${scheduled.length} follow-up${scheduled.length===1?'':'s'}`:'No follow-ups'} in ${label}. ${selection}. ${unscheduled} matching lead${unscheduled===1?' has':'s have'} no follow-up date. Closed leads are excluded. Colors match the lead-status chart. Due / overdue follow-ups are labeled.`;
}
$('calendar-status-filters').onclick=e=>{
 const button=e.target.closest('button[data-calendar-status]');if(!button)return;
 const status=button.dataset.calendarStatus;
 if(status==='all'){for(const value of calendarStatusOptions)calendarStatuses.add(value)}
 else if(calendarStatuses.size===calendarStatusOptions.length){calendarStatuses.clear();calendarStatuses.add(status)}
 else if(calendarStatuses.has(status))calendarStatuses.delete(status);
 else calendarStatuses.add(status);
 renderCalendar();
};
$('calendar-prev').onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderCalendar()};
$('calendar-next').onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderCalendar()};
$('calendar-today').onclick=()=>{calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);renderCalendar()};
$('follow-calendar').onclick=e=>{const button=e.target.closest('button[data-lead-id]');if(button)openEditor(leads.find(r=>r.id===button.dataset.leadId))};
render();

// Hash navigation keeps each section on its own view and supports Back/Forward.
const pageNames={overview:'Overview',customers:'Business leads',industries:'Target industries',guide:'Project guide'};
function showPage(focus=false){
 const requested=location.hash.slice(1),page=Object.hasOwn(pageNames,requested)?requested:'overview';
 for(const section of document.querySelectorAll('[data-page]'))section.hidden=section.id!==page;
 for(const link of document.querySelectorAll('nav a')){
  const active=link.getAttribute('href')==='#'+page;
  link.classList.toggle('selected',active);
  if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 }
 document.title=pageNames[page]+' • Polymer Prospect';
 if(focus)$(page).focus({preventScroll:true});
 window.scrollTo({top:0,behavior:'instant'});
}
window.addEventListener('hashchange',()=>showPage(true));
showPage();
