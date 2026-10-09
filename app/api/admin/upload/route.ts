import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WEBP, and AVIF images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 5MB limit.' },
        { status: 400 }
      );
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const filename = `product-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('products')
          .upload(filename, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (!error && data) {
          const { data: publicData } = supabase.storage
            .from('products')
            .getPublicUrl(filename);
          return NextResponse.json({ success: true, url: publicData.publicUrl });
        }
      } catch (storageErr) {
        console.error('Supabase storage upload error:', storageErr);
      }
    }

    // Fallback to inline data URL
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;
    return NextResponse.json({ success: true, url: dataUrl });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }
    console.error('Upload API error:', err);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}
