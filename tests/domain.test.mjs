import {test} from 'node:test';
import assert from 'node:assert/strict';
import {escapeHtml,safeUrl,dateKey,pacificToday,prettyDate,timeLabel,dueSoon} from '../domain.mjs';
test('user text and executable links cannot become markup',()=>{
 assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
 for(const url of ['javascript:alert(1)','data:text/html,test','//example.com','not a link'])assert.equal(safeUrl(url),'');
 assert.equal(safeUrl('https://example.com/event'),'https://example.com/event');
});
test('Pacific calendar dates do not shift on UTC midnight or daylight changes',()=>{
 assert.equal(pacificToday(new Date('2026-10-13T01:00:00Z')),'2026-10-12');
 assert.equal(pacificToday(new Date('2026-11-01T09:30:00Z')),'2026-11-01');
 assert.equal(prettyDate('2026-08-13'),'Aug 13, 2026');
 assert.equal(dateKey(2026,11,31),'2026-12-31');
 assert.equal(timeLabel('00:30:00'),'12:30 AM Pacific');
 assert.equal(timeLabel('13:30:00'),'1:30 PM Pacific');
});
test('due count includes today and next six dates but excludes completed tasks',()=>{
 const tasks=[{due:'2026-10-12',status:'To Do'},{due:'2026-10-18',status:'Blocked'},{due:'2026-10-19',status:'To Do'},{due:'2026-10-12',status:'Done'},{due:null,status:'To Do'}];
 assert.equal(dueSoon(tasks,'2026-10-12'),2);
});
