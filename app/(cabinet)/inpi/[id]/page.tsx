import { InpiFormalityDetail } from '@/components/cabinet/InpiFormalityDetail';

export const dynamic = 'force-dynamic';

export default async function InpiFormalityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <InpiFormalityDetail id={id} />
    </div>
  );
}
