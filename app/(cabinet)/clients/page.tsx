import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  formatDateFr,
  formatSiren,
  getInitials,
  type Client,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

const GRID_TEMPLATE = '44px 1fr 160px 100px 140px 100px';

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .select(
      'id, denomination, siren, forme_juridique, archived_at, source, created_at',
    )
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  const clients = (data ?? []) as Pick<
    Client,
    | 'id'
    | 'denomination'
    | 'siren'
    | 'forme_juridique'
    | 'archived_at'
    | 'source'
    | 'created_at'
  >[];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p>
            {clients.length} {clients.length > 1 ? 'entreprises gérées' : 'entreprise gérée'}
          </p>
        </div>
        <Link href="/clients/new" className="btn btn-accent">
          + Nouveau client
        </Link>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          Erreur de chargement : {error.message}
        </div>
      )}

      <div className="app-card">
        <div className="app-table">
          <div
            className="app-table-head"
            style={{ gridTemplateColumns: GRID_TEMPLATE }}
          >
            <div></div>
            <div>Dénomination</div>
            <div>SIREN</div>
            <div>Forme</div>
            <div>Ajouté le</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          {clients.length === 0 && !error && (
            <div
              style={{
                padding: '64px 22px',
                textAlign: 'center',
                color: 'var(--ink-500)',
              }}
            >
              <p style={{ marginBottom: 14 }}>
                Aucun client pour l&apos;instant. Commencez par enregistrer votre première entreprise.
              </p>
              <Link href="/clients/new" className="btn btn-primary">
                + Nouveau client
              </Link>
            </div>
          )}

          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="app-table-row"
              style={{ gridTemplateColumns: GRID_TEMPLATE, textDecoration: 'none' }}
            >
              <div className="avatar">{getInitials(c.denomination)}</div>
              <div
                style={{
                  fontWeight: 500,
                  color: 'var(--ink-900)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.denomination}
              </div>
              <div className="mono" style={{ fontSize: 13, color: 'var(--ink-600)' }}>
                {formatSiren(c.siren)}
              </div>
              <div>
                {c.forme_juridique ? (
                  <span className="pill violet">{c.forme_juridique}</span>
                ) : (
                  <span style={{ color: 'var(--ink-400)' }}>—</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-600)' }}>
                {formatDateFr(c.created_at)}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="btn btn-link btn-sm">Ouvrir →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
