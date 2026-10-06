'use client';

// Paiement d'une formalité du Guichet unique (lecture seule : le paiement et la
// délégation se font sur procedures.inpi.fr). Badge de statut et carte détaillée.

import { useState } from 'react';
import { Check, Clock, Copy, CreditCard, ExternalLink, Loader2, Receipt, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';

export type Paiement = {
  statut: 'aucun' | 'a_payer' | 'delegation_en_attente' | 'paye';
  a_payer_cents: number;
  paye_cents: number;
  rembourse_cents?: number;
  delegation: { email: string } | null;
  depuis: string | null;
  jours_attente: number | null;
  paniers?: {
    id: number;
    statut: 'TO_PAY' | 'PAID' | 'REFUNDED' | 'CANCELED';
    total_cents: number;
    date: string | null;
    payeur: string | null;
    delegation: boolean;
    lignes: { libelle: string; beneficiaire: string | null; montant_cents: number }[];
  }[];
  guichet?: { url: string; direct: boolean };
};

export const euros = (c: number) =>
  `${(c / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export function PaiementBadge({ p, className }: { p?: Paiement | null; className?: string }) {
  if (!p || p.statut === 'aucun') return <span className={cn('text-xs text-muted-foreground', className)}>—</span>;
  const retard = (p.jours_attente ?? 0) >= 3;
  const conf = {
    a_payer: { label: `À payer · ${euros(p.a_payer_cents)}`, cls: retard ? 'bg-[#fff1ef] text-[#c2410c]' : 'bg-amber-50 text-amber-800', icon: CreditCard },
    delegation_en_attente: { label: `Délégation en attente · ${euros(p.a_payer_cents)}`, cls: retard ? 'bg-[#fff1ef] text-[#c2410c]' : 'bg-[#ede7ff] text-primary', icon: Send },
    paye: { label: `Payée · ${euros(p.paye_cents)}`, cls: 'bg-emerald-50 text-emerald-700', icon: Check },
  }[p.statut];
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium', conf.cls, className)}
      title={p.jours_attente != null ? `En attente depuis ${p.jours_attente} jour(s)` : undefined}
    >
      <conf.icon className="size-3" /> {conf.label}
    </span>
  );
}

const STATUT_PANIER: Record<string, string> = { TO_PAY: 'À payer', PAID: 'Payé', REFUNDED: 'Remboursé', CANCELED: 'Annulé' };

export function PaiementCard({ p, liasse, formalityId }: { p: Paiement; liasse: string; formalityId: string | number }) {
  const [copie, setCopie] = useState(false);
  const [facture, setFacture] = useState<'idle' | 'busy' | 'ok' | 'deja'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function refacturer() {
    setFacture('busy');
    setError(null);
    try {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Session expirée, reconnectez-vous.');
      const res = await fetch(`${VPS}/api/inpi/formalites/${encodeURIComponent(String(formalityId))}/refacturer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { detail?: string }).detail || `Erreur ${res.status}`);
      setFacture((body as { deja?: boolean }).deja ? 'deja' : 'ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refacturation impossible.');
      setFacture('idle');
    }
  }

  const enAttente = p.statut === 'a_payer' || p.statut === 'delegation_en_attente';
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-primary" /> Paiement
          </CardTitle>
          <CardDescription>
            Le paiement et la délégation se font sur le Guichet unique ; l’application en suit l’état.
          </CardDescription>
        </div>
        <PaiementBadge p={p} />
      </CardHeader>
      <CardContent className="space-y-4">
        {enAttente && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            {p.statut === 'delegation_en_attente' ? (
              <p>
                Délégation de paiement envoyée à <strong>{p.delegation?.email}</strong> : en attente du paiement par le client
                {p.jours_attente != null && <> depuis {p.jours_attente} jour(s)</>}.
                {(p.jours_attente ?? 0) >= 3 && ' Pensez à le relancer.'}
              </p>
            ) : (
              <p>
                <strong>{euros(p.a_payer_cents)}</strong> à payer
                {p.jours_attente != null && <> depuis {p.jours_attente} jour(s)</>}. Payez par vos propres moyens ou envoyez une
                délégation de paiement au client depuis le Guichet unique.
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {p.guichet && (
                <Button asChild size="sm">
                  <a href={p.guichet.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" /> {p.guichet.direct ? 'Payer sur le Guichet unique' : 'Ouvrir le Guichet unique'}
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(liasse);
                    setCopie(true);
                    setTimeout(() => setCopie(false), 2000);
                  } catch {}
                }}
              >
                {copie ? <Check className="size-4" /> : <Copy className="size-4" />} Liasse {liasse}
              </Button>
            </div>
          </div>
        )}

        {(p.paniers ?? []).map((k) => (
          <div key={k.id} className="rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-xs">
              <span className="font-medium">{STATUT_PANIER[k.statut] ?? k.statut}</span>
              <span className="text-muted-foreground">
                {k.payeur && <>{k.delegation ? 'Délégation à ' : 'Payeur : '}{k.payeur} · </>}
                {k.date && new Date(k.date).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {k.lignes.map((l, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-1.5">{l.libelle}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{l.beneficiaire}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{euros(l.montant_cents)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/40 font-semibold">
                  <td className="px-3 py-1.5" colSpan={2}>Total</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{euros(k.total_cents)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={refacturer} disabled={facture === 'busy' || facture === 'ok' || facture === 'deja'}>
            {facture === 'busy' ? <Loader2 className="size-4 animate-spin" /> : facture === 'idle' ? <Receipt className="size-4" /> : <Check className="size-4" />}
            {facture === 'ok' ? 'Facture client créée (brouillon)' : facture === 'deja' ? 'Déjà refacturée' : 'Refacturer les frais au client'}
          </Button>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" /> Facture en brouillon dans Facturation → Factures clients
          </span>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
