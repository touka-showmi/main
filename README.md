# GitHub Pages プログラムランチャー（PWA対応）

アップロードされたランチャーをベースに、表示設定をJSONへ分離し、軽量なPWAオフラインキャッシュに対応させた構成です。

## ファイル構成

- `index.html` — ランチャー本体。検索、カテゴリ別表示、最近開いた項目、PWA登録を担当します。
- `program-index.json` — 各カードのタイトル、色、アイコン、説明、分類、順序などを管理します。
- `manifest.webmanifest` — ホーム画面追加・アプリ表示用の設定です。
- `service-worker.js` — ランチャーの必要ファイルを事前保存し、開いたHTMLを自動キャッシュします。
- `offline.html` — 未保存のページへオフラインでアクセスしたときの案内です。
- `icons/` — PWAアイコンです。

## カードをカスタマイズする

`program-index.json` の `programs` 配列に、リポジトリ内のHTMLを登録してください。`order` は小さいほど先に表示されます。同じ `category` のカードはグループ化されます。

```json
{
  "version": 1,
  "settings": {
    "title": "マイ・プログラム",
    "subtitle": "自分用のHTMLツール一覧",
    "showPath": true
  },
  "programs": [
    {
      "file": "tools/calendar.html",
      "title": "カレンダー",
      "description": "予定を確認します。",
      "color": "#7c5cff",
      "textColor": "#ffffff",
      "icon": "📅",
      "category": "日常ツール",
      "order": 10
    },
    {
      "file": "games/puzzle.html",
      "title": "パズル",
      "description": "短時間で遊べるパズルです。",
      "color": "#1fa6a0",
      "textColor": "#ffffff",
      "icon": "🧩",
      "category": "ゲーム",
      "order": 20,
      "thumbnail": "images/puzzle-cover.jpg"
    }
  ]
}
```

- `file` は `index.html` と同じリポジトリ内からの相対パスです。`..` や絶対URLは使わないでください。
- `title` はカードの題名、`color` はアクセント色、`textColor` は題名の色、`icon` は絵文字などのアイコンです。
- `thumbnail` は任意項目です。指定すると、その相対パスの画像をサムネイル枠に表示します。省略すれば `icon` を表示します。
- `category` は分類名、`order` は表示順（昇順）です。
- `description` は説明文です。
- `showPath` を `false` にするとカード内のファイルパスを非表示にできます。

JSONではコメントや末尾の余分なカンマは使えません。変更後、GitHubへコミットしてPagesの更新を待ってください。

## GitHub Pagesへの配置

1. このフォルダー内のファイルと `icons` フォルダーを、GitHub Pagesで公開しているリポジトリのルートへアップロードします。
2. **既存のHTMLプログラムはそのまま残して**、ランチャーを `index.html` として配置します。既存の `index.html` がプログラム本体の場合は、別名にするか、内容を退避してから置き換えてください。
3. `program-index.json` に公開したいHTMLを登録します。配列が空の場合は、`github.io` のURLならGitHub APIからHTMLファイルを軽量に自動列挙します。カスタムドメインでは手動登録が必要です。
4. GitHubリポジトリの **Settings → Pages** で公開設定を確認し、HTTPSのPages URLでランチャーを一度開きます。
5. オフラインで使いたいHTMLをオンライン状態で一度開きます。次からは保存された最後のバージョンが表示されます。

## オフライン動作と制約

- PWAとService WorkerはHTTPS（GitHub Pagesの通常URLは対応）またはlocalhostで動作します。`file://` から直接開いた場合は利用できません。
- ランチャーのアプリシェルと設定JSONはインストール時に事前保存され、HTMLページはアクセス時に保存されます。オンラインで再アクセスすると、そのページのキャッシュは最新内容に更新されます。
- HTMLだけで完結するページはオフラインでも動作しやすいですが、外部API・外部スクリプト・外部フォント・サーバー通信に依存する機能は、その依存先がオフライン対応でなければ完全には動きません。
- ブラウザーやOSがストレージを消去した場合、保存済みページも失われることがあります。初回アクセスはオンラインで行ってください。
- 大量のHTMLを起動前から一括保存する設計ではありません。アクセス済みページのみキャッシュするため、通信量と処理負荷を抑えます。

## 実装上のポイント

- 一覧設定が存在する通常時は、HTML各ファイルを個別取得せず、JSONひとつで表示するため軽量です。
- GitHub APIによる自動列挙は `program-index.json` の `programs` が空、または設定ファイルが利用できないときだけに行います。自動列挙時は題名をファイル名から作り、HTMLごとの取得はしません。
- Service WorkerはHTMLナビゲーションに「ネット優先＋失敗時キャッシュ」、その他の同一オリジン資産に「キャッシュ優先＋バックグラウンド更新」を使用します。
