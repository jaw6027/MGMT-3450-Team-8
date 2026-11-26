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
// Add separate fictional examples for this week's calendar; never change saved dates.
const sampleWeekStart=new Date();sampleWeekStart.setHours(12,0,0,0);sampleWeekStart.setDate(sampleWeekStart.getDate()-(sampleWeekStart.getDay()+6)%7);
const weeklyFollowupSamples=[['Demo Orchard Containers','Agriculture','New',0],['Demo Circular Film Co.','Recycling','Contacted',1],['Demo Harvest Plastics','Agriculture','Qualified',3],['Demo Reuse Packaging','Packaging','Proposal',4]].map((row,i)=>{
 const follow=new Date(sampleWeekStart);follow.setDate(follow.getDate()+row[3]);
 return {...crmDefaults,id:`sample-weekly-followup-${i+1}`,company:row[0],industry:row[1],status:row[2],contact:'',follow:`${follow.getFullYear()}-${String(follow.getMonth()+1).padStart(2,'0')}-${String(follow.getDate()).padStart(2,'0')}`,notes:'Fictional calendar example added for this week. Not an actual customer or appointment.'};
});
seed.push(...weeklyFollowupSamples);
const $=id=>document.getElementById(id),key='polymer-prospect-v1';let leads=structuredClone(seed),editing=null;const statuses=['New','Contacted','Qualified','Proposal','Closed'];
const calendarStatusOptions=statuses.filter(status=>status!=='Closed');
const calendarStatuses=new Set(calendarStatusOptions);
let calendarView='week',calendarMonth=new Date();
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
 const weeklyUpdateKey=key+'-weekly-followups-1';
 if(localStorage.getItem(weeklyUpdateKey)!=='done'){
  const occupied=new Set(leads.map(r=>r.id));
  for(const sample of weeklyFollowupSamples)if(!occupied.has(sample.id)){leads.push(structuredClone(sample));occupied.add(sample.id)}
  localStorage.setItem(key,JSON.stringify(leads));
  localStorage.setItem(weeklyUpdateKey,'done');
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

$('pipeline-demo').checked=!!pipelineHistory&&!(pipelineHistory.events||[]).some(e=>e.kind==='moved'||e.kind==='added');
$('pipeline-demo').addEventListener('change',renderPipeline);
$('pipeline-month').value=today().slice(0,7);
function pipelinePeriod(){
 const selected=$('pipeline-month').value||today().slice(0,7);
 const [year,month]=selected.split('-').map(Number);
 return {start:new Date(year,month-1,1),end:new Date(year,month,1)};
}
function renderPipeline(){
 const demo=showingPipelineDemo(),history=demo?pipelineDemoData().history:pipelineHistory,events=history?.events||[];
 renderPipelineMonthPicker();
 const names=new Map(events.map(e=>[e.leadId,e.company]));
 if(!demo)for(const lead of leads)names.set(lead.id,lead.company);
 const {start,end}=pipelinePeriod(),fmt=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 const relevant=events.filter(e=>Date.parse(e.at)>=start.getTime()&&Date.parse(e.at)<end.getTime());
 const entries=relevant.filter(e=>e.kind==='moved'||e.kind==='added');
 const covered=history&&start.getTime()>=Date.parse(history.startedAt);
 $('pipeline-range').textContent=`${fmt(start)} – ${fmt(new Date(end.getTime()-1))} • Local timezone${covered?'':' • Partial or unavailable history before tracking began'}`;
 $('pipeline-notice').classList.toggle('is-demo',demo);
 $('pipeline-notice').textContent=demo?'FICTIONAL DEMO — These stage counts are made up to demonstrate the dashboard. They are not company results and are never saved into your records.':pipelineWarning||(history?`Tracking began ${new Date(history.startedAt).toLocaleString()}. Earlier stage dates are unknown. Starting records are observations, not conversions. History stays in this browser; keep the same file location/origin. Closed does not distinguish a won sale from a lost lead.`:'History is unavailable.');
 const counts=statuses.map(status=>new Set(entries.filter(e=>e.to===status).map(e=>e.leadId)).size);
 $('pipeline-chart').innerHTML=statuses.map((status,i)=>`<div class="bar-row" data-lead-status="${status}"><span>${status}</span><div class="track"><div class="bar" style="width:${counts[i]/Math.max(1,...counts)*100}%"></div></div><strong>${counts[i]}</strong></div>`).join('');
 $('pipeline-chart').setAttribute('aria-label',statuses.map((status,i)=>`${status}: ${counts[i]} prospects entered this month`).join(', '));
 const activity={baseline:'First observed; earlier stage start unknown',sync:'Observed after reopening; exact change time unknown',reset:'Sample reset; not a sales movement',added:'Lead added',moved:'Status changed',removed:'Lead deleted; history retained'};
 $('pipeline-events').innerHTML=[...relevant].reverse().map(e=>`<tr><td>${esc(new Date(e.at).toLocaleString())}</td><td>${esc(names.get(e.leadId)||e.company)}</td><td>${e.from||'—'}</td><td>${e.to||'—'}</td><td>${activity[e.kind]}</td></tr>`).join('')||'<tr><td colspan="5">No recorded activity across prospects for this period. Earlier activity may be unknown.</td></tr>';
}
let pipelinePickerYear=new Date().getFullYear();
function renderPipelineMonthPicker(){
 const [year,month]=$('pipeline-month').value.split('-').map(Number);
 $('pipeline-month-toggle').textContent=new Date(year,month-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})+' ▾';
 $('pipeline-picker-year').textContent=pipelinePickerYear;
 $('pipeline-picker-months').innerHTML=Array.from({length:12},(_,i)=>{
  const value=`${pipelinePickerYear}-${String(i+1).padStart(2,'0')}`;
  return `<button type="button" data-pipeline-month="${value}" aria-pressed="${value===$('pipeline-month').value}">${new Date(pipelinePickerYear,i,1).toLocaleDateString('en-US',{month:'short'})}</button>`;
 }).join('');
}
function closePipelineMonthPicker(){
 $('pipeline-month-panel').hidden=true;$('pipeline-month-toggle').setAttribute('aria-expanded','false');
}
$('pipeline-month-toggle').onclick=()=>{
 const open=$('pipeline-month-panel').hidden;
 if(open){pipelinePickerYear=Number($('pipeline-month').value.slice(0,4));renderPipelineMonthPicker()}
 $('pipeline-month-panel').hidden=!open;$('pipeline-month-toggle').setAttribute('aria-expanded',String(open));
};
$('pipeline-year-prev').onclick=()=>{pipelinePickerYear--;renderPipelineMonthPicker()};
$('pipeline-year-next').onclick=()=>{pipelinePickerYear++;renderPipelineMonthPicker()};
$('pipeline-picker-months').onclick=e=>{
 const button=e.target.closest('button[data-pipeline-month]');if(!button)return;
 $('pipeline-month').value=button.dataset.pipelineMonth;closePipelineMonthPicker();renderPipeline();$('pipeline-month-toggle').focus();
};
document.addEventListener('click',e=>{if(!e.target.closest('.pipeline-month-picker'))closePipelineMonthPicker()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('pipeline-month-panel').hidden){closePipelineMonthPicker();$('pipeline-month-toggle').focus()}});


function save(reason='save'){try{localStorage.setItem(key,JSON.stringify(leads));recordPipeline(reason)}catch(e){$('storage-message').textContent='Could not save to this browser. Export your leads before leaving.'}render()}
function filtered(){return leads.filter(r=>(!$('search').value||r.company.toLowerCase().includes($('search').value.toLowerCase()))&&(!$('industry').value||r.industry===$('industry').value)&&(!$('status').value||r.status===$('status').value)&&(!$('due').checked||isDue(r)))}
function renderIndustryTotals(list){
 const container=$('industry-totals');
 const existing=new Map([...container.children].map(row=>[row.dataset.industryTotal,row]));
 const totals=industries.map(industry=>({name:industry.name,count:list.filter(r=>r.industry===industry.name).length}));
 const max=Math.max(1,...totals.map(item=>item.count));
 for(const item of totals){
  let row=existing.get(item.name);
  if(!row){
   row=document.createElement('div');row.dataset.industryTotal=item.name;
   row.innerHTML=`<dt>${esc(item.name)}</dt><dd><span class="industry-bar-track" aria-hidden="true"><span class="industry-bar-fill"></span></span><strong class="industry-bar-count"></strong></dd>`;
   container.append(row);
  }
  row.querySelector('.industry-bar-count').textContent=item.count;
  row.querySelector('.industry-bar-fill').style.width=`${item.count/max*100}%`;
 }
}
function render(){const counts=industries.map(i=>leads.filter(r=>r.industry===i.name).length);const stats=[['Potential leads',leads.length,'Fictional business prospects','▤'],['Industries targeted',counts.filter(Boolean).length,'Represented in the lead list','◈'],['Active opportunities',leads.filter(r=>['Qualified','Proposal'].includes(r.status)).length,'Qualified or proposal stage','↗'],['Follow-ups needed',leads.filter(isDue).length,'Due today or overdue','◷']];$('stats').innerHTML=stats.map(s=>`<div class="stat"><div class="stat-top">${s[0]}<span class="stat-icon">${s[3]}</span></div><strong>${s[1].toString().padStart(2,'0')}</strong><small>${s[2]}</small></div>`).join('');$('chart').innerHTML=industries.map((i,n)=>`<div class="bar-row"><span>${i.name}</span><div class="track"><div class="bar" style="width:${counts[n]/Math.max(1,...counts)*100}%"></div></div><strong>${counts[n]}</strong></div>`).join('');$('chart').setAttribute('aria-label',industries.map((i,n)=>`${i.name}: ${counts[n]} leads`).join(', '));$('total-badge').textContent=leads.length;const list=filtered();renderIndustryTotals(list);$('rows').innerHTML=list.map(r=>`<tr><td><div class="company"><span class="avatar" aria-hidden="true">${esc(r.company.split(' ').map(w=>w[0]).slice(0,2).join(''))}</span>${esc(r.company)}</div></td><td>${esc(r.industry)}</td><td><span class="pill ${r.status}">${r.status}</span></td><td>${date(r.contact)}</td><td class="${isDue(r)?'due':''}">${date(r.follow)}${isDue(r)?' • Due':''}</td><td><button class="edit" data-id="${esc(r.id)}" aria-label="Edit ${esc(r.company)}">Edit ↗</button></td></tr>`).join('')||'<tr><td colspan="6">No leads match these filters. Try clearing them.</td></tr>';$('showing').textContent=`Showing ${list.length} of ${leads.length} fictional leads`;renderLeadViews()}
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
 $('status-chart').innerHTML=statuses.map((status,i)=>`<button type="button" class="bar-row" data-lead-status="${status}" data-filter-status="${status}" aria-controls="rows" aria-label="Show ${counts[i]} ${status} leads in company list"><span>${status}</span><span class="track"><span class="bar" style="width:${counts[i]/Math.max(1,...counts)*100}%"></span></span><strong>${counts[i]}</strong></button>`).join('');
 $('status-chart').setAttribute('aria-label',statuses.map((status,i)=>`${status}: ${counts[i]} leads`).join(', '));
 $('status-summary').textContent=`${leads.length} total leads • Select a status above to view matching companies. Calendar has its own status filters; filters below apply to the table and CSV.`;
 renderCalendar();
 renderPipeline();
}
$('status-chart').onclick=e=>{
 const button=e.target.closest('button[data-filter-status]');if(!button)return;
 $('search').value='';$('industry').value='';$('due').checked=false;$('status').value=button.dataset.filterStatus;
 render();
 $('search').focus({preventScroll:true});
 $('lead-filters').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
};
function calendarDateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function renderCalendar(){
 const weekly=calendarView==='week',year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();
 const start=new Date(year,month,weekly?calendarMonth.getDate():1);
 if(weekly)start.setDate(start.getDate()-(start.getDay()+6)%7);
 const end=weekly?new Date(start.getFullYear(),start.getMonth(),start.getDate()+7):new Date(year,month+1,1);
 const label=weekly?`${date(calendarDateKey(start))} – ${date(calendarDateKey(new Date(end.getFullYear(),end.getMonth(),end.getDate()-1)))}`:calendarMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'});
 $('calendar-month').textContent=label;
 $('calendar-weekly').setAttribute('aria-pressed',String(weekly));$('calendar-monthly').setAttribute('aria-pressed',String(!weekly));
 $('follow-calendar').classList.toggle('weekly-view',weekly);
 $('follow-calendar').setAttribute('aria-label',`${weekly?'Weekly':'Monthly'} follow-ups for ${label}`);
 const periodLeads=leads.filter(r=>calendarStatusOptions.includes(r.status)&&r.follow>=calendarDateKey(start)&&r.follow<calendarDateKey(end));
 const scheduled=periodLeads.filter(r=>calendarStatuses.has(r.status));
 for(const button of $('calendar-status-filters').querySelectorAll('button')){
  const status=button.dataset.calendarStatus;
  const total=status==='all'?periodLeads.length:periodLeads.filter(r=>r.status===status).length;
  const selected=status==='all'?calendarStatuses.size===calendarStatusOptions.length:calendarStatuses.has(status);
  const count=button.querySelector('.calendar-status-count');
  count.textContent=total;
  count.hidden=!selected;
  button.setAttribute('aria-label',`${status==='all'?'All open statuses':status}${selected?`: ${total} leads with follow-ups this ${calendarView}`:''}`);
  button.setAttribute('aria-pressed',String(selected));
 }
 const selectedTotal=scheduled.length;
 $('calendar-selection-total').innerHTML=`<strong>This ${calendarView} total: ${selectedTotal} lead${selectedTotal===1?'':'s'}</strong><span>Selected statuses with a follow-up date in the displayed ${calendarView}. Closed leads are excluded.</span>`;

 const byDate=new Map();
 for(const lead of scheduled){if(!byDate.has(lead.follow))byDate.set(lead.follow,[]);byDate.get(lead.follow).push(lead)}
 const offset=(start.getDay()+6)%7,days=new Date(year,month+1,0).getDate();
 const displayStart=new Date(start);if(!weekly)displayStart.setDate(displayStart.getDate()-offset);
 let html=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<div class="calendar-weekday">${d}</div>`).join('');
 const cells=weekly?7:Math.ceil((offset+days)/7)*7;
 for(let i=0;i<cells;i++){
  const d=new Date(displayStart.getFullYear(),displayStart.getMonth(),displayStart.getDate()+i),iso=calendarDateKey(d);
  if(!weekly&&(d<start||d>=end)){html+='<div class="calendar-day empty" aria-hidden="true"></div>';continue}
  const events=(byDate.get(iso)||[]).sort((a,b)=>a.company.localeCompare(b.company));
  html+=`<div class="calendar-day${iso===today()?' is-today':''}"><time class="calendar-date" datetime="${iso}" aria-label="${date(iso)}"${iso===today()?' aria-current="date"':''}>${d.getDate()}</time>${events.map(r=>`<button class="calendar-event${isDue(r)?' overdue':''}" data-lead-id="${esc(r.id)}" data-lead-status="${r.status}" aria-label="${esc(r.company)} — ${r.status}, follow-up ${date(iso)}${isDue(r)?', due or overdue':''}">${esc(r.company)}<span class="calendar-event-status">${r.status}${isDue(r)?' · Due / overdue':''}</span></button>`).join('')}</div>`;
 }
 $('follow-calendar').innerHTML=html;
 const unscheduled=leads.filter(r=>calendarStatuses.has(r.status)&&!r.follow).length;
 const selection=calendarStatuses.size===calendarStatusOptions.length?'All open statuses':calendarStatuses.size?[...calendarStatuses].join(', '):'No statuses selected';
 $('calendar-summary').textContent=`${scheduled.length?`${scheduled.length} follow-up${scheduled.length===1?'':'s'}`:'No follow-ups'} in this ${calendarView}. ${selection}. ${unscheduled} matching lead${unscheduled===1?' has':'s have'} no follow-up date. Closed leads are excluded. Weeks run Monday–Sunday. Companies beginning with “Demo” are fictional calendar examples.`;
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
$('calendar-weekly').onclick=()=>{calendarView='week';calendarMonth=new Date();renderCalendar()};
$('calendar-monthly').onclick=()=>{calendarView='month';calendarMonth=new Date();renderCalendar()};
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
