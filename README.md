# starsavior-wiki
スターセイヴァーの個人wiki

## 構成

- `wiki/` — Markdownで書かれたwiki本体（このフォルダごとObsidian等のvaultに取り出せる）
  - `wiki/index.md` — 全キャラ／全アルカナへの目次
  - `wiki/キャラクター/` — キャラごとの1ページ（レアリティ・属性・クラス・スキル説明・立ち絵）
  - `wiki/アルカナ/` — アルカナごとの1ページ（所持キャラ・レアリティ・メインステータス・救援者効果・救援の旅データ）
  - `wiki/tier/` — キャラ／アルカナのTier表（5属性別）
  - `wiki/images/` — 立ち絵・アイコン等の画像（ページ内の相対リンクで参照）
- `data/characters.json` / `data/arcanas.json` — 構造化データ（プログラムから利用可）
- `scrape.mjs` — データ取得ツール（ローカル専用・git管理外）
- `build_tier.mjs` — tierページ生成（ローカルJSONのみ使用・オフライン）
- `verify.mjs` — 成果物の整合性チェック
- `render_test.mjs` — Markdown→ブラウザ描画の通しテスト

## 使い方

```bash
npm install            # playwright / marked
node scrape.mjs        # 全件取得（済みslugはスキップ＝中断再開可）
node scrape.mjs --force   # 全件やり直し
node scrape.mjs --limit 2 # まず2件だけ試す
node build_tier.mjs    # tierページ生成（tierデータ更新時）
node build_site.mjs    # 公開用HTMLサイト生成（site/）
node verify.mjs        # 整合性チェック
node render_test.mjs   # 描画テスト（md + site）
```

## GitHub Pages

- pushすると `.github/workflows/pages.yml` が `site/` をビルドして自動デプロイします
 （初回のみ Repo Settings → Pages → Source を「GitHub Actions」に設定）
- 公開URL: `https://yasu7op.github.io/starsavior-wiki/`
- ローカル確認: `node build_site.mjs` のあと `site/index.html` をブラウザで開く

## 注意事項

- 作業したら `docs/作業記録.md` に作業メモを必ず残すこと（詳細ルールは `AGENTS.md`）。
- 画像・データの著作権は © Studio B-Side に帰属します（個人利用の範囲で）。
- `scrape.mjs` と `docs/` は `.gitignore` 済みで、リポジトリには含まれません。
