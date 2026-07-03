import Link from 'next/link';
import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { Metrics } from '@/components/landing/Metrics';
import { Features } from '@/components/landing/Features';
import { FormalityTypes } from '@/components/landing/FormalityTypes';
import { Pricing } from '@/components/landing/Pricing';
import { CtaFinal } from '@/components/landing/CtaFinal';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      <Nav />
      <Hero />
      <Metrics />
      <Features />
      <FormalityTypes />
      <Pricing />
      <CtaFinal />
      <Footer />
    </>
  );
}
