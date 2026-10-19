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
      <SidebarGroupLabel className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-sidebar-foreground/50">{section.label}</SidebarGroupLabel>
      <SidebarMenu>
        {section.items.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={item.label}
                className="relative rounded-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-white/10 data-[active=true]:font-medium data-[active=true]:text-white"
              >
                <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
                  <item.icon className={cn('size-4', active && 'text-coral')} />
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
                <span className="grid size-8 shrink-0 place-items-center">
                  <LogoMark size={28} onDark />
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate font-[Sora] text-[15px] font-bold tracking-tight text-white">
                    Legaly <span className="text-coral">AI</span>
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/70">{orgName}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="grid gap-1.5 group-data-[collapsible=icon]:hidden">
          <Link
            href="/dossiers/new"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-coral px-3 text-sm font-semibold text-coral-foreground shadow-[0_8px_20px_-10px_rgba(255,136,123,0.9)] transition-colors hover:bg-[#ffaca3]"
          >
            <Plus className="size-4" />
            Nouvelle formalité
          </Link>
          <button
            type="button"
            onClick={ouvrirPalette}
            className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Search className="size-3.5" />
            <span className="flex-1 text-left">Rechercher…</span>
            <Kbd className="border-white/15 bg-white/10 text-sidebar-foreground">⌘K</Kbd>
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_SECTIONS.map((section) => (
          <NavGroup key={section.label} section={section} pathname={pathname} />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <Link
          href="/settings/inpi"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs transition-colors hover:bg-white/10 group-data-[collapsible=icon]:hidden"
        >
          <span className={cn('live-dot shrink-0', inpi.configured ? 'text-success' : 'text-warning')} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-white">
              {inpi.configured ? 'Guichet unique connecté' : 'Guichet unique à connecter'}
            </span>
            <span className="block truncate font-mono text-[10.5px] text-sidebar-foreground/60">
              INPI · {inpi.configured ? (inpi.env === 'demo' ? 'démo' : 'production') : 'non configuré'}
            </span>
          </span>
        </Link>

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="text-sidebar-foreground hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-coral text-xs font-semibold text-coral-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium text-white">{userLabel}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">Abonnement {planLabel}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/60" />
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
