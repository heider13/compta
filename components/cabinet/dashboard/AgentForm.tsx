'use client';

// Formulaire interactif posé par l'Agent Formalités (outil poser_questions) :
// champs typés, valeurs pré-remplies, validation des champs requis. Une fois
// envoyé, il s'affiche en lecture seule avec les réponses données.

import { useState } from 'react';
import { CheckCircle2, ClipboardList, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Champ = {
  id: string;
  label: string;
  type: 'texte' | 'texte_long' | 'email' | 'telephone' | 'date' | 'nombre' | 'montant' | 'liste' | 'choix' | 'cases' | 'oui_non' | 'adresse';
  options?: string[];
  requis?: boolean;
  valeur?: string;
  aide?: string;
  placeholder?: string;
};
export type FormSpec = { id: string; titre: string; intro?: string; champs: Champ[]; bouton?: string };
export type Valeur = string | string[];
export type Reponses = Record<string, Valeur>;

const INPUT = 'h-9 w-full rounded-md border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40';

function initiales(champs: Champ[]): Reponses {
  const out: Reponses = {};
  for (const c of champs) {
    if (c.type === 'cases') out[c.id] = c.valeur ? c.valeur.split(/\s*[;,]\s*/).filter(Boolean) : [];
    else out[c.id] = c.valeur ?? '';
  }
  return out;
}

function affichage(c: Champ, v: Valeur | undefined) {
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (!v) return '—';
  if (c.type === 'montant') return `${v} €`;
  if (c.type === 'date') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-FR');
  }
  return v;
}

export function AgentForm({
  form,
  reponses,
  repondu,
  disabled,
  onSubmit,
}: {
  form: FormSpec;
  reponses?: Reponses | null;
  repondu: boolean;
  disabled: boolean;
  onSubmit: (r: Reponses) => void;
}) {
  const [valeurs, setValeurs] = useState<Reponses>(() => initiales(form.champs));
  const [erreurs, setErreurs] = useState<Record<string, boolean>>({});
  const set = (id: string, v: Valeur) => {
    setValeurs((x) => ({ ...x, [id]: v }));
    setErreurs((e) => ({ ...e, [id]: false }));
  };

  if (repondu) {
    return (
      <div className="ml-9 rounded-lg border bg-[#fbfaff] text-xs">
        <p className="flex items-center gap-2 border-b px-3 py-2 font-medium">
          <CheckCircle2 className="size-4 text-primary" /> {form.titre}
          <span className="font-normal text-muted-foreground">· {reponses ? 'réponses envoyées' : 'répondu par message'}</span>
        </p>
        {reponses && (
          <dl className="grid gap-x-4 gap-y-1 px-3 py-2 sm:grid-cols-[minmax(0,14rem)_1fr]">
            {form.champs.map((c) => (
              <div key={c.id} className="contents">
                <dt className="text-muted-foreground">{c.label}</dt>
                <dd className="min-w-0 break-words font-medium">{affichage(c, reponses[c.id])}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const manquants: Record<string, boolean> = {};
    for (const c of form.champs) {
      const v = valeurs[c.id];
      if (c.requis && (Array.isArray(v) ? v.length === 0 : !String(v ?? '').trim())) manquants[c.id] = true;
    }
    setErreurs(manquants);
    if (Object.keys(manquants).length) return;
    onSubmit(valeurs);
  }

  return (
    <form onSubmit={envoyer} className="ml-9 rounded-xl border border-primary/25 bg-card shadow-[0_8px_24px_rgba(54,31,171,0.08)]">
      <div className="flex items-start gap-2 border-b bg-[#f7f5fd] px-4 py-3">
        <ClipboardList className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{form.titre}</p>
          {form.intro && <p className="mt-0.5 text-xs text-muted-foreground">{form.intro}</p>}
        </div>
      </div>
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        {form.champs.map((c) => {
          const v = valeurs[c.id];
          const large = ['texte_long', 'adresse', 'cases', 'choix'].includes(c.type);
          const err = erreurs[c.id];
          const champ = (() => {
            switch (c.type) {
              case 'texte_long':
              case 'adresse':
                return (
                  <textarea
                    rows={c.type === 'adresse' ? 2 : 3}
                    value={String(v ?? '')}
                    onChange={(e) => set(c.id, e.target.value)}
                    placeholder={c.placeholder ?? (c.type === 'adresse' ? 'N° et voie, code postal, commune' : undefined)}
                    className={cn(INPUT, 'h-auto py-2')}
                  />
                );
              case 'liste':
                return (
                  <select value={String(v ?? '')} onChange={(e) => set(c.id, e.target.value)} className={INPUT}>
                    <option value="">— Choisir —</option>
                    {(c.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                );
              case 'choix':
              case 'oui_non': {
                const opts = c.type === 'oui_non' ? ['Oui', 'Non'] : c.options ?? [];
                return (
                  <div className="flex flex-wrap gap-2">
                    {opts.map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => set(c.id, o)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          v === o ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50',
                        )}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                );
              }
              case 'cases':
                return (
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {(c.options ?? []).map((o) => {
                      const list = Array.isArray(v) ? v : [];
                      const on = list.includes(o);
                      return (
                        <label key={o} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={on} onChange={() => set(c.id, on ? list.filter((x) => x !== o) : [...list, o])} />
                          {o}
                        </label>
                      );
                    })}
                  </div>
                );
              case 'montant':
                return (
                  <div className="relative">
                    <input type="number" step="0.01" min="0" value={String(v ?? '')} onChange={(e) => set(c.id, e.target.value)} placeholder={c.placeholder} className={cn(INPUT, 'pr-8')} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                  </div>
                );
              default: {
                const type = { email: 'email', telephone: 'tel', date: 'date', nombre: 'number' }[c.type as string] ?? 'text';
                return <input type={type} value={String(v ?? '')} onChange={(e) => set(c.id, e.target.value)} placeholder={c.placeholder} className={INPUT} />;
              }
            }
          })();
          return (
            <div key={c.id} className={cn('min-w-0 space-y-1.5', large && 'sm:col-span-2')}>
              <label className="block text-xs font-medium">
                {c.label} {c.requis && <span className="text-destructive">*</span>}
              </label>
              {champ}
              {err ? (
                <p className="text-[11px] text-destructive">Champ requis.</p>
              ) : (
                c.aide && <p className="text-[11px] text-muted-foreground">{c.aide}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
        <p className="text-[11px] text-muted-foreground">Vous pouvez aussi répondre par message dans le champ ci-dessous.</p>
        <Button type="submit" size="sm" disabled={disabled}>
          {disabled ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {form.bouton || 'Envoyer'}
        </Button>
      </div>
    </form>
  );
}
