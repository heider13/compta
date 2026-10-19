'use client';

// Palette de commandes ⌘K : pages, actions rapides, recherche instantanée des
// dossiers et des clients du cabinet (RLS Supabase : uniquement l'organisation courante).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, FileText, Loader2, Plus, Sparkles, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NAV_SECTIONS } from '@/components/cabinet/nav';
import { typeFormaliteLabel } from '@/lib/utils/format';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

export const OUVRIR_PALETTE = 'legaly:palette';

export function ouvrirPalette() {
  window.dispatchEvent(new Event(OUVRIR_PALETTE));
}

interface DossierHit {
  id: string;
  reference: string | null;
  client_name: string;
  type_formalite: string;
}
interface ClientHit {
  id: string;
  denomination: string;
  siren: string | null;
}

const ACTIONS = [
  { label: 'Nouvelle formalité', href: '/dossiers/new', icon: Plus, keywords: 'creer dossier creation modification', shortcut: 'N' },
  { label: "Demander à l'agent Formalités", href: '/dashboard', icon: Sparkles, keywords: 'ia chat agent' },
  { label: 'Ajouter un client', href: '/clients/new', icon: UserPlus, keywords: 'nouveau client entreprise siren' },
];

const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dossiers, setDossiers] = useState<DossierHit[]>([]);
  const [clients, setClients] = useState<ClientHit[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      const saisie = cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (!saisie && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === '/') {
          e.preventDefault();
          setOpen(true);
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          router.push('/dossiers/new');
        }
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener(OUVRIR_PALETTE, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(OUVRIR_PALETTE, onOpen);
    };
  }, [router]);

  // Recherche : derniers dossiers à l'ouverture, puis filtrage côté base (anti-rebond 140 ms)
  useEffect(() => {
    if (!open) return;
    const id = ++seq.current;
    const q = query.trim().replace(/[%,()]/g, ' ');
    const t = setTimeout(async () => {
      setLoading(true);
      let dq = supabase
        .from('dossiers')
        .select('id, reference, client_name, type_formalite')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(q ? 8 : 5);
      let cq = supabase
        .from('clients')
        .select('id, denomination, siren')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(q ? 6 : 3);
      if (q) {
        dq = dq.or(`client_name.ilike.%${q}%,reference.ilike.%${q}%`);
        const chiffres = q.replace(/\s/g, '');
        cq = /^\d{3,}$/.test(chiffres) ? cq.ilike('siren', `%${chiffres}%`) : cq.ilike('denomination', `%${q}%`);
      }
      const [d, c] = await Promise.all([dq, cq]);
      if (id !== seq.current) return;
      setDossiers((d.data as DossierHit[] | null) ?? []);
      setClients((c.data as ClientHit[] | null) ?? []);
      setLoading(false);
    }, q ? 140 : 0);
    return () => clearTimeout(t);
  }, [open, query, supabase]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const q = normaliser(query.trim());
  const match = (...textes: (string | undefined)[]) => !q || textes.some((t) => t && normaliser(t).includes(q));
  const actions = ACTIONS.filter((a) => match(a.label, a.keywords));
  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => match(i.label, ...(i.keywords ?? []))),
  })).filter((s) => s.items.length);
  const rien = !loading && !actions.length && !sections.length && !dossiers.length && !clients.length;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Rechercher un dossier, un client, une page…"
      />
      <CommandList>
        {rien && <CommandEmpty>Aucun résultat pour « {query} ».</CommandEmpty>}
        {actions.length > 0 && (
          <CommandGroup heading="Actions">
            {actions.map((a) => (
              <CommandItem key={a.href} value={`action-${a.href}`} onSelect={() => go(a.href)}>
                <a.icon className="text-primary" />
                {a.label}
                {a.shortcut && <CommandShortcut>{a.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {dossiers.length > 0 && (
          <CommandGroup heading={q ? 'Dossiers' : 'Dossiers récents'}>
            {dossiers.map((d) => (
              <CommandItem key={d.id} value={`dossier-${d.id}`} onSelect={() => go(`/dossiers/${d.id}`)}>
                <FileText />
                <span className="truncate">{d.client_name}</span>
                <span className="truncate text-xs text-muted-foreground">{typeFormaliteLabel(d.type_formalite)}</span>
                {d.reference && <CommandShortcut className="tracking-normal">{d.reference}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {clients.length > 0 && (
          <CommandGroup heading="Clients">
            {clients.map((c) => (
              <CommandItem key={c.id} value={`client-${c.id}`} onSelect={() => go(`/clients/${c.id}`)}>
                <Building2 />
                <span className="truncate">{c.denomination}</span>
                {c.siren && <CommandShortcut className="tracking-normal">{c.siren}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {sections.map((s) => (
          <div key={s.label}>
            <CommandSeparator />
            <CommandGroup heading={s.label}>
              {s.items.map((i) => (
                <CommandItem key={i.href} value={`page-${i.href}`} onSelect={() => go(i.href)}>
                  <i.icon />
                  {i.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
      <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-3">
          <span>↑↓ naviguer</span>
          <span>↵ ouvrir</span>
          <span>esc fermer</span>
        </span>
        {loading && (
          <span className="flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" /> recherche
          </span>
        )}
      </div>
    </CommandDialog>
  );
}
