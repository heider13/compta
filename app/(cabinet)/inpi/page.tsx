import { InpiFormalities } from '@/components/cabinet/InpiFormalities';
import { PageShell } from '@/components/cabinet/PageHeader';

export const dynamic = 'force-dynamic';

export default function InpiFormalitiesPage() {
  return (
    <PageShell>
      <InpiFormalities />
    </PageShell>
  );
}
