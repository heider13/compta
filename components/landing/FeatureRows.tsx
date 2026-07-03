// Blocs fonctionnalités alternés texte/visuel — layout inspiré des landing
// legaltech (image gauche/droite en alternance). Les visuels sont des
// mini-mockups UI en pur Tailwind (pas de screenshots à maintenir).

import { Arrow, Users, Chart, Sparkle } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Container, Eyebrow, SectionHead } from './ui';

// ─── Atomes des mockups ──────────────────────────────────────────

function MockCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'w-full max-w-[360px] rounded-xl border border-[var(--ink-150)] bg-white p-[18px] shadow-[0_12px_32px_rgba(35,20,80,0.10)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function MockLine({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'mb-2 h-[9px] rounded-[5px]',
        filled ? 'bg-[var(--violet-200)]' : 'bg-[var(--ink-100)]',
        className,
      )}
    />
  );
}

function MockPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

const pillIndigo = 'bg-[var(--violet-50)] text-[var(--accent-ink)]';
const pillGreen = 'bg-[rgba(19,115,51,0.1)] text-[#137333]';

// ─── Mini-mockups ────────────────────────────────────────────────

function MockOcr() {
  return (
    <MockCard>
      <div className="mb-3.5 flex items-center gap-3.5">
        <div className="grid h-14 w-[84px] shrink-0 place-items-center rounded-lg border border-[var(--ink-150)] bg-gradient-to-br from-[var(--violet-100)] to-[var(--violet-50)] text-[10px] font-bold tracking-[0.06em] text-[var(--accent-ink)]">
          CNI / PDF
        </div>
        <Arrow size={18} className="shrink-0" style={{ color: 'var(--accent)' }} />
        <div className="flex-1">
          <MockLine filled className="w-[90%]" />
          <MockLine filled className="w-[70%]" />
          <MockLine filled className="mb-0 w-[80%]" />
        </div>
      </div>
      <MockPill className={pillGreen}>✓ 12 champs préremplis en 8 s</MockPill>
    </MockCard>
  );
}

function MockGuichet() {
  return (
    <MockCard>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold">Dossier SASU Lemaire</span>
        <MockPill className={pillIndigo}>Synchronisé INPI</MockPill>
      </div>
      {['Déposé au Guichet Unique', 'Paiement des frais validé', 'En examen au greffe'].map((step, i) => (
        <div
          key={step}
          className={cn('flex items-center gap-2 py-[7px]', i < 2 && 'border-b border-[var(--ink-100)]')}
        >
          <span
            className={cn(
              'inline-flex size-4 items-center justify-center rounded-full text-[10px] font-bold',
              i < 2 ? 'bg-[var(--accent)] text-white' : 'bg-[var(--ink-150)] text-[var(--ink-500)]',
            )}
          >
            {i < 2 ? '✓' : '…'}
          </span>
          <span className={cn('text-[13px]', i < 2 ? 'text-[var(--ink-900)]' : 'text-[var(--ink-500)]')}>
            {step}
          </span>
        </div>
      ))}
    </MockCard>
  );
}

function MockStatuts() {
  return (
    <MockCard className="max-w-[300px]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold">Statuts — SASU Lemaire</span>
        <MockPill className={pillIndigo}>.DOCX</MockPill>
      </div>
      <MockLine className="h-[11px] w-[55%]" />
      <MockLine filled className="w-full" />
      <MockLine filled className="w-[92%]" />
      <MockLine filled className="w-[96%]" />
      <MockLine className="mt-3 h-[11px] w-[45%]" />
      <MockLine filled className="w-full" />
      <MockLine filled className="mb-0 w-[85%]" />
    </MockCard>
  );
}

function MockSignature() {
  return (
    <MockCard className="max-w-[320px]">
      <div className="mb-2.5 text-xs font-bold">Signature du PV de décision</div>
      <svg width="140" height="44" viewBox="0 0 140 44" aria-hidden="true" className="mb-2.5 block">
        <path
          d="M6 32 C 22 8, 34 40, 48 24 S 74 6, 88 26 S 116 38, 134 14"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex flex-wrap gap-2">
        <MockPill className={pillIndigo}>OTP SMS vérifié</MockPill>
        <MockPill className={pillGreen}>✓ eIDAS avancée</MockPill>
      </div>
    </MockCard>
  );
}

function MockDashboard() {
  const cols: Array<[string, number]> = [['À traiter', 3], ['Au greffe', 2], ['Validés', 4]];
  return (
    <MockCard className="max-w-[380px]">
      <div className="grid grid-cols-3 gap-2.5">
        {cols.map(([title, count]) => (
          <div key={title}>
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--ink-500)]">
              {title} · {count}
            </div>
            {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
              <div
                key={i}
                className="mb-1.5 rounded-md border border-[var(--ink-100)] bg-[var(--ink-50)] px-[7px] py-1.5"
              >
                <MockLine filled className="mb-1 h-1.5 w-[85%]" />
                <MockLine className="mb-0 h-1.5 w-[55%]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </MockCard>
  );
}

// ─── Contenu des blocs ───────────────────────────────────────────

const ROWS = [
  {
    eyebrow: 'OCR pièce d’identité',
    title: 'Déposez la pièce d’identité, la liasse se remplit toute seule.',
    desc: "Photo de CNI, passeport ou PDF scanné : l'OCR lit la zone MRZ et extrait l'identité complète du dirigeant — nom, prénoms, naissance, nationalité. Le questionnaire devient interactif et 90 % des champs INPI sont déjà remplis. Vous gagnez 15 à 20 minutes par dossier.",
    visual: <MockOcr />,
  },
  {
    eyebrow: 'Guichet Unique',
    title: '100 % intégré à votre Guichet Unique.',
    desc: "Connectez le compte INPI de votre cabinet une seule fois. Vos dossiers sont déposés via l'API officielle et leurs statuts se synchronisent en temps réel : réception, paiement, examen au greffe, validation. Fini les allers-retours sur le portail INPI.",
    visual: <MockGuichet />,
  },
  {
    eyebrow: 'Documents juridiques',
    title: 'Les statuts se génèrent pendant que vous vérifiez.',
    desc: 'SASU, SAS, EURL, SARL, SCI : les statuts sortent en .docx éditable, générés depuis les données du dossier — dénomination, capital, apports, dirigeants. Votre base de travail est prête ; vous n’ajustez que les clauses spécifiques.',
    visual: <MockStatuts />,
  },
  {
    eyebrow: 'Signature électronique',
    title: 'La signature avancée part en un clic.',
    desc: "Signature simple pour les créations, avancée eIDAS pour les modifications et cessations — celle que l'INPI exige. Le signataire reçoit un email, valide par OTP SMS, et le dossier avance tout seul. Aucun certificat matériel à gérer.",
    visual: <MockSignature />,
  },
  {
    eyebrow: 'Pilotage',
    title: 'Un tableau de bord qui montre où agir.',
    desc: 'Kanban des dossiers en cours, tâches par collaborateur, relances clients et alertes sur les dossiers qui requièrent votre attention. Toute l’activité du cabinet au même endroit, sans changer d’outil.',
    visual: <MockDashboard />,
  },
];

const EXTRAS = [
  {
    icon: Users,
    title: 'Multi-cabinets, multi-collaborateurs',
    desc: 'Isolation totale entre cabinets, rôles et permissions fines, audit log complet.',
  },
  {
    icon: Sparkle,
    title: 'CRM intégré',
    desc: 'Carnet de clients, historique des formalités, espace client en autonomie.',
  },
  {
    icon: Chart,
    title: 'API & marque blanche',
    desc: 'Sous-domaine, logo et couleurs du cabinet. API publique + webhooks.',
  },
];

export function FeatureRows() {
  return (
    <section id="fonctionnalites" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <Container>
        <SectionHead
          eyebrow="Fonctionnalités"
          title={
            <>
              Une app qui relie vos outils métiers
              <br />
              au Guichet Unique.
            </>
          }
          lead={
            <>
              Chaque fonctionnalité supprime une tâche manuelle fastidieuse :
              l&apos;outil remplit, génère et dépose — vous vérifiez.
            </>
          }
        />

        {ROWS.map((row, i) => (
          <div
            key={row.title}
            className="grid items-center gap-6 py-8 lg:grid-cols-2 lg:gap-14 lg:py-12"
          >
            <div className={cn(i % 2 === 1 && 'lg:order-2')}>
              <Eyebrow>{row.eyebrow}</Eyebrow>
              <h3 className="mb-3 mt-3.5 text-2xl leading-snug tracking-tight sm:text-[28px] lg:text-[32px]">
                {row.title}
              </h3>
              <p className="mb-4 text-base leading-relaxed text-[var(--ink-600)]">{row.desc}</p>
              <a
                href="/auth/signup"
                className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--accent-ink)] transition-colors hover:text-[var(--violet-900)]"
              >
                Demander une démo <Arrow size={15} />
              </a>
            </div>
            <div
              className={cn(
                'grid min-h-[300px] place-items-center overflow-hidden rounded-[20px] border border-[#ffcfca] bg-gradient-to-br from-[#fff3f1] via-[#eae8f6] to-white p-8 transition-transform duration-300 hover:scale-[1.015]',
                i % 2 === 1 && 'lg:order-1',
              )}
            >
              {row.visual}
            </div>
          </div>
        ))}

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EXTRAS.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[var(--ink-150)] bg-[var(--ink-50)] p-5.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(8,3,49,0.07)]"
            >
              <div className="mb-3 grid size-11 place-items-center rounded-xl bg-[#fff3f1] text-[#cc6d62]">
                <f.icon size={20} />
              </div>
              <h3 className="mb-1.5 text-base font-semibold">{f.title}</h3>
              <p className="text-[13.5px] leading-relaxed text-[var(--ink-600)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
