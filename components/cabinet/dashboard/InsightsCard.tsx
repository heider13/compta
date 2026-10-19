import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

export interface InsightsCardProps {
  awaitingValidation: number;
  inProgress: number;
}

export function InsightsCard({ awaitingValidation, inProgress }: InsightsCardProps) {
  let message: string;
  let cta: string;

  if (awaitingValidation > 0) {
    message = `${awaitingValidation} dossier${awaitingValidation > 1 ? 's' : ''} attend${
      awaitingValidation > 1 ? 'ent' : ''
    } votre validation. Voulez-vous que l'assistant les prépare ?`;
    cta = 'Préparer avec l’IA';
  } else if (inProgress > 0) {
    message = `${inProgress} dossier${inProgress > 1 ? 's' : ''} en cours. L'assistant peut vous aider à les faire avancer.`;
    cta = 'Ouvrir l’assistant';
  } else {
    message = "Aucun dossier en attente. L'assistant peut démarrer une nouvelle formalité pour vous.";
    cta = 'Ouvrir l’assistant';
  }

  return (
    <div className="ai-glow flex h-full min-w-0 flex-col justify-between gap-5 rounded-xl border border-brand-border bg-card p-5 shadow-xs">
      <div className="space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-soft px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-brand-soft-foreground">
          <Sparkles className="size-3" />
          Insights IA
        </span>
        <p className="text-sm font-medium leading-relaxed text-balance text-foreground">{message}</p>
      </div>
      <Link
        href="/assistant"
        className="inline-flex h-8 w-fit items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {cta}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
