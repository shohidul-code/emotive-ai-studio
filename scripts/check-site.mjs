import { readFile, readdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const html=await readFile('dist/index.html','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(ids).size,ids.length,'HTML IDs must be unique');
for(const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if(url.startsWith('/')) await access('dist'+url);
  else if(url.startsWith('#')) assert.ok(ids.includes(url.slice(1)),`Broken anchor: ${url}`);
}
for(const file of (await readdir('dist')).filter(name=>name.endsWith('.js'))) {
  const result=spawnSync(process.execPath,['--check','dist/'+file],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const source=await readFile('dist/'+file,'utf8');
  for(const [,path] of source.matchAll(/(?:from\s*|import\s*)['"](\.\/[^'"]+)['"]/g)) await access('dist/'+path);
}
assert.ok(!html.includes('qa-mobile'),'Temporary QA pages must not be shipped');
console.log('Site check passed: unique IDs, local assets, anchor targets, module imports and JavaScript syntax.');
