import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { LogoBand } from '@/components/landing/LogoBand';
import { Metrics } from '@/components/landing/Metrics';
import { FeatureRows } from '@/components/landing/FeatureRows';
import { FormalityTypes } from '@/components/landing/FormalityTypes';
import { Testimonials } from '@/components/landing/Testimonials';
import { Pricing } from '@/components/landing/Pricing';
import { CtaFinal } from '@/components/landing/CtaFinal';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      <Nav />
      <Hero />
      <LogoBand />
      <Metrics />
      <FeatureRows />
      <FormalityTypes />
      <Testimonials />
      <Pricing />
      <CtaFinal />
      <Footer />
    </>
  );
}
