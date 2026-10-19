'use client';

// Questionnaire pas à pas posé par l'Agent Formalités (outil poser_questions) :
// une question par écran (étiquette de rubrique + « 1 sur N »), réponse libre ou
// choix parmi des options décrites, Retour / Suivant, « Passer : l'agent décide ».
// Une fois envoyé, il s'affiche en récapitulatif.

import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Option = string | { label: string; description?: string };
export type Champ = {
  id: string;
  label: string;
  rubrique?: string;
  type: 'texte' | 'texte_long' | 'email' | 'telephone' | 'date' | 'nombre' | 'montant' | 'liste' | 'choix' | 'cases' | 'oui_non' | 'adresse';
  options?: Option[];
  requis?: boolean;
  valeur?: string;
  aide?: string;
  placeholder?: string;
};
export type FormSpec = { id: string; titre: string; intro?: string; champs: Champ[]; bouton?: string };
export type Valeur = string | string[];
export type Reponses = Record<string, Valeur>;

const optLabel = (o: Option) => (typeof o === 'string' ? o : o.label);
const optDesc = (o: Option) => (typeof o === 'string' ? undefined : o.description);
const optionsDe = (c: Champ): Option[] => (c.type === 'oui_non' ? ['Oui', 'Non'] : c.options ?? []);
const aChoix = (c: Champ) => ['liste', 'choix', 'oui_non', 'cases'].includes(c.type);

function initiales(champs: Champ[]): Reponses {
  const out: Reponses = {};
  for (const c of champs) out[c.id] = c.type === 'cases' ? (c.valeur ? c.valeur.split(/\s*[;,]\s*/).filter(Boolean) : []) : c.valeur ?? '';
  return out;
}

const rempli = (v: Valeur | undefined) => (Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? '').trim()));

function affichage(c: Champ, v: Valeur | undefined) {
  if (Array.isArray(v)) return v.length ? v.join(', ') : 'l’agent décide';
  if (!v) return 'l’agent décide';
  if (c.type === 'montant') return `${v} €`;
  if (c.type === 'date') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-FR');
  }
  return v;
}

const TAG = 'rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-wider';
const SAISIE =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

function Radio({ on }: { on: boolean }) {
  return (
    <span className={cn('mt-[3px] grid size-3.5 shrink-0 place-items-center rounded-full border', on ? 'border-primary' : 'border-muted-foreground/50')}>
      {on && <span className="size-1.5 rounded-full bg-primary" />}
    </span>
  );
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
  const [etape, setEtape] = useState(0);
  const saisieRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const total = form.champs.length;
  const c = form.champs[Math.min(etape, total - 1)];

  useEffect(() => {
    if (!repondu) saisieRef.current?.focus({ preventScroll: true });
  }, [etape, repondu]);

  if (repondu) {
    return (
      <div className="ml-9 overflow-hidden rounded-lg border bg-card text-xs">
        <p className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3.5 py-2">
          <CheckCircle2 className="size-3.5 text-success" />
          <span className="font-medium">{form.titre}</span>
          <span className="font-mono text-[11px] text-muted-foreground">· {reponses ? 'réponses envoyées' : 'répondu par message'}</span>
        </p>
        {reponses && (
          <dl className="grid gap-x-4 gap-y-1.5 px-3.5 py-3 sm:grid-cols-[minmax(0,15rem)_1fr]">
            {form.champs.map((ch) => (
              <div key={ch.id} className="contents">
                <dt className="truncate text-muted-foreground">{ch.rubrique || ch.label}</dt>
                <dd className={cn('min-w-0 break-words font-medium', !rempli(reponses[ch.id]) && 'font-normal italic text-muted-foreground')}>
                  {affichage(ch, reponses[ch.id])}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  const v = valeurs[c.id];
  const set = (x: Valeur) => setValeurs((s) => ({ ...s, [c.id]: x }));
  const options = optionsDe(c);
  const libre = aChoix(c) && c.type !== 'cases' && !options.some((o) => optLabel(o) === v);
  const derniere = etape === total - 1;
  const peutSuivre = !c.requis || rempli(v);

  const suivant = (r: Reponses = valeurs) => {
    if (derniere) onSubmit(r);
    else setEtape((e) => e + 1);
  };
  const passer = () => {
    const r = { ...valeurs, [c.id]: c.type === 'cases' ? [] : '' };
    setValeurs(r);
    suivant(r);
  };

  // Champ de saisie libre selon le type
  const typeInput = { email: 'email', telephone: 'tel', date: 'date', nombre: 'number', montant: 'number' }[c.type as string] ?? 'text';
  const saisieLibre =
    c.type === 'texte_long' || c.type === 'adresse' ? (
      <textarea
        ref={saisieRef}
        rows={c.type === 'adresse' ? 2 : 3}
        value={typeof v === 'string' ? v : ''}
        onChange={(e) => set(e.target.value)}
        placeholder={c.placeholder ?? (c.type === 'adresse' ? 'N° et voie, code postal, commune' : 'Votre réponse…')}
        className={SAISIE}
      />
    ) : (
      <div className="relative w-full">
        <input
          ref={saisieRef}
          type={typeInput}
          step={c.type === 'montant' ? '0.01' : undefined}
          value={typeof v === 'string' && (!aChoix(c) || libre) ? v : ''}
          onChange={(e) => set(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && peutSuivre && !disabled) {
              e.preventDefault();
              suivant();
            }
          }}
          placeholder={c.placeholder ?? 'Votre réponse…'}
          className={cn(SAISIE, c.type === 'montant' && 'pr-8')}
        />
        {c.type === 'montant' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">€</span>}
      </div>
    );

  return (
    <div className="ml-9 space-y-2">
      <div className="overflow-hidden rounded-xl border border-brand-border bg-card shadow-sm">
        {total > 1 && (
          <div className="h-0.5 bg-muted" aria-hidden="true">
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${((etape + 1) / total) * 100}%` }} />
          </div>
        )}
        <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(TAG, 'border-brand-border bg-brand-soft text-brand-soft-foreground')}>{c.rubrique || form.titre}</span>
          {total > 1 && (
            <span className={cn(TAG, 'bg-muted tabular-nums text-muted-foreground')}>
              {etape + 1} sur {total}
            </span>
          )}
        </div>
        <p className="mt-3 max-w-xl text-[15px] font-semibold leading-snug tracking-tight">
          {c.label}
          {c.requis && <span className="text-destructive" aria-label="obligatoire"> *</span>}
        </p>
        {c.aide && <p className="mt-1 max-w-xl text-xs text-muted-foreground">{c.aide}</p>}

        <div className="mt-4 space-y-3">
          {/* Réponse libre (toujours possible, sauf cases à cocher) */}
          {c.type !== 'cases' && (
            <label className="flex items-start gap-3">
              {aChoix(c) && <Radio on={libre && rempli(v)} />}
              {saisieLibre}
            </label>
          )}

          {options.length > 0 && (
            <>
              <p className="label-mono pt-1">
                {c.type === 'cases' ? 'Cochez ce qui s’applique' : 'Ou choisissez'}
              </p>
              <ul className="space-y-1">
                {options.map((o) => {
                  const lab = optLabel(o);
                  const on = Array.isArray(v) ? v.includes(lab) : v === lab;
                  return (
                    <li key={lab}>
                      <button
                        type="button"
                        onClick={() => {
                          if (c.type === 'cases') {
                            const list = Array.isArray(v) ? v : [];
                            set(on ? list.filter((x) => x !== lab) : [...list, lab]);
                          } else {
                            set(lab);
                          }
                        }}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-md border px-2.5 py-2 text-left transition-colors',
                          on ? 'border-brand-border bg-brand-soft' : 'border-transparent hover:bg-muted/50',
                        )}
                        aria-pressed={on}
                      >
                        {c.type === 'cases' ? (
                          <span className={cn('mt-[3px] grid size-3.5 shrink-0 place-items-center rounded-sm border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50')}>
                            {on && <Check className="size-2.5" strokeWidth={3} />}
                          </span>
                        ) : (
                          <Radio on={on} />
                        )}
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{lab}</span>
                          {optDesc(o) && <span className="block text-xs text-muted-foreground">{optDesc(o)}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
          <button
            type="button"
            onClick={() => setEtape((e) => Math.max(0, e - 1))}
            disabled={etape === 0 || disabled}
            className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={() => suivant()}
            disabled={!peutSuivre || disabled}
            className="inline-flex h-8 items-center rounded-md bg-primary px-3.5 text-xs font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {derniere ? form.bouton || 'Envoyer' : 'Suivant'}
          </button>
          {!derniere && <kbd className="hidden h-5 items-center rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground sm:inline-flex">Entrée</kbd>}
          {!c.requis && (
            <button
              type="button"
              onClick={passer}
              disabled={disabled}
              className="ml-auto rounded-md px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              Passer : l’agent décide
            </button>
          )}
        </div>
        </div>
      </div>
      <p className="flex items-center gap-2 pl-1 font-mono text-[11px] text-muted-foreground">
        <span className="live-dot size-1.5 text-primary" aria-hidden="true" />
        en attente de votre réponse… <span className="text-muted-foreground/70">(ou répondez par message ci-dessous)</span>
      </p>
    </div>
  );
}
