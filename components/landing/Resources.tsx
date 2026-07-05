// Section Ressources — façon Brevo : cartes guides / articles avant le CTA final.
// Alimente le SEO et rassure (expertise). Liens placeholder (#) pour le MVP.

import { BookOpen, FileText, GraduationCap } from 'lucide-react';
import { Arrow } from '@/components/icons';
import { Container, SectionHead } from './ui';

const RESOURCES = [
  {
    icon: FileText,
    tag: 'Guide',
    title: 'Créer une SASU en 2026 : le guide complet',
    desc: 'Statuts, capital, dépôt INPI — toutes les étapes expliquées simplement.',
  },
  {
    icon: BookOpen,
    tag: 'Article',
    title: 'Transfert de siège social : ce qui change',
    desc: 'Formalités, pièces à fournir et délais après la réforme du Guichet Unique.',
  },
  {
    icon: GraduationCap,
    tag: 'Académie',
    title: 'Automatiser son cabinet avec l’IA',
    desc: 'Comment les cabinets divisent par 4 le temps passé sur les formalités.',
  },
];

export function Resources() {
  return (
    <section id="ressources" className="border-b border-[var(--ink-100)] py-20 sm:py-24">
      <Container>
        <SectionHead
          eyebrow="Ressources"
          title="Approfondissez votre expertise"
          lead="Guides pratiques, analyses et retours d’expérience pour aller plus loin."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {RESOURCES.map((r) => (
            <a
              key={r.title}
              href="#"
              className="group flex flex-col rounded-2xl border border-[var(--ink-150)] bg-white p-7 no-underline transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_16px_40px_rgba(255,136,123,0.18)]"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                <r.icon className="size-5" />
              </span>
              <span className="mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--accent-ink)]">
                {r.tag}
              </span>
              <h3 className="mt-2 font-[Sora] text-lg font-semibold leading-snug text-[var(--violet-900)]">
                {r.title}
              </h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[var(--ink-600)]">
                {r.desc}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-ink)] transition-colors group-hover:text-[var(--accent)]">
                Lire
                <Arrow size={15} />
              </span>
            </a>
          ))}
        </div>
      </Container>
    </section>
  );
}
