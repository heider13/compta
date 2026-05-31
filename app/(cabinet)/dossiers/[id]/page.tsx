import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusPill } from '@/components/cabinet/StatusPill';
import { formatDate, typeFormaliteLabel, formeJuridiqueLabel } from '@/lib/utils/format';
import { addObservation, submitToAdmin } from '@/lib/server-actions/dossiers';

const VPS_BACKEND_URL =
  process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://vps-84ac2579.vps.ovh.net';

const INPI_PORTAL_PROD = 'https://procedures-bis.inpi.fr/login';
const INPI_PORTAL_DEMO = 'https://procedures-demo.inpi.fr/login';

type InpiLive = { amountCents: number | null; status: string | null } | null;

async function fetchInpiLive(
  orgId: string | null,
  inpiRef: string | null,
  accessToken: string | null,
): Promise<InpiLive> {
  if (!orgId || !inpiRef || !accessToken) return null;
  try {
    const res = await fetch(
      `${VPS_BACKEND_URL}/api/formalites/${encodeURIComponent(inpiRef)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-organization-id': orgId,
        },
        cache: 'no-store',
        // 4 s : on n'attend pas indéfiniment l'INPI sur le chargement de page.
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return null;
    const j = (await res.json().catch(() => ({}))) as {
      amount?: number;
      cart?: { total?: number };
      status?: string;
    };
    const total = j?.amount ?? j?.cart?.total ?? null;
    // INPI renvoie le montant en EUR (float). On convertit en cents pour
    // l'affichage homogène avec le reste du code.
    const amountCents = total != null ? Math.round(Number(total) * 100) : null;
    return { amountCents, status: j?.status ?? null };
  } catch {
    return null;
  }
}

function formatEuros(cents: number | null): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default async function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dossier } = await supabase.from('dossiers').select('*').eq('id', id).single();
  if (!dossier) notFound();

  // Lit env INPI du cabinet pour pointer vers le bon portail (prod/demo).
  // En parallèle, on prépare l'access token pour l'éventuel fetch live.
  const [{ data: sessionData }, orgInfo] = await Promise.all([
    supabase.auth.getSession(),
    dossier.organization_id
      ? supabase
          .from('organizations')
          .select('inpi_env')
          .eq('id', dossier.organization_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const accessToken = sessionData.session?.access_token ?? null;
  const inpiEnv = (orgInfo.data?.inpi_env ?? 'prod') === 'demo' ? 'demo' : 'prod';
  const inpiPortalUrl = inpiEnv === 'demo' ? INPI_PORTAL_DEMO : INPI_PORTAL_PROD;

  const [{ data: observations }, { data: documents }, { data: tasks }, client, inpiLive] = await Promise.all([
    supabase.from('dossier_observations').select('*').eq('dossier_id', id).order('created_at', { ascending: true }),
    supabase.from('dossier_documents').select('*').eq('dossier_id', id).order('created_at', { ascending: true }),
    supabase.from('dossier_tasks').select('*').eq('dossier_id', id).order('done', { ascending: true }),
    dossier.client_id ? (await supabase.from('clients').select('id, denomination, siren').eq('id', dossier.client_id).single()).data : null,
    fetchInpiLive(dossier.organization_id, dossier.inpi_reference, accessToken),
  ]);

  const canSubmit = ['DRAFT', 'INTERNAL_AMENDMENT_PENDING'].includes(dossier.statut);

  return (
    <div className="app-content with-bg">
      <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 12 }}>
        <Link href="/dossiers" style={{ color: 'var(--ink-500)' }}>Dossiers</Link> · <span className="mono">{dossier.reference}</span>
      </div>

      <div className="page-head">
        <div>
          <h1 style={{ margin: 0 }}>{dossier.client_name}</h1>
          <p style={{ marginTop: 2 }}>
            {typeFormaliteLabel(dossier.type_formalite)}
            {dossier.forme_juridique && ` · ${formeJuridiqueLabel(dossier.forme_juridique)}`}
            {' · '}<span className="mono">{dossier.reference}</span>
          </p>
        </div>
        <StatusPill statut={dossier.statut} />
      </div>

      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          {dossier.inpi_reference && (
            <div
              className="app-card"
              style={{ border: '1px solid #F1C75A', background: '#FFFBEA' }}
            >
              <div className="app-card-head">
                <h3 style={{ color: '#8A5400' }}>Frais légaux INPI</h3>
              </div>
              <div style={{ padding: '16px 22px', display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 2 }}>
                      Montant à régler sur l&apos;INPI
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--ink-900)' }}>
                      {formatEuros(inpiLive?.amountCents ?? null)}
                    </div>
                  </div>
                  {inpiLive?.status && (
                    <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                      <div>Statut INPI</div>
                      <div className="mono" style={{ fontSize: 13, color: 'var(--ink-900)' }}>
                        {inpiLive.status}
                      </div>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 13, color: '#6B4400', margin: 0, lineHeight: 1.5 }}>
                  Le paiement des frais légaux (greffe, JAL, etc.) se fait directement sur
                  le portail officiel INPI Guichet Unique — Compta ne perçoit pas ces frais.
                  Connectez-vous avec les identifiants INPI du cabinet
                  {inpiEnv === 'demo' ? ' (environnement démo)' : ''} pour régler.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a
                    href={inpiPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-accent"
                    style={{ background: '#8A5400', borderColor: '#8A5400' }}
                  >
                    Régler sur le portail INPI →
                  </a>
                  {inpiLive == null && (
                    <span style={{ fontSize: 12, color: 'var(--ink-500)', alignSelf: 'center' }}>
                      Montant non disponible — connexion INPI requise pour rafraîchir.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {client && (
            <div className="app-card">
              <div className="app-card-head"><h3>Client</h3></div>
              <div className="app-card-pad" style={{ padding: '14px 22px' }}>
                <Link href={`/clients/${client.id}`} style={{ fontWeight: 500, color: 'var(--accent-ink)' }}>{client.denomination}</Link>
                {client.siren && <span className="mono" style={{ marginLeft: 12, color: 'var(--ink-500)', fontSize: 13 }}>{client.siren}</span>}
              </div>
            </div>
          )}

          <div className="app-card">
            <div className="app-card-head"><h3>Pièces jointes ({documents?.length ?? 0})</h3></div>
            <div style={{ padding: 16, display: 'grid', gap: 10 }}>
              {(documents ?? []).length === 0 && <p style={{ color: 'var(--ink-500)', fontSize: 13, padding: 12, margin: 0 }}>Aucune pièce uploadée.</p>}
              {(documents ?? []).map((d) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--ink-150)', borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>
                      {d.size_bytes ? `${(d.size_bytes / 1024).toFixed(0)} Ko · ` : ''}
                      {d.doc_type ? `${d.doc_type} · ` : ''}
                      {formatDate(d.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-head"><h3>Observations ({observations?.length ?? 0})</h3></div>
            <div style={{ padding: 18, display: 'grid', gap: 12 }}>
              {(observations ?? []).map((o) => (
                <div key={o.id} style={{
                  padding: 12, borderRadius: 10,
                  background: o.author_role === 'admin' ? '#FEF3C7' : 'var(--ink-50)',
                  borderLeft: `3px solid ${o.author_role === 'admin' ? '#F59E0B' : 'var(--accent)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-500)', marginBottom: 4 }}>
                    <strong>{o.author_role === 'admin' ? 'Admin' : 'Client'}</strong>
                    <span className="mono">{formatDate(o.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{o.message}</div>
                </div>
              ))}
              <form action={addObservation}>
                <input type="hidden" name="dossier_id" value={id} />
                <textarea name="message" placeholder="Écrire un message…" rows={3} required
                  style={{ width: '100%', padding: 10, border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="submit" className="btn btn-accent btn-sm">Envoyer</button>
                </div>
              </form>
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-head"><h3>Tâches ({tasks?.length ?? 0})</h3></div>
            <div style={{ padding: 16, display: 'grid', gap: 8 }}>
              {(tasks ?? []).length === 0 && <p style={{ color: 'var(--ink-500)', fontSize: 13, margin: 0 }}>Aucune tâche.</p>}
              {(tasks ?? []).map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: t.done ? 'var(--ink-50)' : 'transparent' }}>
                  <input type="checkbox" defaultChecked={t.done} disabled style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 13, flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-500)' : 'var(--ink-900)' }}>{t.title}</span>
                  {t.due_date && <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>{formatDate(t.due_date)}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 20 }}>
          <div className="app-card">
            <div className="app-card-head"><h3>Actions</h3></div>
            <div style={{ padding: 18, display: 'grid', gap: 10 }}>
              <Link href={`/dossiers/${id}/edit`} className="btn btn-ghost btn-lg" style={{ justifyContent: 'center' }}>Modifier</Link>
              {canSubmit && (
                <form action={async () => { 'use server'; await submitToAdmin(id); }}>
                  <button type="submit" className="btn btn-accent btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
                    Soumettre pour validation
                  </button>
                </form>
              )}
              {dossier.statut === 'VALIDATED_INTERNAL' && (
                <Link href={`/dossiers/${id}/sign`} className="btn btn-accent btn-lg" style={{ justifyContent: 'center' }}>
                  Demander la signature
                </Link>
              )}
              <a href={`/app.html?route=nouveau&type=${dossier.forme_juridique || dossier.type_formalite}&d=${id}`} className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }}>
                Continuer dans le wizard
              </a>
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-head"><h3>Informations</h3></div>
            <div>
              <Row label="Référence" value={<span className="mono">{dossier.reference}</span>} />
              <Row label="Type" value={typeFormaliteLabel(dossier.type_formalite)} />
              <Row label="Forme jur." value={formeJuridiqueLabel(dossier.forme_juridique)} />
              {dossier.siren && <Row label="SIREN" value={<span className="mono">{dossier.siren}</span>} />}
              <Row label="Priorité" value={dossier.priority || 'normal'} />
              {dossier.internal_due_date && <Row label="Échéance interne" value={formatDate(dossier.internal_due_date)} />}
              {dossier.inpi_reference && <Row label="ID INPI" value={<span className="mono">{dossier.inpi_reference}</span>} />}
              <Row label="Créé le" value={formatDate(dossier.created_at)} />
              <Row label="MAJ" value={formatDate(dossier.updated_at)} last />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 22px', borderBottom: last ? 'none' : '1px solid var(--ink-100)',
      fontSize: 13, gap: 12,
    }}>
      <span style={{ color: 'var(--ink-500)' }}>{label}</span>
      <span style={{ color: 'var(--ink-900)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
