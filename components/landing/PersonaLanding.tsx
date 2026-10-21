// Template des pages métier (experts-comptables, avocats, directions juridiques).
// Hero animé propre au métier (le chat reste sur l'accueil), puis une structure
// inspirée de Pennylane : modules en tuiles avec écrans du logiciel, engagements,
// réassurance, connexions officielles, fin de page avec appareils.
// Contenu : lib/landing/metiers.ts.

import type { PersonaContent } from '@/lib/landing/personas';
import { METIERS, NOUVEAUTES } from '@/lib/landing/metiers';
import { Nav } from './Nav';
import { HeroMetier } from './v2/HeroMetier';
import { HeroEntrepreneur } from './HeroEntrepreneur';
import { Modules, Engagements, Reassurance, Connexions, FinAppareils } from './v2/Pennylane';
import type { Variante } from './v2/Maquettes';
import { FooterV2 } from './v2/Bas';
import { CircuitIso } from './v2/CircuitIso';
import { TarifsEntrepreneur } from './v2/TarifsEntrepreneur';

export function PersonaLanding({ persona }: { persona: PersonaContent }) {
  const m = METIERS[persona.slug];
  const v = persona.slug as Variante;
  return (
    <div className="landing-theme">
      <Nav surface="light" />
      {persona.slug === 'independants-tpe' ? (
        // Indépendants et TPE : le vrai assistant, utilisable sans compte
        <HeroEntrepreneur kicker={m.kicker} ligne1={m.ligne1} ligne2={m.ligne2} sousTitre={m.sousTitre} exemples={m.exemples.slice(0, 4)} />
      ) : (
        <HeroMetier metier={persona.slug} kicker={m.kicker} ligne1={m.ligne1} ligne2={m.ligne2} sousTitre={m.sousTitre} points={m.points} />
      )}
      {/* Le circuit est dans l'en-tête des professions ; en section pour les entrepreneurs */}
      {persona.slug === 'independants-tpe' && <CircuitIso variante={persona.slug} />}
      <Modules titre={m.modulesTitre} modules={m.modules} v={v} />
      <Engagements titre={m.engagements.titre} points={m.engagements.points} />
      <Reassurance adapte={m.adapte} nouveautes={NOUVEAUTES} />
      {/* Tarifs par formalité : seulement pour les entrepreneurs (pas pour les professionnels) */}
      {persona.slug === 'independants-tpe' && <TarifsEntrepreneur />}
      <Connexions />
      <FinAppareils titre={m.fin} v={v} />
      <FooterV2 />
    </div>
  );
}
