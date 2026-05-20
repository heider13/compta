'use client';

type ProgressBarProps = {
  steps: string[];
  current: number; // 1-based index of the active step
};

// Barre de progression 4 étapes — affiche les étapes complétées, l'étape active et celles à venir.
export function ProgressBar({ steps, current }: ProgressBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 32,
      }}
    >
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        const circleBg = isDone
          ? 'var(--accent)'
          : isActive
            ? 'var(--accent)'
            : 'var(--white)';
        const circleColor = isDone || isActive ? 'white' : 'var(--ink-500)';
        const circleBorder = isDone || isActive ? 'var(--accent)' : 'var(--ink-200)';

        return (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flex: 1,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: circleBg,
                border: `1px solid ${circleBorder}`,
                color: circleColor,
                display: 'grid',
                placeItems: 'center',
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
                transition: 'background 0.15s ease, border-color 0.15s ease',
              }}
              aria-current={isActive ? 'step' : undefined}
            >
              {isDone ? '✓' : stepNum}
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? 'var(--ink-900)'
                  : isDone
                    ? 'var(--ink-700)'
                    : 'var(--ink-500)',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
            {idx < steps.length - 1 && (
              <div
                style={{
                  height: 1,
                  flex: 1,
                  background: isDone ? 'var(--accent)' : 'var(--ink-200)',
                  marginLeft: 4,
                  marginRight: 4,
                  transition: 'background 0.15s ease',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
