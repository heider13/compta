'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, X, AlertTriangle, BadgeCheck } from 'lucide-react';
import type { OnboardingData } from '@/lib/types/onboarding';
import { formatSiren, validateSiren } from '@/lib/validators/siren';
import { lookupSiren, type SirenLookupResult } from '@/lib/services/siren-lookup';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onNext: () => void | Promise<void>;
  onPrev: () => void;
};

// Noms par défaut posés par le trigger DB `handle_new_user` qu'on peut écraser sans
// craindre d'écraser une saisie de l'utilisateur.
const DEFAULT_CABINET_NAMES = ['compta default', 'cabinet par défaut', 'cabinet par defaut'];

function isDefaultCabinetName(name: string): boolean {
  return DEFAULT_CABINET_NAMES.includes(name.trim().toLowerCase());
}

type SirenStatus =
  | { kind: 'idle' }
  | { kind: 'too_short' }
  | { kind: 'bad_checksum' }
  | { kind: 'looking_up' }
  | { kind: 'not_found' }
  | { kind: 'closed'; info: SirenLookupResult }
  | { kind: 'verified'; info: SirenLookupResult }
  | { kind: 'lookup_error'; message: string };

export function Step1Cabinet({ data, onUpdate, onNext }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sirenStatus, setSirenStatus] = useState<SirenStatus>({ kind: 'idle' });
  const lookupSeq = useRef(0);
  const nameAutoFilled = useRef(false);

  const validation = useMemo(() => validateSiren(data.siren), [data.siren]);

  // Vérification distante : déclenchée 400 ms après le dernier changement,
  // uniquement si le SIREN passe la validation locale.
  useEffect(() => {
    if (validation.kind === 'empty') {
      setSirenStatus({ kind: 'idle' });
      return;
    }
    if (validation.kind === 'too_short') {
      setSirenStatus({ kind: 'too_short' });
      return;
    }
    if (validation.kind === 'bad_checksum') {
      setSirenStatus({ kind: 'bad_checksum' });
      return;
    }

    const mySeq = ++lookupSeq.current;
    setSirenStatus({ kind: 'looking_up' });
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await lookupSiren(validation.digits, controller.signal);
        if (mySeq !== lookupSeq.current) return; // une saisie plus récente a invalidé celle-ci
        if (!result) {
          setSirenStatus({ kind: 'not_found' });
          return;
        }
        if (result.etatAdministratif === 'C') {
          setSirenStatus({ kind: 'closed', info: result });
          return;
        }
        setSirenStatus({ kind: 'verified', info: result });
        // Préremplit le nom du cabinet à partir de la raison sociale. On le fait
        // dès que le champ est vide, qu'il porte une valeur par défaut du trigger
        // DB, ou qu'on avait déjà rempli automatiquement (l'utilisateur peut
        // toujours réécrire derrière).
        const current = data.cabinetName.trim();
        const canAutofill =
          !current || isDefaultCabinetName(current) || nameAutoFilled.current;
        if (result.nomComplet && canAutofill) {
          nameAutoFilled.current = true;
          onUpdate({ cabinetName: result.nomComplet });
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (mySeq !== lookupSeq.current) return;
        setSirenStatus({
          kind: 'lookup_error',
          message: err instanceof Error ? err.message : 'Vérification impossible.',
        });
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // On ne dépend que de la version normalisée du SIREN — pas du nom du cabinet
    // pour éviter de re-déclencher la vérif à chaque frappe dans ce champ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.kind, validation.kind === 'ok' ? validation.digits : '']);

  const sirenOk = sirenStatus.kind === 'verified';
  const isValid =
    data.cabinetName.trim().length > 1 &&
    sirenOk &&
    /^\S+@\S+\.\S+$/.test(data.contactEmail);

  async function handleNext() {
    if (!isValid) {
      setError(
        sirenStatus.kind === 'verified'
          ? 'Merci de renseigner le nom du cabinet et un email valide.'
          : 'Le SIREN doit être vérifié avant de continuer.',
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-[22px] font-semibold tracking-tight text-foreground">Votre cabinet</h2>
      <p className="mb-6 mt-1.5 text-sm text-muted-foreground">
        Personnalisez le nom et renseignez le SIREN de votre cabinet.
      </p>

      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cabinetName">
            Nom du cabinet <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cabinetName"
            type="text"
            value={data.cabinetName}
            onChange={(e) => {
              nameAutoFilled.current = false;
              onUpdate({ cabinetName: e.target.value });
            }}
            placeholder="Cabinet Dupont & Associés"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="siren">
            SIREN du cabinet <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="siren"
              type="text"
              inputMode="numeric"
              maxLength={11}
              className={cn(
                'pr-10',
                sirenStatus.kind === 'verified' && 'border-green-600 focus-visible:ring-green-600/30',
                isSirenInvalid(sirenStatus) && 'border-destructive focus-visible:ring-destructive/30',
                sirenStatus.kind === 'lookup_error' && 'border-amber-500 focus-visible:ring-amber-500/30',
              )}
              value={data.siren}
              onChange={(e) => onUpdate({ siren: formatSiren(e.target.value) })}
              placeholder="123 456 789"
              required
              aria-invalid={isSirenInvalid(sirenStatus)}
            />
            <SirenStatusIcon status={sirenStatus} />
          </div>
          <SirenStatusMessage status={sirenStatus} />
          {sirenStatus.kind === 'verified' && <CompanyInfoCard info={sirenStatus.info} />}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">
              Email de contact <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contactEmail"
              type="email"
              value={data.contactEmail}
              onChange={(e) => onUpdate({ contactEmail: e.target.value })}
              placeholder="contact@cabinet.fr"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Téléphone</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={data.contactPhone}
              onChange={(e) => onUpdate({ contactPhone: e.target.value })}
              placeholder="+33 1 23 45 67 89"
            />
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <Button type="button" onClick={handleNext} disabled={submitting || !isValid}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Sauvegarde…
            </>
          ) : (
            'Suivant →'
          )}
        </Button>
      </div>
    </div>
  );
}

function isSirenInvalid(status: SirenStatus): boolean {
  return (
    status.kind === 'bad_checksum' ||
    status.kind === 'not_found' ||
    status.kind === 'closed'
  );
}

function SirenStatusIcon({ status }: { status: SirenStatus }) {
  const wrap = 'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2';
  switch (status.kind) {
    case 'looking_up':
      return (
        <span className={wrap} aria-label="Vérification en cours">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        </span>
      );
    case 'verified':
      return (
        <span
          className={cn(wrap, 'grid size-4.5 place-items-center rounded-full bg-green-600')}
          aria-label="SIREN vérifié"
        >
          <Check className="size-3 text-white" aria-hidden="true" />
        </span>
      );
    case 'bad_checksum':
    case 'not_found':
    case 'closed':
      return (
        <span
          className={cn(wrap, 'grid size-4.5 place-items-center rounded-full bg-destructive')}
          aria-label="SIREN invalide"
        >
          <X className="size-3 text-white" aria-hidden="true" />
        </span>
      );
    case 'lookup_error':
      return (
        <span className={wrap} aria-label="Vérification impossible">
          <AlertTriangle className="size-4 text-amber-500" aria-hidden="true" />
        </span>
      );
    default:
      return null;
  }
}

function SirenStatusMessage({ status }: { status: SirenStatus }) {
  switch (status.kind) {
    case 'idle':
      return <p className="text-xs text-muted-foreground">9 chiffres — visible sur votre Kbis.</p>;
    case 'too_short':
      return <p className="text-xs text-muted-foreground">Encore quelques chiffres…</p>;
    case 'bad_checksum':
      return (
        <p className="text-xs text-destructive">
          Numéro invalide — la clé de contrôle ne correspond pas.
        </p>
      );
    case 'looking_up':
      return <p className="text-xs text-muted-foreground">Vérification auprès du registre national…</p>;
    case 'not_found':
      return <p className="text-xs text-destructive">Aucune entreprise trouvée avec ce SIREN.</p>;
    case 'closed':
      return (
        <p className="text-xs text-destructive">
          {status.info.nomComplet || 'Cette entreprise'} est marquée comme cessée au registre.
        </p>
      );
    case 'verified':
      return (
        <p className="text-xs font-medium text-green-700">
          Société identifiée au registre national.
        </p>
      );
    case 'lookup_error':
      return (
        <p className="text-xs text-amber-600">Vérification impossible : {status.message}</p>
      );
  }
}

function CompanyInfoCard({ info }: { info: SirenLookupResult }) {
  const rows: Array<{ label: string; value: string }> = [];
  rows.push({ label: 'Raison sociale', value: info.nomComplet || '—' });
  if (info.sigle) rows.push({ label: 'Sigle', value: info.sigle });
  if (info.formeJuridique) rows.push({ label: 'Forme juridique', value: info.formeJuridique });
  if (info.siege.adresseComplete)
    rows.push({ label: 'Adresse du siège', value: info.siege.adresseComplete });
  if (info.siege.siret) rows.push({ label: 'SIRET du siège', value: info.siege.siret });
  if (info.dateCreation)
    rows.push({ label: 'Immatriculée le', value: formatFrenchDate(info.dateCreation) });
  if (info.activitePrincipale)
    rows.push({ label: 'Activité principale', value: info.activitePrincipale });
  if (info.trancheEffectifs) rows.push({ label: 'Effectif', value: info.trancheEffectifs });

  return (
    <Card className="mt-3 gap-0 border-green-600/40 bg-green-50/60 py-0 shadow-none">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-green-700">
          <BadgeCheck className="size-4" aria-hidden="true" />
          Société identifiée au registre national
        </div>
        <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="m-0 font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function formatFrenchDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
