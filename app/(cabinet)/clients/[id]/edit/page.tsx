'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  FORMES_JURIDIQUES,
  formatAdresse,
  type AdresseSiege,
  type Client,
  type FormeJuridique,
} from '@/lib/types';

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
      <div className="app-card app-card-pad" style={{ color: 'var(--ink-500)' }}>
        Chargement…
      </div>
    );
  }
  if (!form) {
    return (
      <>
        <div className="page-head">
          <h1>Modifier le client</h1>
          <Link href="/clients" className="btn btn-ghost">
            ← Retour
          </Link>
        </div>
        <div className="form-error">{error ?? 'Client introuvable.'}</div>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Modifier le client</h1>
          <p>{form.denomination}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/clients/${id}`} className="btn btn-ghost">
            Annuler
          </Link>
          <button
            type="button"
            onClick={handleArchive}
            className="btn btn-ghost"
            disabled={archiving || submitting}
          >
            {archiving ? 'Archivage…' : 'Archiver'}
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="app-card app-card-pad form-grid"
        style={{ maxWidth: 820 }}
      >
        <div className="form-row">
          <div className="form-field">
            <label>Dénomination *</label>
            <input
              type="text"
              value={form.denomination}
              onChange={(e) => update('denomination', e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label>SIREN</label>
            <input
              type="text"
              value={form.siren}
              onChange={(e) => update('siren', e.target.value)}
              inputMode="numeric"
              maxLength={11}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Forme juridique</label>
            <select
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
          <div className="form-field">
            <label>Code NAF</label>
            <input
              type="text"
              value={form.code_naf}
              onChange={(e) => update('code_naf', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Date d&apos;immatriculation</label>
            <input
              type="date"
              value={form.date_immatriculation}
              onChange={(e) => update('date_immatriculation', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Capital social (€)</label>
            <input
              type="number"
              value={form.capital_social}
              onChange={(e) => update('capital_social', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="form-field">
          <label>Adresse du siège</label>
          <input
            type="text"
            value={form.adresse_libelle}
            onChange={(e) => update('adresse_libelle', e.target.value)}
          />
        </div>

        <h3 style={{ marginTop: 8, marginBottom: -4, fontSize: 15 }}>Contact principal</h3>
        <div className="form-row">
          <div className="form-field">
            <label>Prénom</label>
            <input
              type="text"
              value={form.contact_first_name}
              onChange={(e) => update('contact_first_name', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Nom</label>
            <input
              type="text"
              value={form.contact_last_name}
              onChange={(e) => update('contact_last_name', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => update('contact_email', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Téléphone</label>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => update('contact_phone', e.target.value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label>Note interne</label>
          <textarea
            value={form.note}
            onChange={(e) => update('note', e.target.value)}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Link href={`/clients/${id}`} className="btn btn-ghost">
            Annuler
          </Link>
          <button type="submit" className="btn btn-accent" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </>
  );
}
