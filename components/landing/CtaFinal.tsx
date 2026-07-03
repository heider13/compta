import { Arrow } from '@/components/icons';
import { FxBackground } from './FxBackground';
import { Container, btnCta } from './ui';

export function CtaFinal() {
  return (
    <section className="pb-20 sm:pb-24">
      <Container>
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[var(--violet-700)] via-[var(--violet-500)] to-[var(--violet-400)] px-6 py-14 text-center text-white sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.1),transparent_50%)]"
          />
          <FxBackground scanline={false} />
          <span className="relative inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
            Prêt à industrialiser vos formalités ?
          </span>
          <h2 className="relative mb-4 mt-4 text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] tracking-tight text-white">
            Faites passer votre cabinet
            <br />
            à la vitesse supérieure.
          </h2>
          <p className="relative mx-auto mb-8 max-w-xl text-lg leading-relaxed text-white/85">
            Démarrez avec 30 jours gratuits. Onboarding personnalisé, import de votre
            portefeuille client, formation de vos collaborateurs.
          </p>
          <div className="relative flex flex-wrap items-center justify-center gap-3">
            <a href="/auth/signup" className={btnCta}>
              Demander une démo
              <Arrow size={16} />
            </a>
            <a
              href="#tarifs"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-[15px] font-medium text-white transition-colors duration-200 hover:bg-white/20"
            >
              Voir les tarifs
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
