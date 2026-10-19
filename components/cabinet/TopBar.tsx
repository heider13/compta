'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Search } from 'lucide-react';

import { NotificationBell } from '@/components/cabinet/NotificationBell';
import { breadcrumbsFor } from '@/components/cabinet/nav';
import { ouvrirPalette } from '@/components/cabinet/CommandPalette';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export function TopBar() {
  const pathname = usePathname() ?? '';
  const crumbs = breadcrumbsFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-4 md:rounded-t-xl">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />

      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <Fragment key={c.href}>
                {i > 0 && <BreadcrumbSeparator className={i < crumbs.length - 1 ? 'hidden md:block' : undefined} />}
                <BreadcrumbItem className={!last ? 'hidden md:inline-flex' : 'min-w-0'}>
                  {last ? (
                    <BreadcrumbPage className="truncate font-medium">{c.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={c.href}>{c.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <button
        type="button"
        onClick={ouvrirPalette}
        className="hidden h-9 w-72 items-center gap-2 rounded-full border bg-background px-3.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Rechercher un dossier…</span>
        <Kbd className="bg-background">⌘K</Kbd>
      </button>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={ouvrirPalette} aria-label="Rechercher">
        <Search className="size-4" />
      </Button>

      <Button asChild variant="ghost" size="icon" className="hidden text-muted-foreground lg:inline-flex" aria-label="Guide formalités">
        <a href="/app.html" title="Guide formalités">
          <BookOpen className="size-4" />
        </a>
      </Button>

      <NotificationBell />
    </header>
  );
}
