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

      return json({
        ok:true,
        preview:true,
        product:{
          name:null,
          id:match[1],
          releaseDate:null,
          initialPrice:null,
          sourceUrl
        },
        message:'Preview endpoint is ready. Product scraping will be connected next.'
      });
    }

    return json({ok:false,error:'Not Found'},404);
  }
};
