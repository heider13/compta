import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Retour de la connexion Google (OAuth) : échange le code contre une session,
// puis renvoie vers la page demandée (limitée à l'espace entrepreneur).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/espace';
  const cible = next.startsWith('/espace') && !next.startsWith('//') ? next : '/espace';
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/espace/connexion?e=${encodeURIComponent('Connexion Google impossible : réessayez ou utilisez votre e-mail.')}`, url.origin));
  }
  return NextResponse.redirect(new URL(cible, url.origin));
}
