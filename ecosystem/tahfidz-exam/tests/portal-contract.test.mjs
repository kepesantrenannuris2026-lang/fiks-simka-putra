import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('Cloudflare portal HTML provides the nodes required by the login and post-login script',()=>{
 const html=fs.readFileSync('ecosystem/cloudflare/baseline-index.html','utf8');const js=fs.readFileSync('ecosystem/cloudflare/exam-portal.js','utf8');
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 for(const [,id] of js.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(id),'Missing portal element: '+id);
 assert.match(html,/class="[^"]*skip-link/);assert.match(html,/src="\/portal.js(?:\?[^"]*)?"/);assert.match(html,/src="\/apps.js(?:\?[^"]*)?"/);
});
