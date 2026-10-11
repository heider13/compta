'use client';

// Rangée de cartes défilante : toutes les formalités et fonctions de Legaly,
// chacune avec un titre et une mini-illustration. Flèches + défilement tactile.

import { useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
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

export function FeatureRail() {
  const rail = useRef<HTMLDivElement>(null);
  const defiler = (sens: 1 | -1) => rail.current?.scrollBy({ left: sens * 320, behavior: 'smooth' });

  return (
    <section id="fonctionnalites" className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-[#fbf8ff] via-[#fff5fb] to-[#fff8f3] py-20 sm:py-24">
      <Halos />
      <Container className="relative">
        <h2 className="text-center font-[Sora] !text-[clamp(1.75rem,3.4vw,2.6rem)] !font-semibold !text-[var(--violet-900)]">
          Toutes vos formalités, <Degrade>au même endroit</Degrade>
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
          {CARTES.map((c, i) => {
            const t = teinte(i);
            return (
            <article
              key={c.key}
              style={{ ['--t-fort' as string]: t.fort, ['--t-fond' as string]: t.fond, ['--t-ombre' as string]: t.ombre }}
              className="group relative flex h-[300px] w-[230px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-[0_6px_20px_rgba(54,31,171,0.08)] transition-all duration-200 hover:-translate-y-1.5 hover:border-[var(--t-fort)] hover:shadow-[0_20px_44px_var(--t-ombre)]"
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
        <div className="mt-4 flex justify-center gap-2">
          {[-1, 1].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => defiler(s as 1 | -1)}
              aria-label={s < 0 ? 'Cartes précédentes' : 'Cartes suivantes'}
              className="grid size-10 place-items-center rounded-full bg-gradient-to-r from-[#ff887b] to-[#ea42fd] !text-white shadow-[0_8px_20px_rgba(234,66,253,0.35)] transition-transform hover:scale-105"
            >
              {s < 0 ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
