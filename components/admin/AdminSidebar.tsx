'use client';

import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  Building2,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Users,
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
import { Badge } from '@/components/ui/badge';

interface AdminSidebarProps {
  userLabel: string;
  userInitials: string;
  signOutAction: () => Promise<void>;
}

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Tableau de bord', exact: true, icon: LayoutDashboard },
  { href: '/admin/queue', label: 'À valider', icon: Inbox },
  { href: '/admin/dossiers', label: 'Tous les dossiers', icon: FolderOpen },
  { href: '/admin/cabinets', label: 'Cabinets', icon: Building2 },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/audit', label: 'Audit logs', icon: ScrollText },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminSidebar({ userLabel, userInitials, signOutAction }: AdminSidebarProps) {
  const pathname = usePathname() ?? '';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <LogoMark size={30} onDark className="shrink-0" />
          <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold text-sidebar-foreground">
              legaly&nbsp;<span className="text-[#ff887b]">AI</span>
            </span>
            <Badge className="bg-sidebar-primary text-[10px] tracking-wider text-sidebar-primary-foreground">
              ADMIN
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Super admin</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => (
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Vue cabinet">
              <Link href="/clients">
                <ArrowUpRight className="size-4" />
                <span>Vue cabinet</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
          <Avatar className="size-8">
            <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm text-sidebar-foreground">{userLabel}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-1 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground"
              >
                <LogOut className="size-3" />
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
