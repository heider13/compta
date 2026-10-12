import { GroupesListe } from '@/components/cabinet/Groupes';

export const dynamic = 'force-dynamic';

export default function GroupesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <GroupesListe />
    </div>
  );
}
