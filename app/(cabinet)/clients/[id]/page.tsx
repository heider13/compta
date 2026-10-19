import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, FolderOpen, Mail, Pencil, Phone, Plus } from 'lucide-react';
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
import { typeFormaliteLabel } from '@/lib/utils/format';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';
import { EmptyState } from '@/components/cabinet/EmptyState';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={mono ? 'min-w-0 text-right font-mono text-xs tabular-nums' : 'min-w-0 text-right font-medium break-words'}>
        {value}
      </dd>
    </div>
  );
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
    <PageShell className="max-w-6xl">
      <PageHeader
        eyebrow={
          <>
            Client · <span className="tabular-nums">SIREN {formatSiren(c.siren)}</span>
          </>
        }
        title={
          <span className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 shrink-0 rounded-md">
              <AvatarFallback className="rounded-md border bg-background text-xs font-semibold text-muted-foreground">
                {getInitials(c.denomination)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate">{c.denomination}</span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/clients/${c.id}/edit`}>
                <Pencil className="size-4" />
                Modifier
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/dossiers/new?client_id=${c.id}`}>
                <Plus className="size-4" />
                Nouveau dossier
              </Link>
            </Button>
          </>
        }
      >
        {(c.forme_juridique || c.archived_at) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {c.forme_juridique && (
              <Badge variant="outline" className="border-brand-border bg-brand-soft text-brand-soft-foreground">
                {c.forme_juridique}
              </Badge>
            )}
            {c.archived_at && <Badge variant="secondary">Archivé</Badge>}
          </div>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Informations */}
          <Card className="gap-0 py-0">
            <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
              <CardTitle className="text-sm">Informations</CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-2">
              <dl className="divide-y">
                <InfoRow label="Adresse du siège" value={formatAdresse(c.adresse_siege)} />
                <InfoRow label="Code NAF" value={c.code_naf ?? '—'} mono />
                <InfoRow label="Capital social" value={formatCapital(c.capital_social_cents)} mono />
                <InfoRow label="Date d'immatriculation" value={formatDateFr(c.date_immatriculation)} mono />
                <InfoRow
                  label="Source"
                  value={<span className="label-mono text-foreground">{c.source}</span>}
                />
                <InfoRow label="Ajouté le" value={formatDateFr(c.created_at)} mono />
              </dl>
            </CardContent>
          </Card>

          {/* Dossiers récents */}
          <Card className="gap-0 py-0">
            <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-sm">Dossiers récents</CardTitle>
                <CardDescription className="text-xs">Les dernières formalités de ce client</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link href={`/dossiers?client_id=${c.id}`}>
                  Tout voir
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {dossiers.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="Aucun dossier"
                  description="Aucun dossier lié à ce client pour l'instant."
                  compact
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableBody>
                      {dossiers.map((d) => (
                        <TableRow key={d.id} className="group relative hover:bg-muted/50">
                          <TableCell className="pl-5 font-mono text-xs font-medium">
                            <Link
                              href={`/dossiers/${d.id}`}
                              className="after:absolute after:inset-0 focus-visible:outline-none"
                            >
                              {d.reference ?? d.client_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {typeFormaliteLabel(d.type_formalite)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge statut={d.statut} />
                          </TableCell>
                          <TableCell className="pr-5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                            {formatDateFr(d.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Données registre brutes */}
          {pappersEntries.length > 0 && (
            <Card className="gap-0 py-0">
              <CardContent className="p-0">
                <details>
                  <summary className="flex cursor-pointer items-center justify-between gap-2 rounded-xl px-5 py-4 text-sm font-semibold hover:bg-muted/50">
                    Données Pappers / RNE
                    <span className="label-mono">JSON · {pappersEntries.length} champs</span>
                  </summary>
                  <pre className="max-h-[480px] overflow-auto border-t bg-muted/40 p-5 font-mono text-xs leading-relaxed">
                    {JSON.stringify(c.pappers_data, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contact */}
        <Card className="h-fit min-w-0 gap-0 py-0">
          <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
            <CardTitle className="text-sm">Contact</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-2">
            <dl className="divide-y">
              <InfoRow label="Prénom" value={c.contact_first_name ?? '—'} />
              <InfoRow label="Nom" value={c.contact_last_name ?? '—'} />
              <InfoRow
                label="Email"
                value={
                  c.contact_email ? (
                    <a
                      href={`mailto:${c.contact_email}`}
                      className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                    >
                      <Mail className="size-3.5 shrink-0" />
                      {c.contact_email}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <InfoRow
                label="Téléphone"
                value={
                  c.contact_phone ? (
                    <a
                      href={`tel:${c.contact_phone}`}
                      className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                    >
                      <Phone className="size-3.5" />
                      {c.contact_phone}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
