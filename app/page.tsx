import { Nav } from '@/components/landing/Nav';
import { HeroAgent } from '@/components/landing/HeroAgent';
import { CircuitIso } from '@/components/landing/v2/CircuitIso';
import { FormalitesConstellation } from '@/components/landing/v2/FormalitesConstellation';
import { AgentsCarousel } from '@/components/landing/v2/AgentsCarousel';
import { AudienceTabs } from '@/components/landing/v2/AudienceTabs';
import { Conformite, Registres } from '@/components/landing/v2/Confiance';
import { CtaBand, FooterV2 } from '@/components/landing/v2/Bas';

// Accueil : hero « agent » (chat de démonstration + livre animé), puis une
// organisation inspirée de Brevo aux couleurs Legaly : rangée de formalités,
// agents IA en carrousel, onglets par métier, confiance, registres,
// appel à l'action et pied de page en colonnes.
export default function LandingPage() {
  return (
    <div className="landing-theme">
      <Nav
        surface="light"
      />
      <HeroAgent />
      <CircuitIso />
      <FormalitesConstellation />
      <AgentsCarousel />
      <AudienceTabs />
      <Conformite />
      <Registres />
      <CtaBand />
      <FooterV2 />
    </div>
  );
}
