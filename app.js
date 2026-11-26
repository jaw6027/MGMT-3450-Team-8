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
function save(){try{localStorage.setItem(key,JSON.stringify(leads))}catch(e){$('storage-message').textContent='Could not save to this browser. Export your leads before leaving.'}render()}
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
$('reset').onclick=()=>{if(confirm('Replace browser changes with the original fictional sample data?')){leads=structuredClone(seed);save()}};
$('export').onclick=()=>{const cell=v=>'"'+String(/^[=+\-@\t\r]/.test(v)?"'"+v:v).replaceAll('"','""')+'"';const text=[['FICTIONAL SAMPLE DATA - NOT DOMINO PLASTICS RECORDS'],['Company','Industry','Status','Last contact','Next follow-up','Contact name','Email','Phone','Interaction notes and next steps','Product interest (unverified)','Estimated opportunity value (USD, fictional)'],...filtered().map(r=>[r.company,r.industry,r.status,r.contact,r.follow,...Object.keys(crmDefaults).map(k=>r[k]??'')])].map(r=>r.map(cell).join(',')).join('\r\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='fictional-marketing-leads.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
function renderLeadViews(){
 const counts=statuses.map(status=>leads.filter(r=>r.status===status).length);
 $('status-chart').innerHTML=statuses.map((status,i)=>`<div class="bar-row" data-lead-status="${status}"><span>${status}</span><div class="track"><div class="bar" style="width:${counts[i]/Math.max(1,...counts)*100}%"></div></div><strong>${counts[i]}</strong></div>`).join('');
 $('status-chart').setAttribute('aria-label',statuses.map((status,i)=>`${status}: ${counts[i]} leads`).join(', '));
 $('status-summary').textContent=`${leads.length} total leads • Chart and calendar use all leads; filters below apply to the table and CSV.`;
 renderCalendar();
}
function renderCalendar(){
 const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();
 const label=calendarMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'});
 $('calendar-month').textContent=label;
 $('follow-calendar').setAttribute('aria-label',`Follow-ups for ${label}`);
 const prefix=`${year}-${String(month+1).padStart(2,'0')}-`;
 const scheduled=leads.filter(r=>r.status!=='Closed'&&r.follow.startsWith(prefix));
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
 const unscheduled=leads.filter(r=>r.status!=='Closed'&&!r.follow).length;
 $('calendar-summary').textContent=`${scheduled.length?`${scheduled.length} follow-up${scheduled.length===1?'':'s'}`:'No follow-ups'} in ${label}. ${unscheduled} open lead${unscheduled===1?' has':'s have'} no follow-up date. Closed leads are excluded. Colors match the lead-status chart. Due / overdue follow-ups are labeled.`;
}
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
