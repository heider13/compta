export interface BarItem {
  label: string;
  value: number;
  /** Tailwind bg class or arbitrary color for the filled bar, e.g. "bg-[#5b36d6]". */
  colorClass: string;
}

export function BarChart({ items }: { items: BarItem[] }) {
  const total = items.reduce((sum, it) => sum + it.value, 0);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucune formalité pour l&apos;instant.
      </p>
    );
  }

  const max = Math.max(...items.map((it) => it.value), 1);

  return (
    <ul className="space-y-4">
      {items.map((it) => {
        const pctOfTotal = Math.round((it.value / total) * 100);
        const pctOfMax = Math.max((it.value / max) * 100, it.value > 0 ? 6 : 0);
        return (
          <li key={it.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium text-foreground">{it.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{it.value}</span>
                <span className="ml-1 text-xs">· {pctOfTotal}%</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#f3f1fa]">
              <div
                className={`h-full rounded-full ${it.colorClass}`}
                style={{ width: `${pctOfMax}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
