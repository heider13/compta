import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Demarrer } from '@/components/espace/Demarrer';

// Grand chat de démarrage : la demande saisie sur la page Indépendants et TPE est
// reprise ici après la création du compte (paramètre `demande`).
export default async function DemarrerPage({ searchParams }: { searchParams: Promise<{ demande?: string }> }) {
  const { demande = '' } = await searchParams;
  const texte = demande.slice(0, 500);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/espace/connexion?next=${encodeURIComponent(`/espace/demarrer?demande=${encodeURIComponent(texte)}`)}`);
  return <Demarrer demande={texte} />;
}
