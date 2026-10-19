import { PageShell } from '@/components/cabinet/PageHeader';
import { GroupeDetail } from '@/components/cabinet/Groupes';

export const dynamic = 'force-dynamic';

export default async function GroupePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageShell>
      <GroupeDetail id={id} />
    </PageShell>
  );
}
