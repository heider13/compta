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
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';

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
          title="Assistant IA"
          className="fixed bottom-5 right-5 z-50 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-brand-soft transition-[transform,box-shadow] hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-ring/50 sm:bottom-6 sm:right-6"
        >
          <MessageCircle className="size-5" />
          <span className="absolute -right-0.5 -top-0.5 grid size-4.5 place-items-center rounded-full border-2 border-background bg-brand-soft text-brand-soft-foreground">
            <Sparkles className="size-2.5" />
          </span>
        </button>
      )}

      {/* Panneau */}
      {open && (
        <div
          role="dialog"
          aria-label="Assistant Legaly AI"
          className="fixed bottom-4 right-4 z-50 flex h-[560px] max-h-[80vh] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-200 sm:bottom-6 sm:right-6"
        >
          <div className="flex items-center gap-2.5 border-b px-3.5 py-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-md border border-brand-border bg-brand-soft text-brand-soft-foreground">
              <Bot className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Assistant Legaly AI</p>
              <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
                <span className={cn('live-dot size-1.5', busy ? 'text-primary' : 'text-success')} aria-hidden />
                {busy ? 'en cours' : 'fiscal · comptable · juridique'}
              </p>
            </div>
            <Link
              href="/assistant"
              aria-label="Ouvrir en plein écran"
              title="Ouvrir en plein écran"
              className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Maximize2 className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-3.5" aria-busy={busy}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center px-3 py-6 text-center">
                <span className="mb-3 grid size-10 place-items-center rounded-lg border bg-background shadow-xs">
                  <Sparkles className="size-4.5 text-primary" />
                </span>
                <p className="mb-3 max-w-60 text-xs text-muted-foreground">
                  Une question fiscale ou juridique ? Je réponds avec les sources officielles.
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {QUICK.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => ask(q.q)}
                      className="rounded-full border bg-background px-2.5 py-1 text-xs shadow-xs transition-colors hover:border-brand-border hover:bg-brand-soft hover:text-brand-soft-foreground"
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
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-brand-border bg-brand-soft text-brand-soft-foreground">
                    <Bot className="size-3" />
                  </span>
                )}
                <div
                  className={cn(
                    'min-w-0 text-[13px] leading-relaxed',
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-2xl rounded-br-md border bg-muted/60 px-3 py-1.5'
                      : 'flex-1',
                  )}
                >
                  {m.role === 'assistant' && m.content === '' && busy ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <span className="live-dot size-1.5 text-primary" aria-hidden /> Recherche…
                    </span>
                  ) : m.role === 'assistant' ? (
                    <Markdown className="text-[13px]">{m.content}</Markdown>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  )}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 border-t pt-1.5">
                      {m.sources.slice(0, 4).map((s) => (
                        <a key={s.n} href={s.url ?? '#'} target="_blank" rel="noreferrer noopener">
                          <Badge variant="outline" className="max-w-[200px] cursor-pointer gap-1 truncate bg-background text-[10px] font-normal transition-colors hover:bg-accent">
                            {s.source_label && <span className="font-mono text-brand-soft-foreground">{s.source_label}</span>}
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
            className="flex items-center gap-2 border-t bg-muted/30 p-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question…"
              disabled={busy}
              aria-label="Votre question"
              className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-[13px] shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
            />
            <Button type="submit" size="icon" className="size-9 shrink-0" disabled={busy || !input.trim()} aria-label="Envoyer">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
