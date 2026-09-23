export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(triggerUpdate(env, "cron"));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, scheduler: "cloudflare", now: new Date().toISOString() });
    }

    if (url.pathname === "/trigger" && request.method === "POST") {
      const supplied = request.headers.get("authorization");
      if (!env.TRIGGER_SECRET || supplied !== `Bearer ${env.TRIGGER_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      return triggerUpdate(env, "manual");
    }

    return new Response("PCG Market Scheduler", { status: 200 });
  }
};

async function triggerUpdate(env, source) {
  if (!env.GITHUB_TOKEN) {
    return new Response("GITHUB_TOKEN is not configured", { status: 500 });
  }

  const endpoint =
    "https://api.github.com/repos/xienum/pcg-market-checker/actions/workflows/daily-price.yml/dispatches";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pcg-market-cloudflare-scheduler"
    },
    body: JSON.stringify({ ref: "main" })
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("GitHub dispatch failed", response.status, body);
    return new Response(`GitHub dispatch failed: ${response.status}`, { status: 502 });
  }

  console.log("Market update dispatched", { source, at: new Date().toISOString() });
  return new Response("Market update dispatched", { status: 202 });
}
