// Page de déclenchement de signature électronique Yousign pour un dossier.
// Affiche un formulaire (prénom/nom/email signataire) + relaie l'appel au VPS.
// Si une demande de signature est déjà en cours, affiche son statut + lien Yousign.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const VPS_BACKEND_URL =
  process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://vps-84ac2579.vps.ovh.net';

interface DossierRow {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  statut: string;
  organization_id: string | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface SignatureMeta {
  signature_request_id?: string;
  signature_status?: string;
  signature_link?: string | null;
  signature_signer_email?: string;
  signature_requested_at?: string;
  signature_signed_at?: string;
}

// ─── Server Action : envoie la demande de signature ──────
async function sendSignatureRequest(formData: FormData) {
  'use server';

  const dossierId = String(formData.get('dossierId') ?? '');
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phoneNumber = String(formData.get('phoneNumber') ?? '').trim();

  if (!dossierId || !firstName || !lastName || !email) {
    redirect(`/dossiers/${dossierId}/sign?error=missing_fields`);
  }

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    redirect('/auth/login');
  }

  // Récupère l'org_id du dossier pour le header x-organization-id
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('organization_id')
    .eq('id', dossierId)
    .maybeSingle();

  try {
    const res = await fetch(
      `${VPS_BACKEND_URL}/api/dossiers/${dossierId}/sign-request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(dossier?.organization_id
            ? { 'x-organization-id': dossier.organization_id }
            : {}),
        },
        body: JSON.stringify({
          signer: {
            firstName,
            lastName,
            email,
            ...(phoneNumber ? { phoneNumber } : {}),
          },
        }),
        cache: 'no-store',
      },
    );
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      signatureRequestId?: string;
    };
    if (!res.ok) {
      const code = body.error || `http_${res.status}`;
      redirect(`/dossiers/${dossierId}/sign?error=${encodeURIComponent(code)}`);
    }
    redirect(`/dossiers/${dossierId}/sign?ok=1`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network_error';
    // Next.js redirect() throws — ne pas l'attraper comme erreur
    if (msg === 'NEXT_REDIRECT') throw err;
    redirect(`/dossiers/${dossierId}/sign?error=${encodeURIComponent(msg)}`);
  }
}

// ─── Server Action : renvoyer email (re-activate) ────────
async function resendSignatureEmail(formData: FormData) {
  'use server';

  const dossierId = String(formData.get('dossierId') ?? '');
  if (!dossierId) return;

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) redirect('/auth/login');

  // MVP : on relit juste le statut. Yousign relance automatiquement les
  // rappels selon la config de la signature_request. Pas d'endpoint
  // "resend" en v3 — on rafraîchit la page.
  redirect(`/dossiers/${dossierId}/sign?refreshed=1`);
}

export default async function DossierSignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: dossierRaw } = await supabase
    .from('dossiers')
    .select(
      'id, reference, client_name, type_formalite, statut, organization_id, user_id, metadata',
    )
    .eq('id', id)
    .maybeSingle();

  if (!dossierRaw) notFound();
  const dossier = dossierRaw as DossierRow;
  const meta: SignatureMeta = (dossier.metadata as SignatureMeta) || {};
  const hasPending = Boolean(meta.signature_request_id);
  const isSigned = meta.signature_status === 'signed';
  const isDeclined = meta.signature_status === 'declined';
  const isExpired = meta.signature_status === 'expired';

  const errorCode = typeof sp.error === 'string' ? sp.error : null;
  const okFlag = sp.ok === '1';

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          fontSize: 13,
          color: 'var(--ink-500)',
        }}
      >
        <Link href="/dossiers" style={{ color: 'var(--ink-500)' }}>
          ← Dossiers
        </Link>
        <span>/</span>
        <span className="mono">
          {dossier.reference ?? dossier.id.slice(0, 8)}
        </span>
        <span>/</span>
        <span>Signature</span>
      </div>

      <div className="page-head">
        <div>
          <h1 style={{ margin: 0 }}>Signature électronique</h1>
          <p style={{ marginTop: 4 }}>
            {dossier.client_name} · {dossier.type_formalite} ·{' '}
            <span className="mono">
              {dossier.reference ?? dossier.id.slice(0, 8)}
            </span>
          </p>
        </div>
      </div>

      {okFlag && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          Demande de signature envoyée. Le signataire va recevoir un email Yousign.
        </div>
      )}
      {errorCode && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          Erreur : <span className="mono">{errorCode}</span>
        </div>
      )}

      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Statut courant */}
          <div className="app-card">
            <div className="app-card-head">
              <h3>Statut</h3>
            </div>
            <div style={{ padding: 18 }}>
              {!hasPending ? (
                <p
                  style={{ margin: 0, color: 'var(--ink-500)', fontSize: 14 }}
                >
                  Aucune demande de signature envoyée pour ce dossier.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                  <KvRow
                    label="État"
                    value={
                      <strong
                        style={{
                          color: isSigned
                            ? '#065F46'
                            : isDeclined || isExpired
                              ? '#991B1B'
                              : 'var(--ink-900)',
                        }}
                      >
                        {meta.signature_status ?? 'pending'}
                      </strong>
                    }
                  />
                  <KvRow
                    label="Signataire"
                    value={meta.signature_signer_email ?? '—'}
                  />
                  <KvRow
                    label="Référence Yousign"
                    value={
                      <span className="mono" style={{ fontSize: 12 }}>
                        {meta.signature_request_id}
                      </span>
                    }
                  />
                  {meta.signature_requested_at && (
                    <KvRow
                      label="Envoyée le"
                      value={new Date(
                        meta.signature_requested_at,
                      ).toLocaleString('fr-FR')}
                    />
                  )}
                  {meta.signature_signed_at && (
                    <KvRow
                      label="Signée le"
                      value={new Date(meta.signature_signed_at).toLocaleString(
                        'fr-FR',
                      )}
                    />
                  )}
                  {meta.signature_link && !isSigned && (
                    <div style={{ marginTop: 8 }}>
                      <a
                        href={meta.signature_link}
                        target="_blank"
                        rel="noopener"
                        className="btn btn-ghost btn-sm"
                      >
                        Ouvrir le lien Yousign
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Formulaire */}
          {!isSigned && (
            <div className="app-card">
              <div className="app-card-head">
                <h3>
                  {hasPending && !isDeclined && !isExpired
                    ? 'Renvoyer / mettre à jour la demande'
                    : 'Envoyer la demande de signature'}
                </h3>
              </div>
              <div style={{ padding: 18 }}>
                {hasPending && !isDeclined && !isExpired ? (
                  <form action={resendSignatureEmail}>
                    <input type="hidden" name="dossierId" value={dossier.id} />
                    <p
                      style={{
                        fontSize: 13,
                        color: 'var(--ink-500)',
                        marginTop: 0,
                      }}
                    >
                      Une demande est déjà en cours. Yousign envoie
                      automatiquement des rappels. Cliquez pour rafraîchir le
                      statut.
                    </p>
                    <button
                      type="submit"
                      className="btn btn-ghost btn-sm"
                    >
                      Rafraîchir le statut
                    </button>
                  </form>
                ) : (
                  <form
                    action={sendSignatureRequest}
                    style={{ display: 'grid', gap: 12 }}
                  >
                    <input type="hidden" name="dossierId" value={dossier.id} />
                    <Field label="Prénom" name="firstName" required />
                    <Field label="Nom" name="lastName" required />
                    <Field
                      label="Email signataire"
                      name="email"
                      type="email"
                      required
                    />
                    <Field
                      label="Téléphone (OTP SMS, optionnel)"
                      name="phoneNumber"
                      placeholder="+33612345678"
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                      }}
                    >
                      <button type="submit" className="btn btn-accent btn-lg">
                        Envoyer la demande de signature
                      </button>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--ink-500)',
                        margin: 0,
                      }}
                    >
                      Signature avancée RGS via Yousign. Le signataire reçoit un
                      email avec un lien sécurisé.
                    </p>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        <aside style={{ display: 'grid', gap: 20 }}>
          <div className="app-card">
            <div className="app-card-head">
              <h3>Workflow</h3>
            </div>
            <div
              style={{
                padding: 18,
                fontSize: 13,
                color: 'var(--ink-600)',
                lineHeight: 1.55,
              }}
            >
              <ol style={{ paddingLeft: 18, margin: 0 }}>
                <li>Admin valide le dossier (modif / cessation INPI).</li>
                <li>Signature requise → cette page envoie au client.</li>
                <li>Client signe sur Yousign (RGS avancée).</li>
                <li>
                  Webhook reçoit la signature → dossier passe à
                  <strong> VALIDATED_INTERNAL</strong>.
                </li>
                <li>Push automatique vers l&apos;INPI.</li>
              </ol>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
      <span style={{ color: 'var(--ink-600)' }}>{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        style={{
          padding: '8px 10px',
          border: '1px solid var(--ink-200)',
          borderRadius: 8,
          fontFamily: 'inherit',
          fontSize: 13,
        }}
      />
    </label>
  );
}

function KvRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span style={{ color: 'var(--ink-500)' }}>{label}</span>
      <span style={{ color: 'var(--ink-900)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
