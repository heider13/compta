'use client';

// « Une plateforme pensée pour chaque cabinet » : onglets par métier. À gauche
// le pitch, les points clés et le lien vers la page métier ; à droite une carte
// produit (ce que Legaly prépare pour ce métier). Pas de faux témoignage.

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Container } from '../ui';
import { cn } from '@/lib/utils';

const PUBLICS = [
  {
    key: 'experts-comptables',
    onglet: 'Experts-comptables',
    eyebrow: 'Pour les cabinets d’expertise comptable',
    titre: 'Le juridique de tout votre portefeuille, sans plomber vos équipes',
    texte: 'Créations, modifications, cessations : vos collaborateurs décrivent l’opération, l’agent prépare tout, le cabinet valide.',
    points: ['Formalités en lot pour plusieurs clients à la fois', 'Statuts, PV et annonces rédigés à partir du registre', 'Frais officiels suivis et refacturés au client', 'Validation interne avant tout dépôt'],
    carte: { titre: 'Portefeuille clients', lignes: ['12 dossiers en préparation', '3 régularisations du greffe à traiter', '2 délégations de paiement en attente'] },
  },
  {
    key: 'avocats',
    onglet: 'Avocats',
    eyebrow: 'Pour les cabinets d’avocats',
    titre: 'Vos actes rédigés à votre style, la formalité prête à déposer',
    texte: 'L’agent s’appuie sur vos modèles d’actes déjà acceptés par le greffe et sur les textes officiels pour produire des projets à relire.',
    points: ['Modèles du cabinet repris : structure, clauses, mentions', 'Opérations complexes : dissolution, liquidation, transfert', 'Régularisations du greffe analysées et préparées', 'Signature électronique de vos clients'],
    carte: { titre: 'Opération en cours', lignes: ['PV de dissolution — projet à relire', 'Annonce légale — mentions vérifiées', 'Brouillon au Guichet unique — à signer'] },
  },
  {
    key: 'directions-juridiques',
    onglet: 'Directions juridiques',
    eyebrow: 'Pour les directions juridiques',
    titre: 'Le secrétariat juridique de vos filiales, centralisé',
    texte: 'Changements de dirigeants, transferts de siège, mises à jour des bénéficiaires effectifs : un seul outil pour toutes les entités du groupe.',
    points: ['Fiche RNE et documents déposés de chaque filiale', 'Changements en série sur plusieurs entités', 'Historique et pièces de chaque formalité', 'Aucun dépôt sans validation de la direction'],
    carte: { titre: 'Entités du groupe', lignes: ['Filiale A — changement de président', 'Filiale B — transfert de siège', 'Filiale C — bénéficiaires effectifs à jour'] },
  },
];

export function AudienceTabs() {
  const [actif, setActif] = useState(0);
  const p = PUBLICS[actif];
  return (
    <section id="solutions" className="scroll-mt-24 border-t border-[var(--ink-100)] bg-white py-20 sm:py-24">
      <Container>
        <h2 className="text-center font-[Sora] !text-[clamp(1.75rem,3.4vw,2.6rem)] !font-semibold !text-[var(--violet-900)]">
          Une plateforme pensée pour chaque cabinet
        </h2>
        <div className="mt-8 flex justify-center">
          <div className="inline-flex flex-wrap justify-center gap-1 rounded-full border border-[var(--ink-150)] bg-white p-1.5">
            {PUBLICS.map((x, i) => (
              <button
                key={x.key}
                type="button"
                onClick={() => setActif(i)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-5',
                  i === actif ? 'bg-[var(--violet-100)] !text-[var(--violet-900)]' : '!text-[var(--ink-600)] hover:!text-[var(--violet-900)]',
                )}
              >
                {x.onglet}
              </button>
            ))}
          </div>
        </div>

        <div key={p.key} className="mt-12 grid items-center gap-10 lg:grid-cols-2 animate-[heroSceneIn_.4s_ease-out]">
          <div>
            <p className="text-sm font-semibold !text-[var(--violet-600)]">{p.eyebrow}</p>
            <h3 className="!mt-2 font-[Sora] !text-[clamp(1.5rem,2.6vw,2.1rem)] !font-semibold !leading-tight !text-[var(--violet-900)]">{p.titre}</h3>
            <p className="!mt-4 max-w-lg !text-[var(--ink-600)]">{p.texte}</p>
            <ul className="mt-5 space-y-2">
              {p.points.map((pt) => (
                <li key={pt} className="flex items-start gap-2 text-[15px] text-[var(--ink-700)]">
                  <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" /> {pt}
                </li>
              ))}
            </ul>
            <a
              href={`/${p.key}`}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--violet-900)] px-5 py-2.5 text-sm font-semibold !text-white no-underline transition-colors hover:bg-[var(--violet-600)]"
            >
              En savoir plus <ArrowRight className="size-4" />
            </a>
          </div>

          <div className="relative rounded-3xl bg-[var(--ink-50)] p-6 sm:p-8">
            <div className="rounded-2xl border border-[var(--violet-900)]/80 bg-white p-5 shadow-[4px_4px_0_rgba(8,3,49,0.85)]">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--violet-600)]">{p.carte.titre}</p>
              <ul className="mt-4 space-y-2.5">
                {p.carte.lignes.map((l, i) => (
                  <li key={l} className="flex items-center gap-3 rounded-xl border border-[var(--ink-150)] px-3 py-2.5 text-sm text-[var(--violet-900)]">
                    <span className={cn('size-2 shrink-0 rounded-full', ['bg-[var(--violet-500)]', 'bg-[var(--accent)]', 'bg-[#ffbe8c]'][i % 3])} />
                    {l}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-[var(--ink-500)]">Exemple d’écran — vos dossiers réels apparaissent ici.</p>
            </div>
            <span className="absolute -right-3 -top-3 rounded-full border border-[var(--violet-900)]/80 bg-[var(--accent)] px-3 py-1 text-xs font-semibold !text-white shadow-[2px_2px_0_rgba(8,3,49,0.85)]">
              {p.onglet}
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
