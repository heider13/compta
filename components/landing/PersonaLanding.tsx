// Template des pages métier (experts-comptables, avocats, directions juridiques),
// sur le modèle de l'accueil : hero « agent » personnalisé, formalités du métier,
// défis → réponses, agents IA, parcours, confiance, tarifs, appel à l'action.
// Contenu : lib/landing/metiers.ts.

import type { PersonaContent } from '@/lib/landing/personas';
import { METIERS } from '@/lib/landing/metiers';
import { Nav } from './Nav';
import { HeroAgent } from './HeroAgent';
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
      <HeroAgent
        kicker={<span className="rounded-full bg-[var(--violet-600)] px-2.5 py-0.5 text-white">{m.kicker}</span>}
        ligne1={m.ligne1}
        ligne2={m.ligne2}
        sousTitre={m.sousTitre}
        exemples={m.exemples}
        chips={m.chips}
        compact
      />
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
