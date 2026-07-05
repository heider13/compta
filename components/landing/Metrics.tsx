// Section « résultats » façon Brevo : grands chiffres animés (CountUp) +
// deux cartes témoignage/étude de cas. Identité visuelle indigo/violet + corail.

import { Container, SectionHead } from './ui';
import { Reveal } from './Reveal';
import { CountUp } from './CountUp';

const STATS = [
  { to: 4, prefix: '×', suffix: '', decimals: 0, label: 'temps divisé par formalité' },
  { to: 70, prefix: '-', suffix: ' %', decimals: 0, label: "d'allers-retours en moins" },
  { to: 4, prefix: '', suffix: ' min', decimals: 0, label: 'pour préparer un dossier' },
  { to: 100, prefix: '', suffix: ' %', decimals: 0, label: '100 % dématérialisé, zéro papier' },
];

export function Metrics() {
  return (
    <section className="border-b border-[var(--ink-100)] bg-white py-20 sm:py-24">
      <Container>
        <SectionHead
          eyebrow="Des résultats concrets"
          title={
            <>
              De vrais cabinets,
              <br />
              de vrais gains de temps.
            </>
          }
          lead="Ce que l'automatisation change au quotidien pour les cabinets qui l'utilisent."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="rounded-2xl border border-[var(--ink-150)] bg-white p-7 text-center">
                <div className="font-[Sora] text-[clamp(2.2rem,5vw,3rem)] font-bold text-[var(--accent-ink)]">
                  <CountUp
                    to={s.to}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    decimals={s.decimals}
                  />
                </div>
                <div className="mt-1 text-sm text-[var(--ink-600)]">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Reveal delay={0}>
            <figure className="flex h-full flex-col justify-between rounded-2xl bg-[var(--violet-900)] p-7 text-white">
              <blockquote className="text-lg leading-relaxed">
                « Une modification de gérant se prépare en quelques minutes, sans
                ressaisir trois fois les mêmes infos. On a arrêté de courir après
                les pièces justificatives. »
              </blockquote>
              <figcaption className="mt-6 text-sm text-white/80">
                — Camille R., Cabinet Delaunay &amp; Associés
              </figcaption>
            </figure>
          </Reveal>

          <Reveal delay={80}>
            <figure className="flex h-full flex-col justify-between rounded-2xl bg-[var(--accent-soft)] p-7">
              <blockquote className="text-lg leading-relaxed text-[var(--ink-700)]">
                « Le dépôt au Guichet Unique est devenu un non-sujet. Les
                allers-retours avec les clients ont fondu et les dossiers partent
                le jour même. »
              </blockquote>
              <figcaption className="mt-6 text-sm text-[var(--ink-700)]">
                — Julien M., Cabinet Novéo Expertise
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
