import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MODULE_LIST, moduleParCle } from '@/lib/landing/modules';
import { ModulePage } from '@/components/landing/ModulePage';

export function generateStaticParams() {
  return MODULE_LIST.map((x) => ({ slug: x.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const mod = moduleParCle((await params).slug);
  if (!mod) return {};
  return { title: `${mod.title} — Legaly AI`, description: mod.desc };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const mod = moduleParCle((await params).slug);
  if (!mod) notFound();
  return <ModulePage module={mod} />;
}
