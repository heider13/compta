import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { prepareNewDossier } from '@/lib/server-actions/dossiers';
import { getInpiCredentialsStatus } from '@/lib/server-actions/inpi-credentials';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
  'border-input flex h-10 w-full cursor-pointer rounded-md border bg-muted/40 px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

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
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Tableau de bord
        </Link>
        <span>›</span>
        <span className="text-foreground">Nouvelle formalité</span>
      </nav>

      <Card className="mx-auto mb-8 mt-4 max-w-3xl shadow-lg">
        <CardContent className="px-6 py-9 sm:px-11">
          <form action={prepareNewDossier} className="text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-accent">
              <Users className="size-8 text-primary" />
            </div>
            <h1 className="text-2xl font-normal tracking-tight">
              Organisez votre <strong className="font-semibold">opération</strong>
            </h1>
            <p className="mb-7 mt-1.5 text-sm text-muted-foreground">
              Choisissez le client, le type de formalité et le collaborateur en charge.
            </p>

            <div className="mb-4 grid gap-4 text-left sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="client_id" className="text-xs font-medium text-foreground/80">
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
                  className="inline-block text-xs font-medium text-primary hover:underline"
                >
                  + Ajouter une société
                </Link>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="assigned_to" className="text-xs font-medium text-foreground/80">
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
            </div>

            <div className="mb-6 space-y-3 text-left">
              <p className="text-xs font-medium text-foreground/80">Type de formalité</p>
              {FORMALITY_GROUPS.map((g) => (
                <details
                  key={g.group}
                  open={g.group === 'Création'}
                  className="rounded-lg border bg-muted/40 px-3.5 py-2.5"
                >
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-foreground/70">
                    {g.group} ({g.items.length})
                  </summary>
                  <div className="mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-1.5">
                    {g.items.map((it) => (
                      // Radio-card : l'input reste visible pour l'accessibilité
                      // clavier, le label entier est cliquable.
                      <label
                        key={it.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-2 text-[13px] transition-colors hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:font-medium"
                      >
                        <input
                          type="radio"
                          name="type"
                          value={it.id}
                          required
                          className="accent-primary"
                        />
                        <span>{it.label}</span>
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>

            <Button type="submit" size="lg" className="w-full text-[15px]">
              Commencer →
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
