# FashionFind 2.0

Premium fashion discovery + Amazon Associates storefront with a three-input admin catalog workflow, Amazon specification parser, Create My Style builder, admin sign-in and traffic dashboard.

## Fast local run

```bash
npm install
npm run dev
```

Without Supabase configured, the project runs in **demo mode**. Admin demo credentials:

- Email: `admin@fashionfind.local`
- Password: `FashionFind@2026`

Demo mode stores products and traffic in the current browser only. It is suitable for UI review, but **not production admin security**.

## Production on Vercel (recommended)

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase-schema.sql`.
3. Create an admin user in Supabase Authentication > Users.
4. Copy `.env.example` to `.env.local` for local development and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Add the same two variables in Vercel Project Settings > Environment Variables.
6. Deploy.

With Supabase enabled:
- Admin sign-in uses Supabase Auth.
- Products are stored in the `products` table.
- Product images are uploaded to the public `products` storage bucket.
- Website visits and affiliate clicks are recorded in `site_events`.
- Admin dashboard reads shared traffic/product counts.

## Daily product workflow

Admin > Add a product:
1. Upload product image.
2. Upload `.txt/.md/.csv` or paste the Amazon specifications.
3. Paste your Amazon Associates affiliate link.
4. Click **Parse & Publish Product**.

The parser turns the Amazon text into a clean description and specification table and auto-categorizes broad product types such as Shoes, Accessories, Women's Fashion and Men's Shirts.

## Amazon Associates

Use only Amazon content and affiliate links in ways permitted by the Associates Operating Agreement and Product Advertising Content rules. The site includes the Associates disclosure wording in the footer. Review Amazon's current requirements before publishing.
