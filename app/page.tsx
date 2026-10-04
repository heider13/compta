import { Nav } from '@/components/landing/Nav';
import { HeroAgent } from '@/components/landing/HeroAgent';
import { ProductSuite } from '@/components/landing/ProductSuite';
import { TabShowcase } from '@/components/landing/TabShowcase';
import { FormalityTypes } from '@/components/landing/FormalityTypes';
import { Metrics } from '@/components/landing/Metrics';
import { PersonaSelector } from '@/components/landing/PersonaSelector';
import { InteractiveDemo } from '@/components/landing/InteractiveDemo';
import { Awards } from '@/components/landing/Awards';
import { Pricing } from '@/components/landing/Pricing';
import { Resources } from '@/components/landing/Resources';
import { CtaFinal } from '@/components/landing/CtaFinal';
import { Footer } from '@/components/landing/Footer';

// Architecture d'accueil : hero « agent » inspiré de NanoCorp (chat de démonstration
// + animation du parcours), puis sections inspirées de Brevo (indigo + corail) → agents IA → vitrine à onglets des
// formalités → résultats chiffrés animés → solutions par métier → démo →
// bandeau conformité → tarifs → ressources → CTA final → footer.
export default function LandingPage() {
  return (
    <div className="landing-theme">
      <Nav
        surface="light"
        announcement={<>● Nouveau : l’agent rédige aussi vos annonces légales et lit les documents du RNE.</>}
      />
      <HeroAgent />
      <ProductSuite />
      <TabShowcase />
      <FormalityTypes />
      <Metrics />
      <PersonaSelector />
      <InteractiveDemo />
      <Awards />
      <Pricing />
      <Resources />
      <CtaFinal />
      <Footer />
    </div>
  );
}
