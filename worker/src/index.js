const corsHeaders={
  'Access-Control-Allow-Origin':'https://xienum.github.io',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type',
  'Content-Type':'application/json; charset=utf-8'
};

const json=(body,status=200)=>new Response(JSON.stringify(body,null,2),{status,headers:corsHeaders});

export default {
  async fetch(request) {
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:corsHeaders});
    const url=new URL(request.url);

    if(url.pathname==='/' || url.pathname==='/health'){
      return json({
        ok:true,
        service:'pcg-admin-api',
        mode:'preview',
        githubWrite:false,
        message:'PCG Admin API is running'
      });
    }

    if(url.pathname==='/api/product/preview' && request.method==='POST'){
      let body;
      try{ body=await request.json(); }
      catch{ return json({ok:false,error:'Invalid JSON body'},400); }

      const sourceUrl=String(body?.url||'').trim();
      const match=sourceUrl.match(/^https:\/\/(?:www\.)?snkrdunk\.com\/apparels\/(\d+)(?:[/?#].*)?$/i);
      if(!match) return json({ok:false,error:'Invalid Snkrdunk product URL'},400);

      const productId=match[1];
      try{
        const upstream=await fetch(sourceUrl,{headers:{
          'User-Agent':'Mozilla/5.0 (compatible; PCGMarketChecker/2.0)',
          'Accept-Language':'ja-JP,ja;q=0.9,en;q=0.7'
        }});
        if(!upstream.ok) throw new Error('Snkrdunk HTTP '+upstream.status);
        const html=await upstream.text();
        const decode=s=>String(s||'').replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
        const strip=s=>decode(String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));
        const text=strip(html);
        let name=null;
        const h1=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if(h1) name=strip(h1[1])||null;
        if(!name){
          const title=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if(title) name=strip(title[1]).replace(/通販[\s\S]*$/,'').trim()||null;
        }
        let price=null;
        let pm=text.match(/1個\([^)]*\)\s*¥\s*([\d,]+)\s*~/);
        if(!pm) pm=text.match(/購入手数料\s*¥[\d,]+\s*¥\s*([\d,]+)\s*~/);
        if(pm) price=Number(pm[1].replace(/,/g,''));
        let releaseDate=null;
        const dm=text.match(/発売日\s*(20\d{2})年(\d{1,2})月(\d{1,2})日/);
        if(dm) releaseDate=dm[1]+'-'+dm[2].padStart(2,'0')+'-'+dm[3].padStart(2,'0');
        return json({
          ok:true,
          preview:true,
          product:{name,id:productId,releaseDate,initialPrice:price,sourceUrl},
          fields:{name:!!name,id:true,releaseDate:!!releaseDate,initialPrice:Number.isFinite(price)}
        });
      }catch(error){
        return json({ok:false,error:'商品情報の取得に失敗しました',detail:String(error?.message||error),productId},502);
      }
    }

    if(url.pathname==='/api/category/26' && request.method==='GET'){
      try{
        const page=Number(url.searchParams.get('page')||1);
        if(!Number.isSafeInteger(page)||page<1||page>1000) return json({ok:false,error:'Invalid page'},400);
        const categoryUrl='https://snkrdunk.com/search?searchCategoryIds=6%2F26&page='+page;
        const upstream=await fetch(categoryUrl,{headers:{
          'User-Agent':'Mozilla/5.0 (compatible; PCGMarketChecker/2.0)',
          'Accept-Language':'ja-JP,ja;q=0.9,en;q=0.7'
        }});
        if(!upstream.ok) throw new Error('Snkrdunk HTTP '+upstream.status);
        const html=await upstream.text();
        const ids=[...html.matchAll(/<a\b[^>]*href=["'](?:https?:\/\/snkrdunk\.com)?\/apparels\/(\d+)[^"']*["'][^>]*>/gi)].map(m=>m[1]);
        const unique=[...new Set(ids)];
        if(!unique.length) throw new Error('No product IDs found in category HTML');
        const nextPage=new RegExp('href=["\'][^"\']*search\\?[^"\']*page='+(page+1)+'(?:[&"\'])','i').test(html) ? page+1 : null;
        return json({
          ok:true,
          categoryId:'26',
          categoryUrl,
          count:unique.length,
          products:unique.map(id=>({id,url:'https://snkrdunk.com/apparels/'+id})),
          page,nextPage,complete:nextPage===null,
          note:'Product IDs from one search result page. Request nextPage until null.'
        });
      }catch(error){
        return json({ok:false,error:'カテゴリ情報の取得に失敗しました',detail:String(error?.message||error)},502);
      }
    }

    return json({ok:false,error:'Not Found'},404);
  }
};
