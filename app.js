let chart;
const $=s=>document.querySelector(s);
const yen=n=>n==null?'取得待ち':'¥'+Number(n).toLocaleString('ja-JP');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function load(){
  try{
    const r=await fetch('./data.json?ts='+Date.now());
    if(!r.ok) throw new Error('data.json '+r.status);
    render(await r.json());
  }catch(e){
    $('#cards').innerHTML='<div class="card">データの読み込みに失敗しました。<br><small>'+esc(e.message)+'</small></div>';
  }
}

function stats(history){
  if(!history.length)return {};
  const sorted=[...history].sort((a,b)=>a.date.localeCompare(b.date));
  const latest=sorted.at(-1), prev=sorted.at(-2);
  const delta=prev?latest.price-prev.price:null;
  const pct=prev&&prev.price?delta/prev.price*100:null;
  return {latest,prev,delta,pct,min:Math.min(...sorted.map(x=>x.price)),max:Math.max(...sorted.map(x=>x.price))};
}

function render(d){
  $('#cards').innerHTML=d.products.map(p=>{
    const h=d.history.filter(x=>x.productId===p.id),s=stats(h);
    const delta=s.delta==null?'前日比 —':`前日比 ${s.delta>=0?'+':''}${yen(s.delta)} (${s.pct>=0?'+':''}${s.pct.toFixed(1)}%)`;
    return `<article class="card"><h3>${esc(p.name)}</h3><div class="price">${yen(s.latest?.price)}</div><div class="delta">${delta}</div><div class="stats">最高 ${yen(s.max)} ／ 最安 ${yen(s.min)}</div><a class="source" href="${esc(p.url)}" target="_blank" rel="noopener">スニダン商品ページ</a></article>`;
  }).join('');

  $('#products').innerHTML=d.products.map(p=>`<div class="product-row"><div><b>${esc(p.name)}</b><small>${esc(p.url)}</small></div></div>`).join('');
  const dates=d.history.map(x=>x.date).sort();
  $('#updated').textContent=dates.length?`最終価格データ: ${dates.at(-1)} / 毎日11:00 JST自動更新`:'価格データなし';
  draw(d);
}

function draw(d){
  const days=+$('#range').value;
  const allDates=[...new Set(d.history.map(x=>x.date))].sort();
  let labels=allDates;
  if(days&&allDates.length){
    const end=new Date(allDates.at(-1)+'T00:00:00');
    const cutoff=new Date(end); cutoff.setDate(cutoff.getDate()-(days-1));
    labels=allDates.filter(x=>new Date(x+'T00:00:00')>=cutoff);
  }
  const datasets=d.products.map(p=>({
    label:p.name,
    data:labels.map(dt=>d.history.find(x=>x.productId===p.id&&x.date===dt)?.price??null),
    tension:.25,spanGaps:true
  }));
  chart?.destroy();
  chart=new Chart($('#chart'),{type:'line',data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:v=>'¥'+Number(v).toLocaleString('ja-JP')}}}}});
}
$('#range').onchange=load;
$('#refresh').onclick=()=>load();
load();
