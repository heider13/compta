import { Suspense } from 'react';
import { RneDocuments } from '@/components/cabinet/RneDocuments';
import { PageShell } from '@/components/cabinet/PageHeader';

export const dynamic = 'force-dynamic';

export default function RneDocumentsPage() {
  return (
    <PageShell className="max-w-5xl">
      <Suspense>
        <RneDocuments />
      </Suspense>
    </PageShell>
  );
}
