'use client';

// Après la proposition du chat public : connexion ou création du compte, puis
// rattachement de la conversation au compte, puis page de la commande.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { VPS } from '@/lib/espace/chat';

function Commencer() {
  const router = useRouter();
  const sp = useSearchParams();
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    const id = sp.get('commande') || '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) { router.replace('/espace'); return; }
    (async () => {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) { router.replace(`/espace/connexion?next=${encodeURIComponent(`/espace/commencer?commande=${id}`)}`); return; }
      const r = await fetch(`${VPS}/api/espace/commandes/${id}/rattacher`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { const j = await r.json().catch(() => ({})); setErreur(j.detail || 'Impossible de retrouver cette conversation.'); return; }
      router.replace(`/espace/${id}`);
    })();
  }, [router, sp]);
  return erreur
    ? <p className="rounded-lg bg-[#fff1ef] p-4 text-sm text-[#c2410c]">{erreur}</p>
    : <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Préparation de votre espace…</div>;
}

export default function Page() {
  return <Suspense><Commencer /></Suspense>;
}
