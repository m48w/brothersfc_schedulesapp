# Brothers FC Schedules App

Brothers FC 向けのスケジュール管理アプリです。Supabase Auth でログインし、管理者画面と選手画面をロール別に切り替えます。

## 主な機能

- メール / パスワードでログイン
- 管理者画面
  - ダッシュボード（次回の練習・試合 / イベント、月別出席率）
  - スケジュール作成 / 編集 / 削除（投票期限・場所種別・場所を必須）
  - 月別の出欠管理
  - 設定画面へのリンク、React Icons のナビゲーション
  - スマホ用の下部ナビゲーション
- 選手画面
  - 次回予定・ライブカウントダウン、月間スケジュール一覧
  - 出欠投票（`vote_deadline` まで更新可）
  - プロフィールの閲覧 / 編集、写真アップロードまたは URL
  - 言語切替（日本語 / 英語）、パスワード変更
- i18n 対応（`react-i18next`、ブラウザ言語検出 + `localStorage`）

## 最近の更新内容

- パスワード同期の信頼性向上: パスワード変更時に `public.user` テーブルへも同期される処理を追加し、RLSポリシー不足による更新漏れを検知・エラー表示するよう改善。
- 出欠投票ボタンのUI改善: 選手画面にて、投票期限超過後はボタンを非表示にし、期間内は現在の回答状況に合わせてボタンの背景スタイル（アクティブ・非アクティブ）を動的に切り替えるよう変更。
- 選手画面のスケジュール一覧のデザインを改善・最適化（コンパクト/詳細ビューの対応、日付フォーマット、モバイル向けレスポンシブなカードレイアウトの適用など）
- 管理者ダッシュボードから時計 / カウントダウン表示を削除
- `schedule` に `vote_deadline` を追加
- `location_master` に `location_type` (`stadium`, `event`) を追加
- `user` に `password`, `created_at`, `updated_at` を追加
- 共通クラブロゴ（`ClubLogo`）は [`src/logo/brothersfc.svg`](src/logo/brothersfc.svg) を Vite でバンドルして表示（読み込み失敗時は `FC` フォールバック）
- 管理者のスケジュール作成で以下を必須化
  - 投票期限
  - 場所分類
  - 場所
- 選手の出欠投票期限を `schedule.start_time` ではなく `schedule.vote_deadline` 基準に変更
- サンプル SQL / [`src/sql/sample/master.json`](src/sql/sample/master.json) / memo / README を更新

## 技術スタック

- React 18
- TypeScript
- React Router 7
- Supabase（`@supabase/supabase-js`）
- Vite 5
- react-icons
- i18next / react-i18next

## セットアップ

### 1. 依存関係

```bash
npm install
```

### 2. 環境変数

`.env` を作成して以下を設定してください。

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Supabase の設定

新規プロジェクトの場合は、まず [`src/sql/table/table.sql`](src/sql/table/table.sql) を実行してください。

サンプルデータを入れる場合は [`src/sql/sample/sample.sql`](src/sql/sample/sample.sql) を実行してください。マスタ系の参照用 JSON は [`src/sql/sample/master.json`](src/sql/sample/master.json) です。

既存プロジェクトを更新する場合は [`src/sql/memo.txt`](src/sql/memo.txt) の手順を先に確認してください。

### 4. クラブロゴ

ヘッダーのロゴは [`src/components/ClubLogo.tsx`](src/components/ClubLogo.tsx) が [`src/logo/brothersfc.svg`](src/logo/brothersfc.svg) を参照します。差し替える場合は同パスの SVG を置き換えるか、コンポーネントの import を変更してください。画像の読み込みに失敗した場合は `FC` のフォールバックが表示されます。

## 現在のテーブル構成

- `public.user`
  - `id`, `full_name`, `role`, `player_id`, `password`, `is_active_player`, `created_at`, `updated_at`
- `public.location_master`
  - `facility_name`, `location_type`, `address`, `map_url`, `is_active`, `created_at`, `updated_at`
- `public.category_master`
  - `training`, `match`, `event` の分類
- `public.player_profile`
  - 選手プロフィール
- `public.schedule`
  - `schedule_date`, `start_time`, `end_time`, `vote_deadline`, `category_id`, `location_id`, `description`
- `public.attendance`
  - 選手ごとの出欠

## Supabase でやること

既存の Supabase を使っている場合は、以下の対応が必要です。

1. `public.user` に `password`, `created_at`, `updated_at` を追加。同時に **パスワード更新用（UPDATE）の RLS ポリシー (`using(auth.uid()=id)` など) も追加**。
2. `public.location_master` に `location_type` を追加して全既存行に値を入れる
3. `public.schedule` に `vote_deadline` を追加
4. `public.schedule.location_id` に NULL が残らないように更新
5. その後、必要なら `location_id` を `NOT NULL` に変更
6. `src/sql/sample/sample.sql` を参考にマスターデータを見直す

## ローカル起動

```bash
npm run dev
```

通常は `http://localhost:5173` で確認できます。

## ビルド

```bash
npm run build
npm run preview
```

`build` は TypeScript のプロジェクト参照ビルド（`tsc -b`）のあと Vite で本番バンドルを生成します。
