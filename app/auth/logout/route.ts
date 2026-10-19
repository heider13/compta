import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Déconnexion (POST uniquement : un lien externe ne peut pas déconnecter l'utilisateur)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/auth/login', request.url), { status: 303 });
}
