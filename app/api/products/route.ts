import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gender = searchParams.get('gender') || undefined;
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('query') || undefined;
    const color = searchParams.get('color') || undefined;

    let products = await getProducts({
      publishedOnly: true,
      gender,
      category,
      query,
    });

    if (color && color !== 'All') {
      const c = color.toLowerCase();
      products = products.filter((p) => p.color?.toLowerCase().includes(c));
    }

    return NextResponse.json({ success: true, count: products.length, products });
  } catch (err) {
    console.error('Products API error:', err);
    return NextResponse.json({ error: 'Failed to fetch products.' }, { status: 500 });
  }
}
