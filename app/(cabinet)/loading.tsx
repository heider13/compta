// Écran affiché immédiatement pendant le chargement d'une page du cabinet.
// Reprend le gabarit PageShell : en-tête (libellé mono, titre, description),
// bande de 4 indicateurs dans une seule carte divisée, puis une grande carte.
import { Skeleton } from '@/components/ui/skeleton';

export default function Chargement() {
  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:px-8"
      aria-busy="true"
      aria-label="Chargement"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card shadow-xs lg:grid-cols-4 [&>*]:border-border max-lg:[&>*:nth-child(-n+2)]:border-b max-lg:[&>*:nth-child(odd)]:border-r lg:[&>*:not(:last-child)]:border-r">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 p-4 sm:p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="space-y-2 border-b px-5 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <div className="divide-y">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="size-8 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-32 max-w-full" />
              </div>
              <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
