// Section « Vos agents IA » façon Brevo : « des agents IA qui travaillent pour
// vous, avec vous » — une flotte d'agents présentée en grille de cartes, avec
// reveal au scroll et tuiles d'icônes aux couleurs alternées (corail / violet).

import Link from 'next/link';
import { Arrow } from '@/components/icons';
import { MODULE_LIST } from '@/lib/landing/modules';
import { Container, SectionHead } from './ui';
import { Reveal } from './Reveal';

export function ProductSuite() {
  return (
    <section id="modules" className="border-b border-[var(--ink-100)] bg-[var(--ink-50)] py-20 sm:py-24">
      <Container>
        <SectionHead
          eyebrow="Vos agents IA"
          title={
            <>
              Des agents IA qui travaillent
              <br />
              pour vous, avec vous.
            </>
          }
          lead="Chaque étape d’une formalité a son agent. Ensemble, ils automatisent le parcours complet — de la lecture des pièces au dépôt officiel."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_LIST.map((m, i) => (
            <Reveal key={m.key} delay={i * 70}>
              <Link
                href={m.href}
                className="group flex h-full flex-col rounded-2xl border border-[var(--ink-150)] bg-white p-7 no-underline transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_16px_40px_rgba(255,136,123,0.18)]"
              >
                <span
                  className={
                    i % 2 === 0
                      ? 'grid size-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                      : 'grid size-11 place-items-center rounded-xl bg-[var(--violet-100)] text-[var(--violet-700)]'
                  }
                >
                  <m.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-[Sora] text-lg font-semibold text-[var(--violet-900)]">
                  {m.title}
                </h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[var(--ink-600)]">
                  {m.desc}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-ink)] transition-colors group-hover:text-[var(--accent)]">
                  En savoir plus
                  <Arrow size={15} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
