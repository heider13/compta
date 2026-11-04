'use client';

// Échéances de la semaine : propositions préparées par Legaly (chaque lundi ou à la demande).
// Le cabinet décide : accepter (puis préparer avec l'agent), ignorer, marquer fait.

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarClock, Check, EyeOff, FolderOpen, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { deciderProposition } from '@/lib/server-actions/aujourdhui';
import { vpsApi } from '@/components/cabinet/dashboard/BatchProgress';
import { formatDate } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type Proposition = {
  id: string;
  type: string;
  titre: string;
  detail: string | null;
  echeance: string | null;
  statut: 'proposee' | 'acceptee';
  demande_agent: string | null;
  client_id: string | null;
  dossier_id: string | null;
};

export function Propositions({ propositions, indisponible = false }: { propositions: Proposition[]; indisponible?: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [actif, setActif] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preparation, setPreparation] = useState(false);

  function decider(id: string, statut: 'acceptee' | 'ignoree' | 'faite') {
    setActif(id);
    demarrer(async () => {
      const r = await deciderProposition(id, statut);
      if (r.error) setMessage(r.error);
      router.refresh();
    });
  }

  async function preparerMaintenant() {
    setPreparation(true);
    setMessage(null);
    try {
      const r = await vpsApi<{ creees: number; verifications_en_attente: number }>('/api/echeances/preparer', { method: 'POST' });
      const parts = [r.creees ? `${r.creees} nouvelle${r.creees > 1 ? 's' : ''} échéance${r.creees > 1 ? 's' : ''}` : 'Aucune nouvelle échéance'];
      if (r.verifications_en_attente) parts.push(`${r.verifications_en_attente} date${r.verifications_en_attente > 1 ? 's' : ''} de clôture en cours de lecture au registre (quelques minutes) : les comptes concernés apparaîtront ensuite`);
      setMessage(`${parts.join(' · ')}.`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Préparation impossible.');
    } finally {
      setPreparation(false);
    }
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center gap-3 border-b px-5 py-4 [.border-b]:pb-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-soft-foreground">
          <CalendarClock className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <CardTitle className="text-sm">Échéances de la semaine</CardTitle>
          <CardDescription className="text-xs">Comptes annuels à approuver et déposer, échéances internes des dossiers</CardDescription>
        </div>
        {!indisponible && (
          <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" disabled={preparation} onClick={() => void preparerMaintenant()}>
            {preparation ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Préparer maintenant
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {indisponible ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Les échéances seront disponibles très prochainement.</p>
        ) : propositions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Aucune échéance proposée cette semaine.</p>
        ) : (
          <ul className="divide-y">
            {propositions.map((p) => {
              const retard = p.echeance !== null && p.echeance < aujourdhui;
              const occupe = enCours && actif === p.id;
              return (
                <li key={p.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3">
                  <div className="min-w-0 flex-1 basis-72">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className="min-w-0 break-words">{p.titre}</span>
                      {p.statut === 'acceptee' && <Badge className="bg-success/15 text-success">Acceptée</Badge>}
                    </p>
                    {p.detail && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{p.detail}</p>}
                  </div>
                  {p.echeance && (
                    <Badge variant="outline" className={retard ? 'shrink-0 border-destructive/40 text-destructive' : 'shrink-0'}>
                      {retard ? 'Dépassée · ' : 'Avant le '}{formatDate(p.echeance)}
                    </Badge>
                  )}
                  <div className="flex w-full flex-wrap justify-end gap-1.5">
                    {p.statut === 'proposee' ? (
                      <>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" disabled={occupe} onClick={() => decider(p.id, 'ignoree')}>
                          <EyeOff className="size-3.5" /> Ignorer
                        </Button>
                        <Button type="button" size="sm" className="h-7 px-2.5 text-xs" disabled={occupe} onClick={() => decider(p.id, 'acceptee')}>
                          {occupe ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Accepter
                        </Button>
                      </>
                    ) : (
                      <>
                        {p.dossier_id && (
                          <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs">
                            <Link href={`/dossiers/${p.dossier_id}`}><FolderOpen className="size-3.5" /> Ouvrir le dossier</Link>
                          </Button>
                        )}
                        {p.demande_agent && (
                          <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs">
                            <Link href={`/dashboard?demande=${encodeURIComponent(p.demande_agent)}`}><Sparkles className="size-3.5" /> Préparer avec l&apos;agent <ArrowRight className="size-3.5" /></Link>
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={occupe} onClick={() => decider(p.id, 'faite')}>
                          {occupe ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Marquer fait
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {message && <p role="status" className="border-t px-5 py-3 text-xs text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
