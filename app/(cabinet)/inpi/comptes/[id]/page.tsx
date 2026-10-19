import { ComptesAnnuelsDetail } from '@/components/cabinet/ComptesAnnuels';
import { PageShell } from '@/components/cabinet/PageHeader';

export const dynamic = 'force-dynamic';

export default async function DepotComptesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageShell>
      <ComptesAnnuelsDetail id={id} />
    </PageShell>
  );
}
