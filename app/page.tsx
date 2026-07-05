import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { ProductSuite } from '@/components/landing/ProductSuite';
import { TabShowcase } from '@/components/landing/TabShowcase';
import { Metrics } from '@/components/landing/Metrics';
import { PersonaSelector } from '@/components/landing/PersonaSelector';
import { InteractiveDemo } from '@/components/landing/InteractiveDemo';
import { Awards } from '@/components/landing/Awards';
import { Pricing } from '@/components/landing/Pricing';
import { Resources } from '@/components/landing/Resources';
import { CtaFinal } from '@/components/landing/CtaFinal';
import { Footer } from '@/components/landing/Footer';

// Architecture d'accueil inspirée de Brevo (identité visuelle maison : indigo +
// corail) : hero clair à cartes flottantes → agents IA → vitrine à onglets des
// formalités → résultats chiffrés animés → solutions par métier → démo →
// bandeau conformité → tarifs → ressources → CTA final → footer.
export default function LandingPage() {
  return (
    <div className="landing-theme">
      <Nav />
      <Hero />
      <ProductSuite />
      <TabShowcase />
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
