const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Load .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val;
      }
    }
  });
}

async function applySafeSchema() {
  console.log('========================================================');
  console.log('FASHIONFIND SAFE POSTGRESQL 17 SCHEMA MIGRATION');
  console.log('========================================================\n');

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'fashionfind_db';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;

  const client = new Client({ host, port, user, password: String(password), database });
  await client.connect();
  console.log('✓ Connected to PostgreSQL database: fashionfind_db');

  // 1. Roles Table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.roles (
      id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name varchar(50) UNIQUE NOT NULL
    );
    INSERT INTO public.roles (name) VALUES ('USER'), ('ADMIN')
    ON CONFLICT (name) DO NOTHING;
  `);
  console.log('✓ roles table verified with USER and ADMIN.');

  // 2. Users Table Updates
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(255),
      email varchar(255) UNIQUE NOT NULL,
      password_hash text,
      status varchar(50) NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      last_login_at timestamptz
    );

    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role varchar(50) NOT NULL DEFAULT 'USER';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

    CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
    CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
  `);
  console.log('✓ users table & columns verified.');

  // 3. User Roles Mapping Table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.user_roles (
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      role_id smallint NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
      assigned_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, role_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
  `);
  console.log('✓ user_roles table verified.');

  // 4. Verification & Password Reset Tokens Table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.verification_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      token_hash text NOT NULL,
      token_type varchar(50) NOT NULL, -- 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_verification_tokens_hash ON public.verification_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON public.verification_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_tokens_type ON public.verification_tokens(token_type);
  `);
  console.log('✓ verification_tokens table verified.');

  // 5. App Sessions Table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.app_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      token_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON public.app_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_app_sessions_token_hash ON public.app_sessions(token_hash);
  `);
  console.log('✓ app_sessions table verified.');

  // 6. User Preferences Table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.user_preferences (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      preferred_gender varchar(50),
      preferred_occasion varchar(100),
      preferred_style varchar(100),
      preferred_color varchar(100),
      preferred_budget numeric,
      preferred_items text[] NOT NULL DEFAULT '{}'::text[],
      skin_tone_preference varchar(100),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_user_preferences_user_id UNIQUE (user_id)
    );
  `);
  console.log('✓ user_preferences table verified.');

  // 7. Site Events & Audit Logs
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.audit_logs (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
      actor_email text,
      action varchar(100) NOT NULL,
      resource_type varchar(100),
      resource_id text,
      outcome varchar(50) NOT NULL DEFAULT 'SUCCESS',
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_email text;
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

    CREATE TABLE IF NOT EXISTS public.site_events (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event_type varchar(100) NOT NULL,
      user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
      anonymous_session_id text,
      page_path text,
      product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_site_events_type ON public.site_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_site_events_created_at ON public.site_events(created_at);
  `);
  console.log('✓ audit_logs & site_events tables verified.');

  // 8. Products Table & Compatibility
  await client.query(`
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug varchar(255);
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS title text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "affiliateUrl" text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published boolean DEFAULT true;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fit text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS style text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS neck text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sleeve text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pattern text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS care text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS closure text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS country text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS asin text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rank text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pockets text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS season text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS occasion text;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specs jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "sourceText" text;

    CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
    CREATE INDEX IF NOT EXISTS idx_products_asin ON public.products(asin);
  `);
  console.log('✓ products table columns verified.');

  // 9. Seed Genuine Products
  const initialProducts = [
    {
      slug: 'jack-jones-12290084-mid-blue',
      name: 'Classic Mid Blue Regular Fit Shirt',
      title: 'Classic Mid Blue Regular Fit Shirt',
      brand: 'JACK & JONES',
      category: 'TOP',
      product_type: "Men's Shirts",
      gender: 'MEN',
      price: null,
      image: '/products/jack-jones-mid-blue.png',
      image_url: '/products/jack-jones-mid-blue.png',
      affiliateUrl: 'https://link.amazon/B0cWbrp7g',
      affiliate_url: 'https://link.amazon/B0cWbrp7g',
      description: 'A clean, versatile mid-blue shirt with a classic collared silhouette, long sleeves and a regular fit. A simple everyday layer that works with denim, trousers or smart-casual looks.',
      color: 'Mid Blue',
      fit: 'Regular Fit',
      style: 'Classic',
      neck: 'Collared Neck',
      sleeve: 'Long Sleeve',
      pattern: 'Solid',
      material: '95% Cotton, 5% Cotton - recycled',
      care: 'Machine Wash',
      closure: 'Button',
      country: 'Bangladesh',
      asin: 'B0GX61Z4R9',
      model: '12290084',
      rank: '#14,553 Clothing & Accessories • #642 Men’s Shirts',
      pockets: '1',
      season: 'All-Season',
      occasion: 'Casual',
    },
    {
      slug: 'peter-england-pcsflslbj05093-black',
      name: 'Peter England Cotton Linen Solid Shirt — Black',
      title: 'Peter England Cotton Linen Solid Shirt — Black',
      brand: 'Peter England',
      category: 'TOP',
      product_type: "Men's Shirts",
      gender: 'MEN',
      price: null,
      image: '/products/peter-england-black.png',
      image_url: '/products/peter-england-black.png',
      affiliateUrl: 'https://link.amazon/B0cpTcD9D',
      affiliate_url: 'https://link.amazon/B0cpTcD9D',
      description: 'A lightweight black solid shirt from Peter England with a slim, modern silhouette, collared neckline and long sleeves. Its cotton-linen fabric is designed for easy casual summer styling.',
      color: 'Black',
      fit: 'Slim Fit',
      style: 'Modern',
      neck: 'Collared Neck',
      sleeve: 'Long Sleeve',
      pattern: 'Solid',
      material: '62% Cotton and 38% Linen',
      care: 'Machine Wash',
      closure: 'Button',
      country: 'India',
      asin: 'B0F5QJDPWK',
      model: 'PCSFLSLBJ05093',
      rank: '#2,420 Clothing & Accessories • #138 Men’s Shirts',
      pockets: '1',
      season: 'Summer',
      occasion: 'Casual',
    },
    {
      slug: 'highlander-hlsh008837-white',
      name: 'HIGHLANDER HLSH008837 Solid Mandarin Collar Shirt — White',
      title: 'HIGHLANDER HLSH008837 Solid Mandarin Collar Shirt — White',
      brand: 'HIGHLANDER',
      category: 'TOP',
      product_type: "Men's Shirts",
      gender: 'MEN',
      price: null,
      image: '/products/highlander-white.png',
      image_url: '/products/highlander-white.png',
      affiliateUrl: 'https://link.amazon/B0ghQAHR9',
      affiliate_url: 'https://link.amazon/B0ghQAHR9',
      description: 'A clean white solid shirt from HIGHLANDER featuring a regular fit and a distinctive mandarin collar. The lightweight 100% cotton fabric makes it an easy summer-ready choice.',
      color: 'White',
      fit: 'Regular Fit',
      style: 'HLSH013828',
      neck: 'Mandarin Neck',
      sleeve: 'Short Sleeve',
      pattern: 'Solid',
      material: '100% Cotton',
      care: 'Machine Wash',
      closure: '',
      country: 'India',
      asin: 'B01N44MVFT',
      model: 'HLSH008837',
      rank: '#13,306 Clothing & Accessories • #585 Men’s Shirts',
      pockets: '',
      season: 'Summer',
      occasion: 'Casual',
    },
  ];

  for (const p of initialProducts) {
    const existing = await client.query('SELECT id FROM public.products WHERE slug = $1 OR asin = $2', [p.slug, p.asin]);
    if (existing.rows.length === 0) {
      await client.query(`
        INSERT INTO public.products (
          slug, name, title, brand, category, product_type, gender, description, color,
          fit, style, neck, sleeve, pattern, material, care, closure, country,
          asin, model, rank, pockets, season, occasion, image, image_url,
          "affiliateUrl", affiliate_url, is_active, published
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25,
          $26, $27, $28, true, true
        )
      `, [
        p.slug, p.name, p.title, p.brand, p.category, p.product_type, p.gender, p.description, p.color,
        p.fit, p.style, p.neck, p.sleeve, p.pattern, p.material, p.care, p.closure, p.country,
        p.asin, p.model, p.rank, p.pockets, p.season, p.occasion, p.image, p.image_url,
        p.affiliateUrl, p.affiliate_url
      ]);
      console.log(`✓ Product preserved in PostgreSQL: ${p.name} (${p.affiliateUrl})`);
    } else {
      console.log(`✓ Product already verified in PostgreSQL: ${p.slug}`);
    }
  }

  // 10. Configure Initial Administrator from .env.local
  const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : '';
  const adminPassword = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : '';

  if (adminEmail && adminPassword && adminPassword.length >= 8) {
    console.log(`\nConfiguring administrator account for: ${adminEmail}...`);

    // Get ADMIN role id
    const adminRoleRes = await client.query("SELECT id FROM public.roles WHERE name = 'ADMIN'");
    const adminRoleId = adminRoleRes.rows[0]?.id || 2;

    const userRes = await client.query('SELECT id, email, role FROM public.users WHERE email = $1', [adminEmail]);

    if (userRes.rows.length > 0) {
      const u = userRes.rows[0];
      // Update to ADMIN role
      await client.query("UPDATE public.users SET role = 'ADMIN', status = 'active', email_verified = true, updated_at = now() WHERE id = $1", [u.id]);
      await client.query(`
        INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [u.id, adminRoleId]);
      console.log(`✓ Existing user ${adminEmail} assigned ADMIN role in public.users and public.user_roles.`);
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const userId = crypto.randomUUID();

      await client.query(`
        INSERT INTO public.users (id, name, email, password_hash, status, role, email_verified, email_verified_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'active', 'ADMIN', true, now(), now(), now())
      `, [userId, 'Administrator', adminEmail, passwordHash]);

      await client.query(`
        INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [userId, adminRoleId]);

      console.log(`✓ Initial administrator created securely with bcrypt (12 rounds) and ADMIN role assigned.`);
    }
  }

  await client.end();
  console.log('\n========================================================');
  console.log('✓ SCHEMA MIGRATION & ADMIN CONFIGURATION COMPLETED!');
  console.log('========================================================\n');
}

applySafeSchema().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
