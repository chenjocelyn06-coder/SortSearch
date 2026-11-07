import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, normalize } from './server.mjs';

test('normalization keeps unknown prices out of numeric sorting and removes unsafe URLs', () => {
  const rows = normalize([
    {title:'Known',price:'$415.00',extracted_price:415,product_link:'https://google.com/search?q=shoe'},
    {title:'Unknown', link:'javascript:alert(1)'},
    {title:'Other currency',price:'€20',extracted_price:20},
    {title:'Range',price:'$20–$50',extracted_price:20}
  ]);
  assert.equal(rows[0].price,415);
  assert.equal(rows[1].price,null); assert.equal(rows[1].url,'');
  assert.equal(rows[2].price,null); assert.equal(rows[3].price,null);
});
async function withApp(options, check) {
  const app = createApp(options);
  await new Promise(resolve => app.listen(0,'127.0.0.1',resolve));
  try { await check(`http://127.0.0.1:${app.address().port}`); }
  finally { await new Promise(resolve => app.close(resolve)); }
}
test('search forwards query, caches repeats, and never returns API key', async () => {
  let calls = 0;
  await withApp({apiKey:'test-secret',fetcher:async url => {
    calls++; assert.equal(url.searchParams.get('q'),'mcqueen');
    assert.equal(url.searchParams.get('engine'),'google_shopping');
    return Response.json({shopping_results:[{title:'Sneaker',source:'Seller',price:'$415.00',extracted_price:415,product_link:'https://google.com/search?q=shoe'}]});
  }}, async base => {
    assert.equal((await fetch(base + '/')).status,200);
    assert.equal((await fetch(base + '/.env')).status,404);
    assert.equal((await fetch(base + '/api/search?q=a')).status,400);
    const result = await (await fetch(base + '/api/search?q=mcqueen')).json();
    assert.equal(result.offers[0].price,415);
    assert.ok(!JSON.stringify(result).includes('test-secret'));
    await fetch(base + '/api/search?q=McQueen'); assert.equal(calls,1);
  });
});
test('missing configuration, provider errors and empty results are explicit', async () => {
  await withApp({apiKey:''},async base => assert.equal((await fetch(base+'/api/search?q=monitor')).status,503));
  await withApp({apiKey:'test',fetcher:async()=>Response.json({error:'secret provider detail'})},async base => {
    const r = await fetch(base+'/api/search?q=monitor'); assert.equal(r.status,502);
    assert.ok(!(await r.text()).includes('secret provider detail'));
  });
  await withApp({apiKey:'test',fetcher:async()=>Response.json({shopping_results:[]})},async base => {
    const r = await fetch(base+'/api/search?q=monitor'); assert.equal(r.status,200);
    assert.deepEqual((await r.json()).offers,[]);
  });
});
