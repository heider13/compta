import { ComptesAnnuels } from '@/components/cabinet/ComptesAnnuels';

export const dynamic = 'force-dynamic';

export default function ComptesAnnuelsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <ComptesAnnuels />
    </div>
  );
}
