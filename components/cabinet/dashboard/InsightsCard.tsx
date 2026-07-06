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
    <div className="flex h-full min-w-0 flex-col justify-between gap-6 rounded-xl p-6 text-white shadow-sm [background:linear-gradient(135deg,#5b36d6,#7551e8_55%,#ff887b)]">
      <div className="space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium">
          <Sparkles className="size-3.5" />
          Insights IA
        </span>
        <p className="text-base font-medium leading-relaxed text-balance">{message}</p>
      </div>
      <Link
        href="/assistant"
        className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#5b36d6] transition-colors hover:bg-white/90"
      >
        {cta}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
