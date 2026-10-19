'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setItems((data as Notification[]) || []);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unread = items.filter((n) => !n.read_at).length;

  async function markRead(id: string, link: string | null) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    if (link) window.location.href = link;
    else load();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notifications (${unread} non lues)` : 'Notifications'}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="live-dot absolute right-2 top-2 size-1.5 text-primary"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[480px] w-[min(360px,calc(100vw-2rem))] overflow-auto p-0"
      >
        <DropdownMenuLabel className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-brand-soft-foreground tabular-nums">
              {unread} non lue{unread > 1 ? 's' : ''}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <span className="grid size-9 place-items-center rounded-lg border bg-background shadow-xs">
              <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
            </span>
            <p className="text-xs text-muted-foreground">Pas de notification.</p>
          </div>
        )}
        <div className="divide-y">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markRead(n.id, n.link)}
              className={cn(
                'flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none',
                !n.read_at && 'bg-brand-soft/40',
              )}
            >
              <span className="mt-1.5 flex size-1.5 shrink-0" aria-hidden="true">
                {!n.read_at && <span className="size-1.5 rounded-full bg-primary" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{n.title}</span>
                {n.body && <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>}
                <span className="mt-1 block font-mono text-[11px] text-muted-foreground/70 tabular-nums">
                  {new Date(n.created_at).toLocaleString('fr-FR')}
                </span>
              </span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
