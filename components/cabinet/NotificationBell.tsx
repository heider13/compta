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
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4.5" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[480px] w-[360px] overflow-auto p-0">
        <DropdownMenuLabel className="px-4 py-3">
          Notifications{' '}
          {unread > 0 && <span className="text-primary">({unread})</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
            Pas de notification.
          </p>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => markRead(n.id, n.link)}
            className={cn(
              'block w-full cursor-pointer border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/60',
              !n.read_at && 'bg-accent/40',
            )}
          >
            <p className="text-[13px] font-medium">{n.title}</p>
            {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              {new Date(n.created_at).toLocaleString('fr-FR')}
            </p>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
