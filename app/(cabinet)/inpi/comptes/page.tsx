import { ComptesAnnuels } from '@/components/cabinet/ComptesAnnuels';
import { PageShell } from '@/components/cabinet/PageHeader';

export const dynamic = 'force-dynamic';

export default function ComptesAnnuelsPage() {
  return (
    <PageShell>
      <ComptesAnnuels />
    </PageShell>
  );
}
