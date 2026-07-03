import { Arrow, Shield, Bolt, Check } from '@/components/icons';
import { FxBackground } from './FxBackground';
import { Eyebrow, btnCta, btnGhost } from './ui';

const TRUST = [
  { icon: Shield, text: 'RGPD · Hébergement France' },
  { icon: Bolt, text: 'Connecté INPI Guichet Unique' },
  { icon: Check, text: 'Multi-cabinets · marque blanche' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="hero-bg" />
      <div className="hero-grid" />
      <FxBackground />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-7 px-5 pb-20 pt-24 text-center sm:pt-32">
        <Eyebrow>Pour les experts-comptables, avocats et formalistes</Eyebrow>

        <h1 className="text-[clamp(2.5rem,6.2vw,4.3rem)] leading-[1.06] tracking-[-0.02em]">
          Compta pense comme
          <br />
          un formaliste.
          <br />
          <span className="bg-gradient-to-r from-[var(--accent)] to-[#ea42fd] bg-clip-text text-transparent">
            Et travaille comme tout un cabinet.
          </span>
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-[var(--ink-600)] sm:text-xl">
          Déposez une pièce d&apos;identité, saisissez un SIREN : la liasse INPI se
          remplit toute seule, les statuts se génèrent, la signature part en un clic.
          Vous ne faites plus que vérifier.
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
