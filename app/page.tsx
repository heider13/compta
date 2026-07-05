import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { Metrics } from '@/components/landing/Metrics';
import { ProductSuite } from '@/components/landing/ProductSuite';
import { PersonaSelector } from '@/components/landing/PersonaSelector';
import { InteractiveDemo } from '@/components/landing/InteractiveDemo';
import { FeatureRows } from '@/components/landing/FeatureRows';
import { FormalityTypes } from '@/components/landing/FormalityTypes';
import { Testimonials } from '@/components/landing/Testimonials';
import { Awards } from '@/components/landing/Awards';
import { Pricing } from '@/components/landing/Pricing';
import { Resources } from '@/components/landing/Resources';
import { CtaFinal } from '@/components/landing/CtaFinal';
import { Footer } from '@/components/landing/Footer';

// Architecture d'accueil inspirée de Brevo :
//   nav méga-menu → hero → preuve sociale (chiffres) → suite de modules IA
//   → solutions par métier → démo → fonctionnalités → formalités couvertes
//   → témoignages → distinctions → tarifs → ressources → CTA final → footer.
export default function LandingPage() {
  return (
    <div className="landing-theme">
      <Nav />
      <Hero />
      <Metrics />
      <ProductSuite />
      <PersonaSelector />
      <InteractiveDemo />
      <FeatureRows />
      <FormalityTypes />
      <Testimonials />
      <Awards />
      <Pricing />
      <Resources />
      <CtaFinal />
      <Footer />
    </div>
  );
}
