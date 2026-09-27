import worker from './src/index.js';
import assert from 'node:assert/strict';

let calls=0;
globalThis.fetch=async(url)=>{
  calls++;
  if(String(url).includes('/search?searchCategoryIds=6%2F26')) return new Response('<a href="/apparels/881421">a</a><a href="https://snkrdunk.com/apparels/881423">b</a><a href="/apparels/881421">duplicate</a><a href="/search?searchCategoryIds=6%2F26&page=2">next</a>');
  return new Response('<h1>テスト商品</h1><p>発売日 2026年9月16日</p><p>1個(BOX) ¥ 24,700 ~</p>');
};
for(let i=0;i<100;i++){
  let r=await worker.fetch(new Request('https://example.com/api/category/26'));
  let j=await r.json();
  assert.equal(r.status,200);
  assert.equal(j.count,2);
  assert.equal(j.page,1);
  assert.equal(j.nextPage,2);
  assert.deepEqual(j.products.map(x=>x.id),['881421','881423']);
  r=await worker.fetch(new Request('https://example.com/api/product/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://snkrdunk.com/apparels/881421'})}));
  j=await r.json();
  assert.equal(r.status,200);
  assert.equal(j.product.name,'テスト商品');
  assert.equal(j.product.releaseDate,'2026-09-16');
  assert.equal(j.product.initialPrice,24700);
  r=await worker.fetch(new Request('https://example.com/health'));
  assert.equal((await r.json()).ok,true);
  r=await worker.fetch(new Request('https://example.com/api/product/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://evil.example/apparels/881421'})}));
  assert.equal(r.status,400);
}
assert.equal(calls,200);
globalThis.fetch=async()=>new Response('blocked',{status:403});
let failed=await worker.fetch(new Request('https://example.com/api/category/26'));
assert.equal(failed.status,502);
assert.match((await failed.json()).detail,/HTTP 403/);
globalThis.fetch=async()=>new Response('<html>no product links</html>');
failed=await worker.fetch(new Request('https://example.com/api/category/26'));
assert.equal(failed.status,502);
failed=await worker.fetch(new Request('https://example.com/api/category/26?page=0'));
assert.equal(failed.status,400);
console.log('100 rounds passed (category IDs, product fields, health, URL validation)');
