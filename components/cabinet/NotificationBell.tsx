'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  const [open, setOpen] = useState(false);
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
  }, []);

  const unread = items.filter((n) => !n.read_at).length;

  async function markRead(id: string, link: string | null) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    if (link) window.location.href = link;
    else load();
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--ink-600)' }}
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, background: '#EF4444', borderRadius: '50%' }} />
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)',
            width: 360, maxHeight: 480, overflow: 'auto',
            background: 'white', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
            border: '1px solid var(--ink-150)', zIndex: 100,
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--ink-100)', fontWeight: 500 }}>
              Notifications {unread > 0 && <span style={{ color: 'var(--accent-ink)' }}>({unread})</span>}
            </div>
            {items.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-500)', fontSize: 13 }}>Pas de notification.</div>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id, n.link)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 18px', border: 'none', cursor: 'pointer',
                  background: n.read_at ? 'transparent' : 'var(--violet-50)',
                  borderBottom: '1px solid var(--ink-100)',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)', marginBottom: 2 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>{n.body}</div>}
                <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleString('fr-FR')}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
