// Mini-illustrations des cartes de la landing (maquettes au trait, identité
// Legaly : violet, corail, pêche). Purement décoratives.

import {
  Bell, Building2, Check, CreditCard, FileSignature, FileText, Layers, Megaphone, MessageSquare,
  Moon, PenLine, ScanSearch, Send, Sparkles, Stamp, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Fenetre({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-[var(--violet-900)]/80 bg-white shadow-[2px_2px_0_rgba(8,3,49,0.85)]', className)}>
      <div className="flex gap-1 border-b border-[var(--violet-900)]/15 px-2 py-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 rounded-full border border-[var(--violet-900)]/50" />
        ))}
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

export function Lignes({ n = 3, className }: { n?: number; className?: string }) {
  const largeurs = ['w-full', 'w-4/5', 'w-3/5', 'w-2/3', 'w-1/2'];
  return (
    <div className={cn('space-y-1', className)}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={cn('h-1 rounded-full bg-[var(--ink-150)]', largeurs[i % largeurs.length])} />
      ))}
    </div>
  );
}

export function Pastille({ icon: Icon, tone = 'violet', className }: { icon: typeof Check; tone?: 'violet' | 'corail' | 'peche'; className?: string }) {
  const tones = {
    violet: 'bg-[var(--violet-100)] text-[var(--violet-700)]',
    corail: 'bg-[var(--accent-soft)] text-[var(--accent-ink)]',
    peche: 'bg-[#fff1e6] text-[#c2410c]',
  };
  return (
    <span className={cn('grid size-7 place-items-center rounded-lg border border-[var(--violet-900)]/70 shadow-[1.5px_1.5px_0_rgba(8,3,49,0.8)]', tones[tone], className)}>
      <Icon className="size-3.5" />
    </span>
  );
}

// Une illustration par carte de la rangée « formalités »
export const ILLUS: Record<string, React.ReactNode> = {
  creation: (
    <div className="relative">
      <Fenetre className="w-36">
        <p className="mb-1.5 text-[8px] font-semibold text-[var(--violet-900)]">Statuts — SASU</p>
        <Lignes n={4} />
      </Fenetre>
      <Pastille icon={Building2} className="absolute -right-3 -top-3" />
    </div>
  ),
  modification: (
    <div className="relative flex items-center gap-2">
      <div className="rounded-md border border-[var(--violet-900)]/70 bg-white px-2 py-1.5 text-[8px] text-[var(--ink-500)] line-through shadow-[1.5px_1.5px_0_rgba(8,3,49,0.8)]">12 rue de Rome</div>
      <span className="text-[var(--accent)]">→</span>
      <div className="rounded-md border border-[var(--violet-900)]/70 bg-[var(--violet-50)] px-2 py-1.5 text-[8px] font-semibold text-[var(--violet-900)] shadow-[1.5px_1.5px_0_rgba(8,3,49,0.8)]">8 quai du Port</div>
      <Pastille icon={PenLine} tone="corail" className="absolute -right-2 -top-6" />
    </div>
  ),
  dissolution: (
    <div className="relative">
      <Fenetre className="w-36">
        <p className="text-[8px] font-semibold text-[var(--violet-900)]">PV de dissolution</p>
        <p className="mt-1 text-[7px] text-[var(--ink-500)]">Liquidateur nommé</p>
        <Lignes n={2} className="mt-1.5" />
      </Fenetre>
      <Pastille icon={Stamp} tone="peche" className="absolute -right-3 -top-3" />
    </div>
  ),
  sommeil: (
    <div className="relative grid place-items-center">
      <div className="grid size-16 place-items-center rounded-full border border-[var(--violet-900)]/70 bg-[var(--violet-50)] shadow-[2px_2px_0_rgba(8,3,49,0.85)]">
        <Moon className="size-6 text-[var(--violet-700)]" />
      </div>
      <span className="absolute -right-6 top-0 rounded-full border border-[var(--violet-900)]/70 bg-white px-1.5 py-0.5 text-[7px] font-semibold text-[var(--violet-900)]">2 ans max.</span>
    </div>
  ),
  annonces: (
    <div className="relative">
      <Fenetre className="w-36">
        <p className="text-[8px] font-semibold text-[var(--violet-900)]">Avis de constitution</p>
        <Lignes n={3} className="mt-1.5" />
        <p className="mt-1.5 flex items-center gap-1 text-[7px] text-[var(--violet-700)]"><Check className="size-2.5" /> Mentions vérifiées</p>
      </Fenetre>
      <Pastille icon={Megaphone} tone="corail" className="absolute -right-3 -top-3" />
    </div>
  ),
  rne: (
    <div className="relative">
      <div className="space-y-1.5">
        {['Copie des statuts', 'PV d’AG', 'Comptes annuels'].map((t) => (
          <div key={t} className="flex w-36 items-center gap-1.5 rounded-md border border-[var(--violet-900)]/70 bg-white px-2 py-1 text-[8px] text-[var(--violet-900)] shadow-[1.5px_1.5px_0_rgba(8,3,49,0.8)]">
            <FileText className="size-2.5 text-[var(--violet-600)]" /> {t}
          </div>
        ))}
      </div>
      <Pastille icon={ScanSearch} className="absolute -right-4 -top-3" />
    </div>
  ),
  regularisation: (
    <div className="relative">
      <Fenetre className="w-36">
        <p className="flex items-center gap-1 text-[8px] font-semibold text-[var(--accent-ink)]"><Bell className="size-2.5" /> Demande du greffe</p>
        <Lignes n={2} className="mt-1.5" />
        <div className="mt-1.5 rounded bg-[var(--violet-50)] px-1.5 py-1 text-[7px] text-[var(--violet-900)]">Réponse préparée</div>
      </Fenetre>
    </div>
  ),
  lots: (
    <div className="relative space-y-1">
      {['ALPHA CONSEIL', 'BETA STRATÉGIE', 'GAMMA FINANCE'].map((t, i) => (
        <div key={t} className="flex w-40 items-center justify-between rounded-md border border-[var(--violet-900)]/70 bg-white px-2 py-1 text-[7px] text-[var(--violet-900)] shadow-[1.5px_1.5px_0_rgba(8,3,49,0.8)]">
          {t}
          <span className={cn('rounded-full px-1.5 py-px font-semibold', i < 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--violet-100)] text-[var(--violet-700)]')}>{i < 2 ? 'Prête' : 'En cours'}</span>
        </div>
      ))}
      <Pastille icon={Layers} className="absolute -right-4 -top-4" />
    </div>
  ),
  paiement: (
    <div className="relative">
      <Fenetre className="w-36">
        <div className="flex items-center justify-between text-[8px] text-[var(--violet-900)]"><span>BODACC</span><span>116,00 €</span></div>
        <div className="mt-1 flex items-center justify-between text-[8px] text-[var(--violet-900)]"><span>Greffe</span><span>53,38 €</span></div>
        <div className="mt-1.5 rounded-full bg-[var(--violet-50)] px-1.5 py-0.5 text-center text-[7px] font-semibold text-[var(--violet-700)]">Délégation envoyée</div>
      </Fenetre>
      <Pastille icon={CreditCard} tone="corail" className="absolute -right-3 -top-3" />
    </div>
  ),
  signature: (
    <div className="relative">
      <Fenetre className="w-36">
        <Lignes n={2} />
        <svg viewBox="0 0 100 24" className="mt-1.5 h-5 w-24 text-[var(--violet-700)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 18c8-14 12 6 18-4s8-6 12 2 10-10 16-4 8 8 14 0 12 4 20-2" />
        </svg>
      </Fenetre>
      <Pastille icon={FileSignature} className="absolute -right-3 -top-3" />
    </div>
  ),
};

// Illustrations des cartes « agents »
export const ILLUS_AGENTS: Record<string, React.ReactNode> = {
  formalites: (
    <Fenetre className="w-56">
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 grid size-4 place-items-center rounded bg-[var(--violet-100)]"><Sparkles className="size-2.5 text-[var(--violet-700)]" /></span>
        <div className="flex-1 rounded-md border border-[var(--violet-900)]/20 bg-[var(--violet-50)] p-1.5">
          <p className="text-[8px] font-semibold text-[var(--violet-900)]">LE PRÉSIDENT · 1 SUR 4</p>
          <p className="mt-0.5 text-[8px] text-[var(--violet-900)]">Qui préside la société ?</p>
          <div className="mt-1 h-3 rounded border border-[var(--ink-200)] bg-white" />
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[7px] text-[var(--ink-500)]"><Check className="size-2.5 text-[var(--violet-600)]" /> A travaillé 12 s · 3 documents</p>
    </Fenetre>
  ),
  regularisation: (
    <Fenetre className="w-56">
      <p className="flex items-center gap-1 text-[8px] font-semibold text-[var(--accent-ink)]"><Bell className="size-2.5" /> Pièce non conforme — greffe</p>
      <Lignes n={2} className="mt-1.5" />
      <div className="mt-1.5 flex items-center gap-1 rounded bg-[var(--violet-50)] px-1.5 py-1 text-[8px] text-[var(--violet-900)]"><MessageSquare className="size-2.5" /> Courrier de réponse rédigé</div>
    </Fenetre>
  ),
  annonces: (
    <Fenetre className="w-56">
      <p className="text-[8px] font-semibold text-[var(--violet-900)]">Avis de transfert de siège — dépt 13</p>
      <Lignes n={3} className="mt-1.5" />
      <div className="mt-1.5 flex gap-1">
        {['SIREN', 'Greffe', 'Date d’effet'].map((m) => (
          <span key={m} className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-px text-[7px] text-emerald-700"><Check className="size-2" />{m}</span>
        ))}
      </div>
    </Fenetre>
  ),
  lots: (
    <Fenetre className="w-56">
      <p className="text-[8px] font-semibold text-[var(--violet-900)]">Lot — 3 créations · 1 mise en sommeil</p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--ink-100)]"><div className="h-full w-3/4 bg-gradient-to-r from-[#ff887b] to-[#ea42fd]" /></div>
      <p className="mt-1 text-[7px] text-[var(--ink-500)]">3/4 prêtes à valider</p>
      <div className="mt-1.5 flex items-center gap-1 text-[7px] text-[var(--violet-900)]"><Users className="size-2.5" /> Un dossier par société</div>
    </Fenetre>
  ),
  rne: (
    <Fenetre className="w-56">
      <p className="text-[8px] font-semibold text-[var(--violet-900)]">Registre national des entreprises</p>
      <div className="mt-1.5 space-y-1">
        {['Statuts en vigueur', 'Dernier PV', 'Avis de situation INSEE'].map((t) => (
          <div key={t} className="flex items-center justify-between rounded border border-[var(--ink-150)] px-1.5 py-0.5 text-[7px] text-[var(--violet-900)]">
            {t} <Send className="size-2 text-[var(--violet-600)]" />
          </div>
        ))}
      </div>
    </Fenetre>
  ),
};
