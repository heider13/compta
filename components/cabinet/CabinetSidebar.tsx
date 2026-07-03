'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  CheckSquare,
  User,
  CreditCard,
  KeyRound,
  Palette,
  Webhook,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CabinetSidebarProps {
  orgName: string;
  userLabel: string;
  userInitials: string;
}

interface NavItem {
  href: string;
  label: string;
  matchPrefix: string;
  exact?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_PILOTAGE: NavItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', matchPrefix: '/dashboard', exact: true, icon: LayoutDashboard },
  { href: '/dossiers', label: 'Formalités', matchPrefix: '/dossiers', icon: FileText },
  { href: '/clients', label: 'Clients', matchPrefix: '/clients', icon: Users },
  { href: '/tasks', label: 'Tâches', matchPrefix: '/tasks', icon: CheckSquare },
];

const NAV_CABINET: NavItem[] = [
  { href: '/profile', label: 'Mon compte', matchPrefix: '/profile', icon: User },
  { href: '/billing', label: 'Facturation', matchPrefix: '/billing', icon: CreditCard },
  { href: '/settings/inpi', label: 'Connexion INPI', matchPrefix: '/settings/inpi', icon: KeyRound },
  { href: '/settings/branding', label: 'Marque blanche', matchPrefix: '/settings/branding', icon: Palette },
  { href: '/settings/api-keys', label: 'API & webhooks', matchPrefix: '/settings/api', icon: Webhook },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.matchPrefix;
  return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`);
}

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive(item, pathname)} tooltip={item.label}>
              <Link href={item.href}>
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function CabinetSidebar({ orgName, userLabel, userInitials }: CabinetSidebarProps) {
  const pathname = usePathname() ?? '';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-semibold text-sidebar-primary-foreground">
            C
          </div>
          <div className="grid min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold text-sidebar-foreground">Compta</span>
            <span className="truncate text-xs text-sidebar-foreground/60">{orgName}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Pilotage" items={NAV_PILOTAGE} pathname={pathname} />
        <NavGroup label="Cabinet" items={NAV_CABINET} pathname={pathname} />
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
          <Avatar className="size-8">
            <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            {userLabel}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
