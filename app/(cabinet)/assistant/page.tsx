'use client';

// Assistant IA fiscal, comptable & juridique — chat streaming (SSE) avec
// citations des sources officielles. Écran d'accueil inspiré d'Ordalie :
// salutation chaleureuse, grand composer central, bibliothèque de tâches.

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Bot,
  Building2,
  ExternalLink,
  FileText,
  Landmark,
  Loader2,
  Percent,
  Receipt,
  Scale,
  ShieldCheck,
  Sparkles,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://vps-84ac2579.vps.ovh.net';

type Source = { n: number; title: string; url: string | null; source: string; source_label?: string; source_id: string };
type Msg = { role: 'user' | 'assistant'; content: string; sources?: Source[] };

// Bibliothèque de tâches — chaque carte pré-remplit le composer avec un point
// de départ que l'utilisateur peut ajuster avant d'envoyer.
interface TaskCard {
  icon: LucideIcon;
  title: string;
  desc: string;
  tag?: string;
  prompt: string;
}
const TASKS: TaskCard[] = [
  {
    icon: Scale,
    title: 'Question fiscale',
    desc: 'CGI, BOFiP, TVA, impôt sur les sociétés…',
    tag: 'Analyse',
    prompt: 'Explique-moi le régime de TVA applicable à une société de conseil qui facture des clients dans l’UE. Cite les articles.',
  },
  {
    icon: Building2,
    title: 'Choix de forme juridique',
    desc: 'Comparer SASU, SARL, EURL, SCI…',
    prompt: 'Compare la SASU et l’EURL pour un consultant indépendant : fiscalité, protection sociale, coûts. Recommande la meilleure option.',
  },
  {
    icon: FileText,
    title: 'Rédaction de document',
    desc: 'Statuts, PV d’assemblée, contrat…',
    tag: 'Document',
    prompt: 'Rédige un procès-verbal d’assemblée générale actant un transfert de siège social d’une SAS.',
  },
  {
    icon: ShieldCheck,
    title: 'Vérification de conformité',
    desc: 'Obligations légales d’une société',
    prompt: 'Quelles sont les obligations annuelles de conformité (comptes, BE, AG) pour une SAS ? Donne les échéances.',
  },
  {
    icon: Landmark,
    title: 'Jurisprudence',
    desc: 'Conseil d’État, contentieux fiscal',
    tag: 'Analyse',
    prompt: 'Résume la position récente du Conseil d’État sur l’abus de droit fiscal en matière de holding.',
  },
  {
    icon: Receipt,
    title: 'Dépôt des comptes',
    desc: 'Obligations, délais, confidentialité',
    prompt: 'Quels sont les délais et options de confidentialité pour le dépôt des comptes annuels d’une PME ?',
  },
  {
    icon: Percent,
    title: 'Régimes & seuils',
    desc: 'Micro, franchise TVA, IS/IR',
    prompt: 'Rappelle les seuils 2026 du régime micro-entreprise et de la franchise en base de TVA, et les conséquences d’un dépassement.',
  },
  {
    icon: Workflow,
    title: 'Procédure de formalité',
    desc: 'Comment réaliser une démarche',
    prompt: 'Explique étape par étape comment réaliser un transfert de siège social auprès du Guichet Unique INPI.',
  },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const u = data.user;
        const meta = (u?.user_metadata ?? {}) as Record<string, string>;
        const name =
          meta.first_name ||
          (meta.full_name || meta.name || '').split(' ')[0] ||
          (u?.email ? u.email.split('@')[0] : '');
        if (name) setFirstName(name.charAt(0).toUpperCase() + name.slice(1));
      } catch {
        /* silencieux */
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  function pickTask(prompt: string) {
    setInput(prompt);
    textareaRef.current?.focus();
  }

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

  // Rendu inline (fonction, PAS un composant) — sinon le <textarea> se
  // remonterait à chaque frappe et perdrait le focus.
  const renderComposer = (big: boolean) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ask(input);
      }}
      className="rounded-[22px] border bg-card p-3 shadow-[0_8px_30px_rgba(20,15,45,0.06)] transition-colors focus-within:border-primary/40"
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            ask(input);
          }
        }}
        placeholder="Dites-moi ce dont vous avez besoin… (question fiscale, comptable ou juridique)"
        rows={big ? 3 : 2}
        disabled={busy}
        className="w-full resize-none border-0 bg-transparent px-2 pt-1.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
      />
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3" />
          Légifrance · BOFiP · CGI
        </span>
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Envoyer"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </button>
      </div>
    </form>
  );

  // ─── Écran d'accueil (aucun message) — façon Ordalie ─────
  if (messages.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-7">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            {greeting()}
            {firstName ? ` ${firstName}` : ''},
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">
            quelle question souhaitez-vous éclaircir&nbsp;?
          </p>
        </div>

        {renderComposer(true)}

        {error && (
          <div role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Par où commencer&nbsp;?</h2>
            <span className="text-xs text-muted-foreground">{TASKS.length} tâches</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {TASKS.map((t, i) => (
              <button
                key={t.title}
                type="button"
                onClick={() => pickTask(t.prompt)}
                className="group flex items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_30px_rgba(20,15,45,0.08)]"
              >
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-xl',
                    i % 2 === 0 ? 'bg-accent text-primary' : 'bg-primary/10 text-primary',
                  )}
                >
                  <t.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{t.title}</span>
                    {t.tag && (
                      <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] font-medium">
                        {t.tag}
                      </Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{t.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Réponses appuyées sur les sources officielles — ceci n’est pas une consultation juridique.
          </p>
        </div>
      </div>
    );
  }

  // ─── Écran de conversation ───────────────────────────────
  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-3xl flex-col px-4 py-4 sm:px-6">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
          <Scale className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="font-serif text-lg font-medium tracking-tight">Assistant fiscal &amp; juridique</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => {
            setMessages([]);
            setConversationId(null);
            setInput('');
          }}
        >
          Nouvelle conversation
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
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
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'border bg-card',
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

      {renderComposer(false)}
    </div>
  );
}
