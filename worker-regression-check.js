import fs from 'node:fs';
const worker=fs.readFileSync(new URL('./worker/src/index.js',import.meta.url),'utf8');
const config=JSON.parse(fs.readFileSync(new URL('./worker/wrangler.jsonc',import.meta.url),'utf8'));

const checks=[
  ['Worker has default export',/export default\s*\{/.test(worker)],
  ['Health route exists',worker.includes("url.pathname==='/' || url.pathname==='/health'")],
  ['Product preview route exists',worker.includes("'/api/product/preview'")],
  ['Category 26 route exists',worker.includes("'/api/category/26'")],
  ['CORS is restricted to GitHub Pages',worker.includes("'Access-Control-Allow-Origin':'https://xienum.github.io'")],
  ['GitHub writes remain disabled',worker.includes("githubWrite:false")],
  ['Snkrdunk product URL is restricted',worker.includes("snkrdunk\\.com\\/apparels")],
  ['Category source is fixed to Snkrdunk 26',worker.includes("https://snkrdunk.com/categories/26")],
  ['Wrangler name correct',config.name==='pcg-admin-api'],
  ['Wrangler main correct',config.main==='src/index.js'],
  ['No repository-wide assets config',!('assets' in config)],
  ['Workers dev enabled',config.workers_dev===true],
];
const bad=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks) console.log((ok?'PASS':'FAIL')+' '+name);
if(bad.length) throw new Error('Regression checks failed: '+bad.map(x=>x[0]).join(', '));
console.log('WORKER REGRESSION CHECKS PASS '+checks.length+'/'+checks.length);
