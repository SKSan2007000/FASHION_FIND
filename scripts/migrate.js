const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Load .env.local if present
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

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL;

let host = process.env.DB_HOST || '127.0.0.1';
if (host === 'localhost') host = '127.0.0.1';
const port = parseInt(process.env.DB_PORT || '5432', 10);
const database = process.env.DB_NAME || 'fashionfind_db';
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;

async function migrate() {
  console.log('========================================================');
  console.log('FASHIONFIND POSTGRESQL MIGRATION & CONNECTION CHECK');
  console.log('========================================================\n');

  let targetClient;

  if (connectionString) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    console.log('Connecting using hosted connection string (DATABASE_URL)...');
    targetClient = new Client({
      connectionString,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
    await targetClient.connect();
    console.log('✓ Connected to hosted PostgreSQL database.');
  } else {
    console.log(`Connecting to host: ${host}:${port} as user "${user}"...`);

    // Step A: Connect to default postgres DB to verify server and ensure fashionfind_db exists
    let rootClient = new Client({ host, port, user, password: password || '', database: 'postgres' });
    try {
      await rootClient.connect();
      console.log('✓ Connected to PostgreSQL server.');

      const checkDb = await rootClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
      if (checkDb.rows.length === 0) {
        console.log(`Creating database "${database}"...`);
        await rootClient.query(`CREATE DATABASE ${database}`);
        console.log(`✓ Database "${database}" created.`);
      } else {
        console.log(`✓ Database "${database}" verified existing.`);
      }
      await rootClient.end();
    } catch (err) {
      console.warn(`Note on root DB connection: ${err.message}`);
    }

    targetClient = new Client({ host, port, user, password: password || '', database });
    await targetClient.connect();
    console.log(`✓ Connected directly to target database "${database}".`);
  }

    console.log('\nApplying schema migrations...');

    // 1. Products Table
    await targetClient.query(`
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
    `);
    console.log('✓ products table & indexes verified.');

    // 2. Users Table
    await targetClient.query(`
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
    `);
    console.log('✓ users table & indexes verified.');

    // 3. User Preferences Table
    await targetClient.query(`
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
    `);
    console.log('✓ user_preferences table & constraints verified.');

    // 4. Site Events Table
    await targetClient.query(`
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
    `);
    console.log('✓ site_events table & analytics indexes verified.');

    // 5. Audit Logs Table
    await targetClient.query(`
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
    `);
    console.log('✓ audit_logs table & security indexes verified.');

    // 6. Seed & Preserve Genuine Initial Products
    console.log('\nPreserving and seeding genuine catalog products...');
    const initialProducts = [
      {
        id: 'jack-jones-12290084-mid-blue',
        title: 'Classic Mid Blue Regular Fit Shirt',
        brand: 'JACK & JONES',
        category: "Men's Shirts",
        gender: 'MEN',
        price: 'See latest price on Amazon',
        image: '/products/jack-jones-mid-blue.png',
        affiliateUrl: 'https://link.amazon/B0cWbrp7g',
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
        published: true,
      },
      {
        id: 'peter-england-pcsflslbj05093-black',
        title: 'Peter England Cotton Linen Solid Shirt — Black',
        brand: 'Peter England',
        category: "Men's Shirts",
        gender: 'MEN',
        price: 'See latest price on Amazon',
        image: '/products/peter-england-black.png',
        affiliateUrl: 'https://link.amazon/B0cpTcD9D',
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
        published: true,
      },
      {
        id: 'highlander-hlsh008837-white',
        title: 'HIGHLANDER HLSH008837 Solid Mandarin Collar Shirt — White',
        brand: 'HIGHLANDER',
        category: "Men's Shirts",
        gender: 'MEN',
        price: 'See latest price on Amazon',
        image: '/products/highlander-white.png',
        affiliateUrl: 'https://link.amazon/B0ghQAHR9',
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
        published: true,
      },
    ];

    for (const p of initialProducts) {
      await targetClient.query(`
        INSERT INTO public.products (
          id, title, brand, category, gender, price, image, "affiliateUrl",
          description, color, fit, style, neck, sleeve, pattern, material,
          care, closure, country, asin, model, rank, pockets, season, occasion, published
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          brand = EXCLUDED.brand,
          category = EXCLUDED.category,
          gender = EXCLUDED.gender,
          price = EXCLUDED.price,
          image = EXCLUDED.image,
          "affiliateUrl" = EXCLUDED."affiliateUrl",
          description = EXCLUDED.description,
          updated_at = now();
      `, [
        p.id, p.title, p.brand, p.category, p.gender, p.price, p.image, p.affiliateUrl,
        p.description, p.color, p.fit, p.style, p.neck, p.sleeve, p.pattern, p.material,
        p.care, p.closure, p.country, p.asin, p.model, p.rank, p.pockets, p.season, p.occasion, p.published
      ]);
      console.log(`✓ Product preserved with exact affiliate URL: ${p.id} (${p.affiliateUrl})`);
    }

    // Check count
    const countRes = await targetClient.query('SELECT COUNT(*)::int as count FROM public.products');
    console.log(`\n✓ Total products in database: ${countRes.rows[0].count}`);

    await targetClient.end();
    console.log('\n========================================================');
    console.log('✓ POSTGRESQL 17 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('========================================================\n');
    return true;
  } catch (err) {
    console.error(`\n✗ PostgreSQL Error: ${err.message}`);
    await targetClient.end().catch(() => {});
    return false;
  }
}

migrate().then((ok) => {
  process.exit(ok ? 0 : 1);
});
