import Link from 'next/link';

interface StatCardProps {
  count: number;
  label: string;
  sublabel?: string;
  tone?: 'gray' | 'violet' | 'blue' | 'orange' | 'amber' | 'green' | 'red';
  href?: string;
}

const TONE_COLORS: Record<NonNullable<StatCardProps['tone']>, { bg: string; fg: string }> = {
  gray:   { bg: 'var(--ink-100)',  fg: 'var(--ink-700)' },
  violet: { bg: 'var(--accent)',   fg: 'white' },
  blue:   { bg: '#3B82F6',         fg: 'white' },
  orange: { bg: '#F97316',         fg: 'white' },
  amber:  { bg: '#F59E0B',         fg: 'white' },
  green:  { bg: '#10B981',         fg: 'white' },
  red:    { bg: '#EF4444',         fg: 'white' },
};

export function StatCard({ count, label, sublabel, tone = 'gray', href }: StatCardProps) {
  const colors = TONE_COLORS[tone];
  const content = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '18px 20px',
        background: 'white',
        border: '1px solid var(--ink-150)',
        borderRadius: 14,
        transition: 'transform .12s ease, box-shadow .12s ease, border-color .12s ease',
        cursor: href ? 'pointer' : 'default',
        height: '100%',
      }}
      className="stat-card"
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: colors.bg,
          color: colors.fg,
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {count}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 2 }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: 14, color: 'var(--ink-900)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sublabel}
          </div>
        )}
      </div>
      {href && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-400)', flexShrink: 0 }} aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  );
  if (href) {
    return <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{content}</Link>;
  }
  return content;
}
