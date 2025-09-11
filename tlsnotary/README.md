# TLSNotary メモ

```bash
tlsnotary/
├─ app.tsx ← デモ本体（React UI + 証明生成/検証ロジック）
├─ worker.ts ← tlsn-js API を Web Worker 経由で公開するブリッジ
├─ webpack.js ← 開発ビルド設定 (TS -> JS, HTML 生成, wasm 資産コピー/提供)
├─ package.json ← 依存管理・起動スクリプト
├─ tsconfig.json ← TypeScript 設定
```
