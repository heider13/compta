import { Suspense } from 'react';
import { EspaceCommande } from '@/components/espace/Commande';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense><EspaceCommande id={id} /></Suspense>;
}
