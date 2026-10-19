import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, ChevronDown, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { prepareNewDossier } from '@/lib/server-actions/dossiers';
import { getInpiCredentialsStatus } from '@/lib/server-actions/inpi-credentials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageShell } from '@/components/cabinet/PageHeader';

const FORMALITY_GROUPS = [
  { group: 'Création', items: [
    { id: 'AE', label: 'Auto-entreprise' },
    { id: 'SASU', label: 'SASU' },
    { id: 'SAS', label: 'SAS' },
    { id: 'EURL', label: 'EURL' },
    { id: 'SARL', label: 'SARL' },
    { id: 'SCI', label: 'SCI' },
    { id: 'HOLDING', label: 'Holding' },
  ]},
  { group: 'Modification', items: [{ id: 'MODIFICATION', label: 'Modification' }] },
  { group: 'Cessation',    items: [{ id: 'RADIATION', label: 'Cessation / radiation' }] },
  { group: 'Conformité',   items: [
    { id: 'BE', label: 'Bénéficiaires effectifs' },
    { id: 'COMPTES', label: 'Dépôt comptes annuels' },
  ]},
];

// Select natif stylé : le formulaire poste via Server Action (FormData),
// les Select Radix ne portent pas de name natif.
const selectClass =
  'border-input flex h-9 w-full cursor-pointer rounded-md border bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default async function NewDossierPage() {
  // Garde : impossible de lancer une formalité tant que les identifiants
  // INPI du cabinet ne sont pas configurés (sinon le backend renverra 403).
  const inpi = await getInpiCredentialsStatus();
  if (!inpi || !inpi.configured) {
    redirect('/settings/inpi?next=/dossiers/new');
  }

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, denomination, siren, forme_juridique')
    .is('archived_at', null)
    .order('denomination', { ascending: true });

  const { data: { user } } = await supabase.auth.getUser();
  const { data: m } = user ? await supabase
    .from('memberships')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single() : { data: null };

  const { data: members } = m ? await supabase
    .from('memberships')
    .select('user_id, profiles!inner(first_name, last_name)')
    .eq('organization_id', m.organization_id) : { data: null };

  return (
    <PageShell className="max-w-3xl">
      <PageHeader
        eyebrow="Nouvelle formalité"
        title="Organisez votre opération"
        description="Choisissez le client, le type de formalité et le collaborateur en charge."
      />

      <form action={prepareNewDossier}>
        <Card className="gap-0 py-0">
          <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <StepNum n={1} />
              Client et responsable
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="client_id" className="text-sm font-medium">
                Société cliente
              </label>
              <select id="client_id" name="client_id" defaultValue="" className={selectClass}>
                <option value="">Sélectionnez la société</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.denomination}{c.siren ? ` · ${c.siren}` : ''}
                  </option>
                ))}
              </select>
              <Link
                href="/clients/new"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="size-3" />
                Ajouter une société
              </Link>
            </div>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="assigned_to" className="text-sm font-medium">
                Collaborateur en charge
              </label>
              <select id="assigned_to" name="assigned_to" defaultValue={user?.id ?? ''} className={selectClass}>
                <option value="">— Sélectionner —</option>
                {(members ?? []).map((mem: { user_id: string; profiles: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] }) => {
                  const p = Array.isArray(mem.profiles) ? mem.profiles[0] : mem.profiles;
                  const name = `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || mem.user_id.slice(0, 6);
                  return (
                    <option key={mem.user_id} value={mem.user_id}>
                      {name}{mem.user_id === user?.id ? ' (vous)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </CardContent>

          <div className="border-y px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <StepNum n={2} />
              Type de formalité
            </p>
          </div>
          <CardContent className="space-y-3 p-5">
            {FORMALITY_GROUPS.map((g) => (
              <details
                key={g.group}
                open={g.group === 'Création'}
                className="group rounded-lg border bg-muted/40 px-3.5 py-2.5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span className="label-mono text-foreground">{g.group}</span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-md border bg-background px-1.5 py-px font-mono text-[11px] text-muted-foreground tabular-nums">{g.items.length}</span>
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <div className="mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-1.5">
                  {g.items.map((it) => (
                    // Radio-card : l'input reste visible pour l'accessibilité
                    // clavier, le label entier est cliquable.
                    <label
                      key={it.id}
                      className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:border-foreground/20 has-[:checked]:border-brand-border has-[:checked]:bg-brand-soft has-[:checked]:font-medium has-[:checked]:text-brand-soft-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                    >
                      <input
                        type="radio"
                        name="type"
                        value={it.id}
                        required
                        className="accent-primary"
                      />
                      <span className="truncate">{it.label}</span>
                    </label>
                  ))}
                </div>
              </details>
            ))}
          </CardContent>

          <div className="flex flex-col-reverse items-stretch gap-3 border-t bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">L&apos;agent prépare ensuite le dossier avec vous.</p>
            <Button type="submit">
              Commencer
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </Card>
      </form>
    </PageShell>
  );
}

function StepNum({ n }: { n: number }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full border bg-background font-mono text-[10px] font-semibold text-muted-foreground tabular-nums">
      {n}
    </span>
  );
}
