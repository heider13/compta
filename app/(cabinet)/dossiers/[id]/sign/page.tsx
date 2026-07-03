// Page de déclenchement de signature électronique Yousign pour un dossier.
// Affiche un formulaire (prénom/nom/email signataire) + relaie l'appel au VPS.
// Si une demande de signature est déjà en cours, affiche son statut + lien Yousign.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CheckCircle2, ExternalLink, PenLine, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dossiers" className="hover:text-foreground">
          Dossiers
        </Link>
        <span>›</span>
        <span className="font-mono text-xs">{dossier.reference ?? dossier.id.slice(0, 8)}</span>
        <span>›</span>
        <span className="text-foreground">Signature</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Signature électronique</h1>
        <p className="text-sm text-muted-foreground">
          {dossier.client_name} · {dossier.type_formalite} ·{' '}
          <span className="font-mono text-xs">{dossier.reference ?? dossier.id.slice(0, 8)}</span>
        </p>
      </div>

      {okFlag && (
        <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="size-4 shrink-0" />
          Demande de signature envoyée. Le signataire va recevoir un email Yousign.
        </div>
      )}
      {errorCode && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Erreur : <span className="font-mono text-xs">{errorCode}</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {/* Statut courant */}
          <Card>
            <CardHeader>
              <CardTitle>Statut</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasPending ? (
                <p className="text-sm text-muted-foreground">
                  Aucune demande de signature envoyée pour ce dossier.
                </p>
              ) : (
                <div className="grid gap-2.5 text-sm">
                  <KvRow
                    label="État"
                    value={
                      <strong
                        className={cn(
                          'font-semibold',
                          isSigned && 'text-green-700',
                          (isDeclined || isExpired) && 'text-destructive',
                        )}
                      >
                        {meta.signature_status ?? 'pending'}
                      </strong>
                    }
                  />
                  <KvRow label="Signataire" value={meta.signature_signer_email ?? '—'} />
                  <KvRow
                    label="Référence Yousign"
                    value={
                      <span className="font-mono text-xs">{meta.signature_request_id}</span>
                    }
                  />
                  {meta.signature_requested_at && (
                    <KvRow
                      label="Envoyée le"
                      value={new Date(meta.signature_requested_at).toLocaleString('fr-FR')}
                    />
                  )}
                  {meta.signature_signed_at && (
                    <KvRow
                      label="Signée le"
                      value={new Date(meta.signature_signed_at).toLocaleString('fr-FR')}
                    />
                  )}
                  {meta.signature_link && !isSigned && (
                    <div className="mt-1">
                      <Button asChild variant="outline" size="sm">
                        <a href={meta.signature_link} target="_blank" rel="noopener">
                          Ouvrir le lien Yousign
                          <ExternalLink className="size-3.5" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulaire */}
          {!isSigned && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {hasPending && !isDeclined && !isExpired
                    ? 'Renvoyer / mettre à jour la demande'
                    : 'Envoyer la demande de signature'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasPending && !isDeclined && !isExpired ? (
                  <form action={resendSignatureEmail} className="space-y-3">
                    <input type="hidden" name="dossierId" value={dossier.id} />
                    <p className="text-sm text-muted-foreground">
                      Une demande est déjà en cours. Yousign envoie automatiquement des
                      rappels. Cliquez pour rafraîchir le statut.
                    </p>
                    <Button type="submit" variant="outline" size="sm">
                      <RefreshCw className="size-3.5" />
                      Rafraîchir le statut
                    </Button>
                  </form>
                ) : (
                  <form action={sendSignatureRequest} className="grid gap-4">
                    <input type="hidden" name="dossierId" value={dossier.id} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input id="firstName" name="firstName" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input id="lastName" name="lastName" required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email signataire</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phoneNumber">Téléphone (OTP SMS, optionnel)</Label>
                      <Input id="phoneNumber" name="phoneNumber" placeholder="+33612345678" />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" size="lg">
                        <PenLine className="size-4" />
                        Envoyer la demande de signature
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Signature avancée RGS via Yousign. Le signataire reçoit un email avec
                      un lien sécurisé.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-muted-foreground">
                <li>Admin valide le dossier (modif / cessation INPI).</li>
                <li>Signature requise → cette page envoie au client.</li>
                <li>Client signe sur Yousign (RGS avancée).</li>
                <li>
                  Webhook reçoit la signature → dossier passe à{' '}
                  <strong className="text-foreground">VALIDATED_INTERNAL</strong>.
                </li>
                <li>Push automatique vers l&apos;INPI.</li>
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function KvRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
