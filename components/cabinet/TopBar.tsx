'use client';

import Link from 'next/link';
import { Plus, Sparkles, BookOpen, CreditCard, User, ChevronDown } from 'lucide-react';

import { NotificationBell } from '@/components/cabinet/NotificationBell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopBarProps {
  userLabel: string;
  userEmail: string;
  userInitials: string;
  plan?: string | null;
}

export function TopBar({ userLabel, userEmail, userInitials, plan }: TopBarProps) {
  const planLabel = (plan && plan.charAt(0).toUpperCase() + plan.slice(1)) || 'Cabinet';

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />

      <Button asChild size="sm">
        <Link href="/dossiers/new">
          <Plus className="size-4" />
          Nouvelle formalité
        </Link>
      </Button>

      <div className="flex flex-1 justify-center">
        <Link href="/billing" className="hidden sm:block">
          <Badge className="gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent-foreground px-3.5 py-1.5 text-white shadow-sm transition-opacity hover:opacity-90">
            <Sparkles className="size-3" />
            Abonnement {planLabel}
          </Badge>
        </Link>
      </div>

      <Button asChild variant="ghost" size="sm" className="hidden text-muted-foreground lg:inline-flex">
        <a href="/app.html">
          <BookOpen className="size-4" />
          Guide formalités
        </a>
      </Button>

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
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
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/app.html">
              <BookOpen className="size-4" />
              Guide formalités
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
