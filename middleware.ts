import { type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - _next/static (assets statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico, manifest, robots
     * - Tous les fichiers statiques classiques (svg, png, jpg, ico, css, js, html, json)
     * - Les routes /api/* (proxy vers VPS OVH)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest|robots|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|html|json|map|woff2?|ttf|pdf)$).*)',
  ],
};
