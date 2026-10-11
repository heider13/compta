'use client';

// Rangée de cartes défilante : toutes les formalités et fonctions de Legaly,
// chacune avec un titre et une mini-illustration. Flèches + défilement tactile.

import { useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Container } from '../ui';
import { ILLUS } from './Illus';

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

export function FeatureRail() {
  const rail = useRef<HTMLDivElement>(null);
  const defiler = (sens: 1 | -1) => rail.current?.scrollBy({ left: sens * 320, behavior: 'smooth' });

  return (
    <section id="fonctionnalites" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <Container>
        <h2 className="text-center font-[Sora] !text-[clamp(1.75rem,3.4vw,2.6rem)] !font-semibold !text-[var(--violet-900)]">
          Toutes vos formalités, au même endroit
        </h2>
        <p className="!mx-auto !mt-3 max-w-2xl text-center !text-[var(--ink-600)]">
          De la création à la radiation : l’agent prépare, vous validez et déposez.
        </p>
      </Container>

      <div className="relative mx-auto mt-10 max-w-[1240px]">
        <div
          ref={rail}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden"
        >
          {CARTES.map((c) => (
            <article
              key={c.key}
              className="group flex h-[300px] w-[230px] shrink-0 snap-start flex-col rounded-2xl border border-[var(--ink-150)] bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--violet-500)] hover:shadow-[0_18px_40px_rgba(54,31,171,0.12)]"
            >
              <h3 className="font-[Sora] !text-[17px] !font-semibold !leading-snug !text-[var(--violet-900)]">{c.titre}</h3>
              <p className="!mt-1 text-[13px] !leading-snug !text-[var(--ink-500)]">{c.texte}</p>
              <div className="mt-auto grid h-36 place-items-center rounded-xl bg-[var(--ink-50)] transition-colors group-hover:bg-[var(--violet-50)]">
                {ILLUS[c.key]}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          {[-1, 1].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => defiler(s as 1 | -1)}
              aria-label={s < 0 ? 'Cartes précédentes' : 'Cartes suivantes'}
              className="grid size-10 place-items-center rounded-full border border-[var(--violet-900)] bg-white text-[var(--violet-900)] transition-colors hover:bg-[var(--violet-900)] hover:!text-white"
            >
              {s < 0 ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
