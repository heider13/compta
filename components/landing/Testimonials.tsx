// Section témoignages — cartes citation avec guillemet accent + avatar,
// layout inspiré des carrousels d'avis legaltech.
//
// TESTIMONIALS est vide au lancement : on n'invente PAS d'avis clients
// (pratique commerciale trompeuse). Tant que le tableau est vide, la section
// affiche le bloc "programme pilote" — un CTA de recrutement beta honnête.
// Dès les premiers retours réels : remplir le tableau ci-dessous, le
// carrousel remplace le bloc pilote automatiquement.

import { Arrow } from '@/components/icons';
import { Container, Eyebrow, SectionHead, btnCta } from './ui';

type Testimonial = {
  quote: string;
  name: string;
  role: string; // ex : "Expert-comptable — Cabinet Durand"
};

const TESTIMONIALS: Testimonial[] = [
  // { quote: '…', name: '…', role: '…' },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export function Testimonials() {
  return (
    <section className="bg-[var(--ink-50)] py-20 sm:py-24">
      <Container>
        <SectionHead
          eyebrow="Ils utilisent Legaly AI"
          title={
            <>
              Conçu avec les professionnels
              <br />
              qui déposent au quotidien.
            </>
          }
        />

        {TESTIMONIALS.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-[var(--ink-150)] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(8,3,49,0.08)]"
              >
                <div
                  aria-hidden="true"
                  className="mb-2.5 font-serif text-[40px] leading-none text-[var(--accent)]"
                >
                  “
                </div>
                <p className="mb-4.5 text-[15px] leading-relaxed text-[var(--ink-900)]">{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--violet-100)] text-[13px] font-bold text-[var(--accent-ink)]">
                    {initials(t.name)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-[12.5px] text-[var(--ink-500)]">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-2xl rounded-[20px] border border-[var(--ink-150)] bg-white px-6 py-9 text-center shadow-[0_20px_50px_rgba(8,3,49,0.08)] sm:px-10">
            <Eyebrow className="mb-3.5">Programme pilote</Eyebrow>
            <h3 className="mb-2.5 text-[22px] tracking-tight">
              Les premiers cabinets testent Legaly AI en avant-première.
            </h3>
            <p className="mx-auto mb-5.5 max-w-lg text-[15px] leading-relaxed text-[var(--ink-600)]">
              Rejoignez le programme pilote : onboarding personnalisé, accès direct à
              l&apos;équipe produit, et vos retours façonnent la feuille de route.
              Places limitées.
            </p>
            <a href="/auth/signup" className={btnCta}>
              Rejoindre le programme pilote
              <Arrow size={16} />
            </a>
          </div>
        )}
      </Container>
    </section>
  );
}
