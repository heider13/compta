import { ScanLine, FileText, PenTool, Landmark, Check, Sparkles } from 'lucide-react';
import { Arrow } from '@/components/icons';
import { Container } from './ui';

// Hero : fond violet profond (identité maison) avec cartes flottantes animées.
// Colonne texte à gauche, maquette produit « orchestrateur » à droite.

const PIPELINE = [
  { icon: ScanLine, label: 'Pièces d’identité lues', done: true },
  { icon: FileText, label: 'Statuts générés', done: true },
  { icon: PenTool, label: 'Signature eIDAS envoyée', done: true },
  { icon: Landmark, label: 'Dépôt INPI', done: false },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0e0b1a]">
      {/* Fond : halos ambré / violet / magenta, comme le hero précédent */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 720px 620px at 6% -6%, rgba(255,190,140,0.5), transparent 55%),' +
            'radial-gradient(ellipse 1000px 800px at 60% 22%, rgba(117,81,232,0.42), transparent 62%),' +
            'radial-gradient(ellipse 820px 700px at 98% 100%, rgba(234,66,253,0.22), transparent 62%)',
        }}
      />
      {/* Grille discrète */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 30%, transparent 80%)',
        }}
      />
      {/* Fondu bas pour enchaîner avec les sections claires */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{ background: 'linear-gradient(to bottom, transparent, #0e0b1a)' }}
      />

      <Container className="relative grid items-center gap-12 pb-16 pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-32">
        {/* Colonne texte */}
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/85 backdrop-blur">
            <Sparkles className="size-3.5 text-[#ff887b]" />
            Plateforme d’automatisation propulsée par l’IA
          </span>

          <h1 className="mt-6 font-[Sora] text-[clamp(2.4rem,5.2vw,4rem)] font-bold leading-[1.04] tracking-[-0.02em] text-white">
            Développez votre cabinet
            <br />
            <span className="bg-gradient-to-r from-[#ffbe8c] via-[#ff887b] to-[#ea42fd] bg-clip-text text-transparent">
              en toute simplicité.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg lg:mx-0">
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
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-[15px] font-medium text-white transition-colors duration-200 hover:bg-white/15"
            >
              Voir la démo
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-medium text-white/60 lg:justify-start">
            <span>🇫🇷 Conçu et hébergé en France</span>
            <span>🇪🇺 Conforme RGPD</span>
            <span>🔐 Connecté au Guichet Unique INPI</span>
          </div>
        </div>

        {/* Colonne maquette + cartes flottantes */}
        <div className="relative mx-auto w-full max-w-[440px]">
          <div className="relative rounded-3xl border border-white/10 bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
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
                  <span className="flex-1 text-sm font-medium text-[var(--ink-800)]">{s.label}</span>
                  {s.done ? (
                    <Check className="size-4 text-[var(--violet-600)]" />
                  ) : (
                    <span className="text-xs font-semibold text-[var(--accent-ink)]">en cours…</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cartes flottantes */}
          <div className="bp-float absolute -left-6 top-10 hidden rounded-2xl border border-[var(--ink-150)] bg-white px-3.5 py-2.5 shadow-xl sm:block">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--violet-900)]">
              <span className="grid size-7 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                <Sparkles className="size-3.5" />
              </span>
              Dossier prêt en 4 min
            </div>
          </div>
          <div className="bp-float-slow absolute -right-5 bottom-8 hidden rounded-2xl border border-[var(--ink-150)] bg-white px-3.5 py-2.5 shadow-xl sm:block">
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
      <div className="relative border-t border-white/10 py-5">
        <Container>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-semibold tracking-wide text-white/45 sm:justify-between">
            {['INPI Guichet Unique', 'Registre National', 'Yousign', 'Légifrance', 'Stripe'].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}
