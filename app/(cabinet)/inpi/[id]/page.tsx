import { InpiFormalityDetail } from '@/components/cabinet/InpiFormalityDetail';
import { PageShell } from '@/components/cabinet/PageHeader';

export const dynamic = 'force-dynamic';

export default async function InpiFormalityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageShell>
      <InpiFormalityDetail id={id} />
    </PageShell>
  );
}
