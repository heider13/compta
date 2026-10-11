// Template des pages métier (experts-comptables, avocats, directions juridiques),
// sur le modèle de l'accueil : hero animé propre au métier (le chat reste sur l'accueil), formalités du métier,
// défis → réponses, agents IA, parcours, confiance, tarifs, appel à l'action.
// Contenu : lib/landing/metiers.ts.

import type { PersonaContent } from '@/lib/landing/personas';
import { METIERS } from '@/lib/landing/metiers';
import { Nav } from './Nav';
import { HeroMetier } from './v2/HeroMetier';
import { FeatureRail } from './v2/FeatureRail';
import { AgentsCarousel } from './v2/AgentsCarousel';
import { Defis, Parcours } from './v2/Metier';
import { Conformite, Registres } from './v2/Confiance';
import { Pricing } from './Pricing';
import { CtaBand, FooterV2 } from './v2/Bas';

export function PersonaLanding({ persona }: { persona: PersonaContent }) {
  const m = METIERS[persona.slug];
  return (
    <div className="landing-theme">
      <Nav surface="light" />
      <HeroMetier metier={persona.slug} kicker={m.kicker} ligne1={m.ligne1} ligne2={m.ligne2} sousTitre={m.sousTitre} points={m.points} />
      <FeatureRail titre={m.rail.titre} sousTitre={m.rail.sousTitre} cartes={m.rail.cartes} />
      <Defis titre={m.defis.titre} items={m.defis.items} />
      <AgentsCarousel />
      <Parcours titre={m.parcours.titre} etapes={m.parcours.etapes} />
      <Conformite />
      <Registres />
      <Pricing />
      <CtaBand titre={m.cta} />
      <FooterV2 />
    </div>
  );
}
