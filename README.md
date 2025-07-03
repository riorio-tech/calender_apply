This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## MVP構成（スケジュール調整AIアプリ）

### ステップ1: UIセットアップ
- Next.js + TypeScript + Tailwind CSS + ShadCN UIの導入
- 最小限のトップページ、日程候補表示UI

### ステップ2: Googleカレンダー連携（OAuth認証）
- Google APIの認証フロー実装（認証情報は環境変数で管理）
- 自分のカレンダーから空き時間を取得

### ステップ3: 日程候補の自動抽出
- 1週間/1ヶ月/3ヶ月内で空いている日程候補を3つ表示

### ステップ4: 複数人スケジュール調整
- 他の人のメールアドレスを追加し、複数のGoogleカレンダーから共通の空き時間を抽出
- 候補日を提示

### ステップ5: UI改善・体験向上
- 候補日選択・確定UI
- エラーハンドリング、ローディング表示

---

## 環境変数
- Google APIクライアントID、クライアントシークレットなどの機密情報は`.env`で管理
