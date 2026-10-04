'use client';

// Agent Formalités — en tête du tableau de bord.
// Le professionnel décrit l'opération en langage naturel et peut joindre ses
// documents (pièces d'identité, statuts, PV d'AG, annonces légales…) ; l'agent
// (backend /api/agent/formalite, SSE) les lit, pose les questions manquantes,
// crée le dossier, génère les statuts et les actes annexes. Signature et dépôt
// INPI restent des actions humaines depuis la page du dossier.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, ArrowRight, Bot, CheckCircle2, FileText, FolderPlus, Loader2,
  Paperclip, PenLine, RotateCcw, Send, Sparkles, Upload, Workflow, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';

const VPS = process.env.NEXT_PUBLIC_VPS_BACKEND_URL ?? 'https://0dao73k.cserverhost.cloud';
const STORAGE_KEY = 'legaly_formality_agent_v1';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.docx';
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const MAX_FILES = 5;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

type ToolEvent = {
  id: string;
  name: string;
  status: 'start' | 'done' | 'error';
  label: string;
  detail?: string;
  href?: string | null;
  docHref?: string;
  kind?: 'dossier' | 'document' | 'pipeline' | 'piece' | 'inpi';
  dossier?: { id: string; reference: string; denomination: string };
};

type Item =
  | { type: 'user'; text: string; files?: string[] }
  | { type: 'assistant'; text: string }
  | { type: 'tool'; event: ToolEvent };

type SavedState = {
  history: unknown[];
  items: Item[];
  dossier: ToolEvent['dossier'] | null;
};

type PendingFile = { name: string; mime: string; size: number; data: string };

const EXAMPLES = [
  {
    label: 'Créer une SASU de conseil',
    text: "Je veux créer une SASU de conseil en stratégie, capital 1 000 €, siège à Paris. Le président est l'associé unique.",
  },
  {
    label: 'SAS à deux associés',
    text: 'Création d’une SAS de développement logiciel avec deux associés à 50/50, capital 10 000 €, siège à Lyon.',
  },
  {
    label: 'SCI familiale',
    text: 'Constituer une SCI familiale pour détenir un appartement, entre deux époux, capital 1 000 €.',
  },
  {
    label: 'Transfert de siège',
    text: 'Transfert du siège social d’une SARL cliente vers une nouvelle adresse, à compter du mois prochain.',
  },
];

const CAPABILITIES = [
  { icon: FolderPlus, label: 'Création du dossier' },
  { icon: Upload, label: 'Lecture de vos documents' },
  { icon: FileText, label: 'Statuts générés' },
  { icon: PenLine, label: 'Actes annexes' },
  { icon: Workflow, label: 'Suivi jusqu’au dépôt' },
];

function loadSaved(key: string): SavedState | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SavedState) : null;
  } catch {
    return null;
  }
}

function save(key: string, state: SavedState) {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* stockage indisponible : la session reste en mémoire */
  }
}

function clearSaved(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

function mimeOf(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? null;
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error(`Lecture impossible : ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

// inpiFormality : agent ouvert sur une formalité déjà déposée au Guichet unique
// (page /inpi/[id]) — conversation propre à la formalité, consacrée à sa
// régularisation ou à son suivi.
// resume : reprise d'une formalité préparée en lot (conversation de l'agent déjà menée).
export type AgentResume = {
  dossier: { id: string; reference: string; denomination: string };
  messages: unknown[];
  events: { kind?: ToolEvent['kind']; label: string; detail?: string | null }[];
  texte: string;
};

export function FormalityAgent({
  inpiFormality,
  resume,
}: { inpiFormality?: { id: string; label: string; aTraiter?: boolean }; resume?: AgentResume } = {}) {
  const storageKey = inpiFormality
    ? `${STORAGE_KEY}_inpi_${inpiFormality.id}`
    : resume
      ? `${STORAGE_KEY}_dossier_${resume.dossier.id}`
      : STORAGE_KEY;
  const examples = inpiFormality
    ? [
        {
          label: inpiFormality.aTraiter ? 'Analyser la régularisation demandée' : 'Analyser cette formalité',
          text: inpiFormality.aTraiter
            ? `Analyse la demande de régularisation du greffe pour la formalité ${inpiFormality.label}, lis les pièces utiles et prépare tout ce qu'il faut pour y répondre.`
            : `Fais le point sur la formalité ${inpiFormality.label} : statut, pièces déposées et éventuelles actions à mener.`,
        },
      ]
    : EXAMPLES;
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [dossier, setDossier] = useState<ToolEvent['dossier'] | null>(null);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = loadSaved(storageKey);
    if (saved) {
      setItems(saved.items ?? []);
      setHistory(saved.history ?? []);
      setDossier(saved.dossier ?? null);
    } else if (resume) {
      // Première ouverture : on repart de la préparation faite par le lot
      setHistory(resume.messages);
      setDossier(resume.dossier);
      setItems([
        ...resume.events.map((e, i): Item => ({
          type: 'tool',
          event: { id: `lot-${i}`, name: 'lot', status: 'done', label: e.label, detail: e.detail ?? undefined, kind: e.kind },
        })),
        { type: 'assistant', text: resume.texte.trim() || 'Préparation terminée.' },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items, busy]);

  const toolEvents = items
    .filter((i): i is { type: 'tool'; event: ToolEvent } => i.type === 'tool')
    .map((i) => i.event);
  const documents = toolEvents.filter((e) => e.kind === 'document' && e.status === 'done');
  const pieces = toolEvents.filter((e) => e.kind === 'piece' && e.status === 'done');

  async function addFiles(list: FileList | File[]) {
    setError(null);
    const next = [...files];
    for (const file of Array.from(list)) {
      const mime = mimeOf(file);
      if (!mime) {
        setError(`Format non pris en charge : ${file.name}. Formats acceptés : PDF, image (JPG, PNG, WebP) ou Word (.docx).`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name} dépasse 8 Mo.`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setError(`${MAX_FILES} documents maximum par message.`);
        break;
      }
      if (next.reduce((s, f) => s + f.size, 0) + file.size > MAX_TOTAL_BYTES) {
        setError('10 Mo maximum au total par message : envoyez le reste au message suivant.');
        break;
      }
      try {
        next.push({ name: file.name, mime, size: file.size, data: await readBase64(file) });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lecture impossible.');
      }
    }
    setFiles(next);
  }

  function reset() {
    if (busy) return;
    setItems([]);
    setHistory([]);
    setDossier(null);
    setFiles([]);
    setError(null);
    clearSaved(storageKey);
  }

  async function send(text: string) {
    const question = text.trim();
    if ((!question && files.length === 0) || busy) return;
    const attachments = files;
    setBusy(true);
    setError(null);
    setInput('');
    setFiles([]);

    // Copie locale : l'état React n'est relu qu'à la fin du tour.
    let localItems: Item[] = [
      ...items,
      { type: 'user', text: question, files: attachments.map((f) => f.name) },
    ];
    let localDossier = dossier;
    setItems(localItems);

    const commit = (next: Item[]) => {
      localItems = next;
      setItems(next);
    };
    const appendText = (delta: string) => {
      const last = localItems[localItems.length - 1];
      if (last?.type === 'assistant') {
        commit([...localItems.slice(0, -1), { type: 'assistant', text: last.text + delta }]);
      } else {
        commit([...localItems, { type: 'assistant', text: delta }]);
      }
    };
    const upsertTool = (ev: ToolEvent) => {
      const idx = localItems.findIndex((i) => i.type === 'tool' && i.event.id === ev.id);
      if (idx >= 0) {
        const next = localItems.slice();
        next[idx] = { type: 'tool', event: ev };
        commit(next);
      } else {
        commit([...localItems, { type: 'tool', event: ev }]);
      }
      if (ev.dossier) {
        localDossier = ev.dossier;
        setDossier(ev.dossier);
      }
    };

    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Session expirée, reconnectez-vous.');

      const res = await fetch(`${VPS}/api/agent/formalite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          input: question,
          messages: history,
          dossier_id: localDossier?.id ?? null,
          inpi_formality_id: inpiFormality?.id ?? null,
          attachments: attachments.map(({ name, mime, data }) => ({ name, mime, data })),
        }),
      });
      if (!res.ok || !res.body) {
        const b = await res.json().catch(() => ({}));
        throw new Error((b as { detail?: string; error?: string }).detail || (b as { error?: string }).error || `Erreur ${res.status}`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split('\n\n');
        buf = events.pop() ?? '';
        for (const raw of events) {
          const t = raw.match(/^event: (.+)$/m)?.[1];
          const d = raw.match(/^data: (.+)$/m)?.[1];
          if (!t || !d) continue;
          const payload = JSON.parse(d);
          if (t === 'text') appendText(payload.text);
          else if (t === 'tool') upsertTool(payload as ToolEvent);
          else if (t === 'done') {
            setHistory(payload.messages);
            save(storageKey, { history: payload.messages, items: localItems, dossier: localDossier });
          } else if (t === 'error') {
            throw new Error(payload.detail || payload.error);
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inattendue';
      setError(
        /ANTHROPIC_API_KEY/.test(msg)
          ? "L'agent n'est pas encore configuré : la clé Anthropic manque sur le serveur."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  const started = items.length > 0;
  const canSend = !busy && (input.trim().length > 0 || files.length > 0);

  const fileChips = files.length > 0 && (
    <div className="flex flex-wrap gap-1.5">
      {files.map((f, i) => (
        <span key={`${f.name}-${i}`} className="flex max-w-full items-center gap-1.5 rounded-md border bg-[#f7f5fd] py-1 pl-2 pr-1 text-xs">
          <FileText className="size-3.5 shrink-0 text-primary" />
          <span className="min-w-0 truncate">{f.name}</span>
          <span className="shrink-0 text-muted-foreground">{formatSize(f.size)}</span>
          <button
            type="button"
            onClick={() => setFiles(files.filter((_, j) => j !== i))}
            aria-label={`Retirer ${f.name}`}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );

  const attachButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => fileInputRef.current?.click()}
      disabled={busy}
      aria-label="Joindre des documents"
      title="Joindre des documents (PDF, images, Word)"
    >
      <Paperclip className="size-4" />
    </Button>
  );

  return (
    <Card
      className={cn(
        'relative gap-0 overflow-hidden border-[#d9cffb] py-0 shadow-sm',
        dragging && 'ring-[3px] ring-primary/30',
      )}
      onDragOver={(e) => {
        if (busy) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!busy && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[#f3efff]/90">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="size-8" />
            <p className="text-sm font-semibold">Déposez vos documents</p>
            <p className="text-xs text-muted-foreground">Pièces d&apos;identité, statuts, PV, annonces légales… (PDF, images, Word)</p>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#ece6ff] bg-gradient-to-r from-[#f3efff] via-[#f8f6ff] to-white px-5 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">
            {inpiFormality ? 'Agent de régularisation' : 'Agent Formalités'}
          </p>
          <p className="text-xs text-muted-foreground">
            {inpiFormality
              ? "L'agent lit la formalité et ses pièces, explique la demande du greffe et prépare les documents de réponse."
              : "Décrivez l'opération ou joignez vos documents : l'agent crée le dossier, rédige les statuts et tous les actes."}
          </p>
        </div>
        {started && (
          <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
            <RotateCcw className="size-4" />
            Nouvelle formalité
          </Button>
        )}
      </div>

      <CardContent className="p-0">
        {!started ? (
          <div className="space-y-4 px-5 py-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="space-y-2 rounded-xl border bg-card p-2 shadow-xs focus-within:border-primary/60 focus-within:ring-[3px] focus-within:ring-primary/15"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={3}
                placeholder={
                  inpiFormality
                    ? "Ex : Prépare la réponse au greffe. Vous pouvez joindre les pièces reçues du client (pièce d'identité, acte enregistré…)."
                    : "Ex : Je crée une SASU de conseil pour Marie Martin, capital 2 000 €, siège 10 rue de Rivoli 75001 Paris… Vous pouvez aussi joindre sa pièce d'identité ou un PV d'AG."
                }
                className="w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              {fileChips && <div className="px-1">{fileChips}</div>}
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex min-w-0 items-center gap-1">
                  {attachButton}
                  <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
                    Joindre ou glisser des documents · Entrée pour envoyer
                  </span>
                </div>
                <Button type="submit" size="sm" disabled={!canSend}>
                  Lancer l&apos;agent
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => send(ex.text)}
                  className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/50 hover:bg-[#f5f3fb] hover:text-foreground"
                >
                  {ex.label}
                </button>
              ))}
            </div>

            {!inpiFormality && <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
              {CAPABILITIES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f7f5fd] px-3 py-2 text-xs text-foreground/80">
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>}
            {error && <ErrorLine message={error} />}
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
            {/* Conversation */}
            <div className="flex min-w-0 flex-col border-b lg:border-b-0 lg:border-r">
              <div ref={scrollRef} className="max-h-[520px] min-h-[260px] space-y-3 overflow-y-auto px-5 py-4">
                {items.map((item, i) => (
                  <ItemView key={i} item={item} />
                ))}
                {busy && items[items.length - 1]?.type !== 'assistant' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    L&apos;agent travaille…
                  </div>
                )}
                {error && <ErrorLine message={error} />}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="space-y-2 border-t bg-muted/30 px-4 py-3"
              >
                {fileChips}
                <div className="flex items-end gap-2">
                  {attachButton}
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                    rows={1}
                    placeholder="Répondez à l'agent, précisez votre demande ou joignez un document…"
                    disabled={busy}
                    className="max-h-32 min-h-10 flex-1 resize-none rounded-md border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
                  />
                  <Button type="submit" size="icon" disabled={!canSend} aria-label="Envoyer">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
              </form>
            </div>

            {/* Dossier en cours */}
            <aside className="min-w-0 space-y-4 bg-[#fbfaff] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dossier en cours</p>
                {dossier ? (
                  <Link href={`/dossiers/${dossier.id}`} className="mt-2 block rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-primary/50">
                    <span className="block truncate text-sm font-semibold">{dossier.denomination}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{dossier.reference}</span>
                  </Link>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Le dossier sera créé dès que l&apos;agent aura les premières informations.</p>
                )}
              </div>

              <SidebarList title="Documents produits" empty="Aucun document pour l'instant." events={documents} external />
              {pieces.length > 0 && <SidebarList title="Pièces reçues" empty="" events={pieces} />}

              {dossier && (
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={`/dossiers/${dossier.id}/orchestrator`}>
                    Signature et dépôt INPI
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
              <p className="text-[11px] leading-snug text-muted-foreground">
                L&apos;agent prépare tout ; vous relisez, faites signer et déposez depuis le dossier.
              </p>
            </aside>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SidebarList({ title, empty, events, external = false }: { title: string; empty: string; events: ToolEvent[]; external?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title} {events.length > 0 && `(${events.length})`}
      </p>
      {events.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {events.map((d) => (
            <li key={d.id}>
              <a
                href={d.href ?? d.docHref ?? '#'}
                {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-[#f0ecfd]"
              >
                <FileText className="size-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{d.kind === 'piece' ? d.detail : d.label}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemView({ item }: { item: Item }) {
  if (item.type === 'user') {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {item.files && item.files.length > 0 && (
          <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
            {item.files.map((name, i) => (
              <span key={`${name}-${i}`} className="flex min-w-0 items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs">
                <Paperclip className="size-3 shrink-0 text-primary" />
                <span className="truncate">{name}</span>
              </span>
            ))}
          </div>
        )}
        {item.text && (
          <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
            {item.text}
          </p>
        )}
      </div>
    );
  }
  if (item.type === 'assistant') {
    return (
      <div className="flex gap-2.5">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[#ede7ff] text-primary">
          <Bot className="size-4" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <Markdown>{item.text}</Markdown>
        </div>
      </div>
    );
  }
  const ev = item.event;
  const Icon = ev.status === 'start' ? Loader2 : ev.status === 'error' ? AlertCircle : CheckCircle2;
  const link = ev.href;
  const body = (
    <>
      <Icon
        className={cn(
          'size-4 shrink-0',
          ev.status === 'start' && 'animate-spin text-muted-foreground',
          ev.status === 'done' && 'text-primary',
          ev.status === 'error' && 'text-destructive',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{ev.label}</span>
        {ev.detail && <span className="block truncate text-[11px] text-muted-foreground">{ev.detail}</span>}
      </span>
      {link && ev.status === 'done' && <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />}
    </>
  );
  const cls = cn(
    'ml-9 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs',
    ev.status === 'error' ? 'border-destructive/30 bg-destructive/5' : 'bg-card',
    link && ev.status === 'done' && 'transition-colors hover:border-primary/50',
  );
  if (link && ev.status === 'done') {
    return ev.kind === 'document' ? (
      <a href={link} target="_blank" rel="noreferrer" className={cls}>{body}</a>
    ) : (
      <Link href={link} className={cls}>{body}</Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}
