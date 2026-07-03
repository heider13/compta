import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { formatDateFr, formatSiren } from '@/lib/types';
import { KvRow, EmptyState } from '@/components/admin/bits';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  siren: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  inpi_username: string | null;
  inpi_env: string | null;
  plan: string | null;
  created_at: string;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
}

interface MemberProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface OrgDossierRow {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
  statut: string;
  created_at: string;
}

export default async function AdminCabinetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: org }, { data: members }, { data: dossiers }] =
    await Promise.all([
      supabase
        .from('organizations')
        .select(
          'id, name, slug, siren, contact_email, contact_phone, inpi_username, inpi_env, plan, created_at',
        )
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('memberships')
        .select('id, user_id, role, joined_at')
        .eq('organization_id', id)
        .order('joined_at', { ascending: true }),
      supabase
        .from('dossiers')
        .select('id, reference, client_name, type_formalite, statut, created_at')
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

  if (!org) notFound();
  const o = org as OrgDetail;
  const memberRows = (members ?? []) as MemberRow[];
  const dossierRows = (dossiers ?? []) as OrgDossierRow[];

  // Lookup profiles séparément (pas de FK directe memberships → profiles)
  const memberIds = memberRows.map((m) => m.user_id);
  const profileById = new Map<string, MemberProfile>();
  if (memberIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', memberIds);
    for (const p of (profs ?? []) as MemberProfile[]) {
      profileById.set(p.id, p);
    }
  }

  return (
    <>
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/admin/cabinets" className="hover:text-foreground">
          ← Cabinets
        </Link>
        <span>/</span>
        <span className="text-foreground">{o.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{o.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{o.slug}</span>
            {' · '}
            <span className="font-mono text-xs">{formatSiren(o.siren)}</span>
            {' · Inscrit le '}
            {formatDateFr(o.created_at)}
          </p>
        </div>
        <Button
          type="button"
          disabled
          variant="outline"
          className="border-destructive/40 text-destructive"
          title="TODO : ajouter colonne archived_at à organizations"
        >
          Désactiver
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-5">
          <Card className="py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <KvRow label="Plan" value={o.plan ?? 'cabinet'} />
              <KvRow label="Email contact" value={o.contact_email ?? '—'} />
              <KvRow label="Téléphone" value={o.contact_phone ?? '—'} />
              <KvRow
                label="INPI mandataire"
                value={
                  o.inpi_username
                    ? `${o.inpi_username} (${o.inpi_env ?? 'prod'})`
                    : 'non configuré'
                }
              />
              <KvRow label="Inscrit le" value={formatDateFr(o.created_at)} last />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Membres ({memberRows.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {memberRows.length === 0 ? (
                <EmptyState label="Aucun membre." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Rejoint le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberRows.map((m) => {
                      const prof = profileById.get(m.user_id);
                      const fullName = [prof?.first_name, prof?.last_name]
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            {fullName || (
                              <span className="font-mono text-xs">
                                {m.user_id.slice(0, 8)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{m.role}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {formatDateFr(m.joined_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Derniers dossiers ({dossierRows.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {dossierRows.length === 0 ? (
                <EmptyState label="Aucun dossier pour ce cabinet." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Créé</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossierRows.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <Link href={`/admin/dossiers/${d.id}`} className="hover:underline">
                            {d.reference ?? d.id.slice(0, 8)}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/admin/dossiers/${d.id}`} className="hover:underline">
                            {d.client_name}
                          </Link>
                        </TableCell>
                        <TableCell>{d.type_formalite}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatDateFr(d.created_at)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge statut={d.statut} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Membres</span>
                <span className="font-semibold">{memberRows.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dossiers (50 derniers)</span>
                <span className="font-semibold">{dossierRows.length}</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
