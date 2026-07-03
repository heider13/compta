import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, Send, ShieldCheck, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/cabinet/StatusBadge';
import { formatDateFr } from '@/lib/types';
import {
  validateDossierForm,
  requestAmendmentForm,
  addObservationForm,
} from '@/lib/server-actions/admin';
import { KvRow, EmptyState } from '@/components/admin/bits';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/admin/queue" className="hover:text-foreground">
          ← À valider
        </Link>
        <span>/</span>
        <span className="font-mono text-xs">{d.reference ?? d.id.slice(0, 8)}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{d.client_name}</h1>
          <p className="flex flex-wrap gap-x-2 text-sm text-muted-foreground">
            <span>{d.type_formalite}</span>
            <span>·</span>
            <span className="font-mono text-xs">{d.reference ?? d.id.slice(0, 8)}</span>
            <span>·</span>
            <span>Cabinet : {d.organizations?.name ?? '—'}</span>
            {author && (
              <>
                <span>·</span>
                <span>Soumis par {author}</span>
              </>
            )}
          </p>
          {d.forme_juridique && <Badge variant="secondary">{d.forme_juridique}</Badge>}
        </div>
        <StatusBadge statut={d.statut} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          {/* Métadonnées */}
          <Card className="py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <KvRow label="Type formalité" value={d.type_formalite} />
              <KvRow label="Forme juridique" value={d.forme_juridique ?? '—'} />
              <KvRow
                label="SIREN"
                value={d.siren ? <span className="font-mono">{d.siren}</span> : '—'}
              />
              <KvRow
                label="Référence INPI"
                value={
                  d.inpi_reference ? (
                    <span className="font-mono">{d.inpi_reference}</span>
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
                      className="text-primary hover:underline"
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
                value={
                  d.assigned_to ? (
                    <span className="font-mono">{d.assigned_to.slice(0, 8)}</span>
                  ) : (
                    '—'
                  )
                }
              />
              <KvRow label="Créé le" value={formatDateFr(d.created_at)} />
              <KvRow
                label="Mis à jour"
                value={formatDateFr(d.updated_at ?? d.created_at)}
                last
              />
            </CardContent>
          </Card>

          {/* INPI content */}
          <Card>
            <CardHeader>
              <CardTitle>Données INPI saisies</CardTitle>
            </CardHeader>
            <CardContent>
              {d.inpi_content ? (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Voir le payload JSON complet
                  </summary>
                  <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-muted p-3 text-[11px]">
                    {JSON.stringify(d.inpi_content, null, 2)}
                  </pre>
                </details>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun contenu INPI enregistré.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pièces */}
          <Card>
            <CardHeader>
              <CardTitle>Pièces ({docsWithUrl.length})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2.5">
              {docsWithUrl.length === 0 && <EmptyState label="Aucune pièce uploadée." />}
              {docsWithUrl.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.size_bytes ? `${Math.round(doc.size_bytes / 1024)} Ko · ` : ''}
                      {doc.status ? `${doc.status} · ` : ''}
                      {formatDateFr(doc.created_at)}
                    </p>
                  </div>
                  {doc.signedUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={doc.signedUrl} target="_blank" rel="noopener">
                        <Download className="size-4" />
                        Télécharger
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">indisponible</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Observations */}
          <Card>
            <CardHeader>
              <CardTitle>Observations ({obs.length})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {obs.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune observation.</p>
              )}
              {obs.map((o) => (
                <div
                  key={o.id}
                  className={cn(
                    'rounded-lg border-l-[3px] p-3',
                    o.author_role === 'admin'
                      ? 'border-l-amber-500 bg-amber-50'
                      : 'border-l-primary bg-muted/50',
                  )}
                >
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <strong>
                      {o.author_role === 'admin' ? 'Admin Compta' : author || 'Client'}
                    </strong>
                    <span className="font-mono">
                      {new Date(o.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{o.message}</p>
                </div>
              ))}

              <form action={addObservationForm} className="mt-1 space-y-2">
                <input type="hidden" name="dossierId" value={d.id} />
                <Textarea
                  name="message"
                  rows={3}
                  placeholder="Message pour le cabinet…"
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" variant="outline" size="sm">
                    <Send className="size-4" />
                    Envoyer comme commentaire
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <aside className="grid content-start gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2.5">
              {canValidate ? (
                <>
                  <form action={validateDossierForm}>
                    <input type="hidden" name="dossierId" value={d.id} />
                    <input type="hidden" name="sendToInpi" value="true" />
                    <Button type="submit" size="lg" className="w-full">
                      <Send className="size-4" />
                      Valider + envoyer INPI
                    </Button>
                  </form>
                  <form action={validateDossierForm}>
                    <input type="hidden" name="dossierId" value={d.id} />
                    <input type="hidden" name="sendToInpi" value="false" />
                    <Button type="submit" variant="outline" size="lg" className="w-full">
                      <ShieldCheck className="size-4" />
                      Valider sans INPI
                    </Button>
                  </form>
                  <form action={requestAmendmentForm} className="space-y-2">
                    <input type="hidden" name="dossierId" value={d.id} />
                    <Textarea
                      name="message"
                      rows={2}
                      placeholder="Raison de la demande de correction…"
                      required
                      className="text-xs"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-400 text-amber-800 hover:bg-amber-50"
                    >
                      <Wrench className="size-4" />
                      Demander correction
                    </Button>
                  </form>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    « Valider + envoyer INPI » relaie au backend VPS (creds mandataires).
                    « Valider sans INPI » marque seulement le dossier comme validé en
                    interne.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune action requise. Statut actuel : <strong>{d.statut}</strong>
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
