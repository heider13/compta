import { ScanLine, FileText, PenTool, Landmark, Check, Sparkles } from 'lucide-react';
import { Arrow } from '@/components/icons';
import { Container } from './ui';

// Hero façon Brevo : clair, coloré, ludique — mais dans notre identité
// (indigo + corail). Titre large, sous-titre, double CTA, ligne de confiance,
// et une maquette produit avec des cartes flottantes animées.

const PIPELINE = [
  { icon: ScanLine, label: 'Pièces d’identité lues', done: true },
  { icon: FileText, label: 'Statuts générés', done: true },
  { icon: PenTool, label: 'Signature eIDAS envoyée', done: true },
  { icon: Landmark, label: 'Dépôt INPI', done: false },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Blobs de couleur doux (notre indigo + corail) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 620px 520px at 12% -8%, rgba(117,81,232,0.16), transparent 60%),' +
            'radial-gradient(ellipse 640px 520px at 92% 8%, rgba(255,136,123,0.18), transparent 62%)',
        }}
      />

      <Container className="relative grid items-center gap-12 pb-16 pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-32">
        {/* Colonne texte */}
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ink-150)] bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-ink)] shadow-sm">
            <Sparkles className="size-3.5 text-[var(--accent)]" />
            Plateforme d’automatisation propulsée par l’IA
          </span>

          <h1 className="mt-6 font-[Sora] text-[clamp(2.4rem,5.2vw,4rem)] font-bold leading-[1.04] tracking-[-0.02em] text-[var(--violet-900)]">
            Développez votre cabinet
            <br />
            <span className="text-[var(--accent-ink)]">en toute simplicité.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[var(--ink-600)] sm:text-lg lg:mx-0">
            Créations, modifications, cessations, dépôts de comptes : une flotte
            d’agents IA prépare, rédige, signe et dépose vos formalités juridiques.
            Vous validez, c’est tout.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <a
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(255,136,123,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Demander une démo
              <Arrow size={17} />
            </a>
            <a
              href="/#demo"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--ink-200)] bg-white px-6 py-3 text-[15px] font-medium text-[var(--ink-900)] transition-colors duration-200 hover:bg-[var(--ink-50)]"
            >
              Voir la démo
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-medium text-[var(--ink-600)] lg:justify-start">
            <span>🇫🇷 Conçu et hébergé en France</span>
            <span>🇪🇺 Conforme RGPD</span>
            <span>🔐 Connecté au Guichet Unique INPI</span>
          </div>
        </div>

        {/* Colonne maquette + cartes flottantes */}
        <div className="relative mx-auto w-full max-w-[440px]">
          {/* Carte principale : mini-dashboard orchestrateur */}
          <div className="relative rounded-3xl border border-[var(--ink-150)] bg-white p-6 shadow-[0_30px_70px_rgba(43,23,105,0.16)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-400)]">
                  Formalité en cours
                </div>
                <div className="mt-0.5 font-[Sora] text-lg font-semibold text-[var(--violet-900)]">
                  Création SASU · ACME
                </div>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-ink)]">
                75 %
              </span>
            </div>

            <div className="mt-5 space-y-2.5">
              {PIPELINE.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 rounded-xl border border-[var(--ink-100)] bg-[var(--ink-50)] px-3.5 py-2.5"
                >
                  <span
                    className={
                      'grid size-8 place-items-center rounded-lg ' +
                      (s.done
                        ? 'bg-[var(--violet-100)] text-[var(--violet-700)]'
                        : 'bg-[var(--accent-soft)] text-[var(--accent-ink)] bp-pulse-ring')
                    }
                  >
                    <s.icon className="size-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-[var(--ink-800)]">
                    {s.label}
                  </span>
                  {s.done ? (
                    <Check className="size-4 text-[var(--violet-600)]" />
                  ) : (
                    <span className="text-xs font-semibold text-[var(--accent-ink)]">
                      en cours…
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cartes flottantes */}
          <div className="bp-float absolute -left-6 top-10 hidden rounded-2xl border border-[var(--ink-150)] bg-white px-3.5 py-2.5 shadow-lg sm:block">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--violet-900)]">
              <span className="grid size-7 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                <Sparkles className="size-3.5" />
              </span>
              Dossier prêt en 4 min
            </div>
          </div>
          <div className="bp-float-slow absolute -right-5 bottom-8 hidden rounded-2xl border border-[var(--ink-150)] bg-white px-3.5 py-2.5 shadow-lg sm:block">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--violet-900)]">
              <span className="grid size-7 place-items-center rounded-lg bg-[var(--violet-100)] text-[var(--violet-700)]">
                <Check className="size-3.5" />
              </span>
              Signé &amp; déposé
            </div>
          </div>
        </div>
      </Container>

      {/* Bande logos / registres officiels */}
      <div className="relative border-t border-[var(--ink-100)] py-5">
        <Container>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-semibold tracking-wide text-[var(--ink-400)] sm:justify-between">
            {['INPI Guichet Unique', 'Registre National', 'Yousign', 'Légifrance', 'Stripe'].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}
