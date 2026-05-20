import Link from 'next/link';

interface KpiProps {
  label: string;
  value: number | string;
  accent?: string; // Couleur CSS pour la bordure gauche (ex. 'var(--status-blue)')
  href?: string;
  hint?: string;
}

export function Kpi({ label, value, accent, href, hint }: KpiProps) {
  const style: React.CSSProperties = {
    background: 'var(--white)',
    border: '1px solid var(--ink-150)',
    borderRadius: 14,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minHeight: 110,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'border-color .12s, box-shadow .12s, transform .12s',
  };

  if (accent) {
    style.borderLeft = `3px solid ${accent}`;
    style.paddingLeft = 18;
  }

  const inner = (
    <>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--ink-500)',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 600,
          color: 'var(--ink-900)',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{hint}</div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} style={style}>
        {inner}
      </Link>
    );
  }
  return <div style={style}>{inner}</div>;
}
