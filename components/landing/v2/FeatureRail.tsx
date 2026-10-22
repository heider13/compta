'use client';

// Rangée de cartes défilante : toutes les formalités et fonctions de Legaly.
// Style épuré (esprit Lovable) : illustration douce sur un halo coloré flou en haut,
// titre et texte en dessous. Défilement continu et lent, en boucle (cartes doublées),
// qui ralentit en douceur au survol ; défilement manuel si l'animation est réduite.

import { Container } from '../ui';
import { useDefilement } from '../useDefilement';
import { ILLUS } from './Illus';

const CARTES = [
  { key: 'creation', titre: 'Création de société', texte: 'SASU, SAS, SARL, EURL, SCI, micro-entreprise : statuts rédigés, dossier prêt à déposer.' },
  { key: 'modification', titre: 'Modifications', texte: 'Siège, dirigeants, objet, dénomination, capital : les pièces suivent la décision.' },
  { key: 'dissolution', titre: 'Dissolution et liquidation', texte: 'PV, liquidateur, comptes de clôture et radiation, dans l’ordre.' },
  { key: 'sommeil', titre: 'Mise en sommeil', texte: 'Cessation temporaire d’activité, sans annonce légale, jusqu’à deux ans.' },
  { key: 'annonces', titre: 'Annonces légales', texte: 'Rédigées par l’IA, mentions obligatoires contrôlées une à une.' },
  { key: 'rne', titre: 'Documents RNE', texte: 'Statuts, PV, comptes annuels et avis Insee récupérés en un clic.' },
  { key: 'regularisation', titre: 'Régularisations', texte: 'Les demandes du greffe sont lues et les réponses préparées.' },
  { key: 'lots', titre: 'Formalités en lot', texte: 'Plusieurs sociétés traitées en une seule demande.' },
  { key: 'paiement', titre: 'Suivi des paiements', texte: 'Montants, délégation au client et alertes, sans relance manuelle.' },
  { key: 'signature', titre: 'Signature électronique', texte: 'Documents signés en ligne, signature qualifiée eIDAS si besoin.' },
];

type Carte = { key: string; titre: string; texte: string };

// Halos flous de chaque carte (deux taches de couleur, comme sur Lovable)
const HALOS = [
  ['rgba(117,81,232,0.38)', 'rgba(234,66,253,0.22)'],
  ['rgba(255,136,123,0.38)', 'rgba(255,190,140,0.30)'],
  ['rgba(234,66,253,0.30)', 'rgba(117,81,232,0.26)'],
  ['rgba(255,190,140,0.40)', 'rgba(255,136,123,0.24)'],
];

export function FeatureRail({
  titre = ['Toutes vos formalités,', 'au même endroit.'],
  sousTitre = 'De la création à la radiation : l’agent prépare, vous validez et déposez.',
  cartes = CARTES,
}: { titre?: [string, string]; sousTitre?: string; cartes?: Carte[] } = {}) {
  const { piste, survol } = useDefilement<HTMLDivElement>(cartes.length * 10);
  return (
    <section id="fonctionnalites" className="relative scroll-mt-24 overflow-hidden bg-[#fcfbff] py-20 sm:py-24">
      {/* Illustrations adoucies : plus d'ombres « tampon », contours très légers */}
      <style>{`
        .rail-epure [class*='shadow-['] { box-shadow: 0 10px 28px rgba(54,31,171,0.10), 0 1px 2px rgba(8,3,49,0.06) !important; }
        .rail-epure [class*='border-[var(--violet-900)]'] { border-color: rgba(8,3,49,0.08) !important; }
        html[data-landing='dark'] .rail-epure [class*='shadow-['] { box-shadow: 0 10px 28px rgba(0,0,0,0.35) !important; }
        html[data-landing='dark'] .rail-epure [class*='border-[var(--violet-900)]'] { border-color: rgba(255,255,255,0.08) !important; }
      `}</style>
      <Container className="relative">
        <h2 className="max-w-3xl font-[Sora] !text-[clamp(1.75rem,3.4vw,2.6rem)] !font-bold !leading-[1.1] !tracking-[-0.03em] !text-[var(--violet-900)]">
          {titre[0]} {titre[1]}
        </h2>
        <p className="!mt-4 max-w-md text-[15px] !leading-relaxed !text-[var(--ink-600)]">
          {sousTitre}
        </p>
      </Container>

      <div className="relative mx-auto mt-12 max-w-[1440px] [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[scrollbar-width:none]">
        <div ref={piste} {...survol} className="flex w-max pb-6 pt-2 will-change-transform">
          {[...cartes, ...cartes].map((c, k) => {
            const i = k % cartes.length;
            const [a, b] = HALOS[i % HALOS.length];
            return (
              <article
                key={k}
                aria-hidden={k >= cartes.length || undefined}
                className="rail-epure group mr-3 flex h-[360px] w-[340px] shrink-0 flex-col overflow-hidden rounded-[18px] border border-[var(--ink-150)] bg-white shadow-[0_1px_3px_rgba(8,3,49,0.04)] transition-shadow duration-300 hover:shadow-[0_14px_36px_rgba(54,31,171,0.10)]"
              >
                <div className="relative h-[220px] overflow-hidden">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 blur-2xl"
                    style={{ background: `radial-gradient(ellipse 60% 55% at 22% 40%, ${a}, transparent 70%), radial-gradient(ellipse 55% 50% at 85% 18%, ${b}, transparent 70%)` }}
                  />
                  <div className="relative grid h-full place-items-center">
                    <div className="scale-[1.3] transition-transform duration-500 ease-out group-hover:scale-[1.36]">{ILLUS[c.key]}</div>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-4">
                  <h3 className="font-[Sora] !text-[15px] !font-semibold !leading-snug !text-[var(--violet-900)]">{c.titre}</h3>
                  <p className="!mt-2 text-[13.5px] !leading-relaxed !text-[var(--ink-500)]">{c.texte}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
