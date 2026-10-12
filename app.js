import {escapeHtml as esc,safeUrl,dateKey,pacificToday,prettyDate,timeLabel,dueSoon} from './domain.mjs';
const $=id=>document.getElementById(id);
const state={events:[],updates:[],tasks:[],campaigns:[],chapter:null,role:null,user:null};
let client=null, epoch=0, editing=null, busy=false;
const today=pacificToday(); let [year,month]=today.split('-').map(Number); month--;
const canEdit=()=>['editor','admin'].includes(state.role);
const schemas={
 events:[['title','Event title','text',true],['event_date','Date','date',true],['start_time','Start time (Pacific)','time'],['location','Location or online','text'],['visibility','Who can see this?',['internal','public']],['url','Registration or meeting link','url'],['description','Details','textarea']],
 updates:[['title','Headline','text',true],['visibility','Who can see this?',['internal','public']],['body','Update','textarea',true],['url','Read more link','url']],
 tasks:[['title','Task','text',true],['owner','Assigned to','text'],['campaign_id','Campaign','campaign'],['due','Due date','date'],['priority','Priority',['Medium','High','Low']],['status','Status',['To Do','In Progress','Blocked','Done']],['notes','Notes','textarea']],
 campaigns:[['name','Campaign name','text',true],['lead','Lead organizer','text'],['document_url','Planning document link','url'],['description','Description','textarea']],
 chapter:[['title','Chapter name','text',true],['description','About the chapter','textarea'],['leadership','Leadership','textarea'],['contact_email','Public contact email','email'],['resource_url','Resource link','url']]
};
function notice(message){$('notice').textContent=message;}
function link(url,label){const href=safeUrl(url);return href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'';}
function empty(message){return `<p class="empty">${esc(message)}</p>`;}
function actions(table,id){return canEdit()?`<div class="small-actions"><button data-edit="${table}" data-id="${esc(id)}">Edit</button>${table==='chapter'?'':`<button class="secondary" data-delete="${table}" data-id="${esc(id)}">Delete</button>`}</div>`:'';}
function wipePrivate(){state.role=null;state.user=null;state.tasks=[];state.campaigns=[];state.events=state.events.filter(e=>e.visibility==='public');state.updates=state.updates.filter(e=>e.visibility==='public');for(const id of ['detail','editor'])$(id).close();render();}
function render(){
 $('workspace').hidden=!state.role;$('workspaceLink').hidden=!state.role;$('internalOption').hidden=!state.role;
 if(!state.role && $('audience').value==='internal')$('audience').value='all';
 document.querySelectorAll('.editor').forEach(el=>el.hidden=!canEdit());
 $('authButton').textContent=state.user?'Sign out':'Organizer sign in';
 $('accessLabel').textContent=state.role?`${canEdit()?'Editing':'Viewing'} as ${state.user.email}`:state.user?'This account has not been approved for organizer access.':'Public view';
 renderCalendar();renderUpdates();renderWorkspace();
 const c=state.chapter;
 $('chapterInfo').innerHTML=c?`<h3>${esc(c.title)}</h3><p class="body-copy">${esc(c.description)}</p>${c.leadership?`<h3>Leadership</h3><p class="body-copy">${esc(c.leadership)}</p>`:''}${c.contact_email?`<p>Contact: ${esc(c.contact_email)}</p>`:''}${link(c.resource_url,'Chapter resources')}`:empty('Chapter information will appear here.');
}
function renderCalendar(){
 $('monthTitle').textContent=new Date(Date.UTC(year,month,1)).toLocaleDateString('en-US',{timeZone:'UTC',month:'long',year:'numeric'});
 const audience=$('audience').value;
 const available=state.events.filter(e=>audience==='all'||e.visibility===audience);
 const events=available.filter(e=>e.event_date.startsWith(dateKey(year,month,1).slice(0,7)));
 const first=new Date(Date.UTC(year,month,1)).getUTCDay(), days=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 let html=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="day-label">${d}</div>`).join('');
 for(let i=0;i<first;i++)html+='<div class="day blank" aria-hidden="true"></div>';
 for(let day=1;day<=days;day++){const date=dateKey(year,month,day);html+=`<div class="day ${date===today?'today':''}"><span class="date">${day}</span>${events.filter(e=>e.event_date===date).map(e=>`<button class="event ${e.visibility}" data-event="${e.id}">${esc(e.title)}${e.visibility==='internal'?' · Internal':''}</button>`).join('')}</div>`;}
 for(let i=first+days;i%7!==0;i++)html+='<div class="day blank" aria-hidden="true"></div>';
 $('calendarGrid').innerHTML=html;
 const row=e=>`<div class="event-row"><span class="tag">${e.visibility==='internal'?'Internal':'Public'}</span><button data-event="${e.id}">${esc(e.title)}</button><div class="meta">${prettyDate(e.event_date)} · ${timeLabel(e.start_time)}</div></div>`;
 $('eventList').innerHTML=events.length?events.map(row).join(''):empty('No events posted for this month.');
 const upcoming=available.filter(e=>e.event_date>=today).slice(0,5);$('upcoming').innerHTML=upcoming.length?upcoming.map(row).join(''):empty('Upcoming events will appear here.');
}
function renderUpdates(){ $('updateList').innerHTML=state.updates.length?state.updates.map(u=>`<article class="update"><span class="tag">${u.visibility==='internal'?'Internal':'Public'}</span><h3>${esc(u.title)}</h3><p class="body-copy">${esc(u.body)}</p>${link(u.url,'Read more')}${actions('updates',u.id)}</article>`).join(''):empty('Chapter updates will appear here.'); }
function renderWorkspace(){
 const tasks=state.tasks.filter(t=>(!$('taskFilter').value||t.status===$('taskFilter').value)&&`${t.title} ${t.owner}`.toLowerCase().includes($('taskSearch').value.toLowerCase()));
 $('tasks').innerHTML=tasks.length?tasks.map(t=>`<tr><td><strong>${esc(t.title)}</strong><div class="meta body-copy">${esc(t.notes)}</div></td><td>${esc(t.owner)}</td><td>${esc(state.campaigns.find(c=>c.id===t.campaign_id)?.name||'')}</td><td>${t.due?prettyDate(t.due):''}</td><td>${esc(t.priority)}</td><td>${esc(t.status)}</td><td>${actions('tasks',t.id)}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">No tasks to show.</td></tr>';
 $('openCount').textContent=state.tasks.filter(t=>t.status!=='Done').length;$('dueCount').textContent=dueSoon(state.tasks,today);$('campaignCount').textContent=state.campaigns.length;
 $('campaigns').innerHTML=state.campaigns.length?state.campaigns.map(c=>{const ts=state.tasks.filter(t=>t.campaign_id===c.id),done=ts.filter(t=>t.status==='Done').length;return `<article class="campaign"><h3>${esc(c.name)}</h3><p class="meta">Lead: ${esc(c.lead||'Not assigned')} · ${done} of ${ts.length} tasks complete</p><progress value="${done}" max="${ts.length||1}" aria-label="${esc(c.name)} progress"></progress><p class="body-copy">${esc(c.description)}</p>${link(c.document_url,'Open planning document')}${actions('campaigns',c.id)}</article>`;}).join(''):empty('No campaigns added yet.');
}
function showEvent(id){const event=state.events.find(e=>e.id===id);if(!event)return;$('detailTitle').textContent=event.title;$('detailBody').innerHTML=`<span class="tag">${event.visibility==='internal'?'Internal event':'Public event'}</span><p>${prettyDate(event.event_date)} · ${timeLabel(event.start_time)}</p><p>${esc(event.location)}</p><p class="body-copy">${esc(event.description)}</p>${link(event.url,'Open event link')}`;$('detailActions').innerHTML=actions('events',id);$('detail').showModal();}
function openEditor(table,id){if(!canEdit()||!schemas[table])return;const row=table==='chapter'?(state.chapter||{}):(state[table].find(r=>r.id===id)||{});editing={table,id:row.id};$('detail').close();$('editorTitle').textContent=`${row.id?'Edit':'Add'} ${table==='chapter'?'chapter information':table.replace(/s$/,'')}`;
 $('fields').innerHTML=schemas[table].map(([name,label,type,required])=>{const value=row[name]??'';let field;if(Array.isArray(type)||type==='campaign'){const options=type==='campaign'?[['','No campaign'],...state.campaigns.map(c=>[c.id,c.name])]:type.map(v=>[v,v==='internal'?'Internal: organizers only':v==='public'?'Public: everyone':v]);field=`<select name="${name}">${options.map(([v,l])=>`<option value="${esc(v)}" ${value===v?'selected':''}>${esc(l)}</option>`).join('')}</select>`;}else field=type==='textarea'?`<textarea name="${name}" maxlength="10000" ${required?'required':''}>${esc(value)}</textarea>`:`<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${['text','email','url'].includes(type)?'maxlength="2000"':''}>`;return `<label class="${type==='textarea'?'wide':''}">${label}${field}</label>`;}).join('');$('saveMessage').textContent='';$('editor').showModal();
}
async function query(table){const {data,error}=await client.from('chapter_'+table).select('*');if(error)throw error;return data;}
async function reload(){
 if(!client)return;const turn=++epoch;
 try{
  const {data:{session},error}=await client.auth.getSession();if(error)throw error;
  let role=null;
  if(session){const {data,error}=await client.from('chapter_members').select('role').eq('user_id',session.user.id).maybeSingle();if(error)throw error;role=data?.role||null;}
  const [events,updates,chapters,tasks,campaigns]=await Promise.all([query('events'),query('updates'),query('info'),role?query('tasks'):[],role?query('campaigns'):[]]);
  if(turn!==epoch)return;
  state.user=session?.user||null;state.role=role;state.events=events.sort((a,b)=>(a.event_date+(a.start_time||'')).localeCompare(b.event_date+(b.start_time||'')));state.updates=updates.sort((a,b)=>b.created_at.localeCompare(a.created_at));state.chapter=chapters[0]||null;state.tasks=tasks;state.campaigns=campaigns;
  notice(session&&!role?'Your account is signed in but has not been approved for organizer access.':'');render();
 }catch(error){if(turn!==epoch)return;wipePrivate();notice('Unable to load shared information. Please retry or sign in again.');}
}
async function save(event){event.preventDefault();if(!canEdit()||busy||!editing)return;busy=true;const button=event.submitter;button.disabled=true;$('saveMessage').textContent='Saving…';try{const {table,id}=editing;const values=Object.fromEntries(new FormData(event.target));for(const [name,,type] of schemas[table]){if(type==='url'&&values[name]&&!safeUrl(values[name]))throw new Error('Use a complete http or https link.');if(['date','time','campaign'].includes(type)&&!values[name])values[name]=null;}if(table==='chapter')values.id=1;
 const source=client.from(table==='chapter'?'chapter_info':'chapter_'+table);
 const request=id?source.update(values).eq('id',id):source.insert(values);
 const {data,error}=await request.select('id');if(error)throw error;if(!data?.length)throw new Error('Your editing access may have changed. Changes were not saved.');$('editor').close();await reload();notice('Changes saved.');
 }catch(error){$('saveMessage').textContent=error.message||'Could not save. Your changes are still in the form.';}finally{busy=false;button.disabled=false;}}
async function remove(table,id){if(!canEdit()||!schemas[table]||table==='chapter'||busy)return;if(!confirm('Delete this item for everyone?'))return;busy=true;try{const {data,error}=await client.from('chapter_'+table).delete().eq('id',id).select('id');if(error)throw error;if(!data?.length)throw new Error('No item deleted. Your editing access may have changed.');$('detail').close();await reload();notice('Item deleted.');}catch(error){notice(error.message||'Could not delete.');}finally{busy=false;}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.close)$(b.dataset.close).close();if(b.dataset.event)showEvent(b.dataset.event);if(b.dataset.new)openEditor(b.dataset.new);if(b.dataset.edit)openEditor(b.dataset.edit,b.dataset.id);if(b.dataset.delete)remove(b.dataset.delete,b.dataset.id);});
$('prev').onclick=()=>{if(--month<0){month=11;year--;}renderCalendar();};$('next').onclick=()=>{if(++month>11){month=0;year++;}renderCalendar();};$('today').onclick=()=>{[year,month]=pacificToday().split('-').map(Number);month--;renderCalendar();};$('audience').onchange=renderCalendar;$('taskSearch').oninput=renderWorkspace;$('taskFilter').onchange=renderWorkspace;$('editChapter').onclick=()=>openEditor('chapter');$('refresh').onclick=reload;$('editForm').onsubmit=save;
$('authButton').onclick=async()=>{if(!client){notice('Organizer sign in will be available when setup is complete.');return;}if(state.user){++epoch;wipePrivate();const {error}=await client.auth.signOut();if(error){notice('Sign out could not complete. Please retry.');return;}await reload();}else{$('loginMessage').textContent='';$('login').showModal();}};
$('loginForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;$('loginMessage').textContent='Signing in…';try{const form=new FormData(e.target);const {error}=await client.auth.signInWithPassword({email:form.get('email').trim(),password:form.get('password')});if(error)throw error;e.target.reset();$('login').close();await reload();}catch{$('loginMessage').textContent='Could not sign in. Check your email and password, or contact your chapter administrator.';}finally{button.disabled=false;}};
render();
const config=window.CHAPTER_CONFIG;
if(!config?.supabaseUrl||!config?.supabasePublishableKey){notice('Site setup is in progress. Events, sign in, and shared saving are not connected yet.');$('authButton').disabled=true;}else{
 try{
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm');
  client=createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,storage:sessionStorage,detectSessionInUrl:false}});
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){++epoch;wipePrivate();}setTimeout(reload,0);});await reload();
  setInterval(()=>{if(!document.hidden&&!busy&&!$('editor').open)reload();},60000);
 }catch{notice('The connection could not start. Please reload or contact your chapter administrator.');}
}
