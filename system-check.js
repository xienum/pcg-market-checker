import assert from 'node:assert/strict';
import { buildDiscordMessage } from './notify-discord.js';

const base={
 products:[
  {id:'1',name:'Alpha'},{id:'2',name:'Beta'}
 ],
 history:[
  {productId:'1',date:'2026-09-25',price:12345},
  {productId:'2',date:'2026-09-25',price:6789}
 ],
 status:{checkedAt:'2026-09-25T00:00:00.000Z',successCount:2,totalCount:2,ok:true,failures:[]}
};
const env={GITHUB_RUN_ID:'999',STEP_SCRAPE:'success',STEP_SAVE:'success',STEP_CONFIGURE_PAGES:'success',STEP_UPLOAD_PAGES:'success',STEP_DEPLOYMENT:'success'};
let n=0;
function check(name,fn){fn(); n++; console.log(`CHECK ${n}/10 PASS: ${name}`);}
const msg=buildDiscordMessage(base,env);
check('message is non-empty',()=>assert.ok(msg.trim().length>0));
check('success header is present',()=>assert.match(msg,/SUCCESS/));
check('run id is present',()=>assert.match(msg,/Run #999/));
check('first product name is present',()=>assert.match(msg,/Alpha/));
check('price formatting is present',()=>assert.match(msg,/¥12,345/));
check('all stage results are present',()=>assert.match(msg,/Pages公開: SUCCESS/));
const failed=structuredClone(base); failed.status={checkedAt:'2026-09-25T00:00:00.000Z',successCount:1,totalCount:2,ok:false,failures:[{productId:'2',message:'HTTP 403'}]};
const fmsg=buildDiscordMessage(failed,{...env,STEP_SCRAPE:'failure'});
check('error header is present on failure',()=>assert.match(fmsg,/ERROR/));
check('failed product is identified',()=>assert.match(fmsg,/Beta \(2\): HTTP 403/));
check('failed stage is identified',()=>assert.match(fmsg,/価格取得: FAILURE/));
check('message stays under Discord limit',()=>assert.ok(fmsg.length<=1900));
console.log(`SYSTEM CHECK COMPLETE: ${n}/10 PASS`);
