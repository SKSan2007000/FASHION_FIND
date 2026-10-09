import { initialProducts, Product, User, UserPreferences, SiteEvent, AuditLog } from '../data';
import { supabase } from './supabase';
import { pgQuery, isPgConfigured } from './pg';
import crypto from 'crypto';

// In-memory fallback store for local development/testing or when DB credentials aren't set
const localStore = {
  products: new Map<string, Product>(initialProducts.map((p) => [p.id, { ...p, published: true }])),
  users: new Map<string, User>(),
  userPasswords: new Map<string, string>(), // email -> password_hash
  preferences: new Map<string, UserPreferences>(), // userId -> preferences
  events: [] as SiteEvent[],
  auditLogs: [] as AuditLog[],
};

/**
 * Helper to map DB row to Product object
 */
function rowToProduct(row: any): Product {
  let specs = row.specs;
  if (typeof specs === 'string') {
    try {
      specs = JSON.parse(specs);
    } catch {
      specs = [];
    }
  }

  return {
    id: row.id,
    title: row.title,
    brand: row.brand,
    category: row.category,
    gender: row.gender,
    price: row.price || 'See latest price on Amazon',
    price_num: row.price_num !== null ? Number(row.price_num) : undefined,
    image: row.image,
    affiliateUrl: row.affiliateUrl || row.affiliateurl || '',
    description: row.description || '',
    color: row.color || '',
    fit: row.fit || '',
    style: row.style || '',
    neck: row.neck || '',
    sleeve: row.sleeve || '',
    pattern: row.pattern || '',
    material: row.material || '',
    care: row.care || '',
    closure: row.closure || '',
    country: row.country || '',
    asin: row.asin || '',
    model: row.model || '',
    rank: row.rank || '',
    pockets: row.pockets || '',
    season: row.season || '',
    occasion: row.occasion || '',
    specs: Array.isArray(specs) ? specs : [],
    sourceText: row.sourceText || row.sourcetext || '',
    published: row.published !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * ====================================================================
 * PRODUCTS DATA ACCESS
 * ====================================================================
 */

export async function getProducts(options?: {
  publishedOnly?: boolean;
  gender?: string;
  category?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<Product[]> {
  const publishedOnly = options?.publishedOnly ?? true;

  // 1. Try Direct PostgreSQL 17
  if (isPgConfigured()) {
    try {
      let sql = `SELECT * FROM public.products WHERE 1=1`;
      const params: any[] = [];
      let idx = 1;

      if (publishedOnly) {
        sql += ` AND published = true`;
      }
      if (options?.gender && options.gender !== 'ALL') {
        sql += ` AND (gender = $${idx} OR gender = 'UNISEX' OR gender IS NULL)`;
        params.push(options.gender);
        idx++;
      }
      if (options?.category && options.category !== 'All') {
        sql += ` AND category ILIKE $${idx}`;
        params.push(`%${options.category}%`);
        idx++;
      }
      if (options?.query) {
        sql += ` AND (title ILIKE $${idx} OR brand ILIKE $${idx} OR description ILIKE $${idx} OR color ILIKE $${idx} OR asin ILIKE $${idx})`;
        params.push(`%${options.query}%`);
        idx++;
      }

      sql += ` ORDER BY created_at DESC`;

      if (options?.limit) {
        sql += ` LIMIT $${idx}`;
        params.push(options.limit);
        idx++;
      }
      if (options?.offset) {
        sql += ` OFFSET $${idx}`;
        params.push(options.offset);
        idx++;
      }

      const res = await pgQuery(sql, params);
      if (res.rows.length > 0) {
        return res.rows.map(rowToProduct);
      }
    } catch (e) {
      console.error('PostgreSQL getProducts error, falling back:', e);
    }
  }

  // 2. Try Supabase Client
  if (supabase) {
    try {
      let q = supabase.from('products').select('*').order('created_at', { ascending: false });

      if (publishedOnly) {
        q = q.eq('published', true);
      }
      if (options?.gender && options.gender !== 'ALL') {
        q = q.or(`gender.eq.${options.gender},gender.eq.UNISEX,gender.is.null`);
      }
      if (options?.category && options.category !== 'All') {
        q = q.ilike('category', `%${options.category}%`);
      }

      const { data, error } = await q;
      if (!error && data && data.length > 0) {
        let results = (data as any[]).map(rowToProduct);

        if (options?.query) {
          const s = options.query.toLowerCase().trim();
          results = results.filter(
            (p) =>
              p.title.toLowerCase().includes(s) ||
              p.brand?.toLowerCase().includes(s) ||
              p.description?.toLowerCase().includes(s) ||
              p.color?.toLowerCase().includes(s) ||
              p.category?.toLowerCase().includes(s)
          );
        }

        return results;
      }
    } catch (e) {
      console.error('Supabase getProducts error, falling back to initial data:', e);
    }
  }

  // 3. Fallback / In-Memory Store
  let items = Array.from(localStore.products.values());

  if (publishedOnly) {
    items = items.filter((p) => p.published !== false);
  }
  if (options?.gender && options.gender !== 'ALL') {
    items = items.filter((p) => !p.gender || p.gender === options.gender || p.gender === 'UNISEX');
  }
  if (options?.category && options.category !== 'All') {
    items = items.filter((p) => p.category.toLowerCase().includes(options.category!.toLowerCase()));
  }
  if (options?.query) {
    const s = options.query.toLowerCase().trim();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.brand?.toLowerCase().includes(s) ||
        p.description?.toLowerCase().includes(s) ||
        p.color?.toLowerCase().includes(s) ||
        p.category?.toLowerCase().includes(s)
    );
  }

  return items;
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!id) return null;

  if (isPgConfigured()) {
    try {
      const res = await pgQuery(`SELECT * FROM public.products WHERE id = $1`, [id]);
      if (res.rows.length > 0) {
        return rowToProduct(res.rows[0]);
      }
    } catch (e) {
      console.error('PostgreSQL getProductById error:', e);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return rowToProduct(data);
      }
    } catch (e) {
      console.error('Supabase getProductById error:', e);
    }
  }

  return localStore.products.get(id) || null;
}

export async function saveProduct(product: Product): Promise<Product> {
  const row: Product = {
    ...product,
    updated_at: new Date().toISOString(),
    created_at: product.created_at || new Date().toISOString(),
  };

  if (isPgConfigured()) {
    try {
      const sql = `
        INSERT INTO public.products (
          id, title, brand, category, gender, price, image, "affiliateUrl",
          description, color, fit, style, neck, sleeve, pattern, material,
          care, closure, country, asin, model, rank, pockets, season,
          occasion, specs, published, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24,
          $25, $26, $27, $28, $29
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
          color = EXCLUDED.color,
          fit = EXCLUDED.fit,
          style = EXCLUDED.style,
          neck = EXCLUDED.neck,
          sleeve = EXCLUDED.sleeve,
          pattern = EXCLUDED.pattern,
          material = EXCLUDED.material,
          care = EXCLUDED.care,
          closure = EXCLUDED.closure,
          country = EXCLUDED.country,
          asin = EXCLUDED.asin,
          model = EXCLUDED.model,
          rank = EXCLUDED.rank,
          pockets = EXCLUDED.pockets,
          season = EXCLUDED.season,
          occasion = EXCLUDED.occasion,
          specs = EXCLUDED.specs,
          published = EXCLUDED.published,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `;

      const params = [
        row.id,
        row.title,
        row.brand,
        row.category,
        row.gender || 'MEN',
        row.price,
        row.image,
        row.affiliateUrl,
        row.description,
        row.color,
        row.fit,
        row.style,
        row.neck,
        row.sleeve,
        row.pattern,
        row.material,
        row.care,
        row.closure,
        row.country,
        row.asin,
        row.model,
        row.rank,
        row.pockets,
        row.season,
        row.occasion,
        JSON.stringify(row.specs || []),
        row.published !== false,
        row.created_at,
        row.updated_at,
      ];

      const res = await pgQuery(sql, params);
      if (res.rows.length > 0) {
        const saved = rowToProduct(res.rows[0]);
        localStore.products.set(saved.id, saved);
        return saved;
      }
    } catch (e) {
      console.error('PostgreSQL saveProduct error:', e);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').upsert(row).select().single();
      if (!error && data) {
        const saved = rowToProduct(data);
        localStore.products.set(product.id, saved);
        return saved;
      }
    } catch (e) {
      console.error('Supabase saveProduct exception:', e);
    }
  }

  localStore.products.set(product.id, row);
  return row;
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (isPgConfigured()) {
    try {
      await pgQuery(`DELETE FROM public.products WHERE id = $1`, [id]);
    } catch (e) {
      console.error('PostgreSQL deleteProduct error:', e);
    }
  }

  if (supabase) {
    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (e) {
      console.error('Supabase deleteProduct exception:', e);
    }
  }

  return localStore.products.delete(id);
}

/**
 * ====================================================================
 * USERS & RBAC DATA ACCESS
 * ====================================================================
 */

export async function findUserByEmail(email: string): Promise<{ user: User; passwordHash: string } | null> {
  const normalized = email.toLowerCase().trim();

  if (isPgConfigured()) {
    try {
      const sql = `
        SELECT 
          u.id, u.name, u.email, u.password_hash,
          COALESCE(u.status, 'active') as status,
          u.email_verified, u.email_verified_at,
          u.created_at, u.updated_at, u.last_login_at,
          COALESCE(r.name, u.role, 'USER') as effective_role
        FROM public.users u
        LEFT JOIN public.user_roles ur ON u.id = ur.user_id
        LEFT JOIN public.roles r ON ur.role_id = r.id
        WHERE LOWER(u.email) = LOWER($1)
        LIMIT 1;
      `;
      const res = await pgQuery(sql, [normalized]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          user: {
            id: r.id,
            email: r.email,
            name: r.name,
            role: (r.effective_role || 'USER') as 'USER' | 'ADMIN',
            account_status: r.status || 'active',
            email_verified: Boolean(r.email_verified),
            email_verified_at: r.email_verified_at ? new Date(r.email_verified_at).toISOString() : undefined,
            last_login_at: r.last_login_at ? new Date(r.last_login_at).toISOString() : undefined,
            created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
            updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
          },
          passwordHash: r.password_hash,
        };
      }
    } catch (e) {
      console.error('PostgreSQL findUserByEmail error:', e);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalized)
        .maybeSingle();

      if (!error && data) {
        return {
          user: {
            id: data.id,
            email: data.email,
            name: data.name,
            role: (data.role || 'USER') as 'USER' | 'ADMIN',
            account_status: data.status || data.account_status || 'active',
            email_verified: Boolean(data.email_verified),
            email_verified_at: data.email_verified_at,
            last_login_at: data.last_login_at,
            created_at: data.created_at,
            updated_at: data.updated_at,
          },
          passwordHash: data.password_hash,
        };
      }
    } catch (e) {
      console.error('Supabase findUserByEmail error:', e);
    }
  }

  const user = localStore.users.get(normalized);
  const passwordHash = localStore.userPasswords.get(normalized);
  if (user && passwordHash) {
    return { user, passwordHash };
  }

  return null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (!id) return null;

  if (isPgConfigured()) {
    try {
      const sql = `
        SELECT 
          u.id, u.name, u.email,
          COALESCE(u.status, 'active') as status,
          u.email_verified, u.email_verified_at,
          u.created_at, u.updated_at, u.last_login_at,
          COALESCE(r.name, u.role, 'USER') as effective_role
        FROM public.users u
        LEFT JOIN public.user_roles ur ON u.id = ur.user_id
        LEFT JOIN public.roles r ON ur.role_id = r.id
        WHERE u.id = $1
        LIMIT 1;
      `;
      const res = await pgQuery(sql, [id]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          email: r.email,
          name: r.name,
          role: (r.effective_role || 'USER') as 'USER' | 'ADMIN',
          account_status: r.status || 'active',
          email_verified: Boolean(r.email_verified),
          email_verified_at: r.email_verified_at ? new Date(r.email_verified_at).toISOString() : undefined,
          last_login_at: r.last_login_at ? new Date(r.last_login_at).toISOString() : undefined,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
          updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        };
      }
    } catch (e) {
      console.error('PostgreSQL findUserById error:', e);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          role: (data.role || 'USER') as 'USER' | 'ADMIN',
          account_status: data.status || data.account_status || 'active',
          email_verified: Boolean(data.email_verified),
          email_verified_at: data.email_verified_at,
          last_login_at: data.last_login_at,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch (e) {
      console.error('Supabase findUserById error:', e);
    }
  }

  for (const user of localStore.users.values()) {
    if (user.id === id) return user;
  }

  return null;
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  name?: string;
  role?: 'USER' | 'ADMIN';
}): Promise<User> {
  const normalized = params.email.toLowerCase().trim();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const assignedRole = params.role || 'USER';

  const user: User = {
    id,
    email: normalized,
    name: params.name || null,
    role: assignedRole,
    account_status: 'active',
    email_verified: false,
    created_at: now,
    updated_at: now,
  };

  if (isPgConfigured()) {
    try {
      // 1. Insert user
      const sqlUser = `
        INSERT INTO public.users (id, email, password_hash, name, role, status, email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'active', false, $6, $7)
        RETURNING *;
      `;
      const res = await pgQuery(sqlUser, [
        id,
        normalized,
        params.passwordHash,
        params.name || null,
        assignedRole,
        now,
        now,
      ]);

      // 2. Map role in user_roles table
      const roleRow = await pgQuery(`SELECT id FROM public.roles WHERE name = $1`, [assignedRole]);
      const roleId = roleRow.rows[0]?.id || (assignedRole === 'ADMIN' ? 2 : 1);
      await pgQuery(`INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, roleId]);

      if (res.rows.length > 0) {
        localStore.users.set(normalized, user);
        localStore.userPasswords.set(normalized, params.passwordHash);
        return user;
      }
    } catch (e) {
      console.error('PostgreSQL createUser error:', e);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id,
          email: normalized,
          password_hash: params.passwordHash,
          name: params.name || null,
          role: assignedRole,
          status: 'active',
          email_verified: false,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        localStore.users.set(normalized, user);
        localStore.userPasswords.set(normalized, params.passwordHash);
        return user;
      }
    } catch (e) {
      console.error('Supabase createUser exception:', e);
    }
  }

  localStore.users.set(normalized, user);
  localStore.userPasswords.set(normalized, params.passwordHash);
  return user;
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
  const now = new Date().toISOString();

  if (isPgConfigured()) {
    try {
      await pgQuery(`UPDATE public.users SET password_hash = $1, updated_at = $2 WHERE id = $3`, [
        passwordHash,
        now,
        userId,
      ]);
      return true;
    } catch (e) {
      console.error('PostgreSQL updateUserPassword error:', e);
    }
  }

  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash, updated_at: now })
        .eq('id', userId);
      if (!error) return true;
    } catch (e) {
      console.error('Supabase updateUserPassword error:', e);
    }
  }

  for (const [email, u] of localStore.users.entries()) {
    if (u.id === userId) {
      localStore.userPasswords.set(email, passwordHash);
      return true;
    }
  }

  return true;
}

export async function verifyUserEmail(userId: string): Promise<boolean> {
  const now = new Date().toISOString();

  if (isPgConfigured()) {
    try {
      await pgQuery(
        `UPDATE public.users SET email_verified = true, email_verified_at = $1, updated_at = $2 WHERE id = $3`,
        [now, now, userId]
      );
      return true;
    } catch (e) {
      console.error('PostgreSQL verifyUserEmail error:', e);
    }
  }

  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ email_verified: true, email_verified_at: now, updated_at: now })
        .eq('id', userId);
      if (!error) return true;
    } catch (e) {
      console.error('Supabase verifyUserEmail error:', e);
    }
  }

  for (const u of localStore.users.values()) {
    if (u.id === userId) {
      u.email_verified = true;
      u.email_verified_at = now;
      return true;
    }
  }

  return true;
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const now = new Date().toISOString();

  if (isPgConfigured()) {
    try {
      await pgQuery(`UPDATE public.users SET last_login_at = $1 WHERE id = $2`, [now, userId]);
    } catch (e) {
      console.error('PostgreSQL updateUserLastLogin error:', e);
    }
  }
}

export async function countUsers(): Promise<number> {
  if (isPgConfigured()) {
    try {
      const res = await pgQuery(`SELECT COUNT(*)::int as count FROM public.users`);
      if (res.rows.length > 0) return Number(res.rows[0].count);
    } catch (e) {
      console.error('PostgreSQL countUsers error:', e);
    }
  }

  if (supabase) {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      if (!error && count !== null) return count;
    } catch (e) {
      console.error('Supabase countUsers error:', e);
    }
  }
  return localStore.users.size;
}

export async function getAllUsers(limit: number = 100): Promise<User[]> {
  if (isPgConfigured()) {
    try {
      const sql = `
        SELECT 
          u.id, u.name, u.email,
          COALESCE(u.status, 'active') as status,
          u.email_verified, u.email_verified_at,
          u.created_at, u.updated_at, u.last_login_at,
          COALESCE(r.name, u.role, 'USER') as effective_role
        FROM public.users u
        LEFT JOIN public.user_roles ur ON u.id = ur.user_id
        LEFT JOIN public.roles r ON ur.role_id = r.id
        ORDER BY u.created_at DESC
        LIMIT $1;
      `;
      const res = await pgQuery(sql, [limit]);
      return res.rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: (r.effective_role || 'USER') as 'USER' | 'ADMIN',
        account_status: r.status || 'active',
        email_verified: Boolean(r.email_verified),
        email_verified_at: r.email_verified_at ? new Date(r.email_verified_at).toISOString() : undefined,
        last_login_at: r.last_login_at ? new Date(r.last_login_at).toISOString() : undefined,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
      }));
    } catch (e) {
      console.error('PostgreSQL getAllUsers error:', e);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, status, email_verified, email_verified_at, created_at, updated_at, last_login_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return (data as any[]).map((r) => ({
          id: r.id,
          email: r.email,
          name: r.name,
          role: (r.role || 'USER') as 'USER' | 'ADMIN',
          account_status: r.status || 'active',
          email_verified: Boolean(r.email_verified),
          email_verified_at: r.email_verified_at,
          last_login_at: r.last_login_at,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));
      }
    } catch (e) {
      console.error('Supabase getAllUsers error:', e);
    }
  }

  return Array.from(localStore.users.values()).slice(0, limit);
}

/**
 * ====================================================================
 * VERIFICATION & PASSWORD RESET TOKENS (SHA-256 Hashed)
 * ====================================================================
 */

interface LocalTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  tokenType: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  expiresAt: Date;
  usedAt?: Date | null;
}
const localTokenStore = new Map<string, LocalTokenRecord>();

export async function createVerificationToken(params: {
  userId: string;
  tokenType: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  expiryMinutes?: number;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiryMinutes = params.expiryMinutes || (params.tokenType === 'PASSWORD_RESET' ? 60 : 1440); // 1 hr for reset, 24 hr for email
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const id = crypto.randomUUID();

  if (isPgConfigured()) {
    try {
      const sql = `
        INSERT INTO public.verification_tokens (id, user_id, token_hash, token_type, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5, now());
      `;
      await pgQuery(sql, [id, params.userId, tokenHash, params.tokenType, expiresAt.toISOString()]);
      return { rawToken, expiresAt };
    } catch (e) {
      console.error('PostgreSQL createVerificationToken error:', e);
    }
  }

  localTokenStore.set(tokenHash, {
    id,
    userId: params.userId,
    tokenHash,
    tokenType: params.tokenType,
    expiresAt,
    usedAt: null,
  });

  return { rawToken, expiresAt };
}

export async function consumeVerificationToken(params: {
  rawToken: string;
  tokenType: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
}): Promise<{ valid: boolean; userId?: string; error?: string }> {
  if (!params.rawToken) {
    return { valid: false, error: 'Token is required.' };
  }

  const tokenHash = crypto.createHash('sha256').update(params.rawToken).digest('hex');

  if (isPgConfigured()) {
    try {
      const sql = `
        SELECT id, user_id, expires_at, used_at
        FROM public.verification_tokens
        WHERE token_hash = $1 AND token_type = $2
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      const res = await pgQuery(sql, [tokenHash, params.tokenType]);

      if (res.rows.length === 0) {
        return { valid: false, error: 'Invalid or expired token.' };
      }

      const row = res.rows[0];
      if (row.used_at) {
        return { valid: false, error: 'This token has already been used.' };
      }

      if (new Date(row.expires_at).getTime() < Date.now()) {
        return { valid: false, error: 'This token has expired. Please request a new one.' };
      }

      // Mark as used
      await pgQuery(`UPDATE public.verification_tokens SET used_at = now() WHERE id = $1`, [row.id]);

      return { valid: true, userId: row.user_id };
    } catch (e) {
      console.error('PostgreSQL consumeVerificationToken error:', e);
      return { valid: false, error: 'Failed to verify token against database.' };
    }
  }

  const record = localTokenStore.get(tokenHash);
  if (!record || record.tokenType !== params.tokenType) {
    return { valid: false, error: 'Invalid or expired token.' };
  }
  if (record.usedAt) {
    return { valid: false, error: 'This token has already been used.' };
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return { valid: false, error: 'This token has expired.' };
  }

  record.usedAt = new Date();
  return { valid: true, userId: record.userId };
}

/**
 * ====================================================================
 * USER PREFERENCES
 * ====================================================================
 */

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  if (isPgConfigured()) {
    try {
      const res = await pgQuery(`SELECT * FROM public.user_preferences WHERE user_id = $1`, [userId]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        let preferences = r.preferences;
        if (typeof preferences === 'string') {
          try {
            preferences = JSON.parse(preferences);
          } catch {
            preferences = [];
          }
        }
        return {
          id: r.id,
          user_id: r.user_id,
          gender: r.gender,
          occasion: r.occasion,
          style_direction: r.style_direction,
          preferred_color: r.preferred_color,
          budget: r.budget,
          skin_tone: r.skin_tone,
          preferences: Array.isArray(preferences) ? preferences : [],
          created_at: r.created_at,
          updated_at: r.updated_at,
        };
      }
    } catch (e) {
      console.error('PostgreSQL getUserPreferences error:', e);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return data as UserPreferences;
      }
    } catch (e) {
      console.error('Supabase getUserPreferences error:', e);
    }
  }

  return localStore.preferences.get(userId) || null;
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<UserPreferences> {
  const row = {
    ...prefs,
    id: prefs.id || crypto.randomUUID(),
    updated_at: new Date().toISOString(),
    created_at: prefs.created_at || new Date().toISOString(),
  };

  if (isPgConfigured()) {
    try {
      const sql = `
        INSERT INTO public.user_preferences (
          id, user_id, gender, occasion, style_direction, preferred_color, budget, skin_tone, preferences, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (user_id) DO UPDATE SET
          gender = EXCLUDED.gender,
          occasion = EXCLUDED.occasion,
          style_direction = EXCLUDED.style_direction,
          preferred_color = EXCLUDED.preferred_color,
          budget = EXCLUDED.budget,
          skin_tone = EXCLUDED.skin_tone,
          preferences = EXCLUDED.preferences,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `;
      const res = await pgQuery(sql, [
        row.id,
        row.user_id,
        row.gender || null,
        row.occasion || null,
        row.style_direction || null,
        row.preferred_color || null,
        row.budget || null,
        row.skin_tone || null,
        JSON.stringify(row.preferences || []),
        row.created_at,
        row.updated_at,
      ]);
      if (res.rows.length > 0) {
        localStore.preferences.set(prefs.user_id, row);
        return row;
      }
    } catch (e) {
      console.error('PostgreSQL saveUserPreferences error:', e);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .single();

      if (!error && data) {
        localStore.preferences.set(prefs.user_id, data as UserPreferences);
        return data as UserPreferences;
      }
    } catch (e) {
      console.error('Supabase saveUserPreferences error:', e);
    }
  }

  localStore.preferences.set(prefs.user_id, row);
  return row;
}

/**
 * ====================================================================
 * SITE EVENTS & ANALYTICS
 * ====================================================================
 */

export async function recordSiteEvent(event: SiteEvent): Promise<void> {
  const row: SiteEvent = {
    ...event,
    created_at: event.created_at || new Date().toISOString(),
  };

  if (isPgConfigured()) {
    try {
      const sql = `
        INSERT INTO public.site_events (event_type, product_id, session_id, user_id, path, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      await pgQuery(sql, [
        row.event_type,
        row.product_id || null,
        row.session_id || null,
        row.user_id || null,
        row.path || null,
        JSON.stringify(row.metadata || {}),
        row.created_at,
      ]);
      return;
    } catch (e) {
      console.error('PostgreSQL recordSiteEvent error:', e);
    }
  }

  if (supabase) {
    try {
      await supabase.from('site_events').insert(row);
      return;
    } catch (e) {
      console.error('Supabase recordSiteEvent error:', e);
    }
  }

  localStore.events.push(row);
  if (localStore.events.length > 5000) {
    localStore.events.shift();
  }
}

export interface AnalyticsSummary {
  totalUsers: number;
  totalEvents: number;
  totalVisits: number;
  totalProductViews: number;
  totalAffiliateClicks: number;
  totalRecommendations: number;
  uniqueSessionsEstimate: number;
  topProducts: { productId: string; clicks: number; views: number; title?: string }[];
  dailyViews: { date: string; views: number; clicks: number }[];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  let events: SiteEvent[] = [];

  if (isPgConfigured()) {
    try {
      const res = await pgQuery(`SELECT * FROM public.site_events ORDER BY created_at DESC LIMIT 2000`);
      events = res.rows.map((r) => ({
        id: Number(r.id),
        event_type: r.event_type,
        product_id: r.product_id,
        session_id: r.session_id,
        user_id: r.user_id,
        path: r.path,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      }));
    } catch (e) {
      console.error('PostgreSQL getAnalyticsSummary error:', e);
    }
  } else if (supabase) {
    try {
      const { data, error } = await supabase
        .from('site_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (!error && data) {
        events = data as SiteEvent[];
      }
    } catch (e) {
      console.error('Supabase getAnalyticsSummary error:', e);
    }
  }

  if (events.length === 0) {
    events = localStore.events;
  }

  const totalUsers = await countUsers();
  const sessions = new Set<string>();
  let visits = 0;
  let productViews = 0;
  let affiliateClicks = 0;
  let recommendations = 0;

  const productStats = new Map<string, { clicks: number; views: number }>();
  const dailyMap = new Map<string, { views: number; clicks: number }>();

  for (const ev of events) {
    if (ev.session_id) sessions.add(ev.session_id);

    const dateStr = ev.created_at ? ev.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
    if (!dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, { views: 0, clicks: 0 });
    }
    const dayStat = dailyMap.get(dateStr)!;

    if (ev.event_type === 'visit' || ev.event_type === 'page_view') {
      visits++;
      dayStat.views++;
    } else if (ev.event_type === 'product_view') {
      productViews++;
      dayStat.views++;
      if (ev.product_id) {
        const p = productStats.get(ev.product_id) || { clicks: 0, views: 0 };
        p.views++;
        productStats.set(ev.product_id, p);
      }
    } else if (ev.event_type === 'affiliate_click') {
      affiliateClicks++;
      dayStat.clicks++;
      if (ev.product_id) {
        const p = productStats.get(ev.product_id) || { clicks: 0, views: 0 };
        p.clicks++;
        productStats.set(ev.product_id, p);
      }
    } else if (ev.event_type === 'recommendation_run') {
      recommendations++;
    }
  }

  const topProducts = Array.from(productStats.entries())
    .map(([productId, stats]) => {
      const p = localStore.products.get(productId);
      return {
        productId,
        clicks: stats.clicks,
        views: stats.views,
        title: p?.title || productId,
      };
    })
    .sort((a, b) => b.clicks + b.views - (a.clicks + a.views))
    .slice(0, 10);

  const dailyViews = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({ date, views: stats.views, clicks: stats.clicks }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  return {
    totalUsers,
    totalEvents: events.length,
    totalVisits: visits,
    totalProductViews: productViews,
    totalAffiliateClicks: affiliateClicks,
    totalRecommendations: recommendations,
    uniqueSessionsEstimate: sessions.size || (visits > 0 ? visits : 0),
    topProducts,
    dailyViews,
  };
}

/**
 * ====================================================================
 * AUDIT LOGS
 * ====================================================================
 */

export async function recordAuditLog(log: AuditLog): Promise<void> {
  const row: AuditLog = {
    ...log,
    created_at: log.created_at || new Date().toISOString(),
  };

  if (isPgConfigured()) {
    try {
      const isValidUuid =
        row.actor_id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.actor_id);

      const sql = `
        INSERT INTO public.audit_logs (actor_user_id, actor_email, action, resource_id, outcome, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      await pgQuery(sql, [
        isValidUuid ? row.actor_id : null,
        row.actor_email || null,
        row.action,
        row.target_resource || null,
        row.outcome,
        JSON.stringify(row.details || {}),
        row.created_at,
      ]);
      return;
    } catch (e) {
      console.error('PostgreSQL recordAuditLog error:', e);
    }
  }

  if (supabase) {
    try {
      await supabase.from('audit_logs').insert(row);
      return;
    } catch (e) {
      console.error('Supabase recordAuditLog error:', e);
    }
  }

  localStore.auditLogs.unshift(row);
  if (localStore.auditLogs.length > 500) {
    localStore.auditLogs.pop();
  }
}

export async function getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
  if (isPgConfigured()) {
    try {
      const res = await pgQuery(`SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT $1`, [limit]);
      return res.rows.map((r) => ({
        id: Number(r.id),
        actor_id: r.actor_user_id || r.actor_id,
        actor_email: r.actor_email,
        action: r.action,
        target_resource: r.resource_id || r.target_resource,
        outcome: r.outcome as 'SUCCESS' | 'DENIED' | 'ERROR',
        details: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || r.details || {},
        created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      }));
    } catch (e) {
      console.error('PostgreSQL getAuditLogs error:', e);
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data as AuditLog[];
      }
    } catch (e) {
      console.error('Supabase getAuditLogs error:', e);
    }
  }

  return localStore.auditLogs.slice(0, limit);
}
