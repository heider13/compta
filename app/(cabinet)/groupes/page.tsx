import { PageShell } from '@/components/cabinet/PageHeader';
import { GroupesListe } from '@/components/cabinet/Groupes';

export const dynamic = 'force-dynamic';

export default function GroupesPage() {
  return (
    <PageShell>
      <GroupesListe />
    </PageShell>
  );
}
