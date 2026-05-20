import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  formatAdresse,
  formatCapital,
  formatDateFr,
  formatSiren,
  getInitials,
  type Client,
  type Dossier,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Erreur Supabase : ${error.message}`);
  }
  if (!client) {
    notFound();
  }

  const c = client as Client;

  const { data: dossiersData } = await supabase
    .from('dossiers')
    .select('id, reference, client_name, type_formalite, statut, created_at')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  const dossiers = (dossiersData ?? []) as Pick<
    Dossier,
    'id' | 'reference' | 'client_name' | 'type_formalite' | 'statut' | 'created_at'
  >[];

  const pappersEntries = c.pappers_data
    ? Object.entries(c.pappers_data).filter(([, v]) => v != null)
    : [];

  return (
    <>
      <div className="page-head">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="avatar avatar-lg">{getInitials(c.denomination)}</div>
          <div>
            <h1 style={{ marginBottom: 4 }}>{c.denomination}</h1>
            <p style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="mono">SIREN {formatSiren(c.siren)}</span>
              {c.forme_juridique && (
                <span className="pill violet">{c.forme_juridique}</span>
              )}
              {c.archived_at && <span className="pill gray">Archivé</span>}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/clients/${c.id}/edit`} className="btn btn-ghost">
            Modifier
          </Link>
          <button type="button" className="btn btn-ghost" disabled>
            Archiver
          </button>
          <Link href={`/dossiers/new?client_id=${c.id}`} className="btn btn-accent">
            + Nouveau dossier
          </Link>
        </div>
      </div>

      <div className="detail-grid">
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="app-card">
            <div className="app-card-head">
              <h3>Informations</h3>
            </div>
            <div className="app-card-pad">
              <div className="kv-list">
                <div className="kv-row">
                  <span className="k">Adresse du siège</span>
                  <span className="v">{formatAdresse(c.adresse_siege)}</span>
                </div>
                <div className="kv-row">
                  <span className="k">Code NAF</span>
                  <span className="v">{c.code_naf ?? '—'}</span>
                </div>
                <div className="kv-row">
                  <span className="k">Capital social</span>
                  <span className="v">{formatCapital(c.capital_social_cents)}</span>
                </div>
                <div className="kv-row">
                  <span className="k">Date d&apos;immatriculation</span>
                  <span className="v">{formatDateFr(c.date_immatriculation)}</span>
                </div>
                <div className="kv-row">
                  <span className="k">Source</span>
                  <span className="v">{c.source}</span>
                </div>
                <div className="kv-row">
                  <span className="k">Ajouté le</span>
                  <span className="v">{formatDateFr(c.created_at)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="app-card">
            <div className="app-card-head">
              <h3>Dossiers récents</h3>
              <Link href={`/dossiers?client_id=${c.id}`} className="btn btn-link btn-sm">
                Tout voir →
              </Link>
            </div>
            {dossiers.length === 0 ? (
              <div
                className="app-card-pad"
                style={{ color: 'var(--ink-500)', fontSize: 14 }}
              >
                Aucun dossier lié à ce client pour l&apos;instant.
              </div>
            ) : (
              <div className="app-table">
                {dossiers.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dossiers/${d.id}`}
                    className="app-table-row"
                    style={{
                      gridTemplateColumns: '1fr 160px 140px 120px',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>
                      {d.reference ?? d.client_name}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-600)' }}>
                      {d.type_formalite}
                    </div>
                    <div>
                      <span className="pill blue">{d.statut}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
                      {formatDateFr(d.created_at)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {pappersEntries.length > 0 && (
            <section className="app-card">
              <details>
                <summary
                  className="app-card-head"
                  style={{ cursor: 'pointer', listStyle: 'none' }}
                >
                  <h3>Données Pappers / RNE</h3>
                  <span className="btn btn-link btn-sm">Afficher</span>
                </summary>
                <div className="app-card-pad">
                  <pre
                    style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      background: 'var(--ink-50)',
                      padding: 14,
                      borderRadius: 10,
                      overflow: 'auto',
                      margin: 0,
                      maxHeight: 480,
                    }}
                  >
                    {JSON.stringify(c.pappers_data, null, 2)}
                  </pre>
                </div>
              </details>
            </section>
          )}
        </div>

        <aside style={{ display: 'grid', gap: 16 }}>
          <section className="app-card">
            <div className="app-card-head">
              <h3>Contact</h3>
            </div>
            <div className="app-card-pad">
              <div className="kv-list">
                <div className="kv-row">
                  <span className="k">Prénom</span>
                  <span className="v">{c.contact_first_name ?? '—'}</span>
                </div>
                <div className="kv-row">
                  <span className="k">Nom</span>
                  <span className="v">{c.contact_last_name ?? '—'}</span>
                </div>
                <div className="kv-row">
                  <span className="k">Email</span>
                  <span className="v">
                    {c.contact_email ? (
                      <a
                        href={`mailto:${c.contact_email}`}
                        style={{ color: 'var(--accent-ink)' }}
                      >
                        {c.contact_email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                <div className="kv-row">
                  <span className="k">Téléphone</span>
                  <span className="v">
                    {c.contact_phone ? (
                      <a
                        href={`tel:${c.contact_phone}`}
                        style={{ color: 'var(--accent-ink)' }}
                      >
                        {c.contact_phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
