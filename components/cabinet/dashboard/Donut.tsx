export interface DonutProps {
  value: number;
  total: number;
  /** Big text in the center. Defaults to the computed percentage. */
  centerText?: string;
  /** Small label under the center text. */
  centerSub?: string;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
}

export function Donut({
  value,
  total,
  centerText,
  centerSub,
  size = 168,
  thickness = 18,
  color = '#5b36d6',
  trackColor = '#ede7ff',
}: DonutProps) {
  const pct = total > 0 ? Math.min(Math.max(value / total, 0), 1) : 0;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;
  const center = size / 2;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${Math.round(pct * 100)}%`}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={thickness}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
          {centerText ?? `${Math.round(pct * 100)}%`}
        </span>
        {centerSub ? (
          <span className="mt-0.5 text-xs text-muted-foreground">{centerSub}</span>
        ) : null}
      </div>
    </div>
  );
}
