# Cloudflare scheduler

GitHub Actions の schedule は使用しません。Cloudflare Workers Cron Triggers が1時間ごとに GitHub の Market price update を workflow_dispatch で起動します。

## Required secrets

Cloudflare Worker に次の Secret を設定してください。

- `GITHUB_TOKEN`: GitHub fine-grained personal access token。対象リポジトリを `xienum/pcg-market-checker` のみにし、Actions: Read and write を許可。
- `TRIGGER_SECRET`: 任意の十分長いランダム文字列。手動 /trigger 用。Cron 実行には不要ですが設定推奨。

Secret はリポジトリへ保存しないでください。

## Deploy

Cloudflare Workers のプロジェクトとしてこの `cloudflare-scheduler` ディレクトリをデプロイします。
Cron は UTC で `37 * * * *`、毎時37分に起動します。

`GET /health` で Worker の稼働確認ができます。
`POST /trigger` は Authorization: Bearer <TRIGGER_SECRET> が必要です。

GitHub 側の `.github/workflows/daily-price.yml` は workflow_dispatch 専用です。
