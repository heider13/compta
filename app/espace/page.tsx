'use client';

// Liste des formalités commandées par l'entrepreneur.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { euros, VPS, type Offre } from '@/lib/espace/chat';

type Ligne = { id: string; statut: string; offre: Offre | null; paye_le: string | null; created_at: string };
const STATUTS: Record<string, string> = { ouverte: 'Conversation en cours', offre: 'À régler', paiement: 'Paiement en cours', payee: 'En cours de traitement', annulee: 'Annulée' };

export default function EspacePage() {
  const router = useRouter();
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await createClient().auth.getSession();
      const t = data.session?.access_token;
      if (!t) { router.replace('/espace/connexion?mode=connexion'); return; }
      const r = await fetch(`${VPS}/api/espace/commandes`, { headers: { Authorization: `Bearer ${t}` } });
      setLignes(r.ok ? (await r.json()).commandes : []);
    })();
  }, [router]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="!m-0 text-2xl font-semibold text-[#241143]">Mes formalités</h1>
        <Link href="/independants-tpe" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#361fab] to-[#7551e8] px-4 py-2 text-sm font-semibold !text-white no-underline"><Plus className="size-4" /> Nouvelle formalité</Link>
      </div>
      {!lignes && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Chargement…</div>}
      {lignes && !lignes.length && <p className="text-sm text-[#6b6385]">Aucune formalité pour l’instant. Décrivez votre projet à l’assistant sur la page Indépendants et TPE.</p>}
      <div className="space-y-2">
        {lignes?.map((l) => (
          <Link key={l.id} href={`/espace/${l.id}`} className="flex items-center gap-3 rounded-xl border border-[#ebe6f7] bg-white px-4 py-3 no-underline transition-colors hover:border-[#7551e8]">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[#241143]">{l.offre?.libelle || 'Conversation avec l’assistant'}</div>
              <div className="text-xs text-[#8a83a3]">{new Date(l.created_at).toLocaleDateString('fr-FR')} · {STATUTS[l.statut] || l.statut}{l.offre ? ` · ${euros(l.offre.prix_ttc_cents)} TTC` : ''}</div>
            </div>
            <ArrowRight className="size-4 text-[#8a83a3]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
