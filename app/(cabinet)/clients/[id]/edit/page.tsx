'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Archive, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  FORMES_JURIDIQUES,
  formatAdresse,
  type AdresseSiege,
  type Client,
  type FormeJuridique,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface EditState {
  denomination: string;
  siren: string;
  forme_juridique: FormeJuridique | '';
  code_naf: string;
  date_immatriculation: string;
  capital_social: string; // saisi en euros, converti en cents
  adresse_libelle: string;
  contact_email: string;
  contact_phone: string;
  contact_first_name: string;
  contact_last_name: string;
  note: string;
}

// Select natif stylé cohérent avec les Input shadcn (formulaire contrôlé).
const selectClass =
  'border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

function clientToState(c: Client): EditState {
  let adresseLibelle = '';
  if (c.adresse_siege) {
    if (c.adresse_siege.libelle != null) {
      adresseLibelle = String(c.adresse_siege.libelle);
    } else {
      const formatted = formatAdresse(c.adresse_siege);
      adresseLibelle = formatted === '—' ? '' : formatted;
    }
  }

  return {
    denomination: c.denomination ?? '',
    siren: c.siren ?? '',
    forme_juridique: c.forme_juridique ?? '',
    code_naf: c.code_naf ?? '',
    date_immatriculation: c.date_immatriculation ?? '',
    capital_social:
      c.capital_social_cents != null ? String(c.capital_social_cents / 100) : '',
    adresse_libelle: adresseLibelle,
    contact_email: c.contact_email ?? '',
    contact_phone: c.contact_phone ?? '',
    contact_first_name: c.contact_first_name ?? '',
    contact_last_name: c.contact_last_name ?? '',
    note: (c.metadata?.note as string | undefined) ?? '',
  };
}

export default function EditClientPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [form, setForm] = useState<EditState | null>(null);
  const [original, setOriginal] = useState<Client | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (err) {
        setError(err.message);
      } else if (!data) {
        setError('Client introuvable.');
      } else {
        const c = data as Client;
        setOriginal(c);
        setForm(clientToState(c));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  function update<K extends keyof EditState>(key: K, value: EditState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    if (!form.denomination.trim()) {
      setError('La dénomination est obligatoire.');
      return;
    }
    setSubmitting(true);
    try {
      const adresse: AdresseSiege | null = form.adresse_libelle.trim()
        ? { ...(original?.adresse_siege ?? {}), libelle: form.adresse_libelle.trim() }
        : null;

      const capitalCents =
        form.capital_social.trim() === ''
          ? null
          : Math.round(Number(form.capital_social.replace(',', '.')) * 100);

      const metadata: Record<string, unknown> = { ...(original?.metadata ?? {}) };
      if (form.note.trim()) {
        metadata.note = form.note.trim();
      } else {
        delete metadata.note;
      }

      const patch = {
        denomination: form.denomination.trim(),
        siren: form.siren.replace(/\D+/g, '') || null,
        forme_juridique: form.forme_juridique || null,
        code_naf: form.code_naf.trim() || null,
        date_immatriculation: form.date_immatriculation || null,
        capital_social_cents:
          capitalCents !== null && Number.isFinite(capitalCents) ? capitalCents : null,
        adresse_siege: adresse,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_first_name: form.contact_first_name.trim() || null,
        contact_last_name: form.contact_last_name.trim() || null,
        metadata,
      };

      const { error: upErr } = await supabase
        .from('clients')
        .update(patch)
        .eq('id', id);
      if (upErr) throw upErr;
      router.push(`/clients/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la mise à jour.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!confirm('Archiver ce client ? Il pourra être restauré ultérieurement.')) return;
    setArchiving(true);
    try {
      const { error: archErr } = await supabase
        .from('clients')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);
      if (archErr) throw archErr;
      router.push('/clients');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'archivage.");
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Chargement…
        </div>
      </div>
    );
  }
  if (!form) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Modifier le client</h1>
          <Button variant="ghost" asChild>
            <Link href="/clients">← Retour</Link>
          </Button>
        </div>
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error ?? 'Client introuvable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Modifier le client</h1>
          <p className="text-sm text-muted-foreground">{form.denomination}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href={`/clients/${id}`}>Annuler</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleArchive}
            disabled={archiving || submitting}
          >
            <Archive className="size-4" />
            {archiving ? 'Archivage…' : 'Archiver'}
          </Button>
        </div>
      </div>

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
                <Label htmlFor="capital_social">Capital social (€)</Label>
                <Input
                  id="capital_social"
                  type="number"
                  value={form.capital_social}
                  onChange={(e) => update('capital_social', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adresse">Adresse du siège</Label>
              <Input
                id="adresse"
                value={form.adresse_libelle}
                onChange={(e) => update('adresse_libelle', e.target.value)}
              />
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
              <Button variant="ghost" asChild>
                <Link href={`/clients/${id}`}>Annuler</Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
