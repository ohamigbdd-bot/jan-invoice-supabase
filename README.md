
# JAN 支払・売上一体型ツール — Supabase 版

> 旧 IndexedDB 版を **Supabase(Postgres+Auth)** に移行。複数担当・複数端末でリアルタイム共有できます。GitHub Pages 等の静的ホスティングでOK。

## デモ構成
```
jan-invoice-supabase/
├─ index.html                # Max: 認証, チームキー, 旧Excel取込, 検索/エクスポート
├─ pages/
│  ├─ payment.html          # 支払い番号×JAN 登録/削除/エクスポート
│  └─ salesDB.html          # 売上 登録/削除/エクスポート/インポート
├─ assets/
│  ├─ css/style.css
│  └─ js/supa.js            # Supabase API, Excel I/O ヘルパー
└─ sql/schema.sql           # DB作成 & RLS ポリシー（Supabase SQL エディタで実行）
```

## セットアップ（15分）
1. **Supabase プロジェクト作成** → `Project URL` と `anon public key` を控える。  
2. Supabase プロジェクトの **Authentication → Providers** で **GitHub** を有効化（必要に応じてEmail/MagicLinkでも可）。  
3. Supabase の **SQL Editor** で `sql/schema.sql` を実行（テーブル作成＋RLS有効化）。  
4. `assets/js/supa.js` の冒頭にある `SUPABASE_URL` と `SUPABASE_ANON_KEY` をご自身の値に置き換え。  
5. リポジトリを GitHub に push → **Settings → Pages** で公開。  
6. 公開URLへアクセスし、右上の **GitHubでログイン** → **チームキー** を入力・保存（社内共通キー）。

> **注意**：Anon Key はクライアント公開前提の「Public Key」です。**RLS** で保護されます。より厳格な組織分離が必要なら、
> 別途 `teams` テーブル＋メンバーシップ管理＆RLSの強化（チームに属するユーザーのみ CRUD 可）をご提案します。

## データ移行（旧Excel）
- `index.html` 右上の **データ取込** から、`payment_jan_export.xlsx` / `sales_data_export.xlsx` をそのまま投入可能。

## 使い方
- 日々の登録：`pages/payment.html` と `pages/salesDB.html`  
- 検索・集計：`index.html` で支払い番号→JAN→売上番号合算を表示  
- バックアップ：各ページの「Excel エクスポート」

## 追加カスタム案
- **厳格RLS**：`teams` テーブル＋ `user_teams` による所属管理、JWT カスタムクレームで `team_id` を注入して完全分離
- トランザクション（重複JAN/売上番号のバリデーション）
- 監査ログ（row level 監査拡張）
- Realtime サブスクリプションでリスト自動更新
