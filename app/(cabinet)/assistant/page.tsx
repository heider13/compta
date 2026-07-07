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
  History,
  Landmark,
  Loader2,
  MessageSquare,
  Paperclip,
  Percent,
  Receipt,
  Scale,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type Attachment = { name: string; summary: string; text: string };

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://vps-84ac2579.vps.ovh.net';

type Source = { n: number; title: string; url: string | null; source: string; source_label?: string; source_id: string };
type Msg = { role: 'user' | 'assistant'; content: string; sources?: Source[]; attachmentName?: string };
type Conversation = { id: string; title: string | null; created_at?: string; updated_at?: string };

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

// Date relative courte pour l'historique des conversations.
function shortDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const day = 86400000;
  if (diffMs < 60000) return "à l'instant";
  if (diffMs < 3600000) return `il y a ${Math.floor(diffMs / 60000)} min`;
  if (diffMs < day && now.getDate() === d.getDate()) return `il y a ${Math.floor(diffMs / 3600000)} h`;
  if (diffMs < 2 * day) return 'hier';
  if (diffMs < 7 * day) return `il y a ${Math.floor(diffMs / day)} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Charge la liste des conversations (mêmes en-têtes d'auth que ask()).
  async function fetchConversations() {
    try {
      const supabase = createClient();
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`${VPS}/api/ai/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as { items?: Conversation[] };
      setConversations(Array.isArray(data.items) ? data.items : []);
    } catch {
      /* silencieux */
    }
  }

  useEffect(() => {
    void fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ouvre une conversation existante : récupère ses messages et bascule
  // l'écran en vue conversation.
  async function loadConversation(id: string) {
    setError(null);
    setLoadingConversation(true);
    try {
      const supabase = createClient();
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('Session expirée — reconnectez-vous.');
      const res = await fetch(`${VPS}/api/ai/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail || `Erreur ${res.status}`);
      }
      const data = (await res.json()) as {
        conversation?: { id: string; title: string | null };
        messages?: { role: 'user' | 'assistant'; content: string; citations?: Source[] }[];
      };
      const loaded: Msg[] = (data.messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
        sources: Array.isArray(m.citations) ? m.citations : undefined,
      }));
      setConversationId(data.conversation?.id ?? id);
      setMessages(loaded);
      setInput('');
      setAttachment(null);
      setHistoryOpen(false);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement de la conversation impossible.');
    } finally {
      setLoadingConversation(false);
    }
  }

  function pickTask(prompt: string) {
    setInput(prompt);
    textareaRef.current?.focus();
  }

  async function onAttach(file: File) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('Fichier trop lourd (max 20 Mo).');
      return;
    }
    setAttaching(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const supabase = createClient();
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('Session expirée — reconnectez-vous.');
      const res = await fetch(`${VPS}/api/ocr/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileBase64: base64, filename: file.name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { detail?: string }).detail || 'Analyse du document impossible.');
      const f = (data.fields ?? {}) as { documentType?: string; societe?: { denomination?: string }; decisions?: unknown[] };
      const nb = (f.decisions ?? []).length;
      const summary =
        [f.documentType, f.societe?.denomination, nb ? `${nb} décision(s)` : null].filter(Boolean).join(' · ') ||
        'document analysé';
      setAttachment({ name: file.name, summary, text: (data.text as string) || (data.textPreview as string) || '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analyse du document impossible.');
    } finally {
      setAttaching(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function ask(question: string) {
    const att = attachment;
    if ((!question.trim() && !att) || busy) return;
    const q = question.trim() || 'Analyse ce document et résume les points clés.';
    setError(null);
    setBusy(true);
    setInput('');
    setAttachment(null);
    setMessages((m) => [
      ...m,
      { role: 'user', content: q, attachmentName: att?.name },
      { role: 'assistant', content: '' },
    ]);

    // Injecte le contenu du document joint en contexte de la question.
    const payloadQuestion = att
      ? `Document joint « ${att.name} » (${att.summary}) :\n"""\n${att.text}\n"""\n\nEn t'appuyant aussi sur ce document, réponds à : ${q}`
      : q;

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expirée — reconnectez-vous.');

      const res = await fetch(`${VPS}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: payloadQuestion, conversation_id: conversationId }),
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
            void fetchConversations();
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
      {/* Chip du document joint */}
      {attachment && (
        <div className="mx-1 mb-1 inline-flex max-w-full items-center gap-2 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs">
          <FileText className="size-3.5 shrink-0 text-primary" />
          <span className="truncate font-medium">{attachment.name}</span>
          <span className="hidden shrink-0 text-muted-foreground sm:inline">· {attachment.summary}</span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="ml-0.5 rounded p-0.5 hover:bg-muted"
            aria-label="Retirer le document"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAttach(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={attaching || busy}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {attaching ? <Loader2 className="size-3 animate-spin" /> : <Paperclip className="size-3" />}
            Pièce jointe
          </button>
          <span className="hidden items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex">
            <Sparkles className="size-3" />
            Légifrance · BOFiP · CGI
          </span>
        </div>
        <button
          type="submit"
          disabled={busy || (!input.trim() && !attachment)}
          className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Envoyer"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </button>
      </div>
    </form>
  );

  // Panneau latéral « Historique » — réutilisé sur l'accueil et en
  // vue conversation. Contrôlé par historyOpen.
  const renderHistory = () => (
    <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <History className="size-4" />
          Historique
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 font-serif text-base">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-primary">
              <History className="size-4" />
            </span>
            Historique des conversations
          </SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Aucune conversation pour l'instant.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => {
                const active = c.id === conversationId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => loadConversation(c.id)}
                      disabled={loadingConversation}
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#f5f3fb] disabled:opacity-60',
                        active && 'bg-accent',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg',
                          active ? 'bg-[#ede7ff] text-[#5b36d6]' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <MessageSquare className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'truncate text-sm font-medium text-foreground',
                              active && 'text-primary',
                            )}
                          >
                            {c.title || 'Conversation'}
                          </span>
                          {active && (
                            <span className="size-1.5 shrink-0 rounded-full bg-[#ff887b]" aria-hidden />
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {shortDate(c.updated_at || c.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  // ─── Écran d'accueil (aucun message) — façon Ordalie ─────
  if (messages.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-7 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              {greeting()}
              {firstName ? ` ${firstName}` : ''},
            </h1>
            <p className="mt-1 text-lg text-muted-foreground">
              quelle question souhaitez-vous éclaircir&nbsp;?
            </p>
          </div>
          <div className="shrink-0 pt-1">{renderHistory()}</div>
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
        <div className="ml-auto flex items-center gap-2">
          {renderHistory()}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMessages([]);
              setConversationId(null);
              setInput('');
            }}
          >
            Nouvelle conversation
          </Button>
        </div>
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
              ) : m.role === 'assistant' ? (
                <Markdown>{m.content}</Markdown>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
              {m.attachmentName && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-xs">
                  <FileText className="size-3" />
                  <span className="max-w-[220px] truncate">{m.attachmentName}</span>
                </div>
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
