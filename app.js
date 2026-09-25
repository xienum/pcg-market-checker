let chart,data,currentDays=30;const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];const yen=n=>n==null?'—':'¥'+Math.abs(Number(n)).toLocaleString('ja-JP');const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const shortName=n=>String(n??'').replace(/^ポケモンカードゲーム\s*MEGA\s*/,'').replace(/^拡張パック「(.+)」BOX$/,'$1').replace(/^構築済みデッキ「30th CELEBRATION プレミアムデッキセット エーフィ・ブラッキー」$/,'エーフィ・ブラッキー').replace(/^スペシャルBOX「30th CELEBRATION FUTURISTIC BOX」$/,'FUTURISTIC BOX').replace(/^30th CELEBRATION プレミアムデッキセット エーフィ・ブラッキー$/,'エーフィ・ブラッキー').replace(/^30th CELEBRATION FUTURISTIC BOX$/,'FUTURISTIC BOX');
async function load(){try{const r=await fetch('./data.json?ts='+Date.now());if(!r.ok)throw Error('HTTP '+r.status);data=await r.json();render();renderFetchStatus()}catch(e){const el=$('#fetchStatus');if(el){el.className='fetch-status error';el.textContent='● データ読込失敗';}}}
function renderFetchStatus(){const el=$('#fetchStatus');if(!el)return;const s=data.status;if(!s?.checkedAt){el.className='fetch-status warn';el.textContent='● 更新状態：次回取得後に表示';return}const t=new Date(s.checkedAt),fmt=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(t),next=new Date(t.getTime()+60*60000),nfmt=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'}).format(next);const age=Date.now()-t.getTime();if(age>135*60000){el.className='fetch-status error';el.textContent=`● 更新停止を検知　最終 ${fmt}`;el.title='135分以上、新しい取得結果がありません';}else if(s.ok){el.className='fetch-status ok';el.textContent=`● 取得正常　最終 ${fmt} / 次回目安 ${nfmt}`}else{el.className='fetch-status error';el.textContent=`● 取得エラー ${s.successCount}/${s.totalCount}件成功　最終 ${fmt}`;el.title=(s.failures||[]).map(x=>x.productId+': '+x.message).join('\n')}}
function hist(id){return data.history.filter(x=>x.productId===id).sort((a,b)=>a.date.localeCompare(b.date))}
function stat(p){const h=hist(p.id),latest=h.at(-1),prev=h.at(-2),delta=prev?latest.price-prev.price:null,pct=prev&&prev.price?delta/prev.price*100:null,max=h.length?Math.max(...h.map(x=>x.price)):null,min=h.length?Math.min(...h.map(x=>x.price)):null,maxRow=h.find(x=>x.price===max),minRow=h.find(x=>x.price===min);return{h,latest,prev,delta,pct,max,min,maxRow,minRow}}
function changeHTML(s){if(s.delta==null)return '<span class="neutral">前日比 —</span>';const cls=s.delta>0?'positive':s.delta<0?'negative':'neutral',sign=s.delta>0?'+':s.delta<0?'-':'';return `<span class="${cls}">${sign}${yen(s.delta)} (${s.pct>0?'+':''}${s.pct.toFixed(2)}%)</span>`}
function render(){const dates=data.history.map(x=>x.date).sort(),last=dates.at(-1);$('#todayDate').textContent=last||'';$('#updated').textContent=data.status?.checkedAt?'最終取得 '+new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(data.status.checkedAt)):'最終更新 '+(last||'—');$('#cards').innerHTML=data.products.map(p=>{const s=stat(p);return `<article class="card" data-product-id="${p.id}" tabindex="0"><h3>${esc(shortName(p.name))}</h3><div class="price">${yen(s.latest?.price)}</div><div class="change">${changeHTML(s)}</div><div class="extremes"><span>最高値<b>${yen(s.max)}</b><small>${s.maxRow?.date||''}</small></span><span>最安値<b>${yen(s.min)}</b><small>${s.minRow?.date||''}</small></span></div><a class="source" href="${esc(p.url)}" target="_blank" rel="noopener">スニダン商品ページ →</a></article>`}).join('');$('#toggles').innerHTML=data.products.map((p,i)=>`<button class="toggle" data-id="${p.id}"><span class="dot" style="background:${['#31e69a','#19a7ff','#ff5263','#ffc857'][i%4]}"></span>${esc(shortName(p.name))}</button>`).join('');$$('.toggle').forEach(b=>b.onclick=()=>{b.classList.toggle('off');draw()});rank();products();historySelect();draw()}
function rank(){const rows=data.products.map(p=>({p,s:stat(p)})).filter(x=>x.s.delta!=null);const make=(arr,positive)=>arr.map((x,i)=>`<div class="rank-row"><span class="rank-num">${i+1}</span><b>${esc(shortName(x.p.name))}</b><span class="rank-value ${positive?'positive':'negative'}">${positive?'+':'-'}${yen(x.s.delta)}</span></div>`).join('')||'<p class="neutral">データ蓄積後に表示されます</p>';$('#upRank').innerHTML=make(rows.filter(x=>x.s.delta>0).sort((a,b)=>b.s.delta-a.s.delta).slice(0,3),true);$('#downRank').innerHTML=make(rows.filter(x=>x.s.delta<0).sort((a,b)=>a.s.delta-b.s.delta).slice(0,3),false)}
function products(){$('#productCount').textContent='全'+data.products.length+'種類';$('#products').innerHTML=data.products.map(p=>`<a class="product-item source" href="${esc(p.url)}" target="_blank" rel="noopener"><b>${esc(shortName(p.name))}</b><small>${yen(stat(p).latest?.price)}</small></a>`).join('')}
function historySelect(){const sel=$('#historyProduct'),v=sel.value;sel.innerHTML=data.products.map(p=>`<option value="${p.id}">${esc(shortName(p.name))}</option>`).join('');if(v&&data.products.some(p=>p.id===v))sel.value=v;sel.onchange=historyTable;historyTable()}
function historyTable(){const p=data.products.find(x=>x.id===$('#historyProduct').value)||data.products[0],h=hist(p.id),max=h.length?Math.max(...h.map(x=>x.price)):null,min=h.length?Math.min(...h.map(x=>x.price)):null;$('#historyRows').innerHTML=[...h].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>{const idx=h.findIndex(z=>z.date===x.date),prev=idx>0?h[idx-1]:null,d=prev?x.price-prev.price:null,pct=prev?d/prev.price*100:null,cls=d>0?'positive':d<0?'negative':'neutral',sign=d>0?'+':d<0?'-':'';return `<tr><td>${x.date}</td><td>${yen(x.price)}</td><td class="${cls}">${d==null?'—':sign+yen(d)}</td><td class="${cls}">${pct==null?'—':(pct>0?'+':'')+pct.toFixed(2)+'%'}</td><td>${yen(max)}</td><td>${yen(min)}</td></tr>`}).join('')}
function draw(){const active=new Set($$('.toggle:not(.off)').map(x=>x.dataset.id)),all=[...new Set(data.history.map(x=>x.date))].sort();let labels=all;if(currentDays&&all.length){const end=new Date(all.at(-1)+'T00:00:00'),cut=new Date(end);cut.setDate(cut.getDate()-(currentDays-1));labels=all.filter(x=>new Date(x+'T00:00:00')>=cut)}const colors=['#31e69a','#19a7ff','#ff5263','#ffc857'];const sets=data.products.filter(p=>active.has(p.id)||!$('#toggles').children.length).map((p,i)=>({label:shortName(p.name),data:labels.map(dt=>data.history.find(x=>x.productId===p.id&&x.date===dt)?.price??null),borderColor:colors[data.products.indexOf(p)%colors.length],backgroundColor:colors[data.products.indexOf(p)%colors.length],tension:.3,spanGaps:true,pointRadius:3}));chart?.destroy();chart=new Chart($('#chart'),{type:'line',data:{labels,datasets:sets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false}},scales:{x:{grid:{color:'#173247'},ticks:{color:'#9db2c1'}},y:{grid:{color:'#173247'},ticks:{color:'#9db2c1',callback:v=>Number(v).toLocaleString()}}}}})}
$$('#ranges button').forEach(b=>b.onclick=()=>{$$('#ranges button').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentDays=+b.dataset.days;draw()});load().catch(e=>{$('#cards').innerHTML='<article class="card">データの読み込みに失敗しました。</article>'});
// iPhone bottom tabs: highlight the section currently in view
(function(){
  const setup=()=>{
    const tabs=[...document.querySelectorAll('.mobile-tabs a[data-tab]')];
    if(!tabs.length)return;
    const sections=tabs.map(t=>document.getElementById(t.dataset.tab)).filter(Boolean);
    const setActive=id=>tabs.forEach(t=>t.classList.toggle('active',t.dataset.tab===id));
    tabs.forEach(t=>t.addEventListener('click',()=>setActive(t.dataset.tab)));
    const update=()=>{
      if(!matchMedia('(max-width:600px)').matches)return;
      const y=window.scrollY+window.innerHeight*.38;
      let current=sections[0]?.id;
      for(const s of sections)if(s.offsetTop<=y)current=s.id;
      setActive(current);
    };
    addEventListener('scroll',update,{passive:true});addEventListener('resize',update);update();
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',setup):setup();
})();

// iPhone: tap a market card to open its chart and price history
let mobileDetailChart;
(function(){
 const isPhone=()=>matchMedia('(max-width:600px)').matches;
 const modal=()=>document.getElementById('mobileProductDetail');
 function openDetail(id){
  if(!isPhone()||!data)return;
  const p=data.products.find(x=>x.id===id); if(!p)return;
  const s=stat(p), h=s.h;
  document.getElementById('mobileDetailName').textContent=shortName(p.name);
  document.getElementById('mobileDetailPrice').textContent=yen(s.latest?.price);
  document.getElementById('mobileDetailChange').innerHTML=changeHTML(s);
  document.getElementById('mobileDetailHistory').innerHTML=[...h].reverse().map((x,i,arr)=>{const original=h.findIndex(z=>z.date===x.date),prev=original>0?h[original-1]:null,d=prev?x.price-prev.price:null,cls=d>0?'positive':d<0?'negative':'neutral',sign=d>0?'+':d<0?'-':'';return '<div class="mobile-history-row"><span>'+x.date+'</span><b>'+yen(x.price)+'</b><span class="'+cls+'">'+(d==null?'—':sign+yen(d))+'</span></div>'}).join('')||'<p class="neutral">履歴はまだありません</p>';
  mobileDetailChart?.destroy();
  mobileDetailChart=new Chart(document.getElementById('mobileDetailChart'),{type:'line',data:{labels:h.map(x=>x.date),datasets:[{data:h.map(x=>x.price),borderColor:'#19a7ff',backgroundColor:'#19a7ff',tension:.3,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'#173247'},ticks:{color:'#9db2c1',maxTicksLimit:5}},y:{grid:{color:'#173247'},ticks:{color:'#9db2c1',callback:v=>Number(v).toLocaleString()}}}}});
  modal().classList.add('open'); modal().setAttribute('aria-hidden','false'); document.body.classList.add('detail-open');
 }
 function close(){modal()?.classList.remove('open');modal()?.setAttribute('aria-hidden','true');document.body.classList.remove('detail-open')}
 document.addEventListener('click',e=>{const card=e.target.closest('#today .card[data-product-id]');if(card&&!e.target.closest('a'))openDetail(card.dataset.productId);if(e.target.id==='mobileDetailClose'||e.target===modal())close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();if((e.key==='Enter'||e.key===' ')&&e.target.matches('#today .card[data-product-id]')){e.preventDefault();openDetail(e.target.dataset.productId)}});
})();
