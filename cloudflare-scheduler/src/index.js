export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduler(env, "cron"));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, scheduler: "cloudflare", now: new Date().toISOString() });
    }
    if (url.pathname === "/trigger" && request.method === "POST") {
      const supplied = request.headers.get("authorization");
      if (!env.TRIGGER_SECRET || supplied !== `Bearer ${env.TRIGGER_SECRET}`) {
        await notify(env, "❌ Cloudflare manual trigger rejected", "TRIGGER_SECRET authentication failed.");
        return new Response("Unauthorized", { status: 401 });
      }
      return runScheduler(env, "manual");
    }
    return new Response("PCG Market Scheduler", { status: 200 });
  }
};

async function runScheduler(env, source) {
  const started = new Date().toISOString();
  await notify(env, "🟦 PCG automatic update started", `Source: ${source}\nTime: ${started}\nStage: Cloudflare Cron → GitHub Actions`);

  if (!env.GITHUB_TOKEN) {
    await notify(env, "❌ Update failed: Cloudflare configuration", "GITHUB_TOKEN is not configured. GitHub Actions was not started.");
    return new Response("GITHUB_TOKEN is not configured", { status: 500 });
  }

  const endpoint = "https://api.github.com/repos/xienum/pcg-market-checker/actions/workflows/daily-price.yml/dispatches";
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "pcg-market-cloudflare-scheduler"
      },
      body: JSON.stringify({ ref: "main", inputs: { source } })
    });
  } catch (error) {
    await notify(env, "❌ Update failed: GitHub connection", `Cloudflare could not contact GitHub.\nError: ${safe(error?.message)}`);
    throw error;
  }

  if (!response.ok) {
    const body = await response.text();
    await notify(env, "❌ Update failed: GitHub dispatch", `HTTP ${response.status}\nGitHub Actions was not started.\n${safe(body).slice(0, 900)}`);
    return new Response(`GitHub dispatch failed: ${response.status}`, { status: 502 });
  }

  await notify(env, "✅ Cloudflare dispatch successful", `Source: ${source}\nGitHub accepted Market price update.\nStarted: ${started}`);
  return new Response("Market update dispatched", { status: 202 });
}

async function notify(env, title, description) {
  if (!env.SCHEDULER_DISCORD_WEBHOOK_URL) return;
  try {
    const r = await fetch(env.SCHEDULER_DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "PCG Scheduler Monitor",
        embeds: [{ title, description, timestamp: new Date().toISOString() }]
      })
    });
    if (!r.ok) console.error("Discord notification failed", r.status, await r.text());
  } catch (error) {
    console.error("Discord notification exception", error);
  }
}

function safe(value) {
  return String(value ?? "unknown").replace(/[`*_~|>]/g, "");
}
