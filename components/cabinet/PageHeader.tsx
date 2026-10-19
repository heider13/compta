// En-tête de page commun à tout l'espace pro : libellé technique, titre, description, actions.
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Petit libellé mono au-dessus du titre (ex. « Pilotage », une date, une référence) */
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="label-mono">{eyebrow}</p>}
        <h1 className="text-balance">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Conteneur standard d'une page de l'espace pro */
export function PageShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl space-y-6 p-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 sm:p-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
