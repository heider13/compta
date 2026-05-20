import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusPill } from '@/components/cabinet/StatusPill';
import { formatDateFr } from '@/lib/types';
import {
  validateDossierForm,
  requestAmendmentForm,
  addObservationForm,
} from '@/lib/server-actions/admin';

export const dynamic = 'force-dynamic';

interface DossierFull {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  forme_juridique: string | null;
  statut: string;
  created_at: string;
  updated_at: string | null;
  assigned_to: string | null;
  inpi_reference: string | null;
  siren: string | null;
  user_id: string | null;
  organization_id: string | null;
  // Tolérant : inpi_content peut ne pas exister sur d'anciennes installs.
  inpi_content?: unknown;
  organizations: { id: string; name: string } | null;
}

interface DocumentRow {
  id: string;
  name: string;
  file_path: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  status: string | null;
  created_at: string;
}

interface ObservationRow {
  id: string;
  author_id: string;
  author_role: 'admin' | 'client';
  message: string;
  resolved: boolean;
  created_at: string;
}

const SIGNED_URL_TTL = 300;

export default async function AdminDossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: dossier }, { data: docsData }, { data: obsData }] =
    await Promise.all([
      supabase
        .from('dossiers')
        .select(
          'id, reference, client_name, type_formalite, forme_juridique, statut, created_at, updated_at, assigned_to, inpi_reference, siren, user_id, organization_id, organizations(id, name)',
        )
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('dossier_documents')
        .select('id, name, file_path, size_bytes, mime_type, status, created_at')
        .eq('dossier_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('dossier_observations')
        .select('id, author_id, author_role, message, resolved, created_at')
        .eq('dossier_id', id)
        .order('created_at', { ascending: true }),
    ]);

  if (!dossier) notFound();
  const d = dossier as unknown as DossierFull;

  // inpi_content lue séparément : tolérante si la colonne n'existe pas
  // sur certaines installations.
  let inpiContent: unknown = null;
  try {
    const { data: ic } = await supabase
      .from('dossiers')
      .select('inpi_content')
      .eq('id', id)
      .maybeSingle();
    inpiContent = (ic as { inpi_content?: unknown } | null)?.inpi_content ?? null;
  } catch {
    // colonne absente — on ignore
  }
  d.inpi_content = inpiContent;
  const docs = (docsData ?? []) as DocumentRow[];
  const obs = (obsData ?? []) as ObservationRow[];

  // Récupère le profile de l'auteur séparément (pas de FK directe dossiers → profiles)
  let authorProfile: { first_name: string | null; last_name: string | null } | null = null;
  if (d.user_id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', d.user_id)
      .maybeSingle();
    authorProfile = prof ?? null;
  }

  // Création de signed URLs pour chaque document (best-effort).
  const docsWithUrl = await Promise.all(
    docs.map(async (doc) => {
      if (!doc.file_path) return { ...doc, signedUrl: null };
      const { data } = await supabase.storage
        .from('dossier-docs')
        .createSignedUrl(doc.file_path, SIGNED_URL_TTL);
      return { ...doc, signedUrl: data?.signedUrl ?? null };
    }),
  );

  const author = authorProfile
    ? [authorProfile.first_name, authorProfile.last_name].filter(Boolean).join(' ')
    : '';
  const canValidate = d.statut === 'AWAITING_VALIDATION';

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
        <Link href="/admin/queue" style={{ color: 'var(--ink-500)' }}>
          ← À valider
        </Link>
        <span>/</span>
        <span className="mono">{d.reference ?? d.id.slice(0, 8)}</span>
      </div>

      <div className="page-head">
        <div>
          <h1 style={{ margin: 0 }}>{d.client_name}</h1>
          <p style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span>{d.type_formalite}</span>
            <span>·</span>
            <span className="mono">{d.reference ?? d.id.slice(0, 8)}</span>
            <span>·</span>
            <span>Cabinet : {d.organizations?.name ?? '—'}</span>
            {author && (
              <>
                <span>·</span>
                <span>Soumis par {author}</span>
              </>
            )}
          </p>
          {d.forme_juridique && (
            <span
              className="pill violet"
              style={{ marginTop: 10, fontSize: 12 }}
            >
              {d.forme_juridique}
            </span>
          )}
        </div>
        <StatusPill statut={d.statut} />
      </div>

      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Métadonnées */}
          <div className="app-card">
            <div className="app-card-head">
              <h3>Informations</h3>
            </div>
            <div style={{ padding: '6px 0' }}>
              <KvRow label="Type formalité" value={d.type_formalite} />
              <KvRow
                label="Forme juridique"
                value={d.forme_juridique ?? '—'}
              />
              <KvRow
                label="SIREN"
                value={
                  d.siren ? <span className="mono">{d.siren}</span> : '—'
                }
              />
              <KvRow
                label="Référence INPI"
                value={
                  d.inpi_reference ? (
                    <span className="mono">{d.inpi_reference}</span>
                  ) : (
                    '—'
                  )
                }
              />
              <KvRow
                label="Cabinet"
                value={
                  d.organizations ? (
                    <Link
                      href={`/admin/cabinets/${d.organizations.id}`}
                      style={{ color: 'var(--accent-ink)' }}
                    >
                      {d.organizations.name}
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
              <KvRow
                label="Assigné à"
                value={d.assigned_to ? (
                  <span className="mono">{d.assigned_to.slice(0, 8)}</span>
                ) : '—'}
              />
              <KvRow label="Créé le" value={formatDateFr(d.created_at)} />
              <KvRow
                label="Mis à jour"
                value={formatDateFr(d.updated_at ?? d.created_at)}
                last
              />
            </div>
          </div>

          {/* INPI content */}
          <div className="app-card">
            <div className="app-card-head">
              <h3>Données INPI saisies</h3>
            </div>
            <div style={{ padding: 16 }}>
              {d.inpi_content ? (
                <details style={{ fontSize: 12 }}>
                  <summary
                    style={{
                      cursor: 'pointer',
                      color: 'var(--ink-600)',
                      marginBottom: 8,
                    }}
                  >
                    Voir le payload JSON complet
                  </summary>
                  <pre
                    style={{
                      background: 'var(--ink-50)',
                      padding: 12,
                      borderRadius: 8,
                      fontSize: 11,
                      overflow: 'auto',
                      maxHeight: 400,
                    }}
                  >
                    {JSON.stringify(d.inpi_content, null, 2)}
                  </pre>
                </details>
              ) : (
                <p
                  style={{
                    color: 'var(--ink-500)',
                    fontSize: 13,
                    margin: 0,
                  }}
                >
                  Aucun contenu INPI enregistré.
                </p>
              )}
            </div>
          </div>

          {/* Pièces */}
          <div className="app-card">
            <div className="app-card-head">
              <h3>Pièces ({docsWithUrl.length})</h3>
            </div>
            <div style={{ padding: 16, display: 'grid', gap: 10 }}>
              {docsWithUrl.length === 0 && (
                <p
                  style={{
                    color: 'var(--ink-500)',
                    fontSize: 13,
                    padding: 12,
                  }}
                >
                  Aucune pièce uploadée.
                </p>
              )}
              {docsWithUrl.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    border: '1px solid var(--ink-150)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.name}
                    </div>
                    <div
                      style={{ fontSize: 11, color: 'var(--ink-500)' }}
                    >
                      {doc.size_bytes
                        ? `${Math.round(doc.size_bytes / 1024)} Ko · `
                        : ''}
                      {doc.status ? `${doc.status} · ` : ''}
                      {formatDateFr(doc.created_at)}
                    </div>
                  </div>
                  {doc.signedUrl ? (
                    <a
                      href={doc.signedUrl}
                      target="_blank"
                      rel="noopener"
                      className="btn btn-ghost btn-sm"
                    >
                      Télécharger
                    </a>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-400)',
                      }}
                    >
                      indisponible
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Observations */}
          <div className="app-card">
            <div className="app-card-head">
              <h3>Observations ({obs.length})</h3>
            </div>
            <div style={{ padding: 18, display: 'grid', gap: 12 }}>
              {obs.length === 0 && (
                <p style={{ color: 'var(--ink-500)', fontSize: 13 }}>
                  Aucune observation.
                </p>
              )}
              {obs.map((o) => (
                <div
                  key={o.id}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background:
                      o.author_role === 'admin'
                        ? '#FEF3C7'
                        : 'var(--ink-50)',
                    borderLeft: `3px solid ${
                      o.author_role === 'admin'
                        ? '#F59E0B'
                        : 'var(--accent)'
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                      fontSize: 12,
                      color: 'var(--ink-500)',
                    }}
                  >
                    <strong>
                      {o.author_role === 'admin'
                        ? 'Admin Compta'
                        : author || 'Client'}
                    </strong>
                    <span className="mono">
                      {new Date(o.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}
                  >
                    {o.message}
                  </div>
                </div>
              ))}

              <form action={addObservationForm} style={{ marginTop: 4 }}>
                <input type="hidden" name="dossierId" value={d.id} />
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Message pour le cabinet…"
                  required
                  style={{
                    width: '100%',
                    padding: 10,
                    border: '1px solid var(--ink-200)',
                    borderRadius: 8,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    resize: 'vertical',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: 8,
                  }}
                >
                  <button
                    type="submit"
                    className="btn btn-ghost btn-sm"
                  >
                    Envoyer comme commentaire
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <aside style={{ display: 'grid', gap: 20 }}>
          <div className="app-card">
            <div className="app-card-head">
              <h3>Actions</h3>
            </div>
            <div
              style={{
                padding: 18,
                display: 'grid',
                gap: 10,
              }}
            >
              {canValidate ? (
                <>
                  <form action={validateDossierForm}>
                    <input type="hidden" name="dossierId" value={d.id} />
                    <input type="hidden" name="sendToInpi" value="true" />
                    <button
                      type="submit"
                      className="btn btn-accent btn-lg"
                      style={{ width: '100%' }}
                    >
                      Valider + envoyer INPI
                    </button>
                  </form>
                  <form action={validateDossierForm}>
                    <input type="hidden" name="dossierId" value={d.id} />
                    <input type="hidden" name="sendToInpi" value="false" />
                    <button
                      type="submit"
                      className="btn btn-ghost btn-lg"
                      style={{ width: '100%' }}
                    >
                      Valider sans INPI
                    </button>
                  </form>
                  <form action={requestAmendmentForm}>
                    <input type="hidden" name="dossierId" value={d.id} />
                    <textarea
                      name="message"
                      rows={2}
                      placeholder="Raison de la demande de correction…"
                      required
                      style={{
                        width: '100%',
                        padding: 8,
                        border: '1px solid var(--ink-200)',
                        borderRadius: 8,
                        fontFamily: 'inherit',
                        fontSize: 12,
                        resize: 'vertical',
                        marginBottom: 8,
                      }}
                    />
                    <button
                      type="submit"
                      className="btn btn-ghost btn-sm"
                      style={{
                        width: '100%',
                        border: '1px solid #F59E0B',
                        color: '#92400E',
                      }}
                    >
                      Demander correction
                    </button>
                  </form>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-500)',
                      margin: 0,
                      marginTop: 6,
                    }}
                  >
                    « Valider + envoyer INPI » relaie au backend VPS (creds
                    mandataires). « Valider sans INPI » marque seulement le
                    dossier comme validé en interne.
                  </p>
                </>
              ) : (
                <p
                  style={{
                    color: 'var(--ink-500)',
                    fontSize: 13,
                    margin: 0,
                  }}
                >
                  Aucune action requise. Statut actuel :{' '}
                  <strong>{d.statut}</strong>
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function KvRow({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 22px',
        borderBottom: last ? 'none' : '1px solid var(--ink-100)',
        fontSize: 13,
        gap: 12,
      }}
    >
      <span style={{ color: 'var(--ink-500)' }}>{label}</span>
      <span
        style={{
          color: 'var(--ink-900)',
          fontWeight: 500,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}
