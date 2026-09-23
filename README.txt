PCG相場チェッカー v2（毎日11:00 JST 自動取得対応）

【自動取得】
.github/workflows/daily-price.yml が毎日 11:00（日本時間）に起動します。
GitHub Actions の cron は UTC のため 02:00 UTC に設定しています。
取得結果は data.json に日付ごとに保存されます。
PCを起動しておく必要はありません。

【最初の1回だけ必要な設定】
1. GitHubで新しいリポジトリを作成します。
2. このフォルダ内のファイルをすべてアップロードします（.github フォルダも含む）。
3. リポジトリの Settings → Pages を開きます。
4. Build and deployment の Source を「Deploy from a branch」にします。
5. Branch を main / (root) にして Save します。
6. Actions タブで「Daily price update」を開くと、Run workflow から手動テストもできます。

【注意】
GitHub Actions の schedule は混雑状況により11:00ちょうどから数分以上遅れる場合があります。
スニダン側のHTML構造やアクセス制限が変わると、取得処理の修正が必要になる場合があります。
サイトの利用規約・アクセス方針に従って利用してください。

【ローカル版】
server.js 側も毎日11:00 JSTに変更済みです。ただしローカル版の自動取得にはPCとNode.jsの常時起動が必要です。
