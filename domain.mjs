export function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function safeUrl(value) { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
export function dateKey(year, month, day) { return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; }
export function pacificToday(date = new Date()) { return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Los_Angeles', year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function prettyDate(value) { return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}); }
export function timeLabel(time) { if (!time) return 'All day'; const [h,m]=time.split(':'); return `${Number(h)%12 || 12}:${m} ${Number(h)<12?'AM':'PM'} Pacific`; }
export function dueSoon(tasks,today) { const start=new Date(today+'T00:00:00Z'); const end=new Date(start); end.setUTCDate(end.getUTCDate()+6); const last=end.toISOString().slice(0,10); return tasks.filter(t=>t.status!=='Done' && t.due>=today && t.due<=last).length; }
