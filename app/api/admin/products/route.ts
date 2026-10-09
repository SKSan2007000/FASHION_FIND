import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getProducts, saveProduct, deleteProduct, recordAuditLog, getProductById } from '@/lib/db';
import { validateAffiliateUrl } from '@/lib/security';
import { Product } from '@/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await requireAdmin();
    const products = await getProducts({ publishedOnly: false });
    return NextResponse.json({ success: true, count: products.length, products });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch admin products.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const body = await req.json();

    const {
      title,
      brand,
      category,
      gender = 'MEN',
      price = 'See latest price on Amazon',
      image,
      affiliateUrl,
      description,
      color,
      fit,
      style,
      neck,
      sleeve,
      pattern,
      material,
      care,
      closure,
      country,
      asin,
      model,
      rank,
      pockets,
      season,
      occasion,
      specs = [],
      sourceText,
      published = true,
    } = body;

    if (!title || !image || !affiliateUrl) {
      return NextResponse.json(
        { error: 'Product title, image, and affiliate URL are required.' },
        { status: 400 }
      );
    }

    // Validate affiliate URL
    const urlCheck = validateAffiliateUrl(affiliateUrl);
    if (!urlCheck.isValid) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400 });
    }

    const id = `${brand || 'item'}-${model || asin || Date.now()}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const product: Product = {
      id,
      title,
      brand: brand || 'FashionFind Pick',
      category: category || "Men's Fashion",
      gender: gender || 'MEN',
      price,
      image,
      affiliateUrl: urlCheck.normalizedUrl || affiliateUrl,
      description: description || '',
      color: color || '',
      fit: fit || '',
      style: style || '',
      neck: neck || '',
      sleeve: sleeve || '',
      pattern: pattern || '',
      material: material || '',
      care: care || '',
      closure: closure || '',
      country: country || '',
      asin: asin || '',
      model: model || '',
      rank: rank || '',
      pockets: pockets || '',
      season: season || '',
      occasion: occasion || '',
      specs: Array.isArray(specs) ? specs : [],
      sourceText: sourceText || '',
      published: Boolean(published),
    };

    const saved = await saveProduct(product);

    await recordAuditLog({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'PRODUCT_CREATED',
      target_resource: saved.id,
      outcome: 'SUCCESS',
      details: { title: saved.title, brand: saved.brand, category: saved.category },
    });

    return NextResponse.json({ success: true, product: saved });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }
    console.error('Admin product create error:', err);
    return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required for update.' }, { status: 400 });
    }

    const existing = await getProductById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    if (updates.affiliateUrl) {
      const urlCheck = validateAffiliateUrl(updates.affiliateUrl);
      if (!urlCheck.isValid) {
        return NextResponse.json({ error: urlCheck.error }, { status: 400 });
      }
      updates.affiliateUrl = urlCheck.normalizedUrl || updates.affiliateUrl;
    }

    const updatedProduct: Product = {
      ...existing,
      ...updates,
    };

    const saved = await saveProduct(updatedProduct);

    await recordAuditLog({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'PRODUCT_UPDATED',
      target_resource: saved.id,
      outcome: 'SUCCESS',
      details: { changedFields: Object.keys(updates) },
    });

    return NextResponse.json({ success: true, product: saved });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }
    console.error('Admin product update error:', err);
    return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    await deleteProduct(id);

    await recordAuditLog({
      actor_id: session.userId,
      actor_email: session.email,
      action: 'PRODUCT_DELETED',
      target_resource: id,
      outcome: 'SUCCESS',
    });

    return NextResponse.json({ success: true, message: 'Product deleted.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }
    console.error('Admin product delete error:', err);
    return NextResponse.json({ error: 'Failed to delete product.' }, { status: 500 });
  }
}
