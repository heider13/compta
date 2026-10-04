import { Suspense } from 'react';
import { RneDocuments } from '@/components/cabinet/RneDocuments';

export const dynamic = 'force-dynamic';

export default function RneDocumentsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <Suspense>
        <RneDocuments />
      </Suspense>
    </div>
  );
}
