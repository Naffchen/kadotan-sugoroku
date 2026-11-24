# カドタンと協力すごろく — BGM入り・GitHub Pages用

2026年11月24日・Carefree（Kevin MacLeod）のBGMを組み込んだ版です。
自立活動の授業で、6人が1つの駒を協力して進めるアプリです。
ビルドやパッケージのインストールは不要です。

## 今のGitHub Pagesを更新する

このZIPを解凍し、中身のファイルと assets・licenses フォルダーをまとめて、公開用リポジトリの直下に配置してください。
ZIPファイルそのものを置くだけではアプリとして表示されません。
index.html と同じ階層に app.js / background-music.js / content.js / game-engine.js / icons.js / sound-effects.js / styles.css を置いてください。
assets フォルダーには、画像2点に加えて Carefree.mp3 が必要です。
licenses/Carefree-attribution.txt も一緒に公開してください。
.nojekyll も同じ階層に含めてあります。

1. 既存の kadotan-sugoroku リポジトリを開きます。
2. ZIPの中身を、今の index.html と同じ場所にアップロードします。同名のファイルをこの版で更新し、background-music.js・assets/Carefree.mp3・licenses/Carefree-attribution.txt も含めます。
3. 変更をコミットし、GitHub Pagesの更新完了後に https://naffchen.github.io/kadotan-sugoroku/ を開きます。
4. 「BGM 再生」を押して曲が流れることを確認します。
5. 古い画面が残る場合は、Windowsでは Ctrl + F5 で再読み込みします。

同じリポジトリ・同じ公開先を更新するため、PowerPointに設定したアプリのURLはそのまま使えます。
新しいリポジトリを作ったり、Pagesの公開設定を変更したりする必要はありません。

以前のBGM版をすでにアップロードしている場合、古い assets/Steady_Bounce.mp3 はこの版では使いません。GitHub上にも残さない運用にしてください。

## BGMの使い方

- 右上の「BGM 再生」を押すと、Carefree が繰り返し流れます。
- 「BGM 停止」で一時停止し、再生するとその位置から続きます。
- 活動の画面の右上にも同じボタンがあり、友達の発言や先生の説明の前に止められます。
- 初期音量は15%。「先生の設定」→「BGM」で調整し、「変更を保存」で記憶します。
- 音量を試して設定を閉じた場合、保存前の音量に戻ります。
- 効果音のスピーカーボタンとBGMボタンは独立しています。
- 途中のゴールや2周目では、BGMは流れ続けます。
- 「おしまい」または「はじめから」で停止し、次の再生は曲の最初から始まります。
- 別のタブへ切り替えたりページを離れたりすると一時停止します。戻ったら再生ボタンを押してください。
- ページを開いただけでは音楽は流れません。授業を始めるときに先生が再生ボタンを押します。
- 読み込みや再生に失敗しても、すごろく自体はそのまま使えます。

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
今と同じURLを同じブラウザーで開く場合、保存済みのマスの編集、動画URL、途中経過を引き継ぎます。
ブラウザーの保存データを消した場合や、別のブラウザー・別のURLを使った場合は初期状態になります。
このZIPそのものには、生徒の名前やブラウザーに保存した授業の途中経過は含まれていません。

## 参考：GitHub公式ドキュメント

- 公開元の設定: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- index.html の配置: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## 音楽のクレジットとライセンス

"Carefree" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
https://creativecommons.org/licenses/by/4.0/

配布元: https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1400037

音源ファイルは未編集です。アプリで音量調整・くり返し再生をしています。
「先生の設定」→「BGM」にも同じクレジットを表示しています。
詳しい表記は licenses/Carefree-attribution.txt にあります。
この音楽のライセンスは、アプリ本体や学校キャラクターのライセンスを定めるものではありません。

## PowerPointと一緒に使う

すごろくのリンクを開いたら、アプリの「BGM 再生」を押します。
授業用PowerPointのすごろくページでは音楽を流さず、アプリから再生します。
片付けの「Daily Battle」はPowerPointに残しています。
PowerPointに戻る前にアプリの「BGM 停止」または「ここで おしまい」を押すと、切り替えが確実です。
