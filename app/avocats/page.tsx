import type { Metadata } from 'next';
import { PERSONAS } from '@/lib/landing/personas';
import { PersonaLanding } from '@/components/landing/PersonaLanding';

const persona = PERSONAS['avocats'];

export const metadata: Metadata = {
  title: persona.metaTitle,
  description: persona.metaDescription,
};

export default function Page() {
  return <PersonaLanding persona={persona} />;
}
