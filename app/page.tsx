import { Nav } from '@/components/landing/Nav';
import { HeroAgent } from '@/components/landing/HeroAgent';
import { FeatureRail } from '@/components/landing/v2/FeatureRail';
import { AgentsCarousel } from '@/components/landing/v2/AgentsCarousel';
import { AudienceTabs } from '@/components/landing/v2/AudienceTabs';
import { Conformite, Registres } from '@/components/landing/v2/Confiance';
import { Pricing } from '@/components/landing/Pricing';
import { CtaBand, FooterV2 } from '@/components/landing/v2/Bas';

// Accueil : hero « agent » (chat de démonstration + livre animé), puis une
// organisation inspirée de Brevo aux couleurs Legaly : rangée de formalités,
// agents IA en carrousel, onglets par métier, confiance, registres, tarifs,
// appel à l'action et pied de page en colonnes.
export default function LandingPage() {
  return (
    <div className="landing-theme">
      <Nav
        surface="light"
        announcement={<><span className="text-[#ff887b]">●</span> Nouveau : l’agent rédige aussi vos annonces légales et lit les documents du RNE.</>}
      />
      <HeroAgent />
      <FeatureRail />
      <AgentsCarousel />
      <AudienceTabs />
      <Conformite />
      <Registres />
      <Pricing />
      <CtaBand />
      <FooterV2 />
    </div>
  );
}
