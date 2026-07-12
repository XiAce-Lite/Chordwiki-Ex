# Chordwiki-Ex（Chrome / Firefox 拡張）

## なにするもの？

ChordWikiの書き方が気に入らんコード譜に対して、DOMの書き換えとCSSで表示を整えるブラウザ拡張です。

### DOM 処理

- 行頭に前の小節の最後の歌詞があるものを、前の行の最後に持って行きます（例：前の小節の４拍目から歌詞が始まるケース）
- コードの行に、「|（小節線扱い）」がある場合、歌詞の行に移行します。
- テンションコードが()で括られている場合、｛｝に置換します（MNoto Sans 向けの上付きテンション表示）
- コードが長い時に、歌詞の位置が右になるので、少々左に寄せます（トグルでオンオフ）
- コード行内の記号（-, =, ≫, ≧ 等）のフォントサイズ・縦位置を調整します

### 見た目（Stylebot 代替）

拡張のポップアップから **rem** 単位で調整でき、変更は**ページをリロードせず**反映されます。

- **コードの歌詞に対する縦位置**（`span.chord` の `top`）
- **譜面行の行間**（`p.line` の `padding-top`）
- **コメント行の縦位置**（`p.line.comment`）
- **空行の高さ**（譜面内の `<br>` のみ）
- **コメント行**（`p.line.comment strong`）の前景色・背景色・フォントサイズ（rem）
- **キー行**（`p.key`）の前景色・背景色・フォントサイズ（rem）

Stylebot で行っていた広告非表示・譜面まわりの基本スタイルも、拡張 ON 時に適用します。

### フォント

コード表示用に [MNoto Sans (alpha)](https://github.com/ykwe/MNoto-Sans-alpha) の **v2**（`MNotoSans-alpha-ExtraBold-v2.ttf`）を同梱しています。

- ライセンス: [SIL Open Font License 1.1](https://openfontlicense.org/open-font-license-official-text)（拡張内 `fonts/OFL.txt` に全文）
- MNoto 本家: https://github.com/ykwe/MNoto-Sans-alpha

「MNoto Sansフォント対応」トグル OFF 時は `@font-face` を読み込まず、DOM の `()`→`{}` 変換も行いません。

## 例

<table>
  <tr>
    <td align="center">プレーン表示</td>
    <td align="center">適応後の表示</td>
  </tr>
  <tr>
    <td><img src="sample_images/plane.png" alt="プレーン表示" width="400px"></td>
    <td><img src="sample_images/fixed.png" alt="適応後の表示" width="400px"></td>
  </tr>
</table>

## manifest.json（ローカルのみ）

リポジトリには **`manifest.example.json`** を置き、実際の **`manifest.json` は Git に含めません**（`.gitignore`）。公開したくない **Chrome 拡張の `key` などは `manifest.json` にだけ書いてください**。

### 初回セットアップ（クローン後）

1. `manifest.example.json` を `manifest.json` にコピーする。
2. 必要なら `manifest.json` に `key` を追加する（初回ストア審査後）。
3. バージョン自動 bump を使う場合: `git config core.hooksPath .githooks`（リポジトリごとに一度）

### `manifest.example.json` を更新したいとき（Key 以外を Push したい）

ローカルで編集した **`manifest.json` を正とし**、`key` フィールドだけを除いた内容でテンプレを上書きします。

```bash
node scripts/sync-manifest-example.js
```

その後、`manifest.example.json` をコミットしてください。コード変更の pre-commit でも同様に `manifest.example.json` が更新されます。

バージョン番号の**唯一のソースは `manifest.json` の `version`**です。

## バージョン番号（ストア公開）

- Chrome ウェブストアの公開版は **patch 番号だけ上げる**運用を推奨します（例: `1.0.0` → `1.0.1`）。
- 手動 bump: `.\bump-version.ps1` または `node scripts/version-sync.js bump`
- コード（`.js` / `.html` / `.css` / `.json`）をコミットすると、pre-commit で patch が自動 increment され `manifest.example.json` がステージされます。

## Chrome ウェブストア提出用 ZIP

```powershell
.\package-extension.ps1
# または明示的に
.\package-extension.ps1 -Target chrome
```

`dist\Chordwiki-Ex-<version>.zip` が作成されます。ローカルの **`manifest.json`（本物）** が ZIP に入ります。

## Firefox（AMO）提出用 ZIP

```powershell
.\package-extension.ps1 -Target firefox
```

- Zip: `dist\Chordwiki-Ex-<version>-firefox.zip`
- 一時読込用フォルダ: `dist\firefox-unpacked\`（`about:debugging` →「一時的なアドオンを読み込む」でこの中の `manifest.json` を選択）

Firefox 用マニフェストは **`manifest.firefox.json`**（`browser_specific_settings.gecko.id` 付き）。バージョンは `manifest.json` と pre-commit / `version-sync` で同期されます。

### Firefox での動作確認

1. `.\package-extension.ps1 -Target firefox`
2. Firefox で `about:debugging#/runtime/this-firefox`
3. 「一時的なアドオンを読み込む」→ `dist\firefox-unpacked\manifest.json`
4. ChordWiki の曲ページで確認

## 使い方（Chrome）

1. リポジトリをクローンまたは ZIP を展開する
2. 上記のとおり `manifest.json` を用意する
3. Chrome の「パッケージ化されていない拡張機能を読み込む」でこのフォルダを指定する
4. ChordWiki の曲ページを開き、ツールバーの Chordwiki-Ex アイコンから設定する

長いコード時の歌詞位置調整・MNoto 対応の切り替え時は、DOM 加工の都合で**タブのリロード**が必要です。

## その他

このツールを使った事でなんぞ不利益や不具合が発生しても、責任取りません。取れません。各自、ソースコードを調整してください。
