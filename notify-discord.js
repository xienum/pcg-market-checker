import fs from 'node:fs';

const DATA_FILE = new URL('./data.json', import.meta.url);
const LOG_FILE = new URL('./market-update.log', import.meta.url);

export function buildDiscordMessage(data, env = process.env) {
  const products = Array.isArray(data?.products) ? data.products : [];
  const history = Array.isArray(data?.history) ? data.history : [];
  const failures = Array.isArray(data?.status?.failures) ? data.status.failures : [];
  const checkedAt = data?.status?.checkedAt ? new Date(data.status.checkedAt) : new Date();
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(checkedAt);
  const jst = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
  }).format(checkedAt);
  const today = new Map(history.filter(h => h.date === date).map(h => [String(h.productId), h.price]));
  const failureMap = new Map(failures.map(f => [String(f.productId), f.message || 'Unknown error']));

  const stages = [
    ['価格取得', env.STEP_SCRAPE],
    ['data.json保存', env.STEP_SAVE],
    ['Pages設定', env.STEP_CONFIGURE_PAGES],
    ['Pagesアップロード', env.STEP_UPLOAD_PAGES],
    ['Pages公開', env.STEP_DEPLOYMENT],
  ];
  const badStages = stages.filter(([,v]) => v && !['success','skipped'].includes(v));
  const ok = data?.status?.ok === true && failures.length === 0 && badStages.length === 0;

  const priceLines = products.map(p => {
    const id = String(p.id);
    if (failureMap.has(id)) return `❌ ${p.name}: 取得失敗 — ${failureMap.get(id)}`;
    if (!today.has(id)) return `⚠️ ${p.name}: 当日データなし`;
    return `✅ ${p.name}: ¥${Number(today.get(id)).toLocaleString('ja-JP')}`;
  });

  const stageLines = stages.map(([name,v]) => {
    if (!v) return `⚪ ${name}: UNKNOWN`;
    if (v === 'success') return `✅ ${name}: SUCCESS`;
    if (v === 'skipped') return `⚪ ${name}: SKIPPED`;
    return `❌ ${name}: ${String(v).toUpperCase()}`;
  });

  const header = ok ? '🟢 PCG Market Checker | SUCCESS' : '🔴 PCG Market Checker | ERROR';
  const counts = `取得: ${data?.status?.successCount ?? '?'}/${data?.status?.totalCount ?? products.length}`;
  const failureLines = failures.length
    ? ['','【失敗詳細】', ...failures.map(f => {
        const p = products.find(x => String(x.id) === String(f.productId));
        return `❌ ${p?.name || f.productId} (${f.productId}): ${f.message || 'Unknown error'}`;
      })]
    : ['','失敗商品: なし'];

  const lines = [
    header,
    `JST: ${jst}`,
    `Run #${env.GITHUB_RUN_ID || '-'} / ${counts}`,
    '',
    '【商品価格】',
    ...priceLines,
    '',
    '【処理状態】',
    ...stageLines,
    ...failureLines,
  ];
  let message = lines.join('\n');
  if (message.length > 1900) message = message.slice(0, 1850) + '\n…詳細は添付ログを確認してください。';
  return message;
}

async function main() {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) throw new Error('DISCORD_WEBHOOK_URL is not configured');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  let content = buildDiscordMessage(data);
  if (fs.existsSync(LOG_FILE)) {
    const rawLog = fs.readFileSync(LOG_FILE, 'utf8').trim();
    if (rawLog) {
      const room = Math.max(0, 1900 - content.length - 24);
      if (room > 80) content += `\n\n【ログ本文】\n\`\`\`\n${rawLog.slice(-room)}\n\`\`\``;
    }
  }
  if (!content.trim()) throw new Error('Discord message body is empty');

  const form = new FormData();
  form.append('payload_json', JSON.stringify({ content }));
  if (fs.existsSync(LOG_FILE)) {
    form.append('files[0]', new Blob([fs.readFileSync(LOG_FILE)], {type:'text/plain'}), 'market-update.log');
  }
  let lastError;
  for (let attempt=1; attempt<=3; attempt++) {
    try {
      const r = await fetch(webhook, { method:'POST', body:form });
      const body = await r.text();
      if (!r.ok) throw new Error(`Discord HTTP ${r.status}: ${body.slice(0,300)}`);
      console.log(`Discord notification delivered (attempt ${attempt}, HTTP ${r.status}, chars ${content.length})`);
      return;
    } catch (e) {
      lastError=e;
      console.error(`Discord attempt ${attempt}/3 failed: ${e.message}`);
      if (attempt<3) await new Promise(r=>setTimeout(r, attempt*2000));
    }
  }
  throw lastError;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(e => { console.error(e); process.exit(1); });
}
