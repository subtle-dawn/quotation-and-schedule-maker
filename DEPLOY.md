# GitHub Pagesへの公開

GitHub Actionsでテストと本番ビルドを実行し、`dist/`だけをGitHub Pagesへ公開します。APIサーバー・DB・個別のアクセストークンは不要です。

## 初回設定

1. GitHubでリポジトリを作成し、このプロジェクトのソースをpushします。
2. **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に変更します。
3. **Actions → Deploy to GitHub Pages → Run workflow** でデフォルトブランチを選択し、実行します。
4. 成功後、`deploy`ジョブまたは **Settings → Pages** に公開URLが表示されます。

以後はデフォルトブランチへのpushで自動更新します。ブランチ名は自動判定するため、`main`以外でも変更不要です。通常のプロジェクトのURLは `https://ユーザー名.github.io/リポジトリ名/` です。

### このフォルダーから初めてGitへ登録する場合

このフォルダーはまだGitリポジトリとして初期化されていません。GitHub側に空のリポジトリを作成し、URLを自分のリポジトリに置き換えて実行します。

```powershell
git init -b main
git add .
git commit -m "Prepare app for GitHub Pages"
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

既存のGitリポジトリを利用する場合は、初期化やリモート追加を重ねず、通常のコミット・push手順を使ってください。

## 登録するファイル

- `.github/workflows/deploy-pages.yml`：自動テスト・ビルド・Pages公開
- `.nvmrc`：Node.js 24を指定
- `package.json` / `package-lock.json`
- `index.html` / `vite.config.js` / `src/`（PDF用日本語フォントを含む）
- `tests/`
- `public/.nojekyll` / `public/OFL.txt`（静的配信用マーカーとフォントライセンス）

`.gitignore`で除外している `node_modules/`、`dist/`、`tmp/` は登録不要です。`dist/`はGitHub Actions内で生成します。見積Excelやブラウザーの保存データは公開用ファイルに含みません。

## URL・ビルド設定

Viteの `base: './'` を維持しています。JavaScript・CSS・PDF用フォントをHTML内に同梱しているため、リポジトリ名を含むURLでも動作する構成です。公開前にローカルで確認する場合：

```powershell
npm ci
npm test
npm run build
```

生成された `dist/index.html` を開いて確認できます。サーバーを起動する必要はありません。

## 保存済み計画の移行

ローカルHTMLとGitHub Pagesではブラウザーの保存領域が異なります。ローカル版で **書き出す → 計画のバックアップ（.json）** を保存し、公開版の **見積を取り込む** からJSONを読み込んでください。公開後も計算・計画の保存は利用者のブラウザー内で行います。

## 失敗した場合

- Pagesが未設定：**Settings → Pages → Source → GitHub Actions** を確認。
- ワークフローがスキップ：デフォルトブランチで実行するか、そのブランチへpush。
- Actionsが許可されていない：リポジトリのActions設定で、ワークフローと利用するGitHub公式Actionsの許可を確認。
- ビルド・テスト失敗：Actionsログの該当ステップとローカルの実行結果を確認。

公式ドキュメント：[カスタムワークフローによるGitHub Pages公開](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
