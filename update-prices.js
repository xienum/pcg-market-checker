import * as cheerio from 'cheerio';
import fs from 'fs';
const FILE = new URL('./data.json', import.meta.url);
const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const date = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date());
async function scrape(p){
  const r=await fetch(p.url,{headers:{'user-agent':'Mozilla/5.0 (compatible; PCGMarketChecker/2.0)'}});
  if(!r.ok) throw Error('HTTP '+r.status);
  const $=cheerio.load(await r.text());
  const text=$('body').text().replace(/\s+/g,' ');
  const name=$('h1').first().text().trim()||p.name;
  let m=text.match(/1個\(.*?\)\s*¥\s*([\d,]+)\s*~/);
  if(!m)m=text.match(/購入手数料\s*¥[\d,]+\s*¥\s*([\d,]+)\s*~/);
  if(!m)throw Error('1個価格を検出できません');
  return {name,price:+m[1].replaceAll(',','')};
}
let success=0;
for(const p of d.products){
  try{
    const x=await scrape(p); p.name=x.name;
    const row={productId:p.id,date,price:x.price};
    const i=d.history.findIndex(h=>h.productId===p.id&&h.date===date);
    i>=0?d.history[i]=row:d.history.push(row);
    console.log(`${p.id}: ¥${x.price.toLocaleString('ja-JP')}`); success++;
  }catch(e){ console.error(`${p.id}: ${e.message}`); }
}
if(!success) process.exitCode=1;
// Keep exactly one row per product/day. The newest scrape for today wins.
const unique=new Map();
for(const h of d.history) unique.set(`${h.productId}|${h.date}`,h);
d.history=[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||String(a.productId).localeCompare(String(b.productId)));
fs.writeFileSync(FILE,JSON.stringify(d,null,2)+'\n');
