import { Batches } from '@/components/cabinet/Batches';

export const dynamic = 'force-dynamic';

export default function BatchesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <Batches />
    </div>
  );
}
