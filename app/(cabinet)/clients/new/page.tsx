'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, PenLine } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SirenSearch } from '@/components/cabinet/SirenSearch';
import {
  FORMES_JURIDIQUES,
  mapNatureJuridiqueToForme,
  type FormeJuridique,
  type PappersResult,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

type Step = 'search' | 'confirm';

interface FormState {
  denomination: string;
  siren: string;
  forme_juridique: FormeJuridique | '';
  code_naf: string;
  date_immatriculation: string;
  adresse_libelle: string;
  contact_email: string;
  contact_phone: string;
  contact_first_name: string;
  contact_last_name: string;
  note: string;
}

const EMPTY_FORM: FormState = {
  denomination: '',
  siren: '',
  forme_juridique: '',
  code_naf: '',
  date_immatriculation: '',
  adresse_libelle: '',
  contact_email: '',
  contact_phone: '',
  contact_first_name: '',
  contact_last_name: '',
  note: '',
};

// Select natif stylé cohérent avec les Input shadcn (formulaire contrôlé).
const selectClass =
  'border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

function isoFromAnyDate(input: string | undefined): string {
  if (!input) return '';
  // Format YYYY-MM-DD ou DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const m = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return input;
}

export default function NewClientPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>('search');
  const [pappers, setPappers] = useState<PappersResult | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePappersSelect(result: PappersResult) {
    setPappers(result);
    setForm((prev) => ({
      ...prev,
      denomination: result.nom_complet ?? prev.denomination,
      siren: result.siren ?? prev.siren,
      forme_juridique:
        mapNatureJuridiqueToForme(result.nature_juridique) ?? prev.forme_juridique,
      code_naf: result.activite_principale ?? prev.code_naf,
      date_immatriculation: isoFromAnyDate(result.date_creation),
      adresse_libelle: result.etablissement_siege?.adresse ?? prev.adresse_libelle,
    }));
    setStep('confirm');
  }

  function handleManual() {
    setPappers(null);
    setForm(EMPTY_FORM);
    setStep('confirm');
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.denomination.trim()) {
      setError('La dénomination est obligatoire.');
      return;
    }

    setSubmitting(true);
    try {
      // Récupère l'org id du user via la table memberships
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        throw new Error('Session expirée, reconnectez-vous.');
      }
      const { data: memberships, error: mErr } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', userData.user.id)
        .order('joined_at', { ascending: true })
        .limit(1);
      if (mErr) throw mErr;
      const orgId = memberships?.[0]?.organization_id;
      if (!orgId) {
        throw new Error("Aucun cabinet rattaché à votre compte.");
      }

      const payload = {
        organization_id: orgId,
        denomination: form.denomination.trim(),
        siren: form.siren.replace(/\D+/g, '') || null,
        forme_juridique: form.forme_juridique || null,
        code_naf: form.code_naf.trim() || null,
        date_immatriculation: form.date_immatriculation || null,
        adresse_siege: form.adresse_libelle
          ? { libelle: form.adresse_libelle.trim() }
          : null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_first_name: form.contact_first_name.trim() || null,
        contact_last_name: form.contact_last_name.trim() || null,
        pappers_data: pappers as unknown as Record<string, unknown> | null,
        source: pappers ? 'pappers' : 'manual',
        metadata: form.note.trim() ? { note: form.note.trim() } : {},
      };

      const { data, error: insertErr } = await supabase
        .from('clients')
        .insert(payload)
        .select('id')
        .single();
      if (insertErr) throw insertErr;
      router.push(`/clients/${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de l'enregistrement.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nouveau client</h1>
          <p className="text-sm text-muted-foreground">
            Étape {step === 'search' ? '1' : '2'} sur 2 —{' '}
            {step === 'search' ? 'recherche par SIREN' : 'informations complémentaires'}
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/clients">Annuler</Link>
        </Button>
      </div>

      {step === 'search' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recherche entreprise</CardTitle>
            <CardDescription>
              Saisissez le SIREN pour pré-remplir automatiquement les données depuis le
              registre national des entreprises.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <SirenSearch onSelect={handlePappersSelect} />
            <Separator />
            <Button type="button" variant="outline" onClick={handleManual}>
              <PenLine className="size-4" />
              Saisie manuelle (pas de SIREN)
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'confirm' && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations de la société</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="denomination">
                    Dénomination <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="denomination"
                    value={form.denomination}
                    onChange={(e) => update('denomination', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="siren">SIREN</Label>
                  <Input
                    id="siren"
                    value={form.siren}
                    onChange={(e) => update('siren', e.target.value)}
                    inputMode="numeric"
                    maxLength={11}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="forme_juridique">Forme juridique</Label>
                  <select
                    id="forme_juridique"
                    className={selectClass}
                    value={form.forme_juridique}
                    onChange={(e) =>
                      update('forme_juridique', e.target.value as FormeJuridique | '')
                    }
                  >
                    <option value="">—</option>
                    {FORMES_JURIDIQUES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="code_naf">Code NAF</Label>
                  <Input
                    id="code_naf"
                    value={form.code_naf}
                    onChange={(e) => update('code_naf', e.target.value)}
                    placeholder="6920Z"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="date_immatriculation">Date d&apos;immatriculation</Label>
                  <Input
                    id="date_immatriculation"
                    type="date"
                    value={form.date_immatriculation}
                    onChange={(e) => update('date_immatriculation', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adresse">Adresse du siège</Label>
                  <Input
                    id="adresse"
                    value={form.adresse_libelle}
                    onChange={(e) => update('adresse_libelle', e.target.value)}
                    placeholder="12 rue de la Paix, 75002 Paris"
                  />
                </div>
              </div>

              <Separator className="my-2" />
              <h3 className="text-sm font-semibold">Contact principal</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contact_first_name">Prénom</Label>
                  <Input
                    id="contact_first_name"
                    value={form.contact_first_name}
                    onChange={(e) => update('contact_first_name', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_last_name">Nom</Label>
                  <Input
                    id="contact_last_name"
                    value={form.contact_last_name}
                    onChange={(e) => update('contact_last_name', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => update('contact_email', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_phone">Téléphone</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => update('contact_phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note">Note interne</Label>
                <Textarea
                  id="note"
                  value={form.note}
                  onChange={(e) => update('note', e.target.value)}
                  placeholder="Visible uniquement par votre cabinet."
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('search')}
                  disabled={submitting}
                >
                  <ArrowLeft className="size-4" />
                  Retour
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Enregistrement…' : 'Créer le client'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
