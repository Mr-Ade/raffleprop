import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { path } = (await req.json().catch(() => ({}))) as { path?: string };
  revalidatePath(path ?? '/winners');
  return NextResponse.json({ revalidated: true, path: path ?? '/winners' });
}
