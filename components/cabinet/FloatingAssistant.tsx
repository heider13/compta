'use client';

// Bulle d'assistant IA flottante — présente sur toutes les pages du cabinet.
// Chat compact (fiscal/comptable/juridique) réutilisant /api/ai/chat en SSE,
// avec citations et action de rédaction de document.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bot, ExternalLink, FileText, Loader2, Maximize2, MessageCircle, Send, Sparkles, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://vps-84ac2579.vps.ovh.net';

type Source = { n: number; title: string; url: string | null; source_label?: string };
type Msg = { role: 'user' | 'assistant'; content: string; sources?: Source[]; doc?: DraftDoc };
type DraftDoc = { title: string; markdown: string };

const QUICK = [
  { label: 'Franchise TVA ?', q: 'Conditions de la franchise en base de TVA ?' },
  { label: 'SASU vs EURL', q: 'Différences fiscales SASU vs EURL ?' },
];

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy, open]);

  async function authToken() {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
    const patchLast = (fn: (m: Msg) => Msg) =>
      setMessages((msgs) => msgs.map((m, i) => (i === msgs.length - 1 ? fn(m) : m)));
    try {
      const token = await authToken();
      if (!token) throw new Error('Session expirée.');
      const res = await fetch(`${VPS}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, conversation_id: conversationId }),
      });
      if (!res.ok || !res.body) {
        const b = await res.json().catch(() => ({}));
        throw new Error((b as { detail?: string }).detail || `Erreur ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const evs = buf.split('\n\n');
        buf = evs.pop() ?? '';
        for (const raw of evs) {
          const t = raw.match(/^event: (.+)$/m)?.[1];
          const d = raw.match(/^data: (.+)$/m)?.[1];
          if (!t || !d) continue;
          const data = JSON.parse(d);
          if (t === 'sources') patchLast((m) => ({ ...m, sources: data.sources }));
          else if (t === 'delta') patchLast((m) => ({ ...m, content: m.content + data.text }));
          else if (t === 'done') setConversationId(data.conversation_id);
          else if (t === 'error') throw new Error(data.detail || data.error);
        }
      }
    } catch (e) {
      patchLast((m) => ({ ...m, content: m.content || `⚠️ ${e instanceof Error ? e.message : 'Erreur'}` }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Bouton bulle */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant IA"
          className="fixed bottom-6 right-6 z-50 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="size-6" />
          <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-amber-400 text-[10px]">
            <Sparkles className="size-3 text-amber-950" />
          </span>
        </button>
      )}

      {/* Panneau */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[560px] max-h-[80vh] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b bg-sidebar px-4 py-3 text-sidebar-foreground">
            <span className="grid size-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Bot className="size-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Assistant Compta</p>
              <p className="text-[11px] text-sidebar-foreground/60">Fiscal · comptable · juridique</p>
            </div>
            <Link href="/assistant" aria-label="Ouvrir en plein écran" className="rounded p-1 hover:bg-white/10">
              <Maximize2 className="size-4" />
            </Link>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded p-1 hover:bg-white/10">
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="rounded-xl border border-dashed p-4 text-center">
                <Sparkles className="mx-auto mb-2 size-6 text-primary" />
                <p className="mb-3 text-xs text-muted-foreground">
                  Une question fiscale ou juridique ? Je réponds avec les sources officielles.
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {QUICK.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => ask(q.q)}
                      className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs hover:border-primary/50 hover:bg-accent"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn('flex gap-2', m.role === 'user' && 'justify-end')}>
                {m.role === 'assistant' && (
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent text-primary">
                    <Bot className="size-3.5" />
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed',
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'border bg-card',
                  )}
                >
                  {m.role === 'assistant' && m.content === '' && busy ? (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> Recherche…
                    </span>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 border-t pt-1.5">
                      {m.sources.slice(0, 4).map((s) => (
                        <a key={s.n} href={s.url ?? '#'} target="_blank" rel="noreferrer noopener">
                          <Badge variant="secondary" className="max-w-[200px] cursor-pointer gap-1 truncate text-[10px] font-normal hover:bg-accent">
                            {s.source_label && <span className="font-semibold text-primary">{s.source_label}</span>}
                            <span className="truncate">{s.title}</span>
                            <ExternalLink className="size-2 shrink-0" />
                          </Badge>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); ask(input); }}
            className="flex items-center gap-2 border-t p-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question…"
              disabled={busy}
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <Button type="submit" size="icon" className="size-9 shrink-0" disabled={busy || !input.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
