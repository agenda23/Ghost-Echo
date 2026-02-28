# Xリプライ収集・ブラウザ拡張機能 Ghost-Echo 開発手順書

## 1. 開発フェーズ：環境準備と技術スタック

本プロジェクトでは、高速な開発サイクルと型安全性を確保するため、以下のスタックを推奨します。

- **ビルドツール:** Vite (CRXJS Vite Plugin の併用を検討)
- **フレームワーク:** React + TypeScript
- **CSS:** Vanilla CSS
- **ブラウザ API:** Manifest V3

### 権限設定 (`manifest.json`)
- `declarativeNetRequest`: 検知用スクリプトのブロック。
- `storage`: 設定およびセッション情報の保存。
- `offscreen`: 大量データのバックグラウンド処理。

## 2. 核心機能：ステルスキャプチャ

キャプチャプロセスを効率的かつ静かに行うための要件です。

### A. 視認判定に基づいた取得 (Visibility-Based Extraction)
- **実装:** `IntersectionObserver` を使用。
- **目的:** レンダリングされていないDOMへのアクセスを最小限に抑え、ブラウザのパフォーマンスへの影響を減らすとともに、APIのレスポンスの無作為な全取得を防いで自然なページ閲覧と連動させます。

### C. 通信傍受のステルス化 (Stealth Fetch Hooking)
- **注入:** `world: "MAIN"` を指定。
- **偽装:** `Function.prototype.toString` をオーバーライドし、外部からのコード検査を回避します。

## 3. 実装詳細

### Step 1: データのインターセプト
- ターゲット: `https://x.com/i/api/graphql/.../TweetDetail`
- 処理: レスポンス JSON をクローンし、`TimelineAddEntries` 命令からリプライ本文とユーザー情報を抽出。

### Step 2: データ管理 (Data Persistence)
- **chrome.storage.local**: 稼働ステータス、収集済み ID のセット（数千件程度まで）。
- **IndexedDB**: 膨大な収集データ本体（本文、メタデータ）。
- **重複排除**: `rest_id` を主キーとして使用。

### Step 3: 流量制限 (Adaptive Throttling)
- **上限設定:** 1分間に 30〜50件。
- **動的制御:** 取得速度が上がった場合、スクロールを一時停止して「クールダウン」状態へ移行。

### Step 4: データ閲覧と管理 (Data Dashboard)
収集したデータを効率的に活用するため、専用の閲覧画面を設けます。
- **アクセス方法:** ポップアップ内の「ダッシュボードを開く」ボタンから、`index.html`（Dashboard 用）をフルスクリーンで開く。
- **主要機能:**
    - **ページネーション/無限スクロール**: IndexedDB からの効率的なデータ読み込み。
    - **キーワード検索**: `full_text` を対象にした全文検索。
    - **フィルタリング**: 日時範囲、リプライ数、お気に入り数によるソートと絞り込み。
    - **仮想スクロール (Virtual Scroll)**: 数万件のデータ表示でもブラウザが重くならないよう、表示領域外のDOMを再利用。
    - **CSV/JSON エクスポート**: Web Workers を使用してバックグラウンドでエクスポートファイルを生成し、`URL.createObjectURL` でダウンロードを提供。

---

## 5. 堅牢性と保守性 (Robustness & Maintenance)

### A. エラーハンドリングとレジリエンス
- **レートリミット監視**: Xのレスポンスヘッダー（`x-rate-limit-remaining`）を監視し、限界が近い場合は自動で待機モードへ移行。
- **ストレージ制限**: IndexedDB の空き容量を事前にチェックし、不足している場合はユーザーに通知。
- **再試行ロジック**: 一時的なネットワークエラーに対しては、指数バックオフを用いた再試行を実施。

### B. Xの仕様変更への対応 (Maintainability)
- **セレクタの抽象化**: DOMセレクタやAPIパスを定数ファイル（`lib/constants.ts`）に集約。
- **動的定義更新の検討**: 可能であれば、API構造の変更を検知して定義ファイルを動的にパッチする仕組みを検討。

### C. Xのセキュリティポリシー (CSP) への適合
- **インラインスクリプトの回避**: ページへのコード注入は、外部JSファイルを `chrome.runtime.getURL` で読み込む形式を推奨し、CSP違反を回避。

## 6. ディレクトリ構成案

```text
src/
├── manifest.json       # Manifest定義
├── background/         # Service Worker (オフスクリーン管理、API中継)
├── content/            # 特定ページへの注入スクリプト
│   ├── inject.ts       # world: MAIN で注入される Hook スクリプト
│   ├── observer.ts     # IntersectionObserver 管理
│   └── scroller.ts     # 人間模倣スクローラー
├── popup/              # 拡張機能の制御パネル
├── dashboard/          # データ閲覧・管理画面
│   ├── App.tsx         # ダッシュボードメイン
│   └── components/     # 一覧表示、フィルタ、エクスポート
└── lib/                # 共通ロジック
    ├── db.ts           # IndexedDB ラッパー
    └── utils.ts        # ランダム計算などのユーティリティ
```

## 5. 運用上の考慮事項

- **レートリミット対策:** `Rate limit exceeded` 検知時は指数バックオフアルゴリズムで待機。
- **アカウント保護:** 原則として「閲覧専用（ログイン済み・シャドウバンなし）」アカウントでの使用を奨励。