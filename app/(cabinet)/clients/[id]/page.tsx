import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Mail, Pencil, Phone, Plus } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
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
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-12">
            <AvatarFallback className="bg-accent text-base font-semibold text-accent-foreground">
              {getInitials(c.denomination)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{c.denomination}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">SIREN {formatSiren(c.siren)}</span>
              {c.forme_juridique && (
                <Badge variant="outline" className="border-accent bg-accent/50 text-accent-foreground">
                  {c.forme_juridique}
                </Badge>
              )}
              {c.archived_at && <Badge variant="secondary">Archivé</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/clients/${c.id}/edit`}>
              <Pencil className="size-4" />
              Modifier
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dossiers/new?client_id=${c.id}`}>
              <Plus className="size-4" />
              Nouveau dossier
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {/* Informations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Adresse du siège" value={formatAdresse(c.adresse_siege)} />
              <InfoRow label="Code NAF" value={c.code_naf ?? '—'} />
              <InfoRow label="Capital social" value={formatCapital(c.capital_social_cents)} />
              <InfoRow label="Date d'immatriculation" value={formatDateFr(c.date_immatriculation)} />
              <InfoRow label="Source" value={c.source} />
              <InfoRow label="Ajouté le" value={formatDateFr(c.created_at)} />
            </CardContent>
          </Card>

          {/* Dossiers récents */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Dossiers récents</CardTitle>
              <Button variant="link" size="sm" asChild>
                <Link href={`/dossiers?client_id=${c.id}`}>
                  Tout voir
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {dossiers.length === 0 ? (
                <p className="px-6 pb-5 text-sm text-muted-foreground">
                  Aucun dossier lié à ce client pour l&apos;instant.
                </p>
              ) : (
                <Table>
                  <TableBody>
                    {dossiers.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">
                          <Link href={`/dossiers/${d.id}`} className="hover:underline">
                            {d.reference ?? d.client_name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {typeFormaliteLabel(d.type_formalite)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge statut={d.statut} />
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDateFr(d.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Données registre brutes */}
          {pappersEntries.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <details>
                  <summary className="cursor-pointer text-sm font-semibold">
                    Données Pappers / RNE
                  </summary>
                  <pre className="mt-3 max-h-[480px] overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                    {JSON.stringify(c.pappers_data, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contact */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Prénom" value={c.contact_first_name ?? '—'} />
            <InfoRow label="Nom" value={c.contact_last_name ?? '—'} />
            <InfoRow
              label="Email"
              value={
                c.contact_email ? (
                  <a
                    href={`mailto:${c.contact_email}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Mail className="size-3.5" />
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
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Phone className="size-3.5" />
                    {c.contact_phone}
                  </a>
                ) : (
                  '—'
                )
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
