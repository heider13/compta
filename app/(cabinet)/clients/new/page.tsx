'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { SirenSearch } from '@/components/cabinet/SirenSearch';
import {
  FORMES_JURIDIQUES,
  mapNatureJuridiqueToForme,
  type FormeJuridique,
  type PappersResult,
} from '@/lib/types';

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
    <>
      <div className="page-head">
        <div>
          <h1>Nouveau client</h1>
          <p>
            Étape {step === 'search' ? '1' : '2'} sur 2 —{' '}
            {step === 'search' ? 'recherche par SIREN' : 'informations complémentaires'}
          </p>
        </div>
        <Link href="/clients" className="btn btn-ghost">
          Annuler
        </Link>
      </div>

      {step === 'search' && (
        <div className="app-card app-card-pad" style={{ maxWidth: 720 }}>
          <h3 style={{ marginBottom: 8 }}>Recherche entreprise</h3>
          <p style={{ marginBottom: 20, fontSize: 14 }}>
            Saisissez le SIREN pour pré-remplir automatiquement les données depuis le
            registre national des entreprises.
          </p>
          <SirenSearch onSelect={handlePappersSelect} />
          <div className="divider" style={{ margin: '24px 0' }}></div>
          <button type="button" onClick={handleManual} className="btn btn-ghost">
            Saisie manuelle (pas de SIREN)
          </button>
        </div>
      )}

      {step === 'confirm' && (
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
                placeholder="6920Z"
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
              <label>Adresse du siège</label>
              <input
                type="text"
                value={form.adresse_libelle}
                onChange={(e) => update('adresse_libelle', e.target.value)}
                placeholder="12 rue de la Paix, 75002 Paris"
              />
            </div>
          </div>

          <h3 style={{ marginTop: 8, marginBottom: -4, fontSize: 15 }}>
            Contact principal
          </h3>
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
              placeholder="Visible uniquement par votre cabinet."
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setStep('search')}
              className="btn btn-ghost"
              disabled={submitting}
            >
              ← Retour
            </button>
            <button type="submit" className="btn btn-accent" disabled={submitting}>
              {submitting ? 'Enregistrement…' : 'Créer le client'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
