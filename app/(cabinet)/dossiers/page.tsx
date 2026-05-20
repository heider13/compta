import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  DossierCard,
  type DossierCardData,
} from '@/components/cabinet/DossierCard';

export const dynamic = 'force-dynamic';

interface DossierRow {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  forme_juridique: string | null;
  statut: string;
  updated_at: string | null;
  created_at: string | null;
}

interface KanbanColumn {
  key: string;
  title: string;
  statuses: string[];
  tone: 'gray' | 'blue' | 'orange' | 'violet' | 'green';
}

const COLUMNS: KanbanColumn[] = [
  {
    key: 'draft',
    title: 'Brouillons',
    statuses: ['DRAFT'],
    tone: 'gray',
  },
  {
    key: 'awaiting',
    title: 'À valider',
    statuses: ['AWAITING_VALIDATION'],
    tone: 'blue',
  },
  {
    key: 'amendment',
    title: 'En correction',
    statuses: ['INTERNAL_AMENDMENT_PENDING'],
    tone: 'orange',
  },
  {
    key: 'inpi',
    title: "À l'INPI",
    statuses: [
      'RECEIVED',
      'VALIDATION_PENDING',
      'AMENDMENT_PENDING',
      'SIGNATURE_PENDING',
      'PAYMENT_PENDING',
    ],
    tone: 'violet',
  },
  {
    key: 'validated',
    title: 'Validés',
    statuses: ['VALIDATED'],
    tone: 'green',
  },
];

export default async function DossiersKanbanPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dossiers')
    .select(
      'id, reference, client_name, type_formalite, forme_juridique, statut, updated_at, created_at',
    )
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(500);

  const dossiers = (data ?? []) as DossierRow[];

  // Group by colonne
  const byColumn = new Map<string, DossierRow[]>();
  for (const col of COLUMNS) {
    byColumn.set(col.key, []);
  }
  for (const d of dossiers) {
    const col = COLUMNS.find((c) => c.statuses.includes(d.statut));
    if (col) {
      byColumn.get(col.key)!.push(d);
    }
  }

  const total = dossiers.length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dossiers</h1>
          <p>
            {total} {total > 1 ? 'dossiers' : 'dossier'} dans le pipeline
          </p>
        </div>
        <Link href="/dossiers/new" className="btn btn-accent">
          + Nouveau dossier
        </Link>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          Erreur de chargement : {error.message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(240px, 1fr))`,
          gap: 14,
          alignItems: 'flex-start',
          overflowX: 'auto',
          paddingBottom: 8,
        }}
      >
        {COLUMNS.map((col) => {
          const items = byColumn.get(col.key) ?? [];
          return (
            <div
              key={col.key}
              style={{
                background: 'var(--ink-100)',
                border: '1px solid var(--ink-150)',
                borderRadius: 14,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minHeight: 200,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 4px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span className={`pill ${col.tone}`} style={{ padding: '2px 8px' }}>
                    <span className="dot" />
                    {col.title}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--ink-500)',
                  }}
                >
                  {items.length}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  minHeight: 60,
                }}
              >
                {items.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-400)',
                      textAlign: 'center',
                      padding: '20px 8px',
                    }}
                  >
                    Aucun dossier
                  </div>
                ) : (
                  items.map((d) => {
                    const card: DossierCardData = {
                      id: d.id,
                      reference: d.reference,
                      client_name: d.client_name,
                      type_formalite: d.type_formalite,
                      forme_juridique: d.forme_juridique,
                      statut: d.statut,
                      updated_at: d.updated_at,
                      created_at: d.created_at,
                    };
                    return <DossierCard key={d.id} dossier={card} />;
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
