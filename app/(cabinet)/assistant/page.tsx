'use client';

// Assistant IA fiscal, comptable & juridique — chat streaming (SSE) avec
// citations des sources officielles (Légifrance, EUR-Lex, BOFiP).

import { useEffect, useRef, useState } from 'react';
import { Bot, ExternalLink, Loader2, Scale, Send, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://vps-84ac2579.vps.ovh.net';

type Source = { n: number; title: string; url: string | null; source: string; source_label?: string; source_id: string };
type Msg = { role: 'user' | 'assistant'; content: string; sources?: Source[] };

const SUGGESTIONS = [
  'Quelles sont les conditions du régime micro-entreprise en 2026 ?',
  'Différences entre SASU et EURL pour un consultant ?',
  "Quelles obligations de dépôt des comptes annuels pour une SAS ?",
  'Franchise en base de TVA : seuils et sortie du régime ?',
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setError(null);
    setBusy(true);
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: question }, { role: 'assistant', content: '' }]);

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expirée — reconnectez-vous.');

      const res = await fetch(`${VPS}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, conversation_id: conversationId }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail || `Erreur ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const patchLast = (fn: (m: Msg) => Msg) =>
        setMessages((msgs) => msgs.map((m, i) => (i === msgs.length - 1 ? fn(m) : m)));

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const raw of events) {
          const eventMatch = raw.match(/^event: (.+)$/m);
          const dataMatch = raw.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const type = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);
          if (type === 'sources') {
            patchLast((m) => ({ ...m, sources: data.sources }));
          } else if (type === 'delta') {
            patchLast((m) => ({ ...m, content: m.content + data.text }));
          } else if (type === 'done') {
            setConversationId(data.conversation_id);
          } else if (type === 'error') {
            throw new Error(data.detail || data.error);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
      setMessages((msgs) => (msgs[msgs.length - 1]?.content === '' ? msgs.slice(0, -1) : msgs));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-4xl flex-col p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
          <Scale className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Assistant fiscal & juridique</h1>
          <p className="text-xs text-muted-foreground">
            Réponses appuyées sur les sources officielles (Légifrance, EUR-Lex) — pas une consultation juridique.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setMessages([]); setConversationId(null); }}>
            Nouvelle conversation
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Sparkles className="mx-auto mb-3 size-8 text-primary" />
              <p className="mb-4 text-sm text-muted-foreground">
                Posez une question de droit des sociétés, fiscalité ou comptabilité.
              </p>
              <div className="mx-auto grid max-w-lg gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="rounded-lg border bg-muted/40 px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn('flex gap-3', m.role === 'user' && 'justify-end')}>
            {m.role === 'assistant' && (
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                <Bot className="size-4" />
              </span>
            )}
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-card',
              )}
            >
              {m.role === 'assistant' && m.content === '' && busy ? (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Recherche dans les sources…
                </span>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 border-t pt-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Sources
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.sources.map((s) => (
                      <a
                        key={s.n}
                        href={s.url ?? '#'}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex max-w-full items-center gap-1"
                        title={s.title}
                      >
                        <Badge variant="secondary" className="max-w-[300px] cursor-pointer gap-1 font-normal hover:bg-accent">
                          <span className="shrink-0 font-semibold text-primary">[{s.n}]</span>
                          {s.source_label && (
                            <span className="shrink-0 rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">
                              {s.source_label}
                            </span>
                          )}
                          <span className="truncate">{s.title}</span>
                          <ExternalLink className="size-2.5 shrink-0" />
                        </Badge>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div role="alert" className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="flex items-end gap-2"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); }
          }}
          placeholder="Votre question fiscale, comptable ou juridique…"
          rows={2}
          className="resize-none"
          disabled={busy}
        />
        <Button type="submit" size="icon" className="size-10 shrink-0" disabled={busy || !input.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
