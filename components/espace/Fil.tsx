'use client';

// Fil de discussion de l'assistant (chat public et espace entrepreneur) :
// messages, questionnaires interactifs, proposition de formalité, documents.

import { Bot, Check, FileText, Loader2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { AgentForm, type Reponses } from '@/components/cabinet/dashboard/AgentForm';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import { euros, type ItemFil, type Offre } from '@/lib/espace/chat';

export function Avatar() {
  return (
    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#7551e8] to-[#c13ad6] text-white">
      <Bot className="size-4" />
    </span>
  );
}

export function CarteOffre({ offre, action }: { offre: Offre; action?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4dcff] bg-white shadow-[0_12px_30px_rgba(54,31,171,0.08)]">
      <div className="bg-gradient-to-r from-[#f4efff] to-[#fff3f7] px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7551e8]">Formalité proposée</div>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-lg font-semibold text-[#241143]">{offre.libelle}</div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#241143]">{euros(offre.prix_ttc_cents)} <span className="text-sm font-medium text-[#6b6385]">TTC</span></div>
            <div className="text-xs text-[#6b6385]">{offre.prix_ht} € HT · prestation Legaly</div>
          </div>
        </div>
        {offre.resume && <div className="mt-2 text-sm text-[#3d3558]">{offre.resume}</div>}
        {offre.pourquoi && <div className="mt-1 text-sm text-[#6b6385]">{offre.pourquoi}</div>}
      </div>
      <div className="space-y-3 px-5 py-4">
        <ul className="space-y-1.5">
          {offre.inclus.map((x) => (
            <li key={x} className="flex items-start gap-2 text-sm text-[#3d3558]"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {x}</li>
          ))}
        </ul>
        <div className="rounded-lg bg-[#f7f5fc] px-3 py-2 text-xs text-[#6b6385]">
          <strong className="text-[#3d3558]">Frais officiels en plus</strong> (payés sur le Guichet unique) : {offre.frais_officiels}
        </div>
        {action}
        <div className="flex items-center gap-1.5 text-[11px] text-[#8a83a3]"><ShieldCheck className="size-3.5" /> Rien n’est déposé sans votre validation. Dépôt par Legaly comme mandataire.</div>
      </div>
    </div>
  );
}

export function Fil({
  items, busy, onRepondre, actionOffre,
}: {
  items: ItemFil[];
  busy: boolean;
  onRepondre: (id: string, r: Reponses) => void;
  actionOffre?: (o: Offre) => React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {items.map((it, i) => {
        if (it.type === 'user') {
          return (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#361fab] px-4 py-2.5 text-sm text-white">
                {it.text}
                {!!it.files?.length && <div className="mt-1 text-xs text-white/75">{it.files.join(', ')}</div>}
              </div>
            </div>
          );
        }
        if (it.type === 'assistant') {
          return (
            <div key={i} className="flex gap-2.5">
              <Avatar />
              <div className="min-w-0 flex-1 pt-0.5 text-sm text-[#241143] [&_p]:!my-1.5 [&_p]:!text-[#241143]"><Markdown>{it.text}</Markdown></div>
            </div>
          );
        }
        if (it.type === 'form') {
          return (
            <div key={i} className="ml-9">
              <AgentForm form={{ ...it.form, id: it.id }} reponses={it.reponses} repondu={it.repondu} disabled={busy} onSubmit={(r) => onRepondre(it.id, r)} />
            </div>
          );
        }
        if (it.type === 'offre') {
          return <div key={i} className="ml-9"><CarteOffre offre={it.offre} action={actionOffre?.(it.offre)} /></div>;
        }
        if (it.type === 'document') {
          return (
            <div key={i} className="ml-9 flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2 text-xs">
              <FileText className="size-4 text-[#7551e8]" />
              <span className="min-w-0 flex-1"><span className="block font-medium">{it.label}</span>{it.detail && <span className="block truncate text-[#6b6385]">{it.detail}</span>}</span>
            </div>
          );
        }
        if (it.type === 'etape') {
          const Icone = it.statut === 'start' ? Loader2 : it.statut === 'error' ? AlertCircle : Check;
          return (
            <div key={i} className={cn('ml-9 flex items-center gap-2 text-xs', it.statut === 'error' ? 'text-red-600' : 'text-[#6b6385]')}>
              <Icone className={cn('size-3.5', it.statut === 'start' && 'animate-spin')} /> {it.label}{it.detail ? ` · ${it.detail}` : ''}
            </div>
          );
        }
        return null;
      })}
      {busy && (
        <div className="flex items-center gap-2.5 text-sm text-[#6b6385]"><Avatar /><span className="inline-flex gap-1"><span className="size-1.5 animate-bounce rounded-full bg-[#7551e8]" /><span className="size-1.5 animate-bounce rounded-full bg-[#7551e8] [animation-delay:120ms]" /><span className="size-1.5 animate-bounce rounded-full bg-[#7551e8] [animation-delay:240ms]" /></span></div>
      )}
    </div>
  );
}

export function BoutonOffre({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#361fab] to-[#7551e8] px-5 py-3 text-[15px] font-semibold !text-white no-underline shadow-[0_10px_24px_rgba(54,31,171,0.25)] transition-transform hover:-translate-y-0.5">
      {children} <ArrowRight className="size-4" />
    </a>
  );
}
