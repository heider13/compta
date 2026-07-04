// Template des landing pages persona (experts-comptables, avocats,
// directions juridiques). Hero + section douleurs→solutions spécifiques,
// le reste des sections est partagé avec la home.

import { Arrow, Shield, Bolt, Check } from '@/components/icons';
import type { PersonaContent } from '@/lib/landing/personas';
import { Nav } from './Nav';
import { FxBackground } from './FxBackground';
import { LogoBand } from './LogoBand';
import { Metrics } from './Metrics';
import { InteractiveDemo } from './InteractiveDemo';
import { FeatureRows } from './FeatureRows';
import { FormalityTypes } from './FormalityTypes';
import { Testimonials } from './Testimonials';
import { Pricing } from './Pricing';
import { CtaFinal } from './CtaFinal';
import { Footer } from './Footer';
import { Container, Eyebrow, SectionHead, btnCta, btnGhost } from './ui';

const TRUST = [
  { icon: Shield, text: 'RGPD · Hébergement France' },
  { icon: Bolt, text: 'Connecté INPI Guichet Unique' },
  { icon: Check, text: 'Multi-cabinets · marque blanche' },
];

function PersonaHero({ persona }: { persona: PersonaContent }) {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="hero-bg" />
      <div className="hero-grid" />
      <FxBackground />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-7 px-5 pb-20 pt-24 text-center sm:pt-32">
        <Eyebrow>{persona.eyebrow}</Eyebrow>

        <h1 className="text-[clamp(2.4rem,5.8vw,4.1rem)] leading-[1.06] tracking-[-0.02em]">
          {persona.heroLines[0]}
          <br />
          {persona.heroLines[1]}
          <br />
          <span className="bg-gradient-to-r from-[var(--accent)] to-[#ea42fd] bg-clip-text text-transparent">
            {persona.heroHighlight}
          </span>
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-[var(--ink-600)] sm:text-xl">
          {persona.heroSub}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="/auth/signup" className={btnCta}>
            Demander une démo
            <Arrow size={18} />
          </a>
          <a href="#fonctionnalites" className={btnGhost}>
            Voir les fonctionnalités
          </a>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-[var(--ink-500)]">
          {TRUST.map(({ icon: Icon, text }) => (
            <span key={text} className="inline-flex items-center gap-1.5">
              <Icon size={16} style={{ color: 'var(--accent)' }} />
              {text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PersonaPains({ persona }: { persona: PersonaContent }) {
  return (
    <section className="border-b border-[var(--ink-100)] bg-[var(--ink-50)] py-20 sm:py-24">
      <Container>
        <SectionHead
          eyebrow="Votre quotidien"
          title={
            <>
              Ce qui vous ralentit aujourd&apos;hui.
              <br />
              Ce que Compta en fait.
            </>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {persona.pains.map((p, i) => (
            <div
              key={p.pain}
              className="group rounded-2xl border border-[var(--ink-150)] bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(35,20,80,0.10)]"
            >
              <span className="font-[Sora] text-sm font-bold text-[var(--accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 text-lg font-semibold leading-snug text-[var(--violet-900)]">
                {p.pain}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-600)]">
                {p.solution}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function PersonaLanding({ persona }: { persona: PersonaContent }) {
  return (
    <div className="landing-theme">
      <Nav />
      <PersonaHero persona={persona} />
      <LogoBand />
      <Metrics />
      <InteractiveDemo />
      <PersonaPains persona={persona} />
      <FeatureRows />
      <FormalityTypes />
      <Testimonials />
      <Pricing />
      <CtaFinal />
      <Footer />
    </div>
  );
}
