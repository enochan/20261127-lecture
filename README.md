# 20261127-lecture

2026年11月27日「福祉事業所のAI導入と活用セミナー」のワークで使う、参加者向けのページです。ワークで使う文章をボタン1つでコピーでき、事業所メモのファイルをダウンロードできます。

GitHub Pages で公開しています。ビルドは不要で、HTML と CSS と少しの JavaScript だけで動きます。

## ページの構成

- `index.html` はじめに。使い方3つと、2つのワークへの入口、うまくいかないときの案内
- `mail.html` ワーク1。取引先へのお願いメール。11のステップ（コピーして貼る6、確かめる5）。ステップは1つずつ表示し、「次のステップへ」で進む
- `memo.html` ワーク2。事業所メモ（md ファイル）。3つのステップと、時間が余った人への案内
- `files/` ダウンロード用のファイル。事業所メモ（.md と .txt）と、「1文は20字まで」を足した版。参加者はメモ帳に貼らず、ダウンロードして使う
- `assets/` 見た目（`style.css`）、コピーのボタン（`script.js`）、フォント（`fonts/`）

## フォント

Noto Sans JP（可変フォント）を `assets/fonts/` に置いて使っています。配布元は [Fontsource](https://fontsource.org/fonts/noto-sans-jp) の `@fontsource-variable/noto-sans-jp`（5.3.1）で、ライセンスは SIL Open Font License 1.1 です（`assets/fonts/OFL-LICENSE.txt`）。

## 内容の方針

- 入れるのはダミーだけ。実在の人、事業所、診断、記録は載せない
- 文章は、講師の資料（スライド）の文面とそろえる。変えるときは両方を直す
- 入力欄は置かない。ページから外へ送るものはない（解析ツールも使わない）
- 検索に出さない（`noindex`）。参加者に URL を配る前提

## 手元で見る

```
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開きます。

## 直すとき

- 文を直したら、`mail.html` や `memo.html` の本文と、`files/` のファイルが食い違わないようにする。特に `memo.html` の「ファイルの中身」は、`files/jigyosho-memo.md` と同じ文にする
- CSS や JavaScript を直したら、HTML の `?v=` の番号を上げる（古い版が残らないようにするため）

詳しい設計は [docs/design.md](docs/design.md) にあります。
