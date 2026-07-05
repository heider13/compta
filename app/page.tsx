import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { Metrics } from '@/components/landing/Metrics';
import { PersonaSelector } from '@/components/landing/PersonaSelector';
import { InteractiveDemo } from '@/components/landing/InteractiveDemo';
import { FeatureRows } from '@/components/landing/FeatureRows';
import { FormalityTypes } from '@/components/landing/FormalityTypes';
import { Testimonials } from '@/components/landing/Testimonials';
import { Pricing } from '@/components/landing/Pricing';
import { CtaFinal } from '@/components/landing/CtaFinal';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="landing-theme">
      <Nav />
      <Hero />
      <Metrics />
      <PersonaSelector />
      <InteractiveDemo />
      <FeatureRows />
      <FormalityTypes />
      <Testimonials />
      <Pricing />
      <CtaFinal />
      <Footer />
    </div>
  );
}
