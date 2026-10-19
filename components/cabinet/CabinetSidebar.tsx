'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ChevronsUpDown, CreditCard, LogOut, Plus, Search, User } from 'lucide-react';

import { LogoMark } from '@/components/brand/Logo';
import { NAV_SECTIONS, isNavActive, type NavSection } from '@/components/cabinet/nav';
import { ouvrirPalette } from '@/components/cabinet/CommandPalette';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Kbd } from '@/components/ui/kbd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface CabinetSidebarProps {
  orgName: string;
  userLabel: string;
  userEmail: string;
  userInitials: string;
  plan?: string | null;
  inpi: { configured: boolean; env: 'prod' | 'demo' };
}

function NavGroup({ section, pathname }: { section: NavSection; pathname: string }) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-mono text-[10.5px] uppercase tracking-wider">{section.label}</SidebarGroupLabel>
      <SidebarMenu>
        {section.items.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={item.label}
                className="relative data-[active=true]:bg-background data-[active=true]:font-medium data-[active=true]:shadow-xs data-[active=true]:ring-1 data-[active=true]:ring-border"
              >
                <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
                  <item.icon className={cn('size-4', active && 'text-primary')} />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function CabinetSidebar({ orgName, userLabel, userEmail, userInitials, plan, inpi }: CabinetSidebarProps) {
  const pathname = usePathname() ?? '';
  const planLabel = (plan && plan.charAt(0).toUpperCase() + plan.slice(1)) || 'Cabinet';

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-sidebar-accent">
              <Link href="/dashboard">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-background shadow-xs">
                  <LogoMark size={22} />
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold tracking-tight text-foreground">Legaly AI</span>
                  <span className="truncate text-xs text-muted-foreground">{orgName}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="grid gap-1.5 group-data-[collapsible=icon]:hidden">
          <Link
            href="/dossiers/new"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Nouvelle formalité
          </Link>
          <button
            type="button"
            onClick={ouvrirPalette}
            className="flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-sm text-muted-foreground shadow-xs transition-colors hover:text-foreground"
          >
            <Search className="size-3.5" />
            <span className="flex-1 text-left">Rechercher…</span>
            <Kbd>⌘K</Kbd>
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_SECTIONS.map((section) => (
          <NavGroup key={section.label} section={section} pathname={pathname} />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <Link
          href="/settings/inpi"
          className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-xs shadow-xs transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
        >
          <span className={cn('live-dot shrink-0', inpi.configured ? 'text-success' : 'text-warning')} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-foreground">
              {inpi.configured ? 'Guichet unique connecté' : 'Guichet unique à connecter'}
            </span>
            <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
              INPI · {inpi.configured ? (inpi.env === 'demo' ? 'démo' : 'production') : 'non configuré'}
            </span>
          </span>
        </Link>

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-brand-soft text-xs font-semibold text-brand-soft-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium text-foreground">{userLabel}</span>
                    <span className="truncate text-xs text-muted-foreground">Abonnement {planLabel}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
                <DropdownMenuLabel className="grid gap-0.5">
                  <span className="truncate text-sm font-medium">{userLabel}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">{userEmail}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="size-4" />
                    Mon compte
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/billing">
                    <CreditCard className="size-4" />
                    Facturation
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/app.html">
                    <BookOpen className="size-4" />
                    Guide formalités
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action="/auth/logout" method="post">
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full">
                      <LogOut className="size-4" />
                      Se déconnecter
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
