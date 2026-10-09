import { pgQuery, isPgConfigured } from './pg';
import { initialProducts, Product } from '../data';

export const MIGRATION_SQL = `
-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  title text NOT NULL,
  brand text,
  category text,
  gender text DEFAULT 'MEN',
  price text DEFAULT 'See latest price on Amazon',
  price_num numeric,
  image text,
  "affiliateUrl" text,
  description text,
  color text,
  fit text,
  style text,
  neck text,
  sleeve text,
  pattern text,
  material text,
  care text,
  closure text,
  country text,
  asin text,
  model text,
  rank text,
  pockets text,
  season text,
  occasion text,
  specs jsonb DEFAULT '[]'::jsonb,
  "sourceText" text,
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(published);
CREATE INDEX IF NOT EXISTS idx_products_gender ON public.products(gender);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_asin ON public.products(asin);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'USER',
  account_status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 3. USER STYLING PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  gender text,
  occasion text,
  style_direction text,
  preferred_color text,
  budget text,
  skin_tone text,
  preferences jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_user_preferences UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- 4. SITE EVENTS & ANALYTICS
CREATE TABLE IF NOT EXISTS public.site_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL,
  product_id text,
  session_id text,
  user_id text,
  path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_events_type ON public.site_events(event_type);
CREATE INDEX IF NOT EXISTS idx_site_events_created_at ON public.site_events(created_at);
CREATE INDEX IF NOT EXISTS idx_site_events_product_id ON public.site_events(product_id);

-- 5. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text,
  actor_email text,
  action text NOT NULL,
  target_resource text,
  outcome text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
`;

/**
 * Executes database migrations and seeds initial products safely.
 */
export async function runMigrations(): Promise<{ success: boolean; message: string; seededCount: number }> {
  if (!isPgConfigured()) {
    return { success: false, message: 'PostgreSQL connection not configured.', seededCount: 0 };
  }

  try {
    // 1. Run Table Creation & Indexes
    await pgQuery(MIGRATION_SQL);

    // 2. Seed & Preserve Genuine Initial Products
    let seededCount = 0;
    for (const p of initialProducts) {
      const insertSql = `
        INSERT INTO public.products (
          id, title, brand, category, gender, price, image, "affiliateUrl",
          description, color, fit, style, neck, sleeve, pattern, material,
          care, closure, country, asin, model, rank, pockets, season,
          occasion, specs, published
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24,
          $25, $26, true
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          brand = EXCLUDED.brand,
          category = EXCLUDED.category,
          gender = EXCLUDED.gender,
          price = EXCLUDED.price,
          image = EXCLUDED.image,
          "affiliateUrl" = EXCLUDED."affiliateUrl",
          description = EXCLUDED.description,
          specs = EXCLUDED.specs,
          updated_at = now();
      `;

      const params = [
        p.id,
        p.title,
        p.brand,
        p.category,
        p.gender || 'MEN',
        p.price,
        p.image,
        p.affiliateUrl,
        p.description,
        p.color,
        p.fit,
        p.style,
        p.neck,
        p.sleeve,
        p.pattern,
        p.material,
        p.care,
        p.closure,
        p.country,
        p.asin,
        p.model,
        p.rank,
        p.pockets,
        p.season,
        p.occasion,
        JSON.stringify(p.specs || []),
      ];

      await pgQuery(insertSql, params);
      seededCount++;
    }

    return {
      success: true,
      message: 'PostgreSQL 17 schema migrations and product preservation completed successfully.',
      seededCount,
    };
  } catch (err: any) {
    console.error('Migration error:', err);
    return { success: false, message: `Migration failed: ${err.message}`, seededCount: 0 };
  }
}
