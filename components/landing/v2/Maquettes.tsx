// Maquettes d'écrans de Legaly (fidèles à l'application : barre latérale, agent,
// lots, annonces, RNE, régularisations, paiements, entités). Décoratives : les
// données affichées sont des exemples.

import {
  Bell, BookOpen, Check, ClipboardList, CreditCard, FileSignature, FileText, FolderOpen, Landmark,
  LayoutDashboard, Layers, Loader2, Megaphone, Send, Sparkles, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type Variante = 'independants-tpe' | 'experts-comptables' | 'avocats' | 'directions-juridiques';

const SOCIETES: Record<Variante, string[]> = {
  'independants-tpe': ['NOVA CONSEIL', 'PIXEL STUDIO', 'ATELIER CÉRAMIQUE', 'CAFÉ DES HALLES'],
  'experts-comptables': ['ALPHA CONSEIL', 'BOULANGERIE MARTIN', 'SCI DU PORT', 'GAMMA FINANCE'],
  avocats: ['HOLDING VERNE', 'STUDIO NOVA', 'SCI LES TILLEULS', 'ATELIER BLEU'],
  'directions-juridiques': ['HOLDING DU GROUPE', 'FILIALE FRANCE', 'FILIALE LOGISTIQUE', 'SCI IMMOBILIÈRE'],
};

const MENU = [
  { icon: LayoutDashboard, l: 'Tableau de bord' },
  { icon: FileText, l: 'Formalités' },
  { icon: BookOpen, l: 'Documents RNE' },
  { icon: Users, l: 'Clients' },
  { icon: CreditCard, l: 'Facturation' },
];

export function Ecran({ actif = 0, titre, children }: { actif?: number; titre: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--violet-900)]/15 bg-white shadow-[0_30px_70px_rgba(54,31,171,0.18)]">
      <div className="flex h-[380px] text-left sm:h-[420px]">
        <aside className="hidden w-40 shrink-0 flex-col gap-1 bg-[#140d2e] p-3 sm:flex">
          <div className="mb-3 flex items-center gap-1.5 px-1 text-[12px] font-bold text-white">
            <span className="grid size-5 place-items-center rounded bg-gradient-to-br from-[#9d6cf2] to-[#ff5f9e] text-[10px]">L</span> Legaly AI
          </div>
          {MENU.map((m, i) => (
            <div key={m.l} className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]', i === actif ? 'bg-white/10 font-semibold text-white' : 'text-white/55')}>
              <m.icon className="size-3.5" /> {m.l}
            </div>
          ))}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--ink-100)] px-4 py-2.5">
            <p className="text-[13px] font-semibold text-[var(--violet-900)]">{titre}</p>
            <span className="grid size-6 place-items-center rounded-full bg-[var(--violet-100)] text-[10px] font-bold text-[var(--violet-700)]">HI</span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-[#fbfaff] p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

const Pastille = ({ c, children }: { c: string; children: React.ReactNode }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', c)}>{children}</span>
);

export function MaquetteAgent({ v }: { v: Variante }) {
  const soc = SOCIETES[v][0];
  return (
    <Ecran titre="Agent Formalités">
      <div className="space-y-2.5 text-[11px]">
        <div className="ml-auto w-fit max-w-[80%] rounded-xl bg-[var(--violet-600)] px-3 py-2 text-white">
          {v === 'independants-tpe' ? `Je veux créer ma SASU ${soc}, capital 1 000 €` : v === 'experts-comptables' ? `Créer la SASU ${soc} pour un client, capital 1 000 €` : v === 'avocats' ? `Dissolution anticipée de ${soc}, liquidateur le gérant` : `Nommer un nouveau président chez ${SOCIETES[v][1]}`}
        </div>
        <p className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--ink-500)]"><span className="size-1.5 rounded-full bg-[var(--violet-500)]" /> A travaillé 14 s · 4 étapes · 2 documents ›</p>
        <div className="rounded-xl border border-[var(--violet-200)] bg-white p-3 shadow-sm">
          <div className="flex gap-1.5">
            <span className="rounded border border-[var(--violet-200)] bg-[var(--violet-50)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-[var(--violet-700)]">{v === 'avocats' ? 'Le liquidateur' : 'Le président'}</span>
            <span className="rounded border border-[var(--violet-900)]/60 px-1.5 py-0.5 font-mono text-[9px] font-bold">2 SUR 4</span>
          </div>
          <p className="mt-2 text-[12px] font-semibold text-[var(--violet-900)]">{v === 'avocats' ? 'Où sera fixé le siège de la liquidation ?' : 'Quelle est l’adresse personnelle du président ?'}</p>
          <div className="mt-2 h-7 rounded-md border border-[var(--ink-200)] bg-white" />
          <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-[var(--ink-400)]">Ou choisissez</p>
          {(v === 'avocats' ? ['Au siège social', 'Chez le liquidateur'] : ['Même adresse que le siège', 'Autre adresse']).map((o, i) => (
            <div key={o} className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--violet-900)]">
              <span className={cn('grid size-3 place-items-center rounded-full border', i === 0 ? 'border-[var(--violet-600)]' : 'border-[var(--ink-300)]')}>{i === 0 && <span className="size-1.5 rounded-full bg-[var(--violet-600)]" />}</span> {o}
            </div>
          ))}
          <div className="mt-3 flex gap-1.5">
            <span className="rounded border px-2 py-1 font-mono text-[9px] font-bold">RETOUR</span>
            <span className="rounded bg-[var(--violet-600)] px-2 py-1 font-mono text-[9px] font-bold text-white">SUIVANT</span>
          </div>
        </div>
      </div>
    </Ecran>
  );
}

export function MaquetteLots({ v }: { v: Variante }) {
  const soc = SOCIETES[v];
  const ops = v === 'directions-juridiques' ? ['Changement de président', 'Changement de président', 'Changement de président', 'Changement de président'] : ['Création SASU', 'Changement de gérant', 'Transfert de siège', 'Mise en sommeil'];
  return (
    <Ecran titre="Agent Formalités — lot">
      <div className="rounded-xl border bg-white">
        <div className="flex items-center gap-2 border-b px-3 py-2 text-[11px]"><Layers className="size-3.5 text-[var(--violet-600)]" /><span className="flex-1 font-semibold text-[var(--violet-900)]">{v === 'directions-juridiques' ? 'Nouveau président — 4 entités' : 'Lot du portefeuille — 4 formalités'}</span><span className="text-[var(--ink-500)]">3/4 prêtes</span></div>
        <div className="h-1 bg-[var(--ink-100)]"><div className="h-full w-3/4 bg-gradient-to-r from-[#ff887b] to-[#ea42fd]" /></div>
        {soc.map((s, i) => (
          <div key={s} className="flex items-center gap-2 border-b px-3 py-2.5 text-[11px] last:border-0">
            <span className="w-3 text-[var(--ink-400)]">{i + 1}</span>
            <span className="min-w-0 flex-1"><span className="block font-semibold text-[var(--violet-900)]">{s}</span><span className="text-[10px] text-[var(--ink-500)]">{ops[i]} · 2 documents</span></span>
            {i < 3 ? <Pastille c="bg-emerald-50 text-emerald-700"><Check className="size-2.5" /> Prête</Pastille> : <Pastille c="bg-[var(--violet-100)] text-[var(--violet-700)]"><Loader2 className="size-2.5 animate-spin" /> En préparation</Pastille>}
            <span className="rounded border px-1.5 py-0.5 text-[9px] text-[var(--violet-900)]">Ouvrir</span>
          </div>
        ))}
      </div>
    </Ecran>
  );
}

export function MaquetteAnnonce({ v }: { v: Variante }) {
  const soc = SOCIETES[v][v === 'directions-juridiques' ? 0 : 2];
  return (
    <Ecran actif={1} titre="Annonce légale">
      <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border bg-white p-3">
          <p className="font-mono text-[9px] font-bold uppercase text-[var(--violet-600)]">Avis de transfert de siège · dépt 13</p>
          <p className="mt-2 text-[11px] font-bold text-[var(--violet-900)]">{soc}</p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-[var(--ink-600)]" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 12 }}>
            Société à responsabilité limitée au capital de 1 000 euros. Par décision du 1er octobre 2026, le siège social a été transféré au 10 La Canebière, 13001 Marseille, à compter de ce jour. Pour avis.
          </p>
          <p className="mt-2 text-[9px] text-[var(--ink-400)]">412 caractères</p>
        </div>
        <div className="space-y-1.5 rounded-xl border bg-white p-3">
          <p className="font-mono text-[9px] font-bold uppercase text-[var(--violet-600)]">Mentions obligatoires</p>
          {['Dénomination, forme, capital', 'SIREN', 'Organe et date', 'Ancienne et nouvelle adresse'].map((m) => (
            <p key={m} className="flex items-center gap-1.5 text-[10.5px] text-[var(--violet-900)]"><Check className="size-3 text-emerald-600" /> {m}</p>
          ))}
          <p className="flex items-center gap-1.5 text-[10.5px] text-[var(--accent-ink)]"><span className="font-bold">!</span> Greffe à compléter</p>
        </div>
      </div>
    </Ecran>
  );
}

export function MaquetteRNE({ v }: { v: Variante }) {
  const soc = SOCIETES[v][0];
  return (
    <Ecran actif={2} titre={`Documents RNE — ${soc}`}>
      <div className="space-y-2">
        {[['Copie des statuts mis à jour', '13 août 2026'], ['Procès-verbal d’assemblée générale', '23 juin 2026'], ['Comptes annuels — clôture 2025', '27 mai 2026'], ['Certificat de dépôt des fonds', '27 mai 2025']].map(([t, d]) => (
          <div key={t} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-[11px]">
            <FileText className="size-3.5 text-[var(--violet-600)]" />
            <span className="min-w-0 flex-1"><span className="block font-semibold text-[var(--violet-900)]">{t}</span><span className="text-[10px] text-[var(--ink-500)]">Déposé le {d}</span></span>
            <span className="rounded border px-1.5 py-0.5 text-[9px]">Voir</span>
            <span className="flex items-center gap-1 rounded bg-[var(--violet-600)] px-1.5 py-0.5 text-[9px] text-white"><FolderOpen className="size-2.5" /> Au dossier</span>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-xl border border-dashed bg-white px-3 py-2 text-[10.5px] text-[var(--ink-500)]"><Landmark className="size-3.5" /> Avis de situation INSEE</div>
      </div>
    </Ecran>
  );
}

export function MaquetteRegul({ v }: { v: Variante }) {
  const soc = SOCIETES[v][1];
  return (
    <Ecran actif={1} titre={`${soc} — liasse J00287…`}>
      <div className="space-y-2.5">
        <div className="rounded-xl border border-[#ffd2cb] bg-[#fff8f6] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent-ink)]"><Bell className="size-3.5" /> Demande de régularisation du greffe</p>
          <p className="mt-1 text-[10.5px] text-[var(--ink-600)]">Pièce non conforme : la déclaration de non-condamnation doit mentionner la filiation complète.</p>
          <p className="mt-1 text-[10px] text-[var(--ink-500)]">Échéance : 15 jours</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--violet-900)]"><Sparkles className="size-3.5 text-[var(--violet-600)]" /> Agent de régularisation</p>
          <p className="mt-1 text-[10.5px] text-[var(--ink-600)]">J’ai relu la pièce déposée : la filiation du père manque. Je prépare une déclaration corrigée et le courrier de réponse.</p>
          <div className="mt-2 flex gap-1.5">
            <Pastille c="bg-[var(--violet-50)] text-[var(--violet-700)]"><FileText className="size-2.5" /> Déclaration corrigée</Pastille>
            <Pastille c="bg-[var(--violet-50)] text-[var(--violet-700)]"><Send className="size-2.5" /> Courrier au greffe</Pastille>
          </div>
        </div>
      </div>
    </Ecran>
  );
}

export function MaquettePaiement({ v }: { v: Variante }) {
  const soc = SOCIETES[v][0];
  return (
    <Ecran actif={4} titre={`Paiement — ${soc}`}>
      <div className="rounded-xl border bg-white p-3">
        <div className="flex items-center justify-between"><p className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--violet-900)]"><CreditCard className="size-3.5 text-[var(--violet-600)]" /> Paiement</p><Pastille c="bg-[var(--violet-100)] text-[var(--violet-700)]"><Send className="size-2.5" /> Délégation en attente · 175,28 €</Pastille></div>
        <p className="mt-2 rounded-lg bg-[var(--ink-50)] px-2.5 py-2 text-[10.5px] text-[var(--ink-600)]">Délégation envoyée à client@exemple.fr — en attente depuis 2 jours.</p>
        <table className="mt-2 w-full text-[10.5px]">
          <tbody>
            {[['BODACC', 'Greffe', '116,00 €'], ['Frais INPI', 'INPI', '5,90 €'], ['Prise d’activité', 'Greffe', '53,38 €']].map(([a, b, c]) => (
              <tr key={a} className="border-b"><td className="py-1.5 text-[var(--violet-900)]">{a}</td><td className="text-[var(--ink-500)]">{b}</td><td className="text-right">{c}</td></tr>
            ))}
            <tr className="font-semibold"><td className="py-1.5">Total</td><td /><td className="text-right">175,28 €</td></tr>
          </tbody>
        </table>
        <div className="mt-2 flex gap-1.5"><span className="rounded bg-[var(--violet-600)] px-2 py-1 text-[9px] font-semibold text-white">Payer ou envoyer la délégation</span><span className="rounded border px-2 py-1 text-[9px]">Refacturer au client</span></div>
      </div>
    </Ecran>
  );
}

export function MaquetteSignature({ v }: { v: Variante }) {
  return (
    <Ecran actif={1} titre="Signature électronique des actes">
      <div className="space-y-2">
        {[['Statuts', 'Signé', 'Avancée'], [v === 'avocats' ? 'PV de dissolution' : 'Déclaration de non-condamnation', 'Signé', 'Avancée'], ['Pouvoir pour les formalités', 'En attente du client', 'Avancée']].map(([t, s, niveau]) => (
          <div key={t} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-[11px]">
            <FileSignature className="size-3.5 text-[var(--violet-600)]" />
            <span className="flex-1 font-semibold text-[var(--violet-900)]">{t}</span>
            <Pastille c={niveau === 'Qualifiée eIDAS' ? 'bg-[#361fab] text-white' : 'bg-[var(--violet-50)] text-[var(--violet-700)]'}>{niveau}</Pastille>
            {s === 'Signé' ? <Pastille c="bg-emerald-50 text-emerald-700"><Check className="size-2.5" /> Signé</Pastille> : <Pastille c="bg-[#fff1e4] text-[#c2410c]">{s}</Pastille>}
          </div>
        ))}
        <div className="rounded-xl border bg-white p-3 text-[10.5px] text-[var(--ink-600)]">Chaque signataire signe en ligne, à distance. Une fois tout signé, la formalité passe à la signature qualifiée.</div>
      </div>
    </Ecran>
  );
}

export function MaquetteEntites() {
  return (
    <Ecran actif={3} titre="Entités du groupe">
      <div className="grid grid-cols-2 gap-2">
        {SOCIETES['directions-juridiques'].map((s, i) => (
          <div key={s} className="rounded-xl border bg-white p-3">
            <p className="text-[11px] font-semibold text-[var(--violet-900)]">{s}</p>
            <p className="text-[10px] text-[var(--ink-500)]">SIREN 9{i}2 4{i}1 7{i}8</p>
            <div className="mt-2 space-y-1 text-[10px]">
              <p className="flex items-center gap-1 text-[var(--ink-600)]"><ClipboardList className="size-3" /> {i === 1 ? 'Changement de président en cours' : 'À jour'}</p>
              <p className="flex items-center gap-1 text-[var(--ink-600)]"><BookOpen className="size-3" /> Statuts {2024 + (i % 2)}</p>
            </div>
          </div>
        ))}
      </div>
    </Ecran>
  );
}

export function MaquetteFormalites({ v }: { v: Variante }) {
  return (
    <Ecran actif={1} titre="Formalités">
      <div className="mb-2 flex gap-1 border-b text-[10.5px]"><span className="border-b-2 border-[var(--violet-600)] px-2 py-1 font-semibold">{v === 'independants-tpe' ? 'Mes formalités' : 'Dossiers du cabinet'}</span><span className="px-2 py-1 text-[var(--ink-500)]">Déposées à l’INPI</span></div>
      {SOCIETES[v].map((s, i) => (
        <div key={s} className="flex items-center gap-2 border-b py-2 text-[11px] last:border-0">
          <span className="font-mono text-[9px] text-[var(--ink-400)]">CMP-{(4821 + i).toString(36).toUpperCase()}</span>
          <span className="flex-1 font-semibold text-[var(--violet-900)]">{s}</span>
          <Pastille c={['bg-emerald-50 text-emerald-700', 'bg-[var(--violet-100)] text-[var(--violet-700)]', 'bg-[#fff1e4] text-[#c2410c]', 'bg-[var(--ink-100)] text-[var(--ink-600)]'][i]}>{['Validée', 'Signature', 'À payer', 'Brouillon'][i]}</Pastille>
        </div>
      ))}
      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--ink-500)]"><Megaphone className="size-3" /> Alerte : 1 paiement en attente depuis plus de 3 jours</p>
    </Ecran>
  );
}

export function MaquetteRedaction({ v }: { v: Variante }) {
  const soc = SOCIETES[v][0];
  const docs: [string, string][] = [
    ['Statuts', 'Rédigé'],
    ['Déclaration de non-condamnation', 'Rédigé'],
    ['Pouvoir pour les formalités', 'Rédigé'],
    ['Attestation de domiciliation', 'À relire'],
  ];
  return (
    <Ecran actif={1} titre={`Documents — ${soc}`}>
      <div className="space-y-2">
        {docs.map(([t, e]) => (
          <div key={t} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-[11px]">
            <FileText className="size-3.5 text-[var(--violet-600)]" />
            <span className="min-w-0 flex-1"><span className="block font-semibold text-[var(--violet-900)]">{t}</span><span className="text-[10px] text-[var(--ink-500)]">.docx modifiable</span></span>
            {e === 'Rédigé' ? <Pastille c="bg-emerald-50 text-emerald-700"><Check className="size-2.5" /> Rédigé</Pastille> : <Pastille c="bg-[#fff1e4] text-[#c2410c]">À relire</Pastille>}
          </div>
        ))}
        <div className="rounded-xl border bg-white p-3 text-[10.5px] text-[var(--ink-600)]"><Sparkles className="mr-1 inline size-3 text-[var(--violet-600)]" />Rédigés à partir des réponses et de la fiche RNE : vous relisez, modifiez si besoin, puis envoyez en signature.</div>
      </div>
    </Ecran>
  );
}

export function MaquetteQualifiee({ v }: { v: Variante }) {
  const soc = SOCIETES[v][0];
  const etapes: [string, boolean][] = [
    ['Identité du signataire vérifiée', true],
    ['Certificat qualifié eIDAS délivré', true],
    ['Déclaration signée', true],
    ['Formalité prête pour le paiement', false],
  ];
  return (
    <Ecran actif={1} titre={`Signature de la formalité — ${soc}`}>
      <div className="rounded-xl border bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--violet-900)]"><Landmark className="size-3.5 text-[var(--violet-600)]" /> Déclaration au Guichet unique</p>
          <Pastille c="bg-[#361fab] text-white">Qualifiée eIDAS</Pastille>
        </div>
        <ul className="mt-3 space-y-1.5">
          {etapes.map(([t, ok]) => (
            <li key={t} className="flex items-center gap-2 text-[11px]">
              <span className={cn('grid size-4 place-items-center rounded-full', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--violet-50)] text-[var(--violet-600)]')}>
                {ok ? <Check className="size-2.5" /> : <Loader2 className="size-2.5 animate-spin" />}
              </span>
              <span className={ok ? 'text-[var(--violet-900)]' : 'text-[var(--ink-500)]'}>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg bg-[var(--ink-50)] px-2.5 py-2 text-[10.5px] text-[var(--ink-600)]">Le niveau de signature exigé par la formalité, réalisé en ligne : aucun déplacement, aucun papier.</p>
      </div>
    </Ecran>
  );
}

export const MAQUETTES: Record<string, (p: { v: Variante }) => React.ReactNode> = {
  agent: MaquetteAgent,
  lots: MaquetteLots,
  annonces: MaquetteAnnonce,
  rne: MaquetteRNE,
  regularisation: MaquetteRegul,
  paiement: MaquettePaiement,
  signature: MaquetteSignature,
  redaction: MaquetteRedaction,
  qualifiee: MaquetteQualifiee,
  entites: () => <MaquetteEntites />,
  formalites: MaquetteFormalites,
};
