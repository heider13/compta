import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { createClient } from '@/lib/supabase/server';

// Espace entrepreneur : formalités commandées depuis la page Indépendants et TPE.
// Pas de cabinet ni de barre latérale : l'entrepreneur ne voit que ses commandes.

async function deconnexion() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/independants-tpe');
}

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return (
    <div className="min-h-screen bg-[#f8f6fd]">
      <header className="sticky top-0 z-30 border-b border-[#ebe6f7] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/independants-tpe" className="no-underline" aria-label="Legaly AI"><Logo size={26} textClassName="text-base" /></Link>
          {data.user && (
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/espace" className="text-[#3d3558] no-underline hover:text-[#361fab]">Mes formalités</Link>
              <form action={deconnexion}><button type="submit" className="text-[#8a83a3] hover:text-[#361fab]">Se déconnecter</button></form>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
