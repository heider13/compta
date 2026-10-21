// Navigation de l'espace pro : source unique pour la barre latérale, la palette ⌘K
// et le fil d'Ariane.
import {
  BookOpen,
  CheckSquare,
  CreditCard,
  FileSignature,
  FileSpreadsheet,
  FileText,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Network,
  Palette,
  PenLine,
  Scale,
  User,
  Users,
  Webhook,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  matchPrefix: string;
  alsoMatch?: string[];
  /** Sous-chemins qui appartiennent à une autre entrée */
  exclude?: string[];
  exact?: boolean;
  icon: LucideIcon;
  /** Mots-clés supplémentaires pour la recherche ⌘K */
  keywords?: string[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Pilotage',
    items: [
      { href: '/dashboard', label: 'Tableau de bord', matchPrefix: '/dashboard', exact: true, icon: LayoutDashboard, keywords: ['accueil', 'agent'] },
      { href: '/dossiers', label: 'Formalités', matchPrefix: '/dossiers', alsoMatch: ['/inpi'], exclude: ['/inpi/comptes'], icon: FileText, keywords: ['dossiers', 'inpi', 'guichet'] },
      { href: '/inpi/comptes', label: 'Dépôt des comptes annuels', matchPrefix: '/inpi/comptes', icon: FileSpreadsheet, keywords: ['comptes', 'bilan', 'greffe', 'approbation'] },
      { href: '/annonces', label: 'Annonces légales', matchPrefix: '/annonces', icon: Megaphone, keywords: ['annonce', 'jal', 'publication', 'avis'] },
      { href: '/signatures', label: 'Signature électronique', matchPrefix: '/signatures', icon: PenLine, keywords: ['signature', 'yousign', 'qualifiée', 'eidas'] },
      { href: '/clients', label: 'Clients', matchPrefix: '/clients', icon: Users, keywords: ['entreprises', 'sociétés'] },
      { href: '/groupes', label: 'Groupes', matchPrefix: '/groupes', icon: Network, keywords: ['holding', 'filiales'] },
      { href: '/tasks', label: 'Tâches', matchPrefix: '/tasks', icon: CheckSquare, keywords: ['todo', 'échéances'] },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/assistant', label: 'Assistant IA', matchPrefix: '/assistant', icon: Scale, keywords: ['question', 'juridique', 'fiscal'] },
      { href: '/documents', label: 'Rédiger un document', matchPrefix: '/documents', icon: FileSignature, keywords: ['statuts', 'pv', 'acte'] },
      { href: '/rne', label: 'Documents RNE', matchPrefix: '/rne', icon: BookOpen, keywords: ['kbis', 'registre', 'extrait'] },
    ],
  },
  {
    label: 'Cabinet',
    items: [
      { href: '/profile', label: 'Mon compte', matchPrefix: '/profile', icon: User },
      { href: '/billing', label: 'Facturation', matchPrefix: '/billing', icon: CreditCard, keywords: ['abonnement', 'plan'] },
      { href: '/settings/inpi', label: 'Connexion INPI', matchPrefix: '/settings/inpi', icon: KeyRound, keywords: ['identifiants', 'guichet unique'] },
      { href: '/settings/branding', label: 'Marque blanche', matchPrefix: '/settings/branding', icon: Palette, keywords: ['logo', 'couleurs'] },
      { href: '/settings/api-keys', label: 'API & webhooks', matchPrefix: '/settings/api', alsoMatch: ['/settings/webhooks'], icon: Webhook, keywords: ['clé', 'développeur'] },
    ],
  },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.matchPrefix;
  if (item.exclude?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  return [item.matchPrefix, ...(item.alsoMatch ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Libellés des segments d'URL pour le fil d'Ariane
const SEGMENTS: Record<string, string> = {
  dashboard: 'Tableau de bord',
  dossiers: 'Formalités',
  inpi: 'Guichet unique',
  comptes: 'Comptes annuels',
  annonces: 'Annonces légales',
  signatures: 'Signature électronique',
  clients: 'Clients',
  groupes: 'Groupes',
  tasks: 'Tâches',
  assistant: 'Assistant IA',
  documents: 'Rédiger un document',
  rne: 'Documents RNE',
  profile: 'Mon compte',
  billing: 'Facturation',
  settings: 'Paramètres',
  'api-keys': 'API',
  webhooks: 'Webhooks',
  branding: 'Marque blanche',
  new: 'Nouveau',
  edit: 'Modifier',
  sign: 'Signature',
  success: 'Confirmation',
  cancel: 'Annulation',
};

export interface Crumb {
  label: string;
  href: string;
}

export function breadcrumbsFor(pathname: string): Crumb[] {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];
  parts.forEach((part, i) => {
    const href = `/${parts.slice(0, i + 1).join('/')}`;
    // « settings/inpi » : le segment inpi désigne la connexion, pas le Guichet unique
    if (parts[0] === 'settings' && i === 0) return;
    const label =
      parts[0] === 'settings' && part === 'inpi'
        ? 'Connexion INPI'
        : SEGMENTS[part] ?? (/^[0-9a-f-]{8,}$/i.test(part) || /^\d+$/.test(part) ? 'Détail' : decodeURIComponent(part));
    crumbs.push({ label, href });
  });
  return crumbs;
}
