// Écran affiché immédiatement pendant le chargement d'une page du cabinet
export default function Chargement() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6" aria-busy="true" aria-label="Chargement">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border bg-card" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl border bg-card" />
    </div>
  );
}
