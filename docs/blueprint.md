# ごみ捨て特化型PWAアプリ 設計図 (Blueprint)

## 1. プロジェクト概要

ユーザーが自治体の複雑なゴミ収集日をカレンダー形式で管理し、個別回収（粗大ごみ・不用品）の予定も一括管理できるPWAアプリ。

## 2. コア機能

- **マンスリーカレンダー**: 当月・前月・次月の切り替え、今日ハイライト、収集アイコン表示。
- **ゴミ収集ルール設定**:
  - 周期タイプ: `weekly` (毎週), `nth_weekday` (第n曜日)。
  - 詳細設定: 有効/無効トグル、詳細設定フォームの開閉（アコーディオンUI）。
- **個別回収管理**:
  - 「粗大ごみ」「不用品回収」の2つのサブタブ。
  - 日付、品目、金額/個数、回収時間の登録・削除。
- **場所の管理**: 「自宅」「実家」など複数拠点のデータを切り替えて保持。
- **システム設定**:
  - ダークモード、全データ初期化、JSON形式でのデータ書き出し/読み込み。

## 3. データ構造 (JSON Schema)

`localStorage` の `trash_app_data` キーに以下の構造で保存する。

```json
{
  "settings": {
    "currentLocationId": "string",
    "darkMode": "boolean"
  },
  "locations": {
    "location_id": {
      "id": "string",
      "name": "string",
      "trashRules": [
        {
          "id": "string",
          "name": "string",
          "color": "hex_code",
          "active": "boolean",
          "cycleType": "weekly | nth_weekday",
          "weeklyDays": [1, 2, 3, 4, 5, 6, 7], // 1:月...7:日
          "nthWeek": "string", // "第1", "第2・4" など
          "nthWeekday": "number"
        }
      ],
      "specialCollections": {
        "bulkWaste": [
          { "id": "string", "date": "string", "item": "string", "amount": "number", "count": "number" }
        ],
        "reusable": [
          { "id": "string", "date": "string", "item": "string", "time": "string" }
        ]
      }
    }
  }
}

## 4. 実装の重要ルール

### 4.1 UI/UX 仕様
- **画面遷移の仕組み**:
    - ページ遷移は行わず、`nav-item` の `data-screen` 属性と、各セクション（`.screen`）の `.active` クラスの付け外しによって画面を切り替える疑似シングルページアプリケーション（SPA）構成とする。
- **アコーディオン（開閉）UI**:
    - ルール設定画面のカード詳細は、初期状態を `.hidden` クラスで非表示にする。
    - `expand_btn` をクリックした際、詳細エリアの `.hidden` をトグル（付け外し）し、連動してアイコンのテキスト（Material Icons）を `expand_more`（閉じている時）から `expand_less`（開いている時）へ書き換える。
- **カレンダー上のアイコン表現**:
    - 通常のゴミ収集は色付きの丸（`.trash-icon`）で表示。
    - 粗大ごみは背景色 `#8e79ff` に「粗」の文字を表示。
    - 不用品回収は背景色 `#e67e22` に「回」の文字を表示し、角丸を少し強くする（`.special-reusable`）。

### 4.2 計算・判定ロジック
- **カレンダーの月曜開始**:
    - JavaScriptの `Date.getDay()` は 0(日)〜6(土) を返すが、これを月曜開始（月=1...日=7）に補正して描画オフセットを算出する。
- **ゴミ収集日の判定ロジック**:
    - **毎週（weekly）**: `weeklyDays` 配列に対象日の曜日番号が含まれているか判定。
    - **第n曜日（nth_weekday）**:
        1. 対象日が設定された曜日番号と一致するか判定。
        2. `Math.ceil(day / 7)` で「その月の第何週目か」を算出し、設定値（`nthWeek`）と合致するか判定。
        ※「第2・4」などの複数指定にも文字列分割・パースにより対応すること。

### 4.3 スタイル設計 (CSS)
- **非表示制御の優先順位**:
    - JavaScriptによる開閉制御を確実に反映させるため、`.hidden { display: none !important; }` を定義し、他のスタイル指定よりも優先させる。
- **ダークモード対応**:
    - `body.dark-mode` クラスが付与された際、背景色・カード背景・文字色・入力フォームの色が適切に反転するように変数を定義、または個別に指定する。
- **レスポンシブデザイン**:
    - モバイルでの操作を前提とし、ボタンサイズや入力エリアの余白は指でタップしやすいサイズ（最小 44px 四方以上）を意識する。
```
