'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProgressBarProps = {
  steps: string[];
  current: number; // 1-based index of the active step
};

// Barre de progression — étapes complétées, active et à venir.
export function ProgressBar({ steps, current }: ProgressBarProps) {
  return (
    <div className="mb-8 flex items-center gap-2">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;

        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full border text-[13px] font-semibold transition-colors',
                isDone || isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-muted-foreground',
              )}
            >
              {isDone ? <Check className="size-3.5" aria-hidden="true" /> : stepNum}
            </div>
            <span
              className={cn(
                'whitespace-nowrap text-[13px]',
                isActive
                  ? 'font-semibold text-foreground'
                  : isDone
                    ? 'font-medium text-foreground/80'
                    : 'font-medium text-muted-foreground',
              )}
            >
              {label}
            </span>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'mx-1 h-px flex-1 transition-colors',
                  isDone ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
