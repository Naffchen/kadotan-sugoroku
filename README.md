# カドタンと協力すごろく — GitHub Pages用

2026年11月24日の最新版です。自立活動の授業で、6人が1つの駒を協力して進めるアプリです。
表示・ゲーム内容は作成済みアプリのままです。配信用にJavaScriptファイルの拡張子と参照を .js にそろえています。
ビルドやパッケージのインストールは不要です。

## 紬への引き継ぎ

このZIPを解凍し、中身のファイルと assets フォルダーをまとめて、公開用リポジトリの直下に配置してください。
ZIPファイルそのものを置くだけではアプリとして表示されません。
index.html と同じ階層に app.js / content.js / game-engine.js / icons.js / sound-effects.js / styles.css を置き、assets フォルダー内の画像2点も含めてください。
.nojekyll も同じ階層に含めてあります。

## GitHub Pages の公開設定

1. 公開先リポジトリに、解凍した中身をコミットします。
2. Settings → Pages を開きます。
3. Source は「Deploy from a branch」を選びます。
4. Branch はファイルを配置したブランチ（例: main）、フォルダーは「/(root)」を選び、保存します。
5. GitHub が表示する公開URLを開き、表示・駒の移動・ポーズ選択・効果音を確認します。

index.html が公開元フォルダーの最上位にあることが必要です。

## この版に含まれる内容

- 10マス、1〜3のサイコロ、全員で1つのカドタンの駒。
- 1マス約1.5秒で移動し、通過するマスと駒が1回ずつ弾みます。
- 今いるマスはカドタンの立体風の駒・太枠・「いま ここ」で表示。
- 「ふたりでポーズ」と「みんなでまねっこ」にオリジナルポーズ。
- 「みんなでまねっこ」は1回目・2回目で別々にポーズを選べます。
- 音声読み上げはなく、移動・活動終了・ゴールの短い効果音を使用。
- 効果音は初期オン。スピーカーボタンで移動中も切り替え可能。
- ゴールで必ず止まってバンザイ。次の人から2周目へ進みます。
- 6回の活動後に、終了または次のゴールまで続ける選択肢。
- はじめから、1て もどる、全画面、マスの内容編集、体操動画URL設定。
- 名前登録や生徒ごとの順番管理はありません。順番は黒板で管理します。

## 設定・途中経過

設定・途中経過は、ブラウザーとサイトURLごとに保存されます。
このZIPには、既存サイトのブラウザーに保存したマスの編集、動画URL、途中経過は含まれていません。
GitHub Pages側は初期状態から始まり、必要な設定はそのURLを開いて設定します。

## 参考：GitHub公式ドキュメント

- 公開元の設定: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- index.html の配置: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
