// Template des landing pages persona (experts-comptables, avocats,
// directions juridiques). Hero + section douleurs→solutions spécifiques,
// le reste des sections est partagé avec la home.

import { Arrow, Shield, Bolt, Check } from '@/components/icons';
import type { PersonaContent } from '@/lib/landing/personas';
import { Nav } from './Nav';
import { LogoBand } from './LogoBand';
import { Metrics } from './Metrics';
import { InteractiveDemo } from './InteractiveDemo';
import { FeatureRows } from './FeatureRows';
import { FormalityTypes } from './FormalityTypes';
import { Testimonials } from './Testimonials';
import { Pricing } from './Pricing';
import { CtaFinal } from './CtaFinal';
import { Footer } from './Footer';
import { Container, SectionHead } from './ui';

const TRUST = [
  { icon: Shield, text: 'RGPD · Hébergement France' },
  { icon: Bolt, text: 'Connecté INPI Guichet Unique' },
  { icon: Check, text: 'Multi-cabinets · marque blanche' },
];

function PersonaHero({ persona }: { persona: PersonaContent }) {
  return (
    <section className="relative overflow-hidden bg-[#0e0b1a]">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 720px 620px at 6% -6%, rgba(255,190,140,0.5), transparent 55%),' +
            'radial-gradient(ellipse 1000px 800px at 62% 22%, rgba(117,81,232,0.4), transparent 62%),' +
            'radial-gradient(ellipse 800px 700px at 98% 100%, rgba(234,66,253,0.2), transparent 62%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{ background: 'linear-gradient(to bottom, transparent, #0e0b1a)' }}
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-7 px-5 pb-20 pt-32 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/85 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff887b]" />
          {persona.eyebrow}
        </span>

        <h1 className="font-[Sora] text-[clamp(2.3rem,5.4vw,3.8rem)] font-bold leading-[1.06] tracking-[-0.02em] !text-white [&>span]:!text-transparent">
          {persona.heroLines[0]}
          <br />
          {persona.heroLines[1]}
          <br />
          <span className="bg-gradient-to-r from-[#ffbe8c] via-[#ff887b] to-[#ea42fd] bg-clip-text text-transparent">
            {persona.heroHighlight}
          </span>
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
          {persona.heroSub}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-[#0e0b1a] transition-transform duration-200 hover:-translate-y-0.5"
          >
            Demander une démo
            <Arrow size={17} />
          </a>
          <a
            href="#fonctionnalites"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-[15px] font-medium text-white transition-colors duration-200 hover:bg-white/15"
          >
            Voir les fonctionnalités
          </a>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/55">
          {TRUST.map(({ text }) => (
            <span key={text}>{text}</span>
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
