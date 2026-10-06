'use client';

// Questionnaire pas à pas posé par l'Agent Formalités (outil poser_questions) :
// une question par écran (étiquette de rubrique + « 1 sur N »), réponse libre ou
// choix parmi des options décrites, Retour / Suivant, « Passer : l'agent décide ».
// Une fois envoyé, il s'affiche en récapitulatif.

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
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

const TAG = 'rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider';
const SAISIE =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15';

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
      <div className="ml-9 rounded-xl border bg-card text-xs">
        <p className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
          <CheckCircle2 className="size-4 text-primary" />
          <span className="font-semibold">{form.titre}</span>
          <span className="text-muted-foreground">· {reponses ? 'réponses envoyées' : 'répondu par message'}</span>
        </p>
        {reponses && (
          <dl className="grid gap-x-4 gap-y-1.5 px-4 py-3 sm:grid-cols-[minmax(0,15rem)_1fr]">
            {form.champs.map((ch) => (
              <div key={ch.id} className="contents">
                <dt className="text-muted-foreground">{ch.rubrique || ch.label}</dt>
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
        {c.type === 'montant' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>}
      </div>
    );

  return (
    <div className="ml-9 space-y-2">
      <div className="rounded-xl border bg-card p-5 shadow-[0_10px_30px_rgba(54,31,171,0.08)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(TAG, 'border-primary/25 bg-[#ede7ff] text-primary')}>{c.rubrique || form.titre}</span>
          {total > 1 && (
            <span className={cn(TAG, 'border-foreground/70 bg-card text-foreground')}>
              {etape + 1} sur {total}
            </span>
          )}
        </div>
        <p className="mt-3 max-w-xl text-[15px] font-semibold leading-snug">
          {c.label}
          {c.requis && <span className="text-[#ff887b]"> *</span>}
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
              <p className="pt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
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
                          'flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                          on ? 'bg-[#f5f3fb]' : 'hover:bg-muted/50',
                        )}
                      >
                        {c.type === 'cases' ? (
                          <span className={cn('mt-[3px] grid size-3.5 shrink-0 place-items-center rounded-sm border', on ? 'border-primary bg-primary' : 'border-muted-foreground/50')}>
                            {on && <span className="text-[9px] leading-none text-white">✓</span>}
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

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEtape((e) => Math.max(0, e - 1))}
            disabled={etape === 0 || disabled}
            className="rounded-md border px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors hover:bg-muted disabled:opacity-40"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={() => suivant()}
            disabled={!peutSuivre || disabled}
            className="rounded-md bg-primary px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {derniere ? form.bouton || 'Envoyer' : 'Suivant'}
          </button>
          {!c.requis && (
            <button
              type="button"
              onClick={passer}
              disabled={disabled}
              className="ml-auto font-mono text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              Passer : l’agent décide
            </button>
          )}
        </div>
      </div>
      <p className="flex items-center gap-2 pl-1 font-mono text-[11px] text-muted-foreground">
        <span className="grid grid-cols-2 gap-[2px]" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="size-[3px] animate-pulse rounded-full bg-[#ff887b]" style={{ animationDelay: `${i * 180}ms` }} />
          ))}
        </span>
        en attente de votre réponse… <span className="text-muted-foreground/70">(ou répondez par message ci-dessous)</span>
      </p>
    </div>
  );
}
