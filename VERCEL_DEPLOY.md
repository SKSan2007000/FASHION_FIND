# Vercel deployment — FashionFind

### 1. Push/deploy
Upload this folder to GitHub or import the ZIP/folder into Vercel.

### 2. Supabase
Create a Supabase project and run `supabase-schema.sql` in SQL Editor.

Create an admin user under Authentication → Users.

### 3. Vercel environment variables
Add:

`NEXT_PUBLIC_SUPABASE_URL`

`NEXT_PUBLIC_SUPABASE_ANON_KEY`

Redeploy after saving the variables.

### 4. Admin
Open `/auth`, sign in with the Supabase admin account, then use `/admin`.

### 5. Add products
Use exactly three inputs:

1. Product image upload
2. Amazon specification upload/paste
3. Amazon Associates affiliate URL

Click **Parse & Publish Product**.

### 6. Public experience
- `/` — FashionFind home and category discovery
- `/product/[id]` — product detail + parsed specifications + Shop on Amazon
- `/style` — Create My Style outfit builder
- `/auth` — admin sign-in
- `/admin` — catalog + traffic dashboard
