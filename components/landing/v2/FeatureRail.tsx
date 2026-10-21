'use client';

// Rangée de cartes défilante : toutes les formalités et fonctions de Legaly,
// chacune avec un titre et une mini-illustration. Défilement continu et lent,
// en boucle (cartes doublées), en pause au survol ; défilement manuel si
// l'animation est réduite.

import { Container } from '../ui';
import { ILLUS } from './Illus';
import { Degrade, Halos, teinte } from './Couleurs';

const CARTES = [
  { key: 'creation', titre: 'Création de société', texte: 'SASU, SAS, SARL, EURL, SCI, micro-entreprise' },
  { key: 'modification', titre: 'Modifications', texte: 'Siège, dirigeants, objet, dénomination, capital' },
  { key: 'dissolution', titre: 'Dissolution et liquidation', texte: 'PV, liquidateur, clôture et radiation' },
  { key: 'sommeil', titre: 'Mise en sommeil', texte: 'Cessation temporaire, sans annonce légale' },
  { key: 'annonces', titre: 'Annonces légales', texte: 'Mentions obligatoires contrôlées une à une' },
  { key: 'rne', titre: 'Documents RNE', texte: 'Statuts, PV, comptes annuels, avis INSEE' },
  { key: 'regularisation', titre: 'Régularisations', texte: 'Demandes du greffe lues, réponses préparées' },
  { key: 'lots', titre: 'Formalités en lot', texte: 'Plusieurs sociétés en une seule demande' },
  { key: 'paiement', titre: 'Suivi des paiements', texte: 'Montant, délégation au client, alertes' },
  { key: 'signature', titre: 'Signature électronique', texte: 'Actes signés par vos clients, à distance' },
];

type Carte = { key: string; titre: string; texte: string };

export function FeatureRail({
  titre = ['Toutes vos formalités,', 'au même endroit'],
  sousTitre = 'De la création à la radiation : l’agent prépare, vous validez et déposez.',
  cartes = CARTES,
}: { titre?: [string, string]; sousTitre?: string; cartes?: Carte[] } = {}) {
  return (
    <section id="fonctionnalites" className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-[#fbfaff] via-[#fff5fb] to-[#fff8f3] py-20 sm:py-24">
      <Halos />
      <Container className="relative">
        <h2 className="text-center font-[Sora] !text-[clamp(1.75rem,3.4vw,2.6rem)] !font-semibold !text-[var(--violet-900)]">
          {titre[0]} <Degrade>{titre[1]}</Degrade>
        </h2>
        <p className="!mx-auto !mt-3 max-w-2xl text-center !text-[var(--ink-600)]">
          {sousTitre}
        </p>
      </Container>

      <div
        className="relative mx-auto mt-10 max-w-[1440px] [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[scrollbar-width:none]"
      >
        <style>{`@keyframes rail-defile { to { transform: translateX(-50%); } }`}</style>
        <div
          className="flex w-max pb-4 pt-2 hover:[animation-play-state:paused] motion-reduce:!animate-none"
          style={{ animation: `rail-defile ${cartes.length * 7}s linear infinite` }}
        >
          {[...cartes, ...cartes].map((c, k) => {
            const i = k % cartes.length;
            const t = teinte(i);
            return (
            <article
              key={k}
              aria-hidden={k >= cartes.length || undefined}
              style={{ ['--t-fort' as string]: t.fort, ['--t-fond' as string]: t.fond, ['--t-ombre' as string]: t.ombre }}
              className="group relative mr-4 flex h-[300px] w-[230px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-[0_6px_20px_rgba(54,31,171,0.08)] transition-all duration-200 hover:-translate-y-1.5 hover:border-[var(--t-fort)] hover:shadow-[0_20px_44px_var(--t-ombre)]"
            >
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ background: t.fort }} />
              <h3 className="font-[Sora] !text-[17px] !font-semibold !leading-snug !text-[var(--violet-900)]">{c.titre}</h3>
              <p className="!mt-1 text-[13px] !leading-snug !text-[var(--ink-500)]">{c.texte}</p>
              <div className="mt-auto grid h-36 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-[1.03]" style={{ background: `linear-gradient(135deg, ${t.fond}, #ffffff)` }}>
                {ILLUS[c.key]}
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
